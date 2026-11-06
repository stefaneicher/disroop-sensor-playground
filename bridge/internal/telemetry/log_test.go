package telemetry

import (
	"testing"
	"time"
)

func TestLogBusDeliversAndKeepsHistory(t *testing.T) {
	bus := NewLogBus(3)
	ch, cancel := bus.Subscribe()
	defer cancel()

	for _, m := range []string{"a", "b", "c", "d"} {
		bus.Logf("%s", m)
	}
	select {
	case got := <-ch:
		if got != "a" {
			t.Fatalf("first message %q", got)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("no message")
	}
	if got := bus.Recent(); len(got) != 3 || got[0] != "b" || got[2] != "d" {
		t.Fatalf("recent = %v", got)
	}
}

func TestLogBusDropsForFullSubscribers(t *testing.T) {
	bus := NewLogBus(1)
	_, cancel := bus.Subscribe()
	defer cancel()
	for range 1000 {
		bus.Logf("x")
	}
}
