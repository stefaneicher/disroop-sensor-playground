package thingy

import (
	"errors"
	"math"
	"testing"
)

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestDecodeTemperature(t *testing.T) {
	tests := []struct {
		name string
		in   []byte
		want float64
	}{
		{"positive", []byte{23, 40}, 23.40},
		{"zero", []byte{0, 0}, 0},
		{"negative int", []byte{0xFB, 50}, -5 + 0.50},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := DecodeTemperature(tt.in)
			if err != nil || !near(got, tt.want) {
				t.Fatalf("got %v, %v want %v", got, err, tt.want)
			}
		})
	}
}

func TestDecodePressure(t *testing.T) {
	got, err := DecodePressure([]byte{0xC3, 0x03, 0x00, 0x00, 20}) // 963 + 0.20
	if err != nil || !near(got, 963.20) {
		t.Fatalf("got %v, %v", got, err)
	}
}

func TestDecodeHumidity(t *testing.T) {
	got, err := DecodeHumidity([]byte{41})
	if err != nil || got != 41 {
		t.Fatalf("got %v, %v", got, err)
	}
}

func TestDecodeGas(t *testing.T) {
	got, err := DecodeGas([]byte{0x64, 0x02, 0x0E, 0x00})
	if err != nil || got != (Gas{ECO2: 612, TVOC: 14}) {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestDecodeColor(t *testing.T) {
	got, err := DecodeColor([]byte{180, 0, 160, 0, 120, 0, 0x90, 0x01})
	if err != nil || got != (Color{R: 180, G: 160, B: 120, Clear: 400}) {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestDecodeRawMotion(t *testing.T) {
	in := []byte{
		0x00, 0x04, 0x00, 0xFE, 0x00, 0x00, // accel 1024, -512, 0
		0x40, 0x00, 0xE0, 0xFF, 0x10, 0x00, // gyro 64, -32, 16
		0x50, 0x01, 0x80, 0xFF, 0x00, 0x00, // compass 336, -128, 0
	}
	got, err := DecodeRawMotion(in)
	if err != nil {
		t.Fatal(err)
	}
	want := RawMotion{
		Accel:   XYZ{1, -0.5, 0},
		Gyro:    XYZ{2, -1, 0.5},
		Compass: XYZ{21, -8, 0},
	}
	if got != want {
		t.Fatalf("got %+v want %+v", got, want)
	}
}

func TestDecodeEuler(t *testing.T) {
	in := []byte{0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x80, 0x2F, 0x00}
	got, err := DecodeEuler(in)
	if err != nil || got != (Euler{Roll: 1, Pitch: -2, Yaw: 47.5}) {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestDecodeHeading(t *testing.T) {
	got, err := DecodeHeading([]byte{0x00, 0x00, 0x2F, 0x00})
	if err != nil || got != 47 {
		t.Fatalf("got %v, %v", got, err)
	}
}

func TestDecodeQuaternion(t *testing.T) {
	in := []byte{
		0x00, 0x00, 0x00, 0x40, // w = 2^30 → 1
		0x00, 0x00, 0x00, 0xE0, // x = -2^29 → -0.5
		0, 0, 0, 0,
		0x00, 0x00, 0x00, 0x10, // z = 2^28 → 0.25
	}
	got, err := DecodeQuaternion(in)
	if err != nil || got != (Quaternion{W: 1, X: -0.5, Y: 0, Z: 0.25}) {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestDecodeTap(t *testing.T) {
	tests := []struct {
		in   []byte
		want Tap
	}{
		{[]byte{1, 1}, Tap{"X+", 1}},
		{[]byte{2, 2}, Tap{"X-", 2}},
		{[]byte{3, 1}, Tap{"Y+", 1}},
		{[]byte{4, 1}, Tap{"Y-", 1}},
		{[]byte{5, 3}, Tap{"Z+", 3}},
		{[]byte{6, 1}, Tap{"Z-", 1}},
	}
	for _, tt := range tests {
		got, err := DecodeTap(tt.in)
		if err != nil || got != tt.want {
			t.Errorf("%v: got %+v, %v", tt.in, got, err)
		}
	}
	if _, err := DecodeTap([]byte{9, 1}); err == nil {
		t.Error("unknown direction must fail")
	}
}

func TestDecodeOrientation(t *testing.T) {
	want := []string{"portrait", "landscape", "reverse_portrait", "reverse_landscape"}
	for i, w := range want {
		got, err := DecodeOrientation([]byte{byte(i)})
		if err != nil || got != w {
			t.Errorf("%d: got %q, %v", i, got, err)
		}
	}
	if _, err := DecodeOrientation([]byte{4}); err == nil {
		t.Error("unknown orientation must fail")
	}
}

func TestDecodePedometer(t *testing.T) {
	got, err := DecodePedometer([]byte{12, 0, 0, 0, 0xE8, 0x03, 0, 0})
	if err != nil || got != (Pedometer{Steps: 12, TimeMS: 1000}) {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestDecodeButton(t *testing.T) {
	for in, want := range map[byte]bool{0: false, 1: true} {
		got, err := DecodeButton([]byte{in})
		if err != nil || got != want {
			t.Errorf("%d: got %v, %v", in, got, err)
		}
	}
}

func TestDecodeBattery(t *testing.T) {
	got, err := DecodeBattery([]byte{87})
	if err != nil || got != 87 {
		t.Fatalf("got %v, %v", got, err)
	}
}

func TestDecodersRejectShortPayloads(t *testing.T) {
	decoders := map[string]func([]byte) error{
		"temperature": func(b []byte) error { _, err := DecodeTemperature(b); return err },
		"pressure":    func(b []byte) error { _, err := DecodePressure(b); return err },
		"humidity":    func(b []byte) error { _, err := DecodeHumidity(b); return err },
		"gas":         func(b []byte) error { _, err := DecodeGas(b); return err },
		"color":       func(b []byte) error { _, err := DecodeColor(b); return err },
		"raw":         func(b []byte) error { _, err := DecodeRawMotion(b); return err },
		"euler":       func(b []byte) error { _, err := DecodeEuler(b); return err },
		"heading":     func(b []byte) error { _, err := DecodeHeading(b); return err },
		"quaternion":  func(b []byte) error { _, err := DecodeQuaternion(b); return err },
		"tap":         func(b []byte) error { _, err := DecodeTap(b); return err },
		"orientation": func(b []byte) error { _, err := DecodeOrientation(b); return err },
		"pedometer":   func(b []byte) error { _, err := DecodePedometer(b); return err },
		"button":      func(b []byte) error { _, err := DecodeButton(b); return err },
		"battery":     func(b []byte) error { _, err := DecodeBattery(b); return err },
		"envconfig":   func(b []byte) error { _, err := DecodeEnvConfig(b); return err },
	}
	for name, decode := range decoders {
		if err := decode(nil); !errors.Is(err, ErrShortPayload) {
			t.Errorf("%s: want ErrShortPayload, got %v", name, err)
		}
	}
}
