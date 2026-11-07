// Package app wires a device to the telemetry store: startup sequence, decoding,
// reconnects and the speaker/LED output for the song player.
package app

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/battery"
	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/motion"
	"github.com/stefaneicher/thingy52-live/bridge/internal/telemetry"
	"github.com/stefaneicher/thingy52-live/bridge/internal/thingy"
)

// Logf logs a line.
type Logf func(format string, args ...any)

const levelPublishEvery = 100 * time.Millisecond

// The microphone streams 16 kHz IMA-ADPCM (≈ 32 kB/s, fixed in the firmware). Together with all other
// notifications that makes the Windows BLE link drop, so the mic is off by default (SetMic switches it).
// If the connection drops MicMaxDrops times in a row within MicDropWindow after the mic started,
// the mic is switched off automatically.
const (
	MicMaxDrops   = 2
	MicDropWindow = 30 * time.Second
)

// Session owns the current connection.
type Session struct {
	store *telemetry.Store
	logf  Logf
	now   func() time.Time

	// OnButton is called (in its own goroutine) for every button change.
	OnButton func(pressed bool)
	// Skip lists characteristic names (thingy.Char.Name) not to subscribe to (diagnostics, --skip).
	Skip map[string]bool
	// MicDelay is the wait after connecting before the mic is subscribed, so the link settles first.
	MicDelay time.Duration
	// Motion, if set, receives quaternion, raw motion, button and tap notifications (GET /api/motion).
	Motion *motion.Hub

	micMu          sync.Mutex // serializes mic (un)subscriptions
	gameMu         sync.Mutex // serializes game mode switches with the subscriptions of Attach
	mu             sync.Mutex
	dev            device.Device
	meter          *thingy.LevelMeter
	lastLevel      time.Time
	speakerStatus  int
	decodeFailures map[string]bool
	micWanted      bool
	micReady       bool      // MicDelay has passed on the current connection
	micOn          bool      // mic notifications are subscribed on the current connection
	micSince       time.Time // mic start on the current connection, zero if none
	micDrops       int
	battery        *battery.Tracker
	batteryTrend   battery.Trend
	batteryChecked time.Time // last re-evaluation of the trend
	gameHz         uint16    // motion_freq_hz in game mode, 0 = no game (thingy.DefaultMotionConfig)
}

// NewSession returns a session that writes into store. The microphone is off.
func NewSession(store *telemetry.Store, logf Logf, now func() time.Time) *Session {
	return &Session{store: store, logf: logf, now: now, speakerStatus: -1, battery: battery.New(), batteryTrend: battery.Unknown}
}

// Run connects, attaches and reconnects after a lost connection until ctx ends.
func (s *Session) Run(ctx context.Context, conn device.Connector, retry time.Duration) {
	for ctx.Err() == nil {
		s.logf("Verbinde mit Thingy (%s) …", conn.Source())
		dev, err := conn.Connect(ctx)
		if err == nil {
			err = s.Attach(dev)
			if err == nil {
				s.waitForDrop(ctx, dev)
			}
			since := s.Detach()
			s.checkMicDrop(ctx, since)
			_ = dev.Close()
		}
		if ctx.Err() != nil {
			return
		}
		switch {
		case errors.Is(err, device.ErrNotFound):
			s.logf("%v – suche weiter in %s …", err, retry)
		case err != nil:
			s.logf("Verbindung fehlgeschlagen: %v – neuer Versuch in %s", err, retry)
		default:
			s.logf("Neuer Verbindungsversuch in %s", retry)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(retry):
		}
	}
}

// Connect connects to a Thingy and keeps searching (logging a wake-up hint) while none is found,
// until ctx ends. Other errors are returned.
func Connect(ctx context.Context, conn device.Connector, retry time.Duration, logf Logf) (device.Device, error) {
	for {
		logf("Verbinde mit Thingy (%s) …", conn.Source())
		dev, err := conn.Connect(ctx)
		if !errors.Is(err, device.ErrNotFound) {
			return dev, err
		}
		logf("%v – suche weiter in %s … (Strg+C bricht ab)", err, retry)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(retry):
		}
	}
}

