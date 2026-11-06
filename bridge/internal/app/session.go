// Package app wires a device to the telemetry store: startup sequence, decoding,
// reconnects and the speaker/LED output for the song player.
package app

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/telemetry"
	"github.com/stefaneicher/thingy52-live/bridge/internal/thingy"
)

// Logf logs a line.
type Logf func(format string, args ...any)

const levelPublishEvery = 100 * time.Millisecond

// Session owns the current connection.
type Session struct {
	store *telemetry.Store
	logf  Logf
	now   func() time.Time

	// OnButton is called (in its own goroutine) for every button change.
	OnButton func(pressed bool)

	mu             sync.Mutex
	dev            device.Device
	meter          *thingy.LevelMeter
	lastLevel      time.Time
	speakerStatus  int
	decodeFailures map[string]bool
}

// NewSession returns a session that writes into store.
func NewSession(store *telemetry.Store, logf Logf, now func() time.Time) *Session {
	return &Session{store: store, logf: logf, now: now, speakerStatus: -1}
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
			s.Detach()
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

func (s *Session) waitForDrop(ctx context.Context, dev device.Device) {
	select {
	case <-ctx.Done():
	case <-dev.Done():
		s.logf("Verbindung verloren")
	}
}

// Attach runs the startup sequence of docs/protocol.md and subscribes to all notifications.
func (s *Session) Attach(dev device.Device) error {
	if err := Configure(dev, s.logf); err != nil {
		return err
	}
	s.mu.Lock()
	s.dev = dev
	s.meter = thingy.NewLevelMeter(0.3)
	s.lastLevel = time.Time{}
	s.decodeFailures = map[string]bool{}
	s.mu.Unlock()

	for _, c := range thingy.NotifyChars {
		if err := dev.Subscribe(c, func(b []byte) { s.Handle(c, b) }); err != nil {
			s.logf("Abo %s fehlgeschlagen: %v", c.Name, err)
		}
	}
	info := dev.Info()
	s.store.Update(func(snap *telemetry.Snapshot) {
		snap.Connected = true
		snap.Device.Name, snap.Device.Address = telemetry.S(info.Name), telemetry.S(info.Address)
		if info.RSSI != 0 {
			snap.Device.RSSI = telemetry.F(float64(info.RSSI))
		}
	})
	if b, err := dev.Read(thingy.BatteryChar); err == nil {
		s.Handle(thingy.BatteryChar, b)
	}
	s.logf("Verbunden mit %s (%s)", info.Name, info.Address)
	return nil
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

// Detach marks the session as disconnected.
func (s *Session) Detach() {
	s.mu.Lock()
	s.dev = nil
	s.mu.Unlock()
	s.store.Update(func(snap *telemetry.Snapshot) { snap.Connected = false })
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
