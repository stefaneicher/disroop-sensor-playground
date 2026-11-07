package sim

import (
	"bytes"
	"context"
	"math"
	"testing"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/thingy"
)

// record subscribes to c and collects every payload (Step runs synchronously, no locking needed).
func record(t *testing.T, d *Device, c thingy.Char) *[][]byte {
	t.Helper()
	var got [][]byte
	if err := d.Subscribe(c, func(b []byte) { got = append(got, b) }); err != nil {
		t.Fatal(err)
	}
	return &got
}

func TestSimulatorEmitsDecodableRawMotion(t *testing.T) {
	d := Start(Options{Manual: true})
	defer d.Close()
	got := record(t, d, thingy.RawMotionChar)
	d.Step()
	if len(*got) != 1 {
		t.Fatalf("%d raw motion notifications after one step, want 1", len(*got))
	}
	raw, err := thingy.DecodeRawMotion((*got)[0])
	if err != nil {
		t.Fatal(err)
	}
	a := raw.Accel
	if g := math.Sqrt(a.X*a.X + a.Y*a.Y + a.Z*a.Z); g < 0.95 || g > 1.05 {
		t.Fatalf("accel magnitude %v, want ≈1 g", g)
	}
}

func TestSimulatorEmitsEnvironmentImmediatelyThenEverySecond(t *testing.T) {
	d := Start(Options{Manual: true}) // Tick 100 ms
	defer d.Close()
	temps := record(t, d, thingy.TemperatureChar)
	mic := record(t, d, thingy.MicrophoneChar)
	for range 21 { // simulated 0 … 2.0 s
		d.Step()
	}
	if len(*temps) != 3 {
		t.Fatalf("%d temperature notifications in 2 s, want 3 (t=0, 1, 2 s)", len(*temps))
	}
	if v, _ := thingy.DecodeTemperature((*temps)[0]); v < 20 || v > 27 {
		t.Errorf("temperature %v", v)
	}
	if len(*mic) != 21 {
		t.Fatalf("%d mic frames, want one per tick", len(*mic))
	}
	s, _ := thingy.DecodeADPCMFrame((*mic)[0])
	if v := thingy.LevelDBFS(s); v < -60 || v > -5 {
		t.Errorf("mic level %v dBFS", v)
	}
}

func TestSimulatorScheduleTapsAndButton(t *testing.T) {
	d := Start(Options{Manual: true, ButtonEvery: 3 * time.Second})
	defer d.Close()
	taps := record(t, d, thingy.TapChar)
	var presses int
	_ = d.Subscribe(thingy.ButtonChar, func(b []byte) {
		if b[0] == 1 {
			presses++
		}
	})
	for range 71 { // 0 … 7.0 s
		d.Step()
	}
	if len(*taps) != 1 {
		t.Errorf("%d taps in 7 s, want 1 (at 7 s, none at start)", len(*taps))
	}
	if presses != 2 {
		t.Errorf("%d button presses in 7 s, want 2 (3 s, 6 s)", presses)
	}
}

func TestSimulatorBatteryNotifiesOnChangeOnly(t *testing.T) {
	d := Start(Options{Manual: true, Tick: time.Second, Battery: func(e time.Duration) int { return 50 + int(e/time.Minute) }})
	defer d.Close()
	got := record(t, d, thingy.BatteryChar)
	if v, _ := d.Read(thingy.BatteryChar); v[0] != 50 {
		t.Fatalf("initial read %d, want 50", v[0])
	}
	for range 181 { // 0 … 3 min
		d.Step()
	}
	if len(*got) != 3 || (*got)[0][0] != 51 || (*got)[2][0] != 53 {
		t.Fatalf("notifications %v, want 51, 52, 53", *got)
	}
	if v, _ := d.Read(thingy.BatteryChar); v[0] != 53 {
		t.Fatalf("read after 3 min %d, want 53", v[0])
	}
}

func TestChargeCycleRisesThenFalls(t *testing.T) {
	for _, c := range []struct {
		min  int
		want int
	}{{0, 60}, {5, 65}, {10, 70}, {15, 65}, {19, 61}, {20, 60}} {
		if got := ChargeCycle(time.Duration(c.min) * time.Minute); got != c.want {
			t.Errorf("minute %d: %d %%, want %d", c.min, got, c.want)
		}
	}
}

func TestSimulatorStoresWritesAndClosed(t *testing.T) {
	c := NewConnector(Options{})
	dev, err := c.Connect(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := dev.Read(thingy.NFCChar); !bytes.Equal(got, DefaultNFC) {
		t.Fatalf("nfc %X", got)
	}
	aar := thingy.AndroidAppRecord(thingy.AppPackage)
	if err := dev.Write(thingy.NFCChar, aar); err != nil {
		t.Fatal(err)
	}
	if got, _ := dev.Read(thingy.NFCChar); !bytes.Equal(got, aar) {
		t.Fatalf("nfc after write %X", got)
	}
	_ = dev.Close()
	select {
	case <-dev.Done():
	default:
		t.Fatal("Done must be closed")
	}
	if err := dev.Write(thingy.LEDChar, []byte{0}); err == nil {
		t.Fatal("write after close must fail")
	}
}
