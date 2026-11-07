package server

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"testing/fstest"
	"time"

	"github.com/coder/websocket"

	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/motion"
	"github.com/stefaneicher/thingy52-live/bridge/internal/telemetry"
)

type fakeBeep struct {
	mu    sync.Mutex
	kinds []string
	err   error
}

func (f *fakeBeep) Beep(kind string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.kinds = append(f.kinds, kind)
	return f.err
}

func (f *fakeBeep) list() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.kinds...)
}

type gameFixture struct {
	srv  *httptest.Server
	hub  *motion.Hub
	beep *fakeBeep
}

func newGameFixture(t *testing.T, cfg Config) *gameFixture {
	t.Helper()
	f := &gameFixture{hub: motion.NewHub(time.Now), beep: &fakeBeep{}}
	cfg.Store = telemetry.NewStore(telemetry.New("sim"), time.Now)
	cfg.Logs = telemetry.NewLogBus(10)
	cfg.Static = fstest.MapFS{"index.html": {Data: []byte("dashboard")}}
	cfg.Motion = f.hub
	if cfg.Beep == nil {
		cfg.Beep = f.beep
	}
	f.srv = httptest.NewServer(New(cfg))
	t.Cleanup(f.srv.Close)
	return f
}

func dialMotion(t *testing.T, base string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(base, "http")+"/api/motion", nil)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestMotionWebSocketStreamsFramesAndTracksSubscribers(t *testing.T) {
	f := newGameFixture(t, Config{})
	var mu sync.Mutex
	var active []bool
	f.hub.OnActive = func(on bool) { mu.Lock(); active = append(active, on); mu.Unlock() }

	c := dialMotion(t, f.srv.URL)
	deadline := time.Now().Add(5 * time.Second)
	for !f.hub.Active() && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	f.hub.Button(true)
	f.hub.Raw([3]float64{0, 0, 1}, [3]float64{500, 0, 0})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var last motion.Frame
	for range 2 {
		typ, data, err := c.Read(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if typ != websocket.MessageText {
			t.Fatalf("message type %v", typ)
		}
		if err := json.Unmarshal(data, &last); err != nil {
			t.Fatal(err)
		}
	}
	if !last.Button || last.Gyro[0] != 500 || last.Accel[2] != 1 {
		t.Fatalf("frame %+v", last)
	}
	_ = c.Close(websocket.StatusNormalClosure, "")
	for f.hub.Active() && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(active) != 2 || !active[0] || active[1] {
		t.Fatalf("OnActive %v, want [true false]", active)
	}
}

func TestMotionWithoutUpgradeIsRejected(t *testing.T) {
	f := newGameFixture(t, Config{})
	res, err := http.Get(f.srv.URL + "/api/motion")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusUpgradeRequired && res.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", res.StatusCode)
	}
}

func postBeep(t *testing.T, base, body string) int {
	t.Helper()
	res, err := http.Post(base+"/api/beep", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	return res.StatusCode
}

func TestBeepCallsTheDeviceAndIsRateLimited(t *testing.T) {
	f := newGameFixture(t, Config{BeepInterval: time.Hour})
	if got := postBeep(t, f.srv.URL, `{"kind":"point"}`); got != http.StatusNoContent {
		t.Fatalf("first beep %d", got)
	}
	if got := postBeep(t, f.srv.URL, `{"kind":"hit"}`); got != http.StatusTooManyRequests {
		t.Fatalf("second beep %d, want 429", got)
	}
	if k := f.beep.list(); len(k) != 1 || k[0] != "point" {
		t.Fatalf("beeps %v", k)
	}
}

func TestBeepDefaultsToHitAndValidates(t *testing.T) {
	f := newGameFixture(t, Config{BeepInterval: time.Nanosecond})
	for _, c := range []struct {
		body string
		want int
	}{{``, 204}, {`{}`, 204}, {`{"kind":"miss"}`, 204}, {`{"kind":"boom"}`, 400}, {`nope`, 400}} {
		if got := postBeep(t, f.srv.URL, c.body); got != c.want {
			t.Errorf("body %q: %d, want %d", c.body, got, c.want)
		}
		time.Sleep(time.Millisecond)
	}
	if k := f.beep.list(); len(k) != 3 || k[0] != "hit" {
		t.Fatalf("beeps %v", k)
	}
}

func TestBeepReportsADisconnectedThingy(t *testing.T) {
	f := newGameFixture(t, Config{Beep: &fakeBeep{err: device.ErrNotConnected}})
	if got := postBeep(t, f.srv.URL, `{}`); got != http.StatusServiceUnavailable {
		t.Fatalf("status %d", got)
	}
	f = newGameFixture(t, Config{Beep: &fakeBeep{err: errors.New("gatt")}})
	if got := postBeep(t, f.srv.URL, `{}`); got != http.StatusBadGateway {
		t.Fatalf("status %d", got)
	}
}

func get(t *testing.T, url string) (int, string, string) {
	t.Helper()
	client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := client.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	loc := res.Header.Get("Location")
	if loc == "" {
		loc = res.Header.Get("Content-Type")
	}
	return res.StatusCode, string(body), loc
}

func TestTennisAppIsServedUnderTennis(t *testing.T) {
	f := newGameFixture(t, Config{Tennis: fstest.MapFS{
		"index.html":                 {Data: []byte("<title>Thingy Tennis</title>")},
		"js/main.js":                 {Data: []byte("export {}")},
		"vendor/three/three.core.js": {Data: []byte("export {}")},
	}})
	if code, _, loc := get(t, f.srv.URL+"/tennis"); code != http.StatusMovedPermanently || loc != "/tennis/" {
		t.Fatalf("/tennis: %d %q", code, loc)
	}
	if code, body, _ := get(t, f.srv.URL+"/tennis/"); code != 200 || !strings.Contains(body, "Thingy Tennis") {
		t.Fatalf("/tennis/: %d %q", code, body)
	}
	for _, p := range []string{"/tennis/js/main.js", "/tennis/vendor/three/three.core.js"} {
		if code, _, ct := get(t, f.srv.URL+p); code != 200 || ct != "text/javascript; charset=utf-8" {
			t.Errorf("%s: %d %q", p, code, ct)
		}
	}
	if code, body, _ := get(t, f.srv.URL+"/"); code != 200 || body != "dashboard" {
		t.Fatalf("dashboard: %d %q", code, body)
	}
}

func TestTennisWithoutBuildExplainsHowToBuild(t *testing.T) {
	f := newGameFixture(t, Config{Tennis: fstest.MapFS{".keep": {Data: nil}}})
	code, body, _ := get(t, f.srv.URL+"/tennis/")
	if code != http.StatusNotFound || !strings.Contains(body, "./project tennis build") {
		t.Fatalf("%d %q", code, body)
	}
}