// checkMicDrop counts connections lost shortly after the mic started and switches the mic off
// after MicMaxDrops of them in a row.
func (s *Session) checkMicDrop(ctx context.Context, since time.Time) {
	if ctx.Err() != nil || since.IsZero() {
		return
	}
	s.mu.Lock()
	if s.now().Sub(since) >= MicDropWindow {
		s.micDrops = 0
		s.mu.Unlock()
		return
	}
	s.micDrops++
	off := s.micDrops >= MicMaxDrops && s.micWanted
	s.mu.Unlock()
	if off {
		s.logf("Mikrofon automatisch ausgeschaltet: Verbindung brach %d× kurz nach dem Mikrofon-Start ab", MicMaxDrops)
		s.SetMic(false)
	}
}

// SetMic switches the microphone (sound level) on or off, also while connected.
func (s *Session) SetMic(on bool) {
	s.micMu.Lock()
	defer s.micMu.Unlock()
	s.mu.Lock()
	changed := s.micWanted != on
	s.micWanted = on
	if on {
		s.micDrops = 0
	}
	dev, wasOn := s.dev, s.micOn
	if !on {
		s.micOn = false
	}
	s.mu.Unlock()
	s.store.Update(func(snap *telemetry.Snapshot) {
		snap.Sound.MicEnabled = on
		if !on {
			snap.Sound.LevelDBFS = nil
		}
	})
	if changed {
		s.logf("Mikrofon %s", map[bool]string{true: "ein", false: "aus"}[on])
	}
	switch {
	case on && dev != nil:
		s.startMic(dev)
	case !on && wasOn && dev != nil:
		if err := dev.Unsubscribe(thingy.MicrophoneChar); err != nil {
			s.logf("Mikrofon abbestellen fehlgeschlagen: %v", err)
		}
	}
}

// MicEnabled reports whether the mic is switched on.
func (s *Session) MicEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.micWanted
}

// micAfterDelay marks the connection ready for the mic after MicDelay and starts it if wanted.
func (s *Session) micAfterDelay(dev device.Device) {
	if s.MicDelay > 0 {
		t := time.NewTimer(s.MicDelay)
		defer t.Stop()
		select {
		case <-t.C:
		case <-dev.Done():
			return
		}
	}
	s.mu.Lock()
	if s.dev == dev {
		s.micReady = true
	}
	s.mu.Unlock()
	s.micMu.Lock()
	defer s.micMu.Unlock()
	s.startMic(dev)
}

// startMic subscribes the mic on dev if it is wanted, the connection is ready and it is not on yet.
// The caller holds micMu.
func (s *Session) startMic(dev device.Device) {
	s.mu.Lock()
	if s.dev != dev || !s.micWanted || !s.micReady || s.micOn || s.Skip[thingy.MicrophoneChar.Name] {
		s.mu.Unlock()
		return
	}
	s.micOn = true
	s.meter, s.lastLevel = thingy.NewLevelMeter(0.3), time.Time{}
	if s.micSince.IsZero() {
		s.micSince = s.now()
	}
	s.mu.Unlock()
	if !s.subscribe(dev, thingy.MicrophoneChar) {
		s.mu.Lock()
		s.micOn = false
		s.mu.Unlock()
	}
}

func (s *Session) waitForDrop(ctx context.Context, dev device.Device) {
	select {
	case <-ctx.Done():
	case <-dev.Done():
		s.logf("Verbindung verloren")
	}
}

