package relay

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// wsPeer wraps a WebSocket with a bounded send queue and one writer goroutine.
type wsPeer struct {
	c    *websocket.Conn
	out  chan []byte
	done chan struct{}
	once sync.Once
}

func newPeer(c *websocket.Conn) *wsPeer {
	return &wsPeer{c: c, out: make(chan []byte, 64), done: make(chan struct{})}
}

func (p *wsPeer) Send(msg []byte) bool {
	select {
	case p.out <- msg:
		return true
	default:
		return false
	}
}

func (p *wsPeer) Close(reason string) {
	p.once.Do(func() {
		close(p.done)
		_ = p.c.Close(websocket.StatusNormalClosure, reason)
	})
}

func (p *wsPeer) writeLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-p.done:
			return
		case m := <-p.out:
			wctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err := p.c.Write(wctx, websocket.MessageText, m)
			cancel()
			if err != nil {
				return
			}
		}
	}
}

// Handler returns the HTTP handler: WebSockets, health, status, and (optional) static files.
//
//	GET /healthz                 "ok"
//	GET /api/status              {"rooms":n,"pads":n}
//	GET /api/relay               {"relay":true}  (lets pages detect that they are served by a relay)
//	WS  /ws/screen               open a room; receives room, join, leave, frame; sends feedback
//	WS  /ws/pad?room=CODE&name=  join a room; receives welcome, feedback; sends frame
func Handler(h *Hub, static http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("GET /api/status", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, h.Stats())
	})
	mux.HandleFunc("GET /api/relay", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, map[string]bool{"relay": true})
	})
	mux.HandleFunc("GET /ws/screen", func(w http.ResponseWriter, r *http.Request) {
		// Screens may run on another origin (GitHub Pages, thingy.exe on localhost).
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		p := newPeer(c)
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()
		go p.writeLoop(ctx)
		code := h.OpenRoom(p)
		defer h.CloseRoom(code)
		for {
			_, msg, err := c.Read(ctx)
			if err != nil {
				return
			}
			h.FromScreen(code, msg)
		}
	})
	mux.HandleFunc("GET /ws/pad", func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		c.SetReadLimit(4096)
		p := newPeer(c)
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()
		go p.writeLoop(ctx)
		code := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("room")))
		id, err := h.Join(code, strings.TrimSpace(r.URL.Query().Get("name")), p)
		if err != nil {
			p.Send(encode(Message{Type: "error", Text: err.Error()}))
			time.Sleep(100 * time.Millisecond) // let the writer deliver the error
			p.Close(err.Error())
			return
		}
		defer h.Leave(code, id)
		for {
			_, msg, err := c.Read(ctx)
			if err != nil {
				return
			}
			h.FromPad(code, id, msg)
		}
	})
	if static != nil {
		mux.Handle("/", static)
	}
	return mux
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(v)
}
