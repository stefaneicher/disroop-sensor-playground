// Package battery estimates whether the Thingy is charging from its battery level alone.
//
// The stock firmware only exposes the level in % (Battery Service 0x180F, derived from the
// battery voltage). It detects USB power and charging internally but does not publish it over BLE,
// so the trend of the level is the only hint. See docs/protocol.md, "Akku-Trend".
package battery

import (
	"slices"
	"time"
)

// Trend is the estimated charging state (device.battery_trend).
type Trend string

const (
	Unknown     Trend = "unknown"
	Charging    Trend = "charging"
	Discharging Trend = "discharging"
)

const (
	// Window is the sliding time range the trend is computed over.
	Window = 5 * time.Minute
	// MinSpan is the data needed after a (re)connect before the first decision.
	MinSpan = 2 * time.Minute
	// Threshold is the change over the window (percentage points, regression) that decides the trend.
	Threshold = 1.0
	// Step is the resampling period: the level is held between notifications (the firmware
	// notifies on change only), so sparse and dense notifications weigh the same.
	Step = 15 * time.Second
	// medianRadius makes a 5-sample (≈ 1 min) median filter that removes short dips under load.
	medianRadius = 2
)

type sample struct {
	at    time.Time
	level float64
}

// Tracker keeps recent battery levels and the last decision. It is not safe for concurrent use.
type Tracker struct {
	samples []sample
	trend   Trend
}

// New returns a tracker without data (Unknown).
func New() *Tracker { return &Tracker{trend: Unknown} }

// Reset forgets all samples and the last decision, e.g. after a reconnect.
func (t *Tracker) Reset() { t.samples, t.trend = nil, Unknown }

// Add records the level (%) received at and returns the trend at that time.
func (t *Tracker) Add(at time.Time, level float64) Trend {
	t.samples = append(t.samples, sample{at, level})
	return t.Trend(at)
}

// Trend re-evaluates the trend at now: the level is resampled every Step over the last Window,
// median filtered and fitted with a line. A change of at least Threshold up or down decides
// Charging or Discharging; a smaller change keeps the last decision (hysteresis, e.g. "full").
func (t *Tracker) Trend(now time.Time) Trend {
	if len(t.samples) == 0 || now.Sub(t.samples[0].at) < MinSpan {
		return t.trend
	}
	t.prune(now.Add(-Window))
	start := later(t.samples[0].at, now.Add(-Window))
	levels := median(t.resample(start, now))
	switch change := slope(levels) * float64(len(levels)-1); {
	case change >= Threshold-1e-9:
		t.trend = Charging
	case change <= -Threshold+1e-9:
		t.trend = Discharging
	}
	return t.trend
}

// prune drops samples before from, keeping the last one as the level at the window start.
func (t *Tracker) prune(from time.Time) {
	i := 0
	for i+1 < len(t.samples) && !t.samples[i+1].at.After(from) {
		i++
	}
	t.samples = t.samples[i:]
}

func later(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}

// resample returns the held level every Step from start to now.
func (t *Tracker) resample(start, now time.Time) []float64 {
	var out []float64
	i := 0
	for at := start; !at.After(now); at = at.Add(Step) {
		for i+1 < len(t.samples) && !t.samples[i+1].at.After(at) {
			i++
		}
		out = append(out, t.samples[i].level)
	}
	return out
}

// median filters v with a window of 2·medianRadius+1, shrunk at the ends.
func median(v []float64) []float64 {
	out := make([]float64, len(v))
	for i := range v {
		w := slices.Clone(v[max(0, i-medianRadius):min(len(v), i+medianRadius+1)])
		slices.Sort(w)
		n := len(w)
		out[i] = (w[(n-1)/2] + w[n/2]) / 2
	}
	return out
}

// slope is the least-squares slope of v over its index.
func slope(v []float64) float64 {
	n := float64(len(v))
	if n < 2 {
		return 0
	}
	mx := (n - 1) / 2
	var my float64
	for _, y := range v {
		my += y
	}
	my /= n
	var sxy, sxx float64
	for i, y := range v {
		dx := float64(i) - mx
		sxy += dx * (y - my)
		sxx += dx * dx
	}
	return sxy / sxx
}
