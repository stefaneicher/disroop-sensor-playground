package tui

import (
	"strings"
	"testing"
	"time"

	"github.com/stefaneicher/disroop-sensor-playground/hardware/thingy-bridge/internal/telemetry"
)

func TestNum(t *testing.T) {
	if got := num(nil, 1, "°C"); got != "–" {
		t.Errorf("nil: %q", got)
	}
	if got := num(telemetry.F(23.456), 1, "°C"); got != "23.5 °C" {
		t.Errorf("got %q", got)
	}
	if got := num(telemetry.F(41), 0, "%"); got != "41 %" {
		t.Errorf("got %q", got)
	}
}

func TestXYZ(t *testing.T) {
	if got := xyz(nil, 2, "g"); got != "–" {
		t.Errorf("nil: %q", got)
	}
	got := xyz(&telemetry.XYZ{X: 0.02, Y: -0.01, Z: 1}, 2, "g")
	if got != "x  +0.02  y  -0.01  z  +1.00 g" {
		t.Errorf("got %q", got)
	}
}

func TestLevelBar(t *testing.T) {
	tests := []struct {
		db   *float64
		want string
	}{
		{nil, "–"},
		{telemetry.F(-100), "-100.0 dBFS [··········]"},
		{telemetry.F(-30), " -30.0 dBFS [███████···]"},
		{telemetry.F(0), "   0.0 dBFS [██████████]"},
	}
	for _, tt := range tests {
		if got := levelBar(tt.db, 10); got != tt.want {
			t.Errorf("got %q want %q", got, tt.want)
		}
	}
}

func TestOrientationGerman(t *testing.T) {
	if got := orientation(telemetry.S("reverse_landscape")); got != "Querformat (gedreht)" {
		t.Errorf("got %q", got)
	}
	if got := orientation(nil); got != "–" {
		t.Errorf("got %q", got)
	}
}

func TestTapAge(t *testing.T) {
	now := time.UnixMilli(10_000)
	tap := &telemetry.Tap{Direction: "Z+", Count: 2, TS: 7_000}
	if got := tapText(tap, now); got != "Z+ ×2 (vor 3 s)" {
		t.Errorf("got %q", got)
	}
}

func TestSongText(t *testing.T) {
	if got := songText(telemetry.Song{Playing: true, NoteIndex: 2}, 24); got != "läuft – Note 3/24" {
		t.Errorf("got %q", got)
	}
	if got := songText(telemetry.Song{NoteIndex: -1}, 24); got != "gestoppt" {
		t.Errorf("got %q", got)
	}
}

func TestBatteryTextShowsTheTrend(t *testing.T) {
	for trend, want := range map[string]string{"charging": "66 %  ↑ lädt", "discharging": "66 %  ↓ Akkubetrieb", "unknown": "66 %  ?"} {
		if got := batteryText(telemetry.Device{BatteryPct: telemetry.F(66), BatteryTrend: trend}); got != want {
			t.Errorf("%s: got %q, want %q", trend, got, want)
		}
	}
	if got := batteryText(telemetry.Device{BatteryTrend: "charging"}); got != none {
		t.Errorf("no level: got %q", got)
	}
}

func TestRenderContainsAllValues(t *testing.T) {
	s := telemetry.New("ble")
	s.Connected = true
	s.Device = telemetry.Device{Name: telemetry.S("Thingy"), Address: telemetry.S("E3:58:08:1B:53:5F"), RSSI: telemetry.F(-43), BatteryPct: telemetry.F(87), Source: "ble"}
	s.Motion.AccelG = &telemetry.XYZ{Z: 1}
	s.Motion.HeadingDeg = telemetry.F(47)
	s.Environment.TemperatureC = telemetry.F(23.4)
	s.Environment.ECO2PPM, s.Environment.TVOCPPB = telemetry.F(612), telemetry.F(14)
	s.UI.ButtonPressed = telemetry.B(true)
	out := Render(s, []string{"Verbunden"}, Options{SongNotes: 24, URL: "http://localhost:8052"}, time.UnixMilli(0))
	for _, want := range []string{
		"http://localhost:8052", "E3:58:08:1B:53:5F", "-43 dBm", "87 %", "Beschleunigung", "+1.00 g", "47.0°", "23.4 °C",
		"612 ppm", "14 ppb", "gedrückt", "Verbunden", "Drehrate", "Kompass", "Luftdruck", "Feuchte", "Farbe", "Lautstärke", "Lied",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q in\n%s", want, out)
		}
	}
}

func TestFrameRedrawsInPlace(t *testing.T) {
	got := Frame("a\nb")
	if got != "\x1b[Ha\x1b[K\nb\x1b[K\n\x1b[J" {
		t.Errorf("got %q", got)
	}
}
