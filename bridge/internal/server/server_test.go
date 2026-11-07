package server

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"testing/fstest"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/telemetry"
)

type fakeSong struct {
	mu      sync.Mutex
	started []int
	stopped int
}

func (f *fakeSong) Start(v int) { f.mu.Lock(); f.started = append(f.started, v); f.mu.Unlock() }
func (f *fakeSong) Stop()       { f.mu.Lock(); f.stopped++; f.mu.Unlock() }

type fakeLED struct {
	rgb [3]uint8
	err error
}

func (f *fakeLED) LED(r, g, b uint8) error { f.rgb = [3]uint8{r, g, b}; return f.err }

type fakeMic struct {
	mu  sync.Mutex
	set []bool
	err error
}

func (f *fakeMic) SetMic(on bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.set = append(f.set, on)
	return f.err
}

type fixture struct {
	srv   *httptest.Server
	store *telemetry.Store
	logs  *telemetry.LogBus
	song  *fakeSong
	led   *fakeLED
	mic   *fakeMic
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	f := &fixture{
		store: telemetry.NewStore(telemetry.New("sim"), time.Now),
		logs:  telemetry.NewLogBus(10),
		song:  &fakeSong{},
		led:   &fakeLED{},
		mic:   &fakeMic{},
	}
	h := New(Config{
		Store: f.store, Logs: f.logs, Song: f.song, LED: f.led, Mic: f.mic,
		Static: fstest.MapFS{
			"index.html": {Data: []byte("<h1>Thingy</h1>")},
			"js/app.js":  {Data: []byte("export {}")},
			"styles.css": {Data: []byte("body{}")},
		},
		DefaultVolume: 70,
		MinInterval:   100 * time.Millisecond,
	})
	f.srv = httptest.NewServer(h)
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fixture) post(t *testing.T, path, body string) *http.Response {
	t.Helper()
	res, err := http.Post(f.srv.URL+path, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	return res
}

func TestHealthz(t *testing.T) {
	f := newFixture(t)
	res, err := http.Get(f.srv.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != 200 || strings.TrimSpace(string(body)) != "ok" {
		t.Fatalf("%d %q", res.StatusCode, body)
	}
}

func TestIndexServesEmbeddedDashboard(t *testing.T) {
	f := newFixture(t)
	res, err := http.Get(f.srv.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != 200 || !strings.Contains(string(body), "Thingy") {
		t.Fatalf("%d %q", res.StatusCode, body)
	}
}

func TestStaticAssetsHaveExplicitMIMETypes(t *testing.T) {
	f := newFixture(t)
	for path, want := range map[string]string{
		"/js/app.js":  "text/javascript; charset=utf-8",
		"/styles.css": "text/css; charset=utf-8",
	} {
		res, err := http.Get(f.srv.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != 200 || res.Header.Get("Content-Type") != want {
			t.Errorf("%s: %d %q", path, res.StatusCode, res.Header.Get("Content-Type"))
		}
	}
}

func TestStateReturnsSnapshot(t *testing.T) {
	f := newFixture(t)
	f.store.Update(func(s *telemetry.Snapshot) { s.Environment.TemperatureC = telemetry.F(23.4) })
	res, err := http.Get(f.srv.URL + "/api/state")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if ct := res.Header.Get("Content-Type"); ct != "application/json" {
		t.Fatalf("content type %q", ct)
	}
	var s telemetry.Snapshot
	if err := json.NewDecoder(res.Body).Decode(&s); err != nil {
		t.Fatal(err)
	}
	if s.Device.Source != "sim" || *s.Environment.TemperatureC != 23.4 {
		t.Fatalf("snapshot %+v", s)
	}
}

type sseEvent struct{ name, data string }

// readEvents runs during() once connected and collects events until done(events) holds.
// It returns the events and how long the stream was read; the 10 s cap only guards against hangs.
func readEvents(t *testing.T, url string, during func(), done func([]sseEvent) bool) ([]sseEvent, time.Duration) {
	t.Helper()
	start := time.Now()
	res, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if ct := res.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("content type %q", ct)
	}
	events := make(chan sseEvent, 100)
	go func() {
		sc := bufio.NewScanner(res.Body)
		var ev sseEvent
		for sc.Scan() {
			line := sc.Text()
			switch {
			case strings.HasPrefix(line, "event: "):
				ev.name = strings.TrimPrefix(line, "event: ")
			case strings.HasPrefix(line, "data: "):
				ev.data = strings.TrimPrefix(line, "data: ")
			case line == "" && ev.name != "":
				events <- ev
				ev = sseEvent{}
			}
		}
		close(events)
	}()
	go during()
	var got []sseEvent
	timeout := time.After(10 * time.Second)
	for {
		select {
		case ev, ok := <-events:
			if !ok {
				t.Fatalf("stream closed early: %v", got)
			}
			got = append(got, ev)
			if done(got) {
				return got, time.Since(start)
			}
		case <-timeout:
			t.Fatalf("condition not reached within 10 s: %v", got)
		}
	}
}

func logMessages(events []sseEvent) []string {
	var logs []string
	for _, e := range events {
		if e.name == "log" {
			var m struct{ Msg string }
			_ = json.Unmarshal([]byte(e.data), &m)
			logs = append(logs, m.Msg)
		}
	}
	return logs
}

func count(events []sseEvent, name string) int {
	n := 0
	for _, e := range events {
		if e.name == name {
			n++
		}
	}
	return n
}

func TestStreamSendsThrottledTelemetryAndLogs(t *testing.T) {
	f := newFixture(t)
	const updates = 40
	steps := func(e sseEvent) float64 {
		var snap telemetry.Snapshot
		if e.name != "telemetry" || json.Unmarshal([]byte(e.data), &snap) != nil || snap.Motion.Steps == nil {
			return 0
		}
		return *snap.Motion.Steps
	}
	events, elapsed := readEvents(t, f.srv.URL+"/api/stream", func() {
		f.logs.Logf("hallo")
		for i := 1; i <= updates; i++ { // a burst of updates, the last one must arrive eventually
			v := float64(i)
			f.store.Update(func(s *telemetry.Snapshot) { s.Motion.Steps = &v })
			time.Sleep(5 * time.Millisecond)
		}
	}, func(got []sseEvent) bool {
		return steps(got[len(got)-1]) == updates && len(logMessages(got)) > 0
	})
	if events[0].name != "telemetry" {
		t.Fatalf("first event %+v, want the current snapshot", events[0])
	}
	n := count(events, "telemetry")
	// ≤ 10 Hz: initial event + one per started 100 ms of reading, +1 for the trailing flush.
	if limit := 2 + int(elapsed/(100*time.Millisecond)); n > limit || n >= updates {
		t.Fatalf("%d telemetry events in %v, want throttled to ≤ %d", n, elapsed, limit)
	}
	if logs := logMessages(events); len(logs) != 1 || logs[0] != "hallo" {
		t.Fatalf("logs %v", logs)
	}
}

func TestStreamReplaysRecentLogsToNewClients(t *testing.T) {
	f := newFixture(t)
	f.logs.Logf("eins")
	f.logs.Logf("zwei")
	events, _ := readEvents(t, f.srv.URL+"/api/stream", func() {}, func(got []sseEvent) bool { return len(logMessages(got)) == 2 })
	if logs := logMessages(events); strings.Join(logs, ",") != "eins,zwei" {
		t.Fatalf("replayed logs %v, want [eins zwei]", logs)
	}
}

func TestSongPlayAndStop(t *testing.T) {
	f := newFixture(t)
	if res := f.post(t, "/api/song", `{"action":"play","volume":40}`); res.StatusCode != http.StatusAccepted {
		t.Fatalf("play: %d", res.StatusCode)
	}
	if res := f.post(t, "/api/song", `{"action":"play"}`); res.StatusCode != http.StatusAccepted {
		t.Fatalf("play default volume: %d", res.StatusCode)
	}
	if res := f.post(t, "/api/song", `{"action":"stop"}`); res.StatusCode != http.StatusAccepted {
		t.Fatalf("stop: %d", res.StatusCode)
	}
	if len(f.song.started) != 2 || f.song.started[0] != 40 || f.song.started[1] != 70 || f.song.stopped != 1 {
		t.Fatalf("song %+v", f.song)
	}
}

func TestSongRejectsBadRequests(t *testing.T) {
	f := newFixture(t)
	for _, body := range []string{`{"action":"dance"}`, `{"action":"play","volume":101}`, `not json`} {
		if res := f.post(t, "/api/song", body); res.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: %d", body, res.StatusCode)
		}
	}
	res, _ := http.Get(f.srv.URL + "/api/song")
	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/song: %d", res.StatusCode)
	}
}

func TestLED(t *testing.T) {
	f := newFixture(t)
	if res := f.post(t, "/api/led", `{"r":255,"g":16,"b":0}`); res.StatusCode != http.StatusNoContent {
		t.Fatalf("led: %d", res.StatusCode)
	}
	if f.led.rgb != [3]uint8{255, 16, 0} {
		t.Fatalf("rgb %v", f.led.rgb)
	}
	for _, body := range []string{`{"r":256,"g":0,"b":0}`, `{"r":-1,"g":0,"b":0}`, `{"r":1}`} {
		if res := f.post(t, "/api/led", body); res.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: %d", body, res.StatusCode)
		}
	}
	f.led.err = device.ErrNotConnected
	if res := f.post(t, "/api/led", `{"r":1,"g":2,"b":3}`); res.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("not connected: %d", res.StatusCode)
	}
}

