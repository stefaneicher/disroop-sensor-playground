package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// stream replays the recent log lines, then sends `event: telemetry` (throttled to MinInterval) and `event: log` as Server-Sent Events.
func (s *server) stream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no")

	changes, cancelChanges := s.Store.Subscribe()
	defer cancelChanges()
	backlog, logs, cancelLogs := s.Logs.SubscribeWithRecent()
	defer cancelLogs()
	keepAlive := time.NewTicker(s.KeepAlive)
	defer keepAlive.Stop()

	var last time.Time
	var pending <-chan time.Time
	sendTelemetry := func() error {
		last, pending = time.Now(), nil
		return writeEvent(w, flusher, "telemetry", s.Store.Snapshot())
	}
	if err := sendTelemetry(); err != nil {
		return
	}
	for _, msg := range backlog {
		if err := writeEvent(w, flusher, "log", map[string]string{"msg": msg}); err != nil {
			return
		}
	}
	for {
		var err error
		select {
		case <-r.Context().Done():
			return
		case <-changes:
			if wait := s.MinInterval - time.Since(last); wait > 0 {
				if pending == nil {
					pending = time.After(wait)
				}
				continue
			}
			err = sendTelemetry()
		case <-pending:
			err = sendTelemetry()
		case msg := <-logs:
			err = writeEvent(w, flusher, "log", map[string]string{"msg": msg})
		case <-keepAlive.C:
			_, err = fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		}
		if err != nil {
			return
		}
	}
}

func writeEvent(w http.ResponseWriter, f http.Flusher, name string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", name, data); err != nil {
		return err
	}
	f.Flush()
	return nil
}
