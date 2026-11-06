// Command thingy connects to a Nordic Thingy:52 (or the simulator) and shows the data live
// in the terminal and on http://127.0.0.1:8052. Subcommands: scan, song, nfc.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/app"
	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/device/ble"
	"github.com/stefaneicher/thingy52-live/bridge/internal/device/sim"
	"github.com/stefaneicher/thingy52-live/bridge/internal/server"
	"github.com/stefaneicher/thingy52-live/bridge/internal/song"
	"github.com/stefaneicher/thingy52-live/bridge/internal/telemetry"
	"github.com/stefaneicher/thingy52-live/bridge/internal/tui"
	"github.com/stefaneicher/thingy52-live/bridge/web"
)

const reconnectAfter = 3 * time.Second

type options struct {
	command string
	sim     bool
	addr    string
	port    int
	noTUI   bool
	volume  int
	restore bool
	backup  string
	timeout time.Duration
}

const usageText = `Aufruf: thingy [scan|song|nfc] [Optionen]

  (ohne Befehl)  verbinden, Live-Anzeige im Terminal und Web-GUI auf http://127.0.0.1:8052
  scan           Thingys in Reichweite auflisten
  song           verbinden und „Highway to Hell“ einmal abspielen
  nfc            NFC-Tag auf die Android-App umschreiben (Backup zuerst), --restore schreibt das Backup zurück

Optionen:
`

func parseArgs(args []string, stderr io.Writer) (options, error) {
	o := options{command: "live"}
	if len(args) > 0 && !strings.HasPrefix(args[0], "-") {
		o.command, args = args[0], args[1:]
	}
	fs := flag.NewFlagSet("thingy", flag.ContinueOnError)
	fs.SetOutput(stderr)
	fs.Usage = func() { fmt.Fprint(stderr, usageText); fs.PrintDefaults() }
	fs.BoolVar(&o.sim, "sim", false, "Simulator statt Bluetooth verwenden")
	fs.StringVar(&o.addr, "addr", "", "Bluetooth-Adresse des Thingy (leer = erstes gefundenes)")
	fs.IntVar(&o.port, "port", 8052, "HTTP-Port (nur 127.0.0.1)")
	fs.BoolVar(&o.noTUI, "no-tui", false, "keine Live-Anzeige, nur Meldungen ausgeben")
	fs.IntVar(&o.volume, "volume", 100, "Lautstärke des Lieds 0..100")
	fs.BoolVar(&o.restore, "restore", false, "nfc: Backup zurückschreiben")
	fs.StringVar(&o.backup, "backup", "", "nfc: Backup-Datei (Standard build/nfc-backup.hex)")
	fs.DurationVar(&o.timeout, "timeout", 10*time.Second, "scan: Suchdauer")
	if err := fs.Parse(args); err != nil {
		return o, err
	}
	switch o.command {
	case "live", "scan", "song", "nfc":
	case "help":
		fs.Usage()
		return o, flag.ErrHelp
	default:
		fs.Usage()
		return o, fmt.Errorf("unbekannter Befehl %q", o.command)
	}
	if o.volume < 0 || o.volume > 100 {
		return o, errors.New("--volume muss 0..100 sein")
	}
	if fs.NArg() > 0 {
		return o, fmt.Errorf("unerwartete Argumente: %v", fs.Args())
	}
	if o.backup == "" {
		o.backup = "build/nfc-backup.hex"
		if o.sim {
			o.backup = "build/nfc-backup-sim.hex"
		}
	}
	return o, nil
}

func main() { os.Exit(run(os.Args[1:], os.Stdout, os.Stderr)) }