func TestCORSPreflight(t *testing.T) {
	f := newFixture(t)
	req, _ := http.NewRequest(http.MethodOptions, f.srv.URL+"/api/led", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusNoContent || res.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("%d %v", res.StatusCode, res.Header)
	}
}

func TestMicSwitch(t *testing.T) {
	f := newFixture(t)
	for _, body := range []string{`{"enabled":true}`, `{"enabled":false}`} {
		if res := f.post(t, "/api/mic", body); res.StatusCode != http.StatusAccepted {
			t.Fatalf("%s: %d", body, res.StatusCode)
		}
	}
	for _, body := range []string{`{"enabled":"yes"}`, `{}`, `not json`} {
		if res := f.post(t, "/api/mic", body); res.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: %d", body, res.StatusCode)
		}
	}
	if fmt.Sprint(f.mic.set) != "[true false]" {
		t.Fatalf("SetMic calls %v", f.mic.set)
	}
	res, _ := http.Get(f.srv.URL + "/api/mic")
	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/mic: %d", res.StatusCode)
	}
}

func TestMicRejectedWhileBlockedIs409(t *testing.T) {
	f := newFixture(t)
	f.mic.err = errors.New("Mikrofon ist im Spielmodus gesperrt (Bluetooth-Bandbreite)")
	res, err := http.Post(f.srv.URL+"/api/mic", "application/json", strings.NewReader(`{"enabled":true}`))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var body map[string]string
	_ = json.NewDecoder(res.Body).Decode(&body)
	if res.StatusCode != http.StatusConflict || body["error"] != f.mic.err.Error() {
		t.Fatalf("%d %v", res.StatusCode, body)
	}
}
