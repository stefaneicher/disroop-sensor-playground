// Package relay forwards motion frames from phones ("pads") to a game screen.
//
// A screen opens a room and gets a short code. Pads join the room with that code (QR code on the screen),
// send MotionFrames and receive feedback (vibration). The screen runs the game; the relay only forwards.
// Protocol: docs/KONZEPT_HANDY_CONTROLLER.md and relay/README.md.
package relay

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"math/big"
	"sync"
	"time"
)

// Peer is one WebSocket connection (screen or pad). Send must not block: it returns false when the
// outgoing queue is full (the message is dropped, fresher frames follow anyway).
type Peer interface {
	Send(msg []byte) bool
	Close(reason string)
}

// Errors returned to joining pads.
var (
	ErrNoRoom   = errors.New("unbekannter Raum")
	ErrRoomFull = errors.New("Raum ist voll")
)

// codeAlphabet has no easily confused characters (0/O, 1/I/L).
const codeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// Colors handed out to pads in join order (disroop palette first, then distinct hues).
var Colors = []string{
	"#00a3e0", "#ff6b35", "#7ac143", "#c04de0", "#ffc20e", "#e0115f", "#00b3a4", "#8a6d3b",
	"#4363d8", "#f58231", "#3cb44b", "#911eb4", "#bfef45", "#f032e6", "#42d4f4", "#9a6324",
	"#469990", "#dcbeff", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9",
}

// Message is the JSON envelope in both directions. Only the fields of the given type are set.
type Message struct {
	Type  string          `json:"type"`
	Room  string          `json:"room,omitempty"`
	Pad   int             `json:"pad,omitempty"`
	Name  string          `json:"name,omitempty"`
	Color string          `json:"color,omitempty"`
	Kind  string          `json:"kind,omitempty"`
	Text  string          `json:"text,omitempty"`
	F     json.RawMessage `json:"f,omitempty"`
}

type pad struct {
	id    int
	name  string
	color string
	peer  Peer
}

type room struct {
	code   string
	screen Peer
	pads   map[int]*pad
	nextID int
	active time.Time
}

// Hub holds all rooms. Safe for concurrent use.
type Hub struct {
	MaxPads int           // pads per room
	TTL     time.Duration // rooms without traffic for this long are closed
	Now     func() time.Time

	mu    sync.Mutex
	rooms map[string]*room
}

// NewHub returns a hub with defaults (24 pads, 30 min).
func NewHub() *Hub {
	return &Hub{MaxPads: 24, TTL: 30 * time.Minute, Now: time.Now, rooms: map[string]*room{}}
}

func encode(m Message) []byte {
	b, _ := json.Marshal(m)
	return b
}

func (h *Hub) newCode() string {
	for {
		b := make([]byte, 4)
		for i := range b {
			n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
			b[i] = codeAlphabet[n.Int64()]
		}
		if _, taken := h.rooms[string(b)]; !taken {
			return string(b)
		}
	}
}

// OpenRoom registers a screen and returns the room code. The screen gets {"type":"room","room":code}.
func (h *Hub) OpenRoom(screen Peer) string {
	h.mu.Lock()
	defer h.mu.Unlock()
	code := h.newCode()
	h.rooms[code] = &room{code: code, screen: screen, pads: map[int]*pad{}, nextID: 1, active: h.Now()}
	screen.Send(encode(Message{Type: "room", Room: code}))
	return code
}

// CloseRoom removes the room of a disconnected screen and tells all pads.
func (h *Hub) CloseRoom(code string) {
	h.mu.Lock()
	r := h.rooms[code]
	delete(h.rooms, code)
	h.mu.Unlock()
	if r == nil {
		return
	}
	for _, p := range r.pads {
		p.peer.Close("Spiel beendet")
	}
}

// Join adds a pad. It returns the pad id; the pad gets "welcome", the screen gets "join".
func (h *Hub) Join(code, name string, peer Peer) (int, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[code]
	if r == nil {
		return 0, ErrNoRoom
	}
	if len(r.pads) >= h.MaxPads {
		return 0, ErrRoomFull
	}
	id := r.nextID
	r.nextID++
	if name == "" {
		name = "Spieler " + itoa(id)
	}
	if len([]rune(name)) > 16 {
		name = string([]rune(name)[:16])
	}
	used := map[string]bool{}
	for _, p := range r.pads {
		used[p.color] = true
	}
	color := Colors[(id-1)%len(Colors)]
	for _, c := range Colors {
		if !used[c] {
			color = c
			break
		}
	}
	r.pads[id] = &pad{id: id, name: name, color: color, peer: peer}
	r.active = h.Now()
	peer.Send(encode(Message{Type: "welcome", Room: code, Pad: id, Name: name, Color: color}))
	r.screen.Send(encode(Message{Type: "join", Pad: id, Name: name, Color: color}))
	return id, nil
}

// Leave removes a pad and tells the screen.
func (h *Hub) Leave(code string, id int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[code]
	if r == nil || r.pads[id] == nil {
		return
	}
	delete(r.pads, id)
	r.screen.Send(encode(Message{Type: "leave", Pad: id}))
}

// FromPad handles a message of a pad. Only "frame" is forwarded (with the pad id set by the relay).
func (h *Hub) FromPad(code string, id int, raw []byte) {
	var m Message
	if json.Unmarshal(raw, &m) != nil || m.Type != "frame" || len(m.F) == 0 {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[code]
	if r == nil || r.pads[id] == nil {
		return
	}
	r.active = h.Now()
	r.screen.Send(encode(Message{Type: "frame", Pad: id, F: m.F}))
}

// FromScreen handles a message of the screen: "feedback" goes to one pad (pad > 0) or all pads.
func (h *Hub) FromScreen(code string, raw []byte) {
	var m Message
	if json.Unmarshal(raw, &m) != nil || m.Type != "feedback" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[code]
	if r == nil {
		return
	}
	r.active = h.Now()
	out := encode(Message{Type: "feedback", Kind: m.Kind, Text: m.Text})
	for _, p := range r.pads {
		if m.Pad == 0 || m.Pad == p.id {
			p.peer.Send(out)
		}
	}
}

// Sweep closes rooms without traffic for longer than TTL. Returns the number of closed rooms.
func (h *Hub) Sweep() int {
	h.mu.Lock()
	var stale []*room
	for code, r := range h.rooms {
		if h.Now().Sub(r.active) > h.TTL {
			stale = append(stale, r)
			delete(h.rooms, code)
		}
	}
	h.mu.Unlock()
	for _, r := range stale {
		r.screen.Close("Raum abgelaufen")
		for _, p := range r.pads {
			p.peer.Close("Raum abgelaufen")
		}
	}
	return len(stale)
}

// Stats is the content of GET /api/status.
type Stats struct {
	Rooms int `json:"rooms"`
	Pads  int `json:"pads"`
}

// Stats counts rooms and pads.
func (h *Hub) Stats() Stats {
	h.mu.Lock()
	defer h.mu.Unlock()
	s := Stats{Rooms: len(h.rooms)}
	for _, r := range h.rooms {
		s.Pads += len(r.pads)
	}
	return s
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b []byte
	for ; n > 0; n /= 10 {
		b = append([]byte{byte('0' + n%10)}, b...)
	}
	return string(b)
}