// Attach runs the startup sequence of docs/protocol.md and subscribes to all notifications.
// In game mode it leaves thingy.GamePausedChars out and raises motion_freq_hz only after all
// subscriptions are done.
func (s *Session) Attach(dev device.Device) error {
	if err := Configure(dev, s.logf); err != nil {
		return err
	}
	s.gameMu.Lock()
	s.mu.Lock()
	s.dev = dev
	s.decodeFailures = map[string]bool{}
	s.micReady, s.micOn, s.micSince = false, false, time.Time{}
	s.battery.Reset()
	s.batteryTrend, s.batteryChecked = battery.Unknown, time.Time{}
	hz := s.gameHz
	s.mu.Unlock()

	for _, c := range thingy.NotifyChars {
		if c != thingy.MicrophoneChar && !s.Skip[c.Name] && (hz == 0 || !gamePaused(c)) {
			s.subscribe(dev, c)
		}
	}
	if hz != 0 {
		if err := dev.Write(thingy.MotionConfigChar, motionConfig(hz).Bytes()); err != nil {
			s.logf("Motion-Frequenz %d Hz setzen fehlgeschlagen: %v", hz, err)
		}
	}
	s.gameMu.Unlock()
	info := dev.Info()
	s.store.Update(func(snap *telemetry.Snapshot) {
		snap.Connected = true
		snap.Device.BatteryTrend = string(battery.Unknown)
		snap.Device.Name, snap.Device.Address = telemetry.S(info.Name), telemetry.S(info.Address)
		if info.RSSI != 0 {
			snap.Device.RSSI = telemetry.F(float64(info.RSSI))
		}
	})
	if b, err := dev.Read(thingy.BatteryChar); err == nil {
		s.Handle(thingy.BatteryChar, b)
	}
	s.logf("Verbunden mit %s (%s)", info.Name, info.Address)
	go s.micAfterDelay(dev)
	return nil
}

func (s *Session) subscribe(dev device.Device, c thingy.Char) bool {
	if err := dev.Subscribe(c, func(b []byte) { s.Handle(c, b) }); err != nil {
		s.logf("Abo %s fehlgeschlagen: %v", c.Name, err)
		return false
	}
	return true
}

// Configure writes the motion, environment and sound configuration.
func Configure(dev device.Device, logf Logf) error {
	if err := dev.Write(thingy.MotionConfigChar, thingy.DefaultMotionConfig().Bytes()); err != nil {
		return errors.Join(errors.New("Motion-Config schreiben"), err)
	}
	env := thingy.EnvConfigValue{}
	if raw, err := dev.Read(thingy.EnvConfigChar); err != nil {
		logf("Env-Config lesen fehlgeschlagen: %v", err)
	} else if env, err = thingy.DecodeEnvConfig(raw); err != nil {
		logf("Env-Config ungültig: %v", err)
	}
	if err := dev.Write(thingy.EnvConfigChar, env.WithDemoIntervals().Bytes()); err != nil {
		return errors.Join(errors.New("Env-Config schreiben"), err)
	}
	if err := dev.Write(thingy.SoundConfigChar, thingy.SoundConfig(thingy.SpeakerModeFrequency, thingy.MicModeADPCM)); err != nil {
		return errors.Join(errors.New("Sound-Config schreiben"), err)
	}
	return nil
}

// Detach marks the session as disconnected. It returns when the mic was started on the connection
// (zero if it was not).
func (s *Session) Detach() time.Time {
	s.mu.Lock()
	since := s.micSince
	s.dev, s.micReady, s.micOn, s.micSince = nil, false, false, time.Time{}
	s.mu.Unlock()
	s.store.Update(func(snap *telemetry.Snapshot) {
		snap.Connected = false
		snap.Sound.LevelDBFS = nil
	})
	return since
}

func (s *Session) device() (device.Device, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.dev == nil {
		return nil, device.ErrNotConnected
	}
	return s.dev, nil
}

// Tone plays a tone (implements song.Output).
func (s *Session) Tone(hz, ms, volume int) error {
	dev, err := s.device()
	if err != nil {
		return err
	}
	return dev.WriteNoResponse(thingy.SpeakerChar, thingy.SpeakerTone(uint16(hz), uint16(ms), volume))
}

