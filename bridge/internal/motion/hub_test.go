package motion

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

type clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *clock) now() time.Time { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *clock) advance(d time.Duration) {
	c.mu.Lock()
	c.t = c.t.Add(d)
	c.mu.Unlock()
}

func newHub() (*Hub, *clock) {
	c := &clock{t: time.UnixMilli(1762500000000)}
	return NewHub(c.now), c
}

func next(t *testing.T, ch <-chan Frame) Frame {
	t.Helper()
	select {
	case f := <-ch:
		return f
	case <-time.After(5 * time.Second):
		t.Fatal("no frame")
		return Frame{}
	}
}

func none(t *testing.T, ch <-chan Frame) {
	t.Helper()
	select {
	case f := <-ch:
		t.Fatalf("unexpected frame %+v", f)
	default:
	}
}

func TestRawMotionPublishesAFrameWithTheLatestQuaternionAndButton(t *testing.T) {
	h, _ := newHub()
	frames, cancel := h.Subscribe(8)
	defer cancel()
	h.Raw([3]float64{0, 0, 1}, [3]float64{1, 2, 3})
	next(t, frames)
	h.Quaternion([4]float64{0.7, 0, 0, 0.7})
	none(t, frames) // raw drives the rate while it is fresh
	h.Button(true)
	f := next(t, frames)
	if !f.Button || f.Q != [4]float64{0.7, 0, 0, 0.7} {
		t.Fatalf("button frame %+v", f)
	}
	h.Raw([3]float64{0.1, 0, 1}, [3]float64{400, 0, 0})
	f = next(t, frames)
	if f.T != 1762500000000 || f.Gyro != [3]float64{400, 0, 0} || f.Accel != [3]float64{0.1, 0, 1} || !f.Button {
		t.Fatalf("frame %+v", f)
	}
}

func TestQuaternionPublishesWhenRawMotionIsMissing(t *testing.T) {
	h, c := newHub()
	frames, cancel := h.Subscribe(8)
	defer cancel()
	h.Quaternion([4]float64{1, 0, 0, 0})
	if f := next(t, frames); f.Q != [4]float64{1, 0, 0, 0} {
		t.Fatalf("frame %+v", f)
	}
	h.Raw([3]float64{}, [3]float64{})
	next(t, frames)
	c.advance(RawGrace + time.Millisecond)
	h.Quaternion([4]float64{0, 1, 0, 0})
	if f := next(t, frames); f.Q != [4]float64{0, 1, 0, 0} {
		t.Fatalf("frame %+v", f)
	}
}

func TestTapIsSentOnceWithTheNextFrame(t *testing.T) {
	h, _ := newHub()
	h.Raw([3]float64{}, [3]float64{})
	frames, cancel := h.Subscribe(8)
	defer cancel()
	h.Tap("Z+", 2)
	none(t, frames)
	h.Raw([3]float64{}, [3]float64{})
	if f := next(t, frames); f.Tap == nil || *f.Tap != (Tap{Dir: "Z+", Count: 2}) {
		t.Fatalf("tap frame %+v", f)
	}
	h.Raw([3]float64{}, [3]float64{})
	if f := next(t, frames); f.Tap != nil {
		t.Fatalf("tap repeated: %+v", f)
	}
}

func TestFrameJSONMatchesTheProtocol(t *testing.T) {
	b, err := json.Marshal(Frame{T: 5, Q: [4]float64{1, 0, 0, 0}, Gyro: [3]float64{1, 2, 3}, Accel: [3]float64{0, 0, 1}})
	if err != nil {
		t.Fatal(err)
	}
	want := `{"t":5,"q":[1,0,0,0],"gyro":[1,2,3],"accel":[0,0,1],"button":false}`
	if string(b) != want {
		t.Fatalf("json %s, want %s", b, want)
	}
}

func TestOnActiveFiresForFirstSubscriberAndLastCancel(t *testing.T) {
	h, _ := newHub()
	var mu sync.Mutex
	var calls []bool
	h.OnActive = func(on bool) { mu.Lock(); calls = append(calls, on); mu.Unlock() }
	_, c1 := h.Subscribe(1)
	_, c2 := h.Subscribe(1)
	if !h.Active() {
		t.Fatal("not active")
	}
	c1()
	c1() // idempotent
	c2()
	if h.Active() {
		t.Fatal("still active")
	}
	mu.Lock()
	defer mu.Unlock()
	if len(calls) != 2 || !calls[0] || calls[1] {
		t.Fatalf("OnActive calls %v, want [true false]", calls)
	}
}

func TestSlowSubscriberDropsOldFramesAndKeepsTheNewest(t *testing.T) {
	h, _ := newHub()
	frames, cancel := h.Subscribe(2)
	defer cancel()
	for i := range 5 {
		h.Raw([3]float64{}, [3]float64{float64(i), 0, 0})
	}
	a, b := next(t, frames), next(t, frames)
	if a.Gyro[0] != 3 || b.Gyro[0] != 4 {
		t.Fatalf("got %v %v, want the two newest", a.Gyro, b.Gyro)
	}
}

func TestCancelClosesTheChannel(t *testing.T) {
	h, _ := newHub()
	frames, cancel := h.Subscribe(1)
	cancel()
	if _, ok := <-frames; ok {
		t.Fatal("channel open")
	}
	h.Raw([3]float64{}, [3]float64{}) // no panic on closed subscriber
}
