package relay

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/coder/websocket"
)

func dial(t *testing.T, ctx context.Context, srv *httptest.Server, path string) *websocket.Conn {
	t.Helper()
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+path, nil)
	if err != nil {
		t.Fatalf("dial %s: %v", path, err)
	}
	return c
}

func read(t *testing.T, ctx context.Context, c *websocket.Conn) Message {
	t.Helper()
	_, b, err := c.Read(ctx)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var m Message
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("json %s: %v", b, err)
	}
	return m
}

func TestEndToEnd(t *testing.T) {
	h := NewHub()
	srv := httptest.NewServer(Handler(h, nil))
	defer srv.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	screen := dial(t, ctx, srv, "/ws/screen")
	defer screen.CloseNow()
	room := read(t, ctx, screen)
	if room.Type != "room" {
		t.Fatalf("room %+v", room)
	}

	pad := dial(t, ctx, srv, "/ws/pad?room="+strings.ToLower(room.Room)+"&name=Mia")
	defer pad.CloseNow()
	if w := read(t, ctx, pad); w.Type != "welcome" || w.Name != "Mia" {
		t.Fatalf("welcome %+v", w)
	}
	if j := read(t, ctx, screen); j.Type != "join" || j.Name != "Mia" {
		t.Fatalf("join %+v", j)
	}

	frame := `{"type":"frame","f":{"t":5,"q":[1,0,0,0],"gyro":[0,0,0],"accel":[0,0,1],"button":true}}`
	if err := pad.Write(ctx, websocket.MessageText, []byte(frame)); err != nil {
		t.Fatal(err)
	}
	if f := read(t, ctx, screen); f.Type != "frame" || f.Pad != 1 || !strings.Contains(string(f.F), `"button":true`) {
		t.Fatalf("frame %+v", f)
	}

	if err := screen.Write(ctx, websocket.MessageText, []byte(`{"type":"feedback","kind":"hit"}`)); err != nil {
		t.Fatal(err)
	}
	if fb := read(t, ctx, pad); fb.Type != "feedback" || fb.Kind != "hit" {
		t.Fatalf("feedback %+v", fb)
	}

	_ = pad.Close(websocket.StatusNormalClosure, "bye")
	if l := read(t, ctx, screen); l.Type != "leave" || l.Pad != 1 {
		t.Fatalf("leave %+v", l)
	}

	_ = screen.Close(websocket.StatusNormalClosure, "bye")
	deadline := time.Now().Add(2 * time.Second)
	for h.Stats().Rooms != 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if h.Stats().Rooms != 0 {
		t.Fatal("room not closed with its screen")
	}
}

func TestPadUnknownRoomGetsError(t *testing.T) {
	srv := httptest.NewServer(Handler(NewHub(), nil))
	defer srv.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pad := dial(t, ctx, srv, "/ws/pad?room=QQQQ")
	defer pad.CloseNow()
	if m := read(t, ctx, pad); m.Type != "error" || m.Text != ErrNoRoom.Error() {
		t.Fatalf("got %+v", m)
	}
}

func TestHTTPEndpointsAndStatic(t *testing.T) {
	files := http.FileServer(http.FS(fstest.MapFS{"games/pad/index.html": {Data: []byte("pad")}}))
	srv := httptest.NewServer(Handler(NewHub(), files))
	defer srv.Close()
	for path, want := range map[string]string{
		"/healthz":              "ok",
		"/api/status":           `"rooms":0`,
		"/api/relay":            `"relay":true`,
		"/games/pad/index.html": "pad",
	} {
		res, err := http.Get(srv.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		b, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 || !strings.Contains(string(b), want) {
			t.Errorf("%s: %d %q", path, res.StatusCode, b)
		}
	}
}
