// Command relay connects phones (pads) with game screens and serves the playground site.
//
//	relay [-addr :8080] [-static build/site] [-ttl 30m] [-max-pads 24] [-tls-cert f -tls-key f]
//
// Phones only release motion sensors over HTTPS: run it behind a TLS proxy or tunnel (see relay/README.md),
// or pass -tls-cert/-tls-key.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/stefaneicher/disroop-sensor-playground/relay/internal/relay"
)

func main() {
	if err := run(context.Background(), os.Args[1:], os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, "relay:", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string, logOut io.Writer) error {
	fs := flag.NewFlagSet("relay", flag.ContinueOnError)
	addr := fs.String("addr", ":8080", "Adresse, auf der der Server lauscht")
	static := fs.String("static", "", "Ordner mit der Website (console, games, pad); leer = keine statischen Dateien")
	ttl := fs.Duration("ttl", 30*time.Minute, "Räume ohne Verkehr so lange behalten")
	maxPads := fs.Int("max-pads", 24, "Handys pro Raum")
	cert := fs.String("tls-cert", "", "TLS-Zertifikat (PEM), optional")
	key := fs.String("tls-key", "", "TLS-Schlüssel (PEM), optional")
	if err := fs.Parse(args); err != nil {
		return err
	}
	logger := log.New(logOut, "", log.LstdFlags)

	hub := relay.NewHub()
	hub.TTL, hub.MaxPads = *ttl, *maxPads
	var files http.Handler
	if *static != "" {
		if st, err := os.Stat(*static); err != nil || !st.IsDir() {
			return fmt.Errorf("-static %q ist kein Ordner", *static)
		}
		files = http.FileServer(http.Dir(*static))
	}
	srv := &http.Server{Addr: *addr, Handler: relay.Handler(hub, files), ReadHeaderTimeout: 10 * time.Second}

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		t := time.NewTicker(time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if n := hub.Sweep(); n > 0 {
					logger.Printf("%d Raum/Räume abgelaufen", n)
				}
			}
		}
	}()
	errc := make(chan error, 1)
	go func() {
		logger.Printf("relay auf %s (static: %q)", *addr, *static)
		if *cert != "" {
			errc <- srv.ListenAndServeTLS(*cert, *key)
		} else {
			errc <- srv.ListenAndServe()
		}
	}()
	select {
	case err := <-errc:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		sctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Shutdown(sctx)
	}
}