// LED sets a constant color (implements song.Output and the HTTP LED control).
func (s *Session) LED(r, g, b uint8) error {
	dev, err := s.device()
	if err != nil {
		return err
	}
	if err := dev.Write(thingy.LEDChar, thingy.LEDConstant(r, g, b)); err != nil {
		return err
	}
	s.store.Update(func(snap *telemetry.Snapshot) {
		snap.UI.LED = &telemetry.RGB{R: float64(r), G: float64(g), B: float64(b)}
	})
	return nil
}

// LEDOff switches the LED off (implements song.Output).
func (s *Session) LEDOff() error {
	dev, err := s.device()
	if err != nil {
		return err
	}
	if err := dev.Write(thingy.LEDChar, thingy.LEDOff()); err != nil {
		return err
	}
	s.store.Update(func(snap *telemetry.Snapshot) { snap.UI.LED = &telemetry.RGB{} })
	return nil
}

func motionConfig(hz uint16) thingy.MotionConfigValue {
	cfg := thingy.DefaultMotionConfig()
	if hz != 0 {
		cfg.MotionHz = hz
	}
	return cfg
}

func gamePaused(c thingy.Char) bool {
	for _, p := range thingy.GamePausedChars {
		if p == c {
			return true
		}
	}
	return false
}

// SetGameMode switches the game mode for the fast motion channel, now and after reconnects:
// hz > 0 unsubscribes thingy.GamePausedChars and then sets motion_freq_hz to hz; 0 restores the
// default rate of thingy.DefaultMotionConfig and then subscribes them again. All notifications that
// follow motion_freq_hz together overload the BLE link at a game rate (docs/TENNIS.md).
func (s *Session) SetGameMode(hz uint16) {
	s.gameMu.Lock()
	defer s.gameMu.Unlock()
	s.mu.Lock()
	was := s.gameHz
	s.gameHz = hz
	dev := s.dev
	s.mu.Unlock()
	if was == hz {
		return
	}
	cfg := motionConfig(hz)
	if hz != 0 {
		s.logf("Spielmodus: Motion-Frequenz %d Hz, Euler und Kompass pausiert", cfg.MotionHz)
	} else {
		s.logf("Spielmodus aus: Motion-Frequenz %d Hz", cfg.MotionHz)
	}
	if dev == nil {
		return
	}
	if was == 0 {
		for _, c := range thingy.GamePausedChars {
			if !s.Skip[c.Name] {
				if err := dev.Unsubscribe(c); err != nil {
					s.logf("Abo %s beenden fehlgeschlagen: %v", c.Name, err)
				}
			}
		}
	}
	if err := dev.Write(thingy.MotionConfigChar, cfg.Bytes()); err != nil {
		s.logf("Motion-Frequenz setzen fehlgeschlagen: %v", err)
	}
	if hz == 0 {
		for _, c := range thingy.GamePausedChars {
			if !s.Skip[c.Name] {
				s.subscribe(dev, c)
			}
		}
	}
}

// GameMode reports whether the game mode is on.
func (s *Session) GameMode() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.gameHz != 0
}

// beepSounds is the device feedback of POST /api/beep: a short tone plus an LED color.
var beepSounds = map[string]struct {
	hz, ms  int
	r, g, b uint8
}{
	"hit":   {1320, 40, 0, 255, 0},
	"point": {1760, 90, 163, 230, 53},
	"miss":  {330, 140, 255, 0, 0},
}

// Beep gives short feedback on the Thingy (tone + LED): kind is "hit", "point" or "miss".
func (s *Session) Beep(kind string) error {
	b, ok := beepSounds[kind]
	if !ok {
		return fmt.Errorf("unbekannte Art %q", kind)
	}
	if err := s.Tone(b.hz, b.ms, 60); err != nil {
		return err
	}
	return s.LED(b.r, b.g, b.b)
}
