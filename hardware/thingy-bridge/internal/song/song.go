// Package song plays hardware/shared/chorus.json on the Thingy speaker and blinks the LED to it.
package song

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"math"
	"sync"
	"time"
)

// chorus.json is copied from hardware/shared/chorus.json by scripts/bridge.sh (single source of truth, gitignored here).
//
//go:embed chorus.json
var chorusJSON []byte

// Note is one tone: sound for OnMS, then silence for OffMS.
type Note struct {
	OnMS  int `json:"on_ms"`
	OffMS int `json:"off_ms"`
	Hz    int `json:"hz"`
}

// Song is a list of notes with a pause between repetitions.
type Song struct {
	Title   string `json:"title"`
	PauseMS int    `json:"pause_ms"`
	Notes   []Note `json:"notes"`
}

// Parse reads the hardware/shared/chorus.json format.
func Parse(raw []byte) (Song, error) {
	var s Song
	if err := json.Unmarshal(raw, &s); err != nil {
		return Song{}, err
	}
	if len(s.Notes) == 0 {
		return Song{}, errors.New("song has no notes")
	}
	return s, nil
}

// Chorus returns the embedded "Highway to Hell" chorus.
func Chorus() Song {
	s, err := Parse(chorusJSON)
	if err != nil {
		panic("embedded chorus.json: " + err.Error())
	}
	return s
}

// Output is the port to the speaker and LED.
type Output interface {
	Tone(hz, ms, volume int) error
	LED(r, g, b uint8) error
	LEDOff() error
}

// Clock is injectable for tests.
type Clock interface {
	Now() time.Time
	Sleep(ctx context.Context, d time.Duration) error
}

// RealClock uses the system time.
type RealClock struct{}

// Now implements Clock.
func (RealClock) Now() time.Time { return time.Now() }

// Sleep implements Clock. It returns early with ctx.Err() when ctx ends.
func (RealClock) Sleep(ctx context.Context, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-t.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// StateFunc receives the player state: note index while playing, -1 when idle.
type StateFunc func(playing bool, noteIndex int)

// Player plays a song. Start/Stop/Toggle are safe for concurrent use.
type Player struct {
	song    Song
	out     Output
	clock   Clock
	onState StateFunc

	mu     sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

// NewPlayer returns a player. onState may be nil.
func NewPlayer(s Song, out Output, clock Clock, onState StateFunc) *Player {
	if onState == nil {
		onState = func(bool, int) {}
	}
	return &Player{song: s, out: out, clock: clock, onState: onState}
}

// PlayOnce plays the song one time and blocks until it ends or ctx is cancelled.
func (p *Player) PlayOnce(ctx context.Context, volume int) error {
	return p.play(ctx, volume, false)
}

// Start plays the song in a loop (with pause_ms between) in the background until Stop.
func (p *Player) Start(volume int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.done != nil {
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	p.cancel, p.done = cancel, done
	go func() {
		defer close(done)
		_ = p.play(ctx, volume, true)
		p.mu.Lock()
		if p.done == done {
			p.cancel, p.done = nil, nil
		}
		p.mu.Unlock()
		cancel()
	}()
}

// Stop ends playback and waits until the LED is off.
func (p *Player) Stop() {
	p.mu.Lock()
	cancel, done := p.cancel, p.done
	p.cancel, p.done = nil, nil
	p.mu.Unlock()
	if cancel != nil {
		cancel()
		<-done
	}
}

// Toggle starts or stops playback.
func (p *Player) Toggle(volume int) {
	if p.Playing() {
		p.Stop()
	} else {
		p.Start(volume)
	}
}

// Playing reports whether the background loop runs.
func (p *Player) Playing() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.done != nil
}

func (p *Player) play(ctx context.Context, volume int, loop bool) (err error) {
	defer func() {
		if offErr := p.out.LEDOff(); err == nil && ctx.Err() == nil {
			err = offErr
		}
		p.onState(false, -1)
	}()
	for {
		for i, n := range p.song.Notes {
			if err := p.playNote(ctx, i, n, volume); err != nil {
				return err
			}
		}
		if !loop {
			return nil
		}
		if err := p.clock.Sleep(ctx, time.Duration(p.song.PauseMS)*time.Millisecond); err != nil {
			return err
		}
	}
}

func (p *Player) playNote(ctx context.Context, i int, n Note, volume int) error {
	p.onState(true, i)
	start := p.clock.Now()
	if err := p.out.Tone(n.Hz, n.OnMS, volume); err != nil {
		return err
	}
	if err := p.out.LED(ColorForHz(n.Hz)); err != nil {
		return err
	}
	if err := p.sleepUntil(ctx, start.Add(time.Duration(n.OnMS)*time.Millisecond)); err != nil {
		return err
	}
	if err := p.out.LEDOff(); err != nil {
		return err
	}
	return p.sleepUntil(ctx, start.Add(time.Duration(n.OnMS+n.OffMS)*time.Millisecond))
}

// sleepUntil keeps the rhythm even when BLE writes take time.
func (p *Player) sleepUntil(ctx context.Context, t time.Time) error {
	if d := t.Sub(p.clock.Now()); d > 0 {
		return p.clock.Sleep(ctx, d)
	}
	return ctx.Err()
}

// ColorForHz maps the pitch class to a hue (A = red, 30° per semitone), full saturation.
func ColorForHz(hz int) (r, g, b uint8) {
	semitone := int(math.Round(12 * math.Log2(float64(hz)/440)))
	hue := float64(((semitone%12)+12)%12) * 30
	return hsvToRGB(hue)
}

func hsvToRGB(hue float64) (r, g, b uint8) {
	h := hue / 60
	x := 1 - math.Abs(math.Mod(h, 2)-1)
	var rf, gf, bf float64
	switch int(h) {
	case 0:
		rf, gf = 1, x
	case 1:
		rf, gf = x, 1
	case 2:
		gf, bf = 1, x
	case 3:
		gf, bf = x, 1
	case 4:
		rf, bf = x, 1
	default:
		rf, bf = 1, x
	}
	to8 := func(v float64) uint8 { return uint8(math.Round(v * 255)) }
	return to8(rf), to8(gf), to8(bf)
}
