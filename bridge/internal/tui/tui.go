// Package tui is the terminal live view (ANSI redraw in place, German labels).
package tui

import (
	"context"
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"github.com/stefaneicher/disroop-thingy-arcade/bridge/internal/telemetry"
)

const none = "–"

func num(p *float64, decimals int, unit string) string {
	if p == nil {
		return none
	}
	s := fmt.Sprintf("%.*f", decimals, *p)
	if unit == "" {
		return s
	}
	return s + " " + unit
}

func xyz(v *telemetry.XYZ, decimals int, unit string) string {
	if v == nil {
		return none
	}
	f := fmt.Sprintf("%%+6.%df", decimals)
	return fmt.Sprintf("x "+f+"  y "+f+"  z "+f+" %s", v.X, v.Y, v.Z, unit)
}

func levelBar(db *float64, width int) string {
	if db == nil {
		return none
	}
	filled := int(math.Round((*db + 100) / 100 * float64(width)))
	filled = max(0, min(width, filled))
	return fmt.Sprintf("%6.1f dBFS [%s%s]", *db, strings.Repeat("█", filled), strings.Repeat("·", width-filled))
}

var orientationNames = map[string]string{
	"portrait": "Hochformat", "landscape": "Querformat",
	"reverse_portrait": "Hochformat (gedreht)", "reverse_landscape": "Querformat (gedreht)",
}

func orientation(p *string) string {
	if p == nil {
		return none
	}
	if n, ok := orientationNames[*p]; ok {
		return n
	}
	return *p
}

func tapText(t *telemetry.Tap, now time.Time) string {
	if t == nil {
		return none
	}
	age := now.Sub(time.UnixMilli(t.TS)).Round(time.Second)
	return fmt.Sprintf("%s ×%d (vor %d s)", t.Direction, t.Count, int(age.Seconds()))
}

func songText(s telemetry.Song, notes int) string {
	if !s.Playing {
		return "gestoppt"
	}
	return fmt.Sprintf("läuft – Note %d/%d", s.NoteIndex+1, notes)
}

// batteryText shows the level with the estimated trend (a heuristic, see package battery).
func batteryText(d telemetry.Device) string {
	if d.BatteryPct == nil {
		return none
	}
	trend := map[string]string{"charging": "↑ lädt", "discharging": "↓ Akkubetrieb"}[d.BatteryTrend]
	if trend == "" {
		trend = "?"
	}
	return num(d.BatteryPct, 0, "%") + "  " + trend
}

func text(p *string) string {
	if p == nil {
		return none
	}
	return *p
}

func yesNo(b bool) string {
	if b {
		return "ja"
	}
	return "nein"
}

func button(p *bool) string {
	switch {
	case p == nil:
		return none
	case *p:
		return "gedrückt"
	default:
		return "losgelassen"
	}
}

func euler(e *telemetry.Euler) string {
	if e == nil {
		return none
	}
	return fmt.Sprintf("Roll %+6.1f°  Nick %+6.1f°  Gier %+6.1f°", e.Roll, e.Pitch, e.Yaw)
}

func color(c *telemetry.Color) string {
	if c == nil {
		return none
	}
	return fmt.Sprintf("R %.0f  G %.0f  B %.0f  Hell %.0f", c.R, c.G, c.B, c.Clear)
}

func led(c *telemetry.RGB) string {
	if c == nil {
		return none
	}
	return fmt.Sprintf("R %.0f  G %.0f  B %.0f", c.R, c.G, c.B)
}

func magnitude(v *telemetry.XYZ) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("   |a| %.2f g", math.Sqrt(v.X*v.X+v.Y*v.Y+v.Z*v.Z))
}

// Options configure the view.
type Options struct {
	SongNotes int    // number of notes in the song
	URL       string // dashboard address shown in the header
}

// Render returns the live view as plain text lines.
func Render(s telemetry.Snapshot, logs []string, opts Options, now time.Time) string {
	m, e := s.Motion, s.Environment
	row := func(label, value string) string { return fmt.Sprintf("  %-15s %s", label, value) }
	lines := []string{
		fmt.Sprintf("Disroop Thingy Arcade   Quelle: %s   Verbunden: %s   Web: %s", s.Device.Source, yesNo(s.Connected), opts.URL),
		"",
		row("Gerät", fmt.Sprintf("%s  %s  RSSI %s", text(s.Device.Name), text(s.Device.Address), num(s.Device.RSSI, 0, "dBm"))),
		row("Akku", batteryText(s.Device)),
		"",
		row("Beschleunigung", xyz(m.AccelG, 2, "g")+magnitude(m.AccelG)),
		row("Drehrate", xyz(m.GyroDPS, 1, "°/s")),
		row("Kompass", xyz(m.CompassUT, 1, "µT")),
		row("Kurs", num(m.HeadingDeg, 1, "")+"°"),
		row("Euler", euler(m.EulerDeg)),
		row("Lage", orientation(m.Orientation)),
		row("Tippen", tapText(m.Tap, now)),
		row("Schritte", num(m.Steps, 0, "")),
		"",
		row("Temperatur", num(e.TemperatureC, 1, "°C")),
		row("Feuchte", num(e.HumidityPct, 0, "%")),
		row("Luftdruck", num(e.PressureHPa, 1, "hPa")),
		row("eCO₂ / TVOC", num(e.ECO2PPM, 0, "ppm")+"  /  "+num(e.TVOCPPB, 0, "ppb")),
		row("Farbe", color(e.Color)),
		"",
		row("Lautstärke", levelBar(s.Sound.LevelDBFS, 30)),
		row("Taster", button(s.UI.ButtonPressed)),
		row("LED", led(s.UI.LED)),
		row("Lied", songText(s.Sound.Song, opts.SongNotes)),
		"",
		"  Meldungen:",
	}
	for _, l := range logs {
		lines = append(lines, "    "+l)
	}
	lines = append(lines, "", "  Strg+C beendet.")
	return strings.Join(lines, "\n")
}

// Frame turns the text into an in-place redraw: cursor home, clear each line end, clear below.
func Frame(text string) string {
	var b strings.Builder
	b.WriteString("\x1b[H")
	for _, l := range strings.Split(text, "\n") {
		b.WriteString(l)
		b.WriteString("\x1b[K\n")
	}
	b.WriteString("\x1b[J")
	return b.String()
}

// Run redraws the view on changes (at most every interval) until ctx ends.
func Run(ctx context.Context, w io.Writer, store *telemetry.Store, logs *telemetry.LogBus, opts Options, interval time.Duration) {
	enableVT()
	changes, cancel := store.Subscribe()
	defer cancel()
	fmt.Fprint(w, "\x1b[?25l\x1b[2J")
	defer fmt.Fprint(w, "\x1b[?25h\n")
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	draw := func() {
		recent := logs.Recent()
		fmt.Fprint(w, Frame(Render(store.Snapshot(), recent, opts, time.Now())))
	}
	draw()
	dirty := false
	for {
		select {
		case <-ctx.Done():
			return
		case <-changes:
			dirty = true
		case <-ticker.C:
			if dirty {
				draw()
				dirty = false
			}
		}
	}
}
