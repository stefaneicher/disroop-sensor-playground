package sim

import (
	"bytes"
	"context"
	"math"
	"testing"
	"time"

	"github.com/stefaneicher/disroop-sensor-playground/hardware/thingy-bridge/internal/thingy"
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

func writeMotionHz(t *testing.T, d *Device, hz uint16) {
	t.Helper()
	cfg := thingy.DefaultMotionConfig()
	cfg.MotionHz = hz
	if err := d.Write(thingy.MotionConfigChar, cfg.Bytes()); err != nil {
		t.Fatal(err)
	}
}

func TestSimulatorFollowsTheMotionFrequency(t *testing.T) {
	d := Start(Options{Manual: true})
	defer d.Close()
	writeMotionHz(t, d, 100)
	if p := d.Period(); p != 10*time.Millisecond {
		t.Fatalf("period %v at 100 Hz, want 10 ms", p)
	}
	temps := record(t, d, thingy.TemperatureChar)
	raw := record(t, d, thingy.RawMotionChar)
	for range 101 { // simulated 0 … 1.00 s
		d.Step()
	}
	if len(*raw) != 101 || len(*temps) != 2 {
		t.Fatalf("%d raw motion, %d temperature notifications in 1 s at 100 Hz, want 101 and 2", len(*raw), len(*temps))
	}
	writeMotionHz(t, d, 1000)
	if p := d.Period(); p != 5*time.Millisecond {
		t.Fatalf("period %v at 1000 Hz, want clamp to 200 Hz", p)
	}
}

func TestConnectorDevicesFollowTheMotionFrequency(t *testing.T) {
	dev, err := NewConnector(Options{Manual: true}).Connect(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	d := dev.(*Device)
	defer d.Close()
	writeMotionHz(t, d, 100)
	if p := d.Period(); p != 10*time.Millisecond {
		t.Fatalf("period %v at 100 Hz, want 10 ms (the connector must not fix the tick)", p)
	}
}

func TestSimulatorWithExplicitTickIgnoresTheMotionFrequency(t *testing.T) {
	d := Start(Options{Manual: true, Tick: time.Second})
	defer d.Close()
	writeMotionHz(t, d, 100)
	if p := d.Period(); p != time.Second {
		t.Fatalf("period %v, want the fixed 1 s tick", p)
	}
}

// swing is one detected gyro spike above 350 °/s about the vertical axis (Z).
type swing struct{ peak, yawChange float64 }

func TestSimulatorSwingsAlternateForehandAndBackhandWithMatchingQuaternion(t *testing.T) {
	d := Start(Options{Manual: true})
	defer d.Close()
	writeMotionHz(t, d, 100)
	var gyroZ, yaw []float64
	_ = d.Subscribe(thingy.RawMotionChar, func(b []byte) {
		r, _ := thingy.DecodeRawMotion(b)
		gyroZ = append(gyroZ, r.Gyro.Z)
	})
	_ = d.Subscribe(thingy.QuaternionChar, func(b []byte) {
		q, _ := thingy.DecodeQuaternion(b)
		if n := math.Sqrt(q.W*q.W + q.X*q.X + q.Y*q.Y + q.Z*q.Z); math.Abs(n-1) > 1e-3 {
			t.Fatalf("quaternion not normalized: %v", n)
		}
		yaw = append(yaw, math.Atan2(2*(q.W*q.Z+q.X*q.Y), 1-2*(q.Y*q.Y+q.Z*q.Z))*180/math.Pi)
	})
	for range 1000 { // 10 s
		d.Step()
	}
	var swings []swing
	in := false
	start := 0
	for i, g := range gyroZ {
		switch {
		case !in && math.Abs(g) > 350:
			in, start = true, i
			swings = append(swings, swing{})
		case in && math.Abs(g) < 200:
			in = false
			dy := math.Mod(yaw[i]-yaw[start-1]+540, 360) - 180
			swings[len(swings)-1].yawChange = dy
		}
		if in && math.Abs(g) > math.Abs(swings[len(swings)-1].peak) {
			swings[len(swings)-1].peak = g
		}
	}
	if len(swings) < 3 {
		t.Fatalf("%d swings in 10 s, want ≥ 3", len(swings))
	}
	for i, s := range swings[:3] {
		if math.Abs(s.peak) < 600 || math.Abs(s.peak) > 1000 {
			t.Errorf("swing %d peak %.0f °/s, want 600..1000", i, s.peak)
		}
		if i > 0 && math.Signbit(s.peak) == math.Signbit(swings[i-1].peak) {
			t.Errorf("swing %d has the same direction as the previous one", i)
		}
		if math.Signbit(s.yawChange) != math.Signbit(s.peak) || math.Abs(s.yawChange) < 60 {
			t.Errorf("swing %d: quaternion yaw change %.0f° does not match gyro peak %.0f °/s", i, s.yawChange, s.peak)
		}
	}
}