func run(args []string, stdout, stderr io.Writer) int {
	o, err := parseArgs(args, stderr)
	if errors.Is(err, flag.ErrHelp) {
		return 0
	}
	if err != nil {
		fmt.Fprintln(stderr, "Fehler:", err)
		return 2
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	logf := printLogf(stdout)
	switch o.command {
	case "scan":
		err = scan(ctx, o, stdout)
	case "song":
		err = playSong(ctx, o, logf)
	case "nfc":
		err = programNFC(ctx, o, logf)
	default:
		err = live(ctx, o, stdout)
	}
	if err != nil && ctx.Err() == nil {
		fmt.Fprintln(stderr, "Fehler:", err)
		return 1
	}
	return 0
}

func printLogf(w io.Writer) app.Logf {
	return func(format string, args ...any) {
		fmt.Fprintf(w, "%s  %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
	}
}

type connector interface {
	device.Connector
	device.Scanner
}

func newConnector(o options, logf app.Logf) connector {
	if o.sim {
		return sim.NewConnector(sim.Options{ButtonEvery: 45 * time.Second})
	}
	return ble.New(o.addr, logf)
}

func scan(ctx context.Context, o options, w io.Writer) error {
	ctx, cancel := context.WithTimeout(ctx, o.timeout)
	defer cancel()
	fmt.Fprintf(w, "Suche Thingys (%s) …\n", o.timeout)
	n := 0
	err := newConnector(o, printLogf(w)).Scan(ctx, func(i device.Info) {
		n++
		fmt.Fprintf(w, "%s  %4d dBm  %s\n", i.Address, i.RSSI, i.Name)
	})
	if err != nil {
		return err
	}
	if n == 0 {
		return device.ErrNotFound
	}
	return nil
}

func songState(store *telemetry.Store) song.StateFunc {
	return func(playing bool, idx int) {
		store.Update(func(s *telemetry.Snapshot) { s.Sound.Song = telemetry.Song{Playing: playing, NoteIndex: idx} })
	}
}

func live(ctx context.Context, o options, stdout io.Writer) error {
	logs := telemetry.NewLogBus(8)
	conn := newConnector(o, logs.Logf)
	store := telemetry.NewStore(telemetry.New(conn.Source()), time.Now)
	session := app.NewSession(store, logs.Logf, time.Now)
	chorus := song.Chorus()
	player := song.NewPlayer(chorus, session, song.RealClock{}, songState(store))
	session.OnButton = func(pressed bool) {
		if pressed {
			logs.Logf("Taster gedrückt: Lied %s", map[bool]string{true: "stopp", false: "start"}[player.Playing()])
			player.Toggle(o.volume)
		}
	}

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", o.port))
	if err != nil {
		return fmt.Errorf("HTTP-Port: %w", err)
	}
	url := fmt.Sprintf("http://localhost:%d", o.port)
	srv := &http.Server{
		Handler: server.New(server.Config{
			Store: store, Logs: logs, Song: player, LED: session, Static: web.Static(), DefaultVolume: o.volume,
		}),
		BaseContext:       func(net.Listener) context.Context { return ctx },
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logs.Logf("HTTP-Server: %v", err)
		}
	}()
	logs.Logf("Web-GUI: %s", url)

	sessionCtx, stopSession := context.WithCancel(context.Background())
	sessionDone := make(chan struct{})
	go func() { session.Run(sessionCtx, conn, reconnectAfter); close(sessionDone) }()

	if o.noTUI {
		printLogs(ctx, logs, stdout)
	} else {
		tui.Run(ctx, stdout, store, logs, tui.Options{SongNotes: len(chorus.Notes), URL: url}, 100*time.Millisecond)
	}

	player.Stop()
	stopSession()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	select {
	case <-sessionDone:
	case <-shutdownCtx.Done():
	}
	fmt.Fprintln(stdout, "Beendet.")
	return nil
}

func printLogs(ctx context.Context, logs *telemetry.LogBus, w io.Writer) {
	for _, l := range logs.Recent() {
		fmt.Fprintln(w, l)
	}
	ch, cancel := logs.Subscribe()
	defer cancel()
	for {
		select {
		case <-ctx.Done():
			return
		case l := <-ch:
			fmt.Fprintf(w, "%s  %s\n", time.Now().Format("15:04:05"), l)
		}
	}
}

func connect(ctx context.Context, o options, logf app.Logf) (device.Device, error) {
	return app.Connect(ctx, newConnector(o, logf), reconnectAfter, logf)
}

func playSong(ctx context.Context, o options, logf app.Logf) error {
	dev, err := connect(ctx, o, logf)
	if err != nil {
		return err
	}
	defer dev.Close()
	store := telemetry.NewStore(telemetry.New(""), time.Now)
	session := app.NewSession(store, logf, time.Now)
	if err := session.Attach(dev); err != nil {
		return err
	}
	chorus := song.Chorus()
	logf("Spiele %q (%d Noten, Lautstärke %d) …", chorus.Title, len(chorus.Notes), o.volume)
	player := song.NewPlayer(chorus, session, song.RealClock{}, nil)
	start := time.Now()
	if err := player.PlayOnce(ctx, o.volume); err != nil {
		return err
	}
	logf("Fertig nach %s.", time.Since(start).Round(10*time.Millisecond))
	return nil
}

func programNFC(ctx context.Context, o options, logf app.Logf) error {
	dev, err := connect(ctx, o, logf)
	if err != nil {
		return err
	}
	defer dev.Close()
	if o.restore {
		return app.RestoreNFC(dev, o.backup, logf)
	}
	return app.ProgramNFC(dev, o.backup, logf)
}
