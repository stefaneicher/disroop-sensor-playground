package thingy

import (
	"math"
	"slices"
	"testing"
)

func TestDecodeADPCMFrame(t *testing.T) {
	// predictor 0, step index 0 (step 7); nibble 7 → +11 (index 8, step 16); nibble 0 → +2.
	got, err := DecodeADPCMFrame([]byte{0x00, 0x00, 0x00, 0x07})
	if err != nil {
		t.Fatal(err)
	}
	if want := []int16{11, 13}; !slices.Equal(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
}

func TestDecodeADPCMFrameNegativeAndClamp(t *testing.T) {
	// predictor 32767 index 88: positive nibble must clamp at 32767, then nibble 0xF goes down.
	got, err := DecodeADPCMFrame([]byte{0xFF, 0x7F, 88, 0xF7})
	if err != nil {
		t.Fatal(err)
	}
	if got[0] != 32767 {
		t.Fatalf("first sample %d, want clamp 32767", got[0])
	}
	if got[1] >= got[0] {
		t.Fatalf("second sample %d must decrease", got[1])
	}
}

func TestDecodeADPCMFrameShort(t *testing.T) {
	if _, err := DecodeADPCMFrame([]byte{1, 2}); err == nil {
		t.Fatal("want error")
	}
}

func TestLevelDBFS(t *testing.T) {
	tests := []struct {
		name    string
		samples []int16
		want    float64
	}{
		{"silence", []int16{0, 0, 0}, -100},
		{"empty", nil, -100},
		{"full scale", []int16{32767, -32767}, 20 * math.Log10(32767.0/32768)},
		{"half scale", []int16{16384, -16384}, 20 * math.Log10(0.5)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LevelDBFS(tt.samples); math.Abs(got-tt.want) > 1e-6 {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}

func TestLevelMeterEMA(t *testing.T) {
	m := NewLevelMeter(0.3)
	if got := m.Add(-40); got != -40 {
		t.Fatalf("first value must be taken as is, got %v", got)
	}
	if got := m.Add(-20); math.Abs(got-(-34)) > 1e-9 {
		t.Fatalf("got %v want -34", got)
	}
}

func TestADPCMRoundTripKeepsLevel(t *testing.T) {
	samples := make([]int16, 256)
	for i := range samples {
		samples[i] = int16(8000 * math.Sin(2*math.Pi*float64(i)/32))
	}
	frame := EncodeADPCMFrame(samples)
	if len(frame) != 3+128 {
		t.Fatalf("frame length %d", len(frame))
	}
	decoded, err := DecodeADPCMFrame(frame)
	if err != nil {
		t.Fatal(err)
	}
	if want, got := LevelDBFS(samples), LevelDBFS(decoded); math.Abs(want-got) > 1 {
		t.Fatalf("level %v after round trip, want %v", got, want)
	}
}
