package battery

import (
	"testing"
	"time"
)

var t0 = time.Date(2026, 11, 7, 10, 0, 0, 0, time.UTC)

// feed adds one level per interval starting at t0 and returns the trend and time of the last sample.
func feed(tr *Tracker, every time.Duration, levels ...float64) (Trend, time.Time) {
	var got Trend
	at := t0
	for i, l := range levels {
		at = t0.Add(time.Duration(i) * every)
		got = tr.Add(at, l)
	}
	return got, at
}

func TestUnknownUntilEnoughData(t *testing.T) {
	tr := New()
	if got := tr.Trend(t0); got != Unknown {
		t.Fatalf("no data: %q, want unknown", got)
	}
	if got, _ := feed(tr, 30*time.Second, 60, 61, 62, 63); got != Unknown { // 90 s < MinSpan
		t.Fatalf("after 90 s: %q, want unknown", got)
	}
}

func TestRisingLevelIsCharging(t *testing.T) {
	if got, _ := feed(New(), time.Minute, 60, 61, 62); got != Charging {
		t.Fatalf("got %q, want charging", got)
	}
}

func TestFallingLevelIsDischarging(t *testing.T) {
	if got, _ := feed(New(), time.Minute, 80, 79, 78); got != Discharging {
		t.Fatalf("got %q, want discharging", got)
	}
}

func TestSteadyLevelStaysUnknown(t *testing.T) {
	if got, _ := feed(New(), 30*time.Second, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66); got != Unknown {
		t.Fatalf("got %q, want unknown", got)
	}
}

func TestJitterOfOnePointIsIgnored(t *testing.T) {
	got, _ := feed(New(), 30*time.Second, 66, 65, 66, 65, 66, 65, 66, 65, 66, 65, 66, 65)
	if got != Unknown {
		t.Fatalf("alternating 65/66: %q, want unknown", got)
	}
}

func TestShortDipIsFiltered(t *testing.T) {
	tr := New()
	feed(tr, time.Minute, 66, 66, 66)
	at := t0.Add(2*time.Minute + 10*time.Second)
	tr.Add(at, 60) // voltage dip under load (speaker, LED)
	tr.Add(at.Add(20*time.Second), 66)
	for _, d := range []time.Duration{0, 30 * time.Second, time.Minute, 2 * time.Minute, 4 * time.Minute} {
		if got := tr.Trend(at.Add(20*time.Second + d)); got != Unknown {
			t.Fatalf("got %q %s after a short dip, want unknown", got, d)
		}
	}
}

func TestSteadyLevelKeepsLastDecision(t *testing.T) {
	tr := New()
	_, at := feed(tr, time.Minute, 97, 98, 99, 100)
	if got := tr.Trend(at); got != Charging {
		t.Fatalf("got %q, want charging", got)
	}
	// Full: 100 % for 20 minutes without notifications (the firmware notifies on change only).
	for d := time.Minute; d <= 20*time.Minute; d += time.Minute {
		if got := tr.Trend(at.Add(d)); got != Charging {
			t.Fatalf("full and steady for %s: %q, want charging (last decision)", d, got)
		}
	}
}

func TestDirectionChangeIsDetected(t *testing.T) {
	tr := New()
	_, at := feed(tr, time.Minute, 60, 61, 62, 63)
	for i := 1; i <= 4; i++ {
		tr.Add(at.Add(time.Duration(i)*time.Minute), float64(63-i))
	}
	if got := tr.Trend(at.Add(4 * time.Minute)); got != Discharging {
		t.Fatalf("got %q, want discharging after unplugging", got)
	}
}

func TestSingleStepWithSparseNotificationsIsDetected(t *testing.T) {
	tr := New()
	tr.Add(t0, 70) // initial read
	tr.Add(t0.Add(3*time.Minute), 69)
	if got := tr.Trend(t0.Add(4 * time.Minute)); got != Discharging {
		t.Fatalf("got %q, want discharging", got)
	}
}

func TestResetForgetsEverything(t *testing.T) {
	tr := New()
	_, at := feed(tr, time.Minute, 60, 61, 62)
	tr.Reset()
	if got := tr.Trend(at); got != Unknown {
		t.Fatalf("after reset: %q, want unknown", got)
	}
	if got := tr.Add(at.Add(time.Minute), 62); got != Unknown {
		t.Fatalf("one sample after reset: %q, want unknown", got)
	}
}
