// Package server is the HTTP API of docs/protocol.md §2 and serves the embedded dashboard.
package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"path"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/telemetry"
)

// SongControl starts and stops the song.
type SongControl interface {
	Start(volume int)
	Stop()
}

// LEDControl sets the LED color.
type LEDControl interface {
	LED(r, g, b uint8) error
}

// MicControl switches the microphone (sound level) on or off.
type MicControl interface {
	SetMic(on bool)
}

// Config holds the dependencies of the handler.
type Config struct {
	Store         *telemetry.Store
	Logs          *telemetry.LogBus
	Song          SongControl
	LED           LEDControl
	Mic           MicControl
	Static        fs.FS
	DefaultVolume int
	MinInterval   time.Duration // minimum time between telemetry events per client (default 100 ms)
	KeepAlive     time.Duration // SSE comment interval (default 15 s)
}

type server struct{ Config }

// New returns the HTTP handler.
func New(cfg Config) http.Handler {
	if cfg.MinInterval == 0 {
		cfg.MinInterval = 100 * time.Millisecond
	}
	if cfg.KeepAlive == 0 {
		cfg.KeepAlive = 15 * time.Second
	}
	s := &server{cfg}
	mux := http.NewServeMux()
	mux.Handle("GET /", staticTypes(http.FileServerFS(cfg.Static)))
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { fmt.Fprintln(w, "ok") })
	mux.HandleFunc("GET /api/state", s.state)
	mux.HandleFunc("GET /api/stream", s.stream)
	mux.HandleFunc("POST /api/song", s.song)
	mux.HandleFunc("POST /api/led", s.led)
	mux.HandleFunc("POST /api/mic", s.mic)
	notAllowed := func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "use POST"})
	}
	mux.HandleFunc("GET /api/song", notAllowed)
	mux.HandleFunc("GET /api/led", notAllowed)
	mux.HandleFunc("GET /api/mic", notAllowed)
	mux.HandleFunc("OPTIONS /api/", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	return cors(mux)
}

// staticTypes sets MIME types explicitly; on Windows the registry may map .js to text/plain.
func staticTypes(next http.Handler) http.Handler {
	types := map[string]string{
		".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
		".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
		".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json",
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if t, ok := types[path.Ext(r.URL.Path)]; ok {
			w.Header().Set("Content-Type", t)
		}
		next.ServeHTTP(w, r)
	})
}

// cors allows the dashboard dev server (another origin) to use the API.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Content-Type")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func badRequest(w http.ResponseWriter, msg string) {
	writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
}

func (s *server) state(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.Store.Snapshot())
}

type songRequest struct {
	Action string `json:"action"`
	Volume *int   `json:"volume"`
}

func (s *server) song(w http.ResponseWriter, r *http.Request) {
	var req songRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, "invalid JSON")
		return
	}
	volume := s.DefaultVolume
	if req.Volume != nil {
		volume = *req.Volume
	}
	if volume < 0 || volume > 100 {
		badRequest(w, "volume must be 0..100")
		return
	}
	switch req.Action {
	case "play":
		s.Song.Start(volume)
	case "stop":
		s.Song.Stop()
	default:
		badRequest(w, `action must be "play" or "stop"`)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"action": req.Action})
}

type ledRequest struct {
	R, G, B *int
}

func (s *server) led(w http.ResponseWriter, r *http.Request) {
	var req ledRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, "invalid JSON")
		return
	}
	rgb := []*int{req.R, req.G, req.B}
	for _, c := range rgb {
		if c == nil || *c < 0 || *c > 255 {
			badRequest(w, "r, g, b must be 0..255")
			return
		}
	}
	err := s.LED.LED(uint8(*req.R), uint8(*req.G), uint8(*req.B))
	switch {
	case errors.Is(err, device.ErrNotConnected):
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
	case err != nil:
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

type micRequest struct {
	Enabled *bool `json:"enabled"`
}

func (s *server) mic(w http.ResponseWriter, r *http.Request) {
	var req micRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Enabled == nil {
		badRequest(w, `body must be {"enabled":true|false}`)
		return
	}
	s.Mic.SetMic(*req.Enabled)
	writeJSON(w, http.StatusAccepted, map[string]bool{"enabled": *req.Enabled})
}
