package sim

import "math"

// SwingPeriod is the time between two simulated racket swings; they alternate forehand and
// backhand, every third one is a slice (racket face opened by rolling about the Y axis).
const SwingPeriod = 2.4 // s

// swingState is the racket motion added to the slow drift: yaw angle and rate about the
// vertical Z axis, roll angle and rate about the racket axis Y (degrees, °/s).
type swingState struct{ angle, rate, roll, rollRate float64 }

// Phases of one swing (s since the swing period started): wind-up back, fast stroke through
// the ball (~785 °/s peak), slow return (< 200 °/s, so it never counts as a stroke), rest.
var swingPhases = []struct{ from, to, start, end float64 }{
	{0.0, 0.6, 0, -60},
	{0.6, 0.9, -60, 90},
	{0.9, 1.9, 90, 0},
}

func swingAt(t float64) swingState {
	n := math.Floor(t / SwingPeriod)
	s := t - n*SwingPeriod
	dir := 1.0 // forehand: counter-clockwise seen from above
	if int(n)%2 == 1 {
		dir = -1
	}
	var st swingState
	for _, p := range swingPhases {
		if s >= p.from && s < p.to {
			st.angle, st.rate = ease(p.start, p.end, s-p.from, p.to-p.from)
			st.angle, st.rate = dir*st.angle, dir*st.rate
		}
	}
	if int(n)%3 == 2 && s >= 0.3 && s < 1.5 { // slice: face open by up to 50°
		st.roll, st.rollRate = 50*math.Sin(math.Pi*(s-0.3)/1.2), 50*math.Pi/1.2*math.Cos(math.Pi*(s-0.3)/1.2)
	}
	return st
}

// ease moves from a to b over d seconds with a cosine profile; it returns the value and its rate at u.
func ease(a, b, u, d float64) (float64, float64) {
	return a + (b-a)*(1-math.Cos(math.Pi*u/d))/2, (b - a) * math.Pi / (2 * d) * math.Sin(math.Pi*u/d)
}

// sway is a slow sideways tilt (roll) of ±12°, enough to steer a player in the tennis game.
func sway(t float64) float64 { return 12 * math.Sin(2*math.Pi*t/9) }
