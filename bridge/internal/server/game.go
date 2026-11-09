package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"time"

	"github.com/coder/websocket"

	"github.com/stefaneicher/disroop-sensor-playground/bridge/internal/device"
)

// BeepControl gives short feedback on the Thingy (tone + LED).
type BeepControl interface {
	Beep(kind string) error
}

// beepKinds are the accepted values of POST /api/beep {"kind": …}.
var beepKinds = map[string]bool{"hit": true, "point": true, "miss": true}

// motionBuffer frames may wait per WebSocket client; slower clients lose the oldest ones.
const motionBuffer = 32

// motionStream sends every motion frame as a JSON text message (docs/protocol.md "Motion-Kanal").
func (s *server) motionStream(w http.ResponseWriter, r *http.Request) {
	if s.Motion == nil {
		http.NotFound(w, r)
		return
	}
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: []string{"127.0.0.1:*", "localhost:*", "[::1]:*"}})
	if err != nil {
		return // Accept already wrote the error response
	}
	defer c.CloseNow()
	frames, cancel := s.Motion.Subscribe(motionBuffer)
	defer cancel()
	ctx := c.CloseRead(r.Context())
	for {
		select {
		case <-ctx.Done():
			return
		case f, ok := <-frames:
			if !ok {
				return
			}
			data, err := json.Marshal(f)
			if err != nil {
				return
			}
			wctx, done := context.WithTimeout(ctx, 2*time.Second)
			err = c.Write(wctx, websocket.MessageText, data)
			done()
			if err != nil {
				return
			}
		}
	}
}

type beepRequest struct {
	Kind string `json:"kind"`
}

func (s *server) beep(w http.ResponseWriter, r *http.Request) {
	var req beepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		badRequest(w, "invalid JSON")
		return
	}
	if req.Kind == "" {
		req.Kind = "hit"
	}
	if !beepKinds[req.Kind] {
		badRequest(w, `kind must be "hit", "point" or "miss"`)
		return
	}
	s.beepMu.Lock()
	now := time.Now()
	limited := now.Sub(s.lastBeep) < s.BeepInterval
	if !limited {
		s.lastBeep = now
	}
	s.beepMu.Unlock()
	if limited {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "zu schnell, max. ein Beep pro " + s.BeepInterval.String()})
		return
	}
	err := s.Beep.Beep(req.Kind)
	switch {
	case errors.Is(err, device.ErrNotConnected):
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
	case err != nil:
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

const tennisMissing = `<!doctype html><meta charset="utf-8"><title>Tennis</title>
<body style="font-family:system-ui;background:#111827;color:#e5e7eb;padding:2rem">
<h1>Tennis ist nicht eingebaut</h1>
<p>Diese thingy.exe wurde ohne die Tennis-App gebaut. Bauen mit <code>./project tennis build</code>, danach <code>./project bridge build</code>.</p>`

// tennisHandler serves the embedded game under /tennis/, or a build hint if it was not built in.
func tennisHandler(app fs.FS) http.Handler {
	if _, err := fs.Stat(app, "index.html"); err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusNotFound)
			_, _ = io.WriteString(w, tennisMissing)
		})
	}
	return http.StripPrefix("/tennis", staticTypes(http.FileServerFS(app)))
}

// skiHandler serves the ski page under /ski/; a <base> tag keeps its relative asset paths under /tennis/ski/.
func skiHandler(app fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		page, err := fs.ReadFile(app, "ski/index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(bytes.Replace(page, []byte("<head>"), []byte(`<head><base href="/tennis/ski/">`), 1))
	})
}
