package relay

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

type fakePeer struct {
	mu     sync.Mutex
	msgs   []Message
	closed string
	full   bool
}

func (f *fakePeer) Send(b []byte) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.full {
		return false
	}
	var m Message
	_ = json.Unmarshal(b, &m)
	f.msgs = append(f.msgs, m)
	return true
}

func (f *fakePeer) Close(reason string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.closed = reason
}

func (f *fakePeer) last(t *testing.T) Message {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.msgs) == 0 {
		t.Fatal("keine Nachricht")
	}
	return f.msgs[len(f.msgs)-1]
}

func TestOpenRoomSendsCode(t *testing.T) {
	h := NewHub()
	s := &fakePeer{}
	code := h.OpenRoom(s)
	if len(code) != 4 {
		t.Fatalf("code %q", code)
	}
	if m := s.last(t); m.Type != "room" || m.Room != code {
		t.Fatalf("got %+v", m)
	}
}

func TestJoinFrameFeedbackLeave(t *testing.T) {
	h := NewHub()
	s := &fakePeer{}
	code := h.OpenRoom(s)
	p := &fakePeer{}
	id, err := h.Join(code, "Anna", p)
	if err != nil || id != 1 {
		t.Fatalf("join: %d %v", id, err)
	}
	if m := p.last(t); m.Type != "welcome" || m.Pad != 1 || m.Name != "Anna" || m.Color != Colors[0] {
		t.Fatalf("welcome %+v", m)
	}
	if m := s.last(t); m.Type != "join" || m.Pad != 1 || m.Color != Colors[0] {
		t.Fatalf("join %+v", m)
	}
	h.FromPad(code, id, []byte(`{"type":"frame","f":{"t":1,"q":[1,0,0,0]}}`))
	if m := s.last(t); m.Type != "frame" || m.Pad != 1 || string(m.F) != `{"t":1,"q":[1,0,0,0]}` {
		t.Fatalf("frame %+v", m)
	}
	h.FromScreen(code, []byte(`{"type":"feedback","pad":1,"kind":"hit"}`))
	if m := p.last(t); m.Type != "feedback" || m.Kind != "hit" {
		t.Fatalf("feedback %+v", m)
	}
	h.Leave(code, id)
	if m := s.last(t); m.Type != "leave" || m.Pad != 1 {
		t.Fatalf("leave %+v", m)
	}
	if st := h.Stats(); st.Rooms != 1 || st.Pads != 0 {
		t.Fatalf("stats %+v", st)
	}
}

func TestPadCannotSpoofOrSendOtherTypes(t *testing.T) {
	h := NewHub()
	s := &fakePeer{}
	code := h.OpenRoom(s)
	id, _ := h.Join(code, "", &fakePeer{})
	n := len(s.msgs)
	h.FromPad(code, id, []byte(`{"type":"join","name":"x"}`))
	h.FromPad(code, id, []byte(`kaputt`))
	h.FromPad(code, id, []byte(`{"type":"frame"}`))
	if len(s.msgs) != n {
		t.Fatalf("unexpected forward: %+v", s.msgs[n:])
	}
	h.FromPad(code, id, []byte(`{"type":"frame","pad":99,"f":{}}`))
	if m := s.last(t); m.Pad != id {
		t.Fatalf("pad id must come from the relay, got %d", m.Pad)
	}
}

func TestDefaultNameAndDistinctColors(t *testing.T) {
	h := NewHub()
	code := h.OpenRoom(&fakePeer{})
	a, b := &fakePeer{}, &fakePeer{}
	h.Join(code, "", a)
	h.Join(code, "Ein sehr langer Spielername", b)
	if a.last(t).Name != "Spieler 1" {
		t.Fatalf("name %q", a.last(t).Name)
	}
	if got := b.last(t).Name; len([]rune(got)) != 16 {
		t.Fatalf("name not cut: %q", got)
	}
	if a.last(t).Color == b.last(t).Color {
		t.Fatal("same color")
	}
	h.Leave(code, 1)
	c := &fakePeer{}
	h.Join(code, "", c)
	if c.last(t).Color != Colors[0] {
		t.Fatalf("freed color not reused: %s", c.last(t).Color)
	}
}

func TestUnknownRoomAndFull(t *testing.T) {
	h := NewHub()
	if _, err := h.Join("ZZZZ", "", &fakePeer{}); err != ErrNoRoom {
		t.Fatalf("want ErrNoRoom, got %v", err)
	}
	h.MaxPads = 2
	code := h.OpenRoom(&fakePeer{})
	h.Join(code, "", &fakePeer{})
	h.Join(code, "", &fakePeer{})
	if _, err := h.Join(code, "", &fakePeer{}); err != ErrRoomFull {
		t.Fatalf("want ErrRoomFull, got %v", err)
	}
}

func TestCloseRoomClosesPads(t *testing.T) {
	h := NewHub()
	code := h.OpenRoom(&fakePeer{})
	p := &fakePeer{}
	h.Join(code, "", p)
	h.CloseRoom(code)
	if p.closed == "" {
		t.Fatal("pad not closed")
	}
	if _, err := h.Join(code, "", &fakePeer{}); err != ErrNoRoom {
		t.Fatal("room still open")
	}
}

func TestSweepExpiresIdleRooms(t *testing.T) {
	now := time.Unix(0, 0)
	h := NewHub()
	h.Now = func() time.Time { return now }
	s := &fakePeer{}
	idle := h.OpenRoom(s)
	busy := h.OpenRoom(&fakePeer{})
	id, _ := h.Join(busy, "", &fakePeer{})
	now = now.Add(20 * time.Minute)
	h.FromPad(busy, id, []byte(`{"type":"frame","f":{}}`))
	now = now.Add(15 * time.Minute)
	if n := h.Sweep(); n != 1 {
		t.Fatalf("swept %d", n)
	}
	if s.closed == "" {
		t.Fatal("idle screen not closed")
	}
	if _, err := h.Join(idle, "", &fakePeer{}); err != ErrNoRoom {
		t.Fatal("idle room still there")
	}
	if _, err := h.Join(busy, "", &fakePeer{}); err != nil {
		t.Fatal("busy room expired")
	}
}

func TestFullQueueDropsInsteadOfBlocking(t *testing.T) {
	h := NewHub()
	s := &fakePeer{}
	code := h.OpenRoom(s)
	id, _ := h.Join(code, "", &fakePeer{})
	s.full = true
	done := make(chan struct{})
	go func() {
		for range 1000 {
			h.FromPad(code, id, []byte(`{"type":"frame","f":{}}`))
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("blocked on a full screen queue")
	}
}
