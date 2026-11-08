// Package motion is the fast motion channel for games (GET /api/motion): it merges the
// quaternion, raw motion, button and tap notifications into frames and fans them out
// to subscribers without the 10 Hz throttle of the telemetry stream.
package motion

import (
	"sync"
	"time"
)

// RawGrace is how long a raw motion notification drives the frame rate. Without raw motion
// (e.g. --skip raw_motion) every quaternion notification publishes a frame.
const RawGrace = 100 * time.Millisecond

// Tap is a tap event (direction as in the telemetry snapshot, count 1 or 2).
type Tap struct {
	Dir   string `json:"dir"`
	Count int    `json:"count"`
}

// Frame is one message on /api/motion (docs/protocol.md).
type Frame struct {
	T      int64      `json:"t"`     // Unix ms
	Q      [4]float64 `json:"q"`     // w, x, y, z
	Gyro   [3]float64 `json:"gyro"`  // °/s
	Accel  [3]float64 `json:"accel"` // g
	Button bool       `json:"button"`
	Tap    *Tap       `json:"tap,omitempty"`
}

// Hub collects motion notifications and publishes frames.
type Hub struct {
	// OnActive is called with true when the first subscriber arrives and with false after the
	// last one left. Calls are serialized and may block (e.g. a BLE write).
	OnActive func(active bool)

	now      func() time.Time
	mu       sync.Mutex
	state    Frame
	lastRaw  time.Time
	tap      *Tap
	subs     map[chan Frame]struct{}
	activeMu sync.Mutex
	reported bool
}

// NewHub returns an empty hub; now stamps the frames.
func NewHub(now func() time.Time) *Hub {
	return &Hub{now: now, state: Frame{Q: [4]float64{1, 0, 0, 0}}, subs: map[chan Frame]struct{}{}}
}

// Raw stores accelerometer (g) and gyroscope (°/s) values and publishes a frame.
func (h *Hub) Raw(accel, gyro [3]float64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.state.Accel, h.state.Gyro = accel, gyro
	h.lastRaw = h.now()
	h.publish()
}

// Quaternion stores the orientation (w, x, y, z); it publishes only while raw motion is missing.
func (h *Hub) Quaternion(q [4]float64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.state.Q = q
	if h.lastRaw.IsZero() || h.now().Sub(h.lastRaw) > RawGrace {
		h.publish()
	}
}

// Button stores the button state and publishes a frame immediately.
func (h *Hub) Button(pressed bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.state.Button = pressed
	h.publish()
}

// Tap attaches a tap event to the next frame.
func (h *Hub) Tap(dir string, count int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.tap = &Tap{Dir: dir, Count: count}
}

// Latest returns the current state as a frame.
func (h *Hub) Latest() Frame {
	h.mu.Lock()
	defer h.mu.Unlock()
	f := h.state
	f.T = h.now().UnixMilli()
	return f
}

// publish sends the state to every subscriber; a full buffer drops its oldest frame. Caller holds mu.
func (h *Hub) publish() {
	if len(h.subs) == 0 {
		return
	}
	f := h.state
	f.T = h.now().UnixMilli()
	f.Tap, h.tap = h.tap, nil
	for ch := range h.subs {
		select {
		case ch <- f:
			continue
		default:
		}
		select {
		case <-ch:
		default:
		}
		select {
		case ch <- f:
		default:
		}
	}
}

// Active reports whether anybody subscribes.
func (h *Hub) Active() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs) > 0
}

// Subscribe returns a channel with up to buffer pending frames and an idempotent cancel func
// that closes it.
func (h *Hub) Subscribe(buffer int) (<-chan Frame, func()) {
	ch := make(chan Frame, max(1, buffer))
	h.mu.Lock()
	h.subs[ch] = struct{}{}
	h.mu.Unlock()
	h.syncActive()
	var once sync.Once
	return ch, func() {
		once.Do(func() {
			h.mu.Lock()
			delete(h.subs, ch)
			close(ch)
			h.mu.Unlock()
			h.syncActive()
		})
	}
}

// syncActive reports changes of Active to OnActive, serialized, so the last call always matches the state.
func (h *Hub) syncActive() {
	h.activeMu.Lock()
	defer h.activeMu.Unlock()
	if active := h.Active(); active != h.reported {
		h.reported = active
		if h.OnActive != nil {
			h.OnActive(active)
		}
	}
}
