package song

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakeClock struct {
	mu     sync.Mutex
	now    time.Time
	block  chan struct{} // if set, Sleep waits for it or ctx
	sleeps []time.Duration
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) Sleep(ctx context.Context, d time.Duration) error {
	if c.block != nil {
		select {
		case <-c.block:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
	c.sleeps = append(c.sleeps, d)
	return ctx.Err()
}

type recorder struct {
	mu     sync.Mutex
	events []string
	fail   bool
}

func (r *recorder) add(s string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, s)
	if r.fail {
		return fmt.Errorf("write failed")
	}
	return nil
}
func (r *recorder) Tone(hz, ms, volume int) error {
	return r.add(fmt.Sprintf("tone %d %d %d", hz, ms, volume))
}
func (r *recorder) LED(red, g, b uint8) error { return r.add(fmt.Sprintf("led %d,%d,%d", red, g, b)) }
func (r *recorder) LEDOff() error             { return r.add("off") }
func (r *recorder) list() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.events...)
}

var twoNotes = Song{PauseMS: 1500, Notes: []Note{{OnMS: 180, OffMS: 80, Hz: 440}, {OnMS: 400, OffMS: 120, Hz: 392}}}

func TestParseChorus(t *testing.T) {
	s := Chorus()
	if len(s.Notes) != 24 || s.PauseMS != 1500 {
		t.Fatalf("chorus has %d notes, pause %d", len(s.Notes), s.PauseMS)
	}
	if s.Notes[0] != (Note{OnMS: 180, OffMS: 80, Hz: 440}) {
		t.Fatalf("first note %+v", s.Notes[0])
	}
	if !strings.Contains(s.Title, "Highway") {
		t.Fatalf("title %q", s.Title)
	}
}

func TestParseRejectsEmptySong(t *testing.T) {
	if _, err := Parse([]byte(`{"notes":[]}`)); err == nil {
		t.Fatal("want error")
	}
}

func TestPlayOnceWritesToneAndLEDPerNoteWithTiming(t *testing.T) {
	out, clock := &recorder{}, &fakeClock{now: time.Unix(0, 0)}
	var states []string
	p := NewPlayer(twoNotes, out, clock, func(playing bool, idx int) {
		states = append(states, fmt.Sprintf("%v/%d", playing, idx))
	})

	if err := p.PlayOnce(context.Background(), 80); err != nil {
		t.Fatal(err)
	}

	want := []string{"tone 440 180 80", "led 255,0,0", "off", "tone 392 400 80", "led 255,0,255", "off", "off"}
	if got := out.list(); strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("events\n got %v\nwant %v", got, want)
	}
	wantSleeps := []time.Duration{180 * time.Millisecond, 80 * time.Millisecond, 400 * time.Millisecond, 120 * time.Millisecond}
	if fmt.Sprint(clock.sleeps) != fmt.Sprint(wantSleeps) {
		t.Fatalf("sleeps %v want %v", clock.sleeps, wantSleeps)
	}
	if got := strings.Join(states, " "); got != "true/0 true/1 false/-1" {
		t.Fatalf("states %q", got)
	}
}

func TestStartLoopsWithPauseUntilStop(t *testing.T) {
	out, clock := &recorder{}, &fakeClock{now: time.Unix(0, 0)}
	p := NewPlayer(twoNotes, out, clock, nil)
	p.Start(100)
	deadline := time.Now().Add(10 * time.Second)
	for countTones(out.list()) < 6 {
		if time.Now().After(deadline) {
			t.Fatal("song does not loop")
		}
		time.Sleep(time.Millisecond)
	}
	p.Stop()
	if p.Playing() {
		t.Fatal("still playing after Stop")
	}
	clock.mu.Lock()
	defer clock.mu.Unlock()
	if !containsDuration(clock.sleeps, 1500*time.Millisecond) {
		t.Fatalf("no pause between loops: %v", clock.sleeps)
	}
}

func TestStopInterruptsAndSwitchesLEDOff(t *testing.T) {
	out, clock := &recorder{}, &fakeClock{now: time.Unix(0, 0), block: make(chan struct{})}
	idle := make(chan struct{})
	p := NewPlayer(twoNotes, out, clock, func(playing bool, idx int) {
		if !playing {
			close(idle)
		}
	})
	p.Start(100)
	waitFor(t, func() bool { return countTones(out.list()) == 1 })
	p.Stop()
	<-idle
	events := out.list()
	if events[len(events)-1] != "off" || countTones(events) != 1 {
		t.Fatalf("events %v", events)
	}
}

func TestToggle(t *testing.T) {
	clock := &fakeClock{now: time.Unix(0, 0), block: make(chan struct{})}
	p := NewPlayer(twoNotes, &recorder{}, clock, nil)
	p.Toggle(100)
	if !p.Playing() {
		t.Fatal("toggle must start")
	}
	p.Toggle(100)
	if p.Playing() {
		t.Fatal("toggle must stop")
	}
}

func TestPlayOnceStopsOnWriteError(t *testing.T) {
	p := NewPlayer(twoNotes, &recorder{fail: true}, &fakeClock{}, nil)
	if err := p.PlayOnce(context.Background(), 100); err == nil {
		t.Fatal("want error")
	}
}

func TestColorForHz(t *testing.T) {
	tests := []struct {
		hz      int
		r, g, b uint8
	}{
		{440, 255, 0, 0},   // A
		{880, 255, 0, 0},   // A one octave up
		{392, 255, 0, 255}, // G
		{587, 0, 255, 128}, // D
	}
	for _, tt := range tests {
		r, g, b := ColorForHz(tt.hz)
		if r != tt.r || g != tt.g || b != tt.b {
			t.Errorf("%d Hz: got %d,%d,%d want %d,%d,%d", tt.hz, r, g, b, tt.r, tt.g, tt.b)
		}
	}
}

func countTones(events []string) int {
	n := 0
	for _, e := range events {
		if strings.HasPrefix(e, "tone") {
			n++
		}
	}
	return n
}

func containsDuration(ds []time.Duration, d time.Duration) bool {
	for _, x := range ds {
		if x == d {
			return true
		}
	}
	return false
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatal("timeout")
		}
		time.Sleep(time.Millisecond)
	}
}
