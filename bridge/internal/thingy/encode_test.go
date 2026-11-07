package thingy

import (
	"bytes"
	"testing"
)

func TestMotionConfigBytes(t *testing.T) {
	got := DefaultMotionConfig().Bytes()
	want := []byte{0xE8, 0x03, 0xF4, 0x01, 0x64, 0x00, 0x0A, 0x00, 0x01}
	if !bytes.Equal(got, want) {
		t.Fatalf("got % X want % X", got, want)
	}
}

func TestEnvConfigRoundTrip(t *testing.T) {
	read := []byte{0xD0, 0x07, 0xD0, 0x07, 0xD0, 0x07, 0xE8, 0x03, 2, 0x11, 0x22, 0x33}
	cfg, err := DecodeEnvConfig(read)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.LED != [3]byte{0x11, 0x22, 0x33} || cfg.GasMode != 2 || cfg.TempMS != 2000 {
		t.Fatalf("decoded %+v", cfg)
	}
	got := cfg.WithDemoIntervals().Bytes()
	want := []byte{0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 1, 0x11, 0x22, 0x33}
	if !bytes.Equal(got, want) {
		t.Fatalf("got % X want % X", got, want)
	}
}

func TestSoundConfig(t *testing.T) {
	if got := SoundConfig(SpeakerModeFrequency, MicModeADPCM); !bytes.Equal(got, []byte{1, 1}) {
		t.Fatalf("got % X", got)
	}
}

func TestSpeakerTone(t *testing.T) {
	got := SpeakerTone(440, 180, 100)
	want := []byte{0xB8, 0x01, 0xB4, 0x00, 100}
	if !bytes.Equal(got, want) {
		t.Fatalf("got % X want % X", got, want)
	}
}

func TestSpeakerToneClampsVolume(t *testing.T) {
	if got := SpeakerTone(440, 1, 150); got[4] != 100 {
		t.Fatalf("volume %d", got[4])
	}
	if got := SpeakerTone(440, 1, -3); got[4] != 0 {
		t.Fatalf("volume %d", got[4])
	}
}

func TestLEDEncoding(t *testing.T) {
	if got := LEDConstant(255, 16, 0); !bytes.Equal(got, []byte{1, 255, 16, 0}) {
		t.Fatalf("constant % X", got)
	}
	if got := LEDOff(); !bytes.Equal(got, []byte{0}) {
		t.Fatalf("off % X", got)
	}
}

func TestAndroidAppRecord(t *testing.T) {
	got := AndroidAppRecord("ch.disroop.sensorplayground")
	want := append([]byte{0xD4, 0x0F, 0x1B}, []byte("android.com:pkgch.disroop.sensorplayground")...)
	if !bytes.Equal(got, want) {
		t.Fatalf("got % X\nwant % X", got, want)
	}
	if len(got) != 45 {
		t.Fatalf("len %d, want 45", len(got))
	}
}
