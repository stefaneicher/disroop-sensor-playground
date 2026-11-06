package thingy

// MotionConfigValue is the 0401 characteristic.
type MotionConfigValue struct {
	PedometerMS, TemperatureMS, CompassMS, MotionHz uint16
	WakeOnMotion                                    bool
}

// DefaultMotionConfig is the start configuration from docs/protocol.md.
func DefaultMotionConfig() MotionConfigValue {
	return MotionConfigValue{PedometerMS: 1000, TemperatureMS: 500, CompassMS: 100, MotionHz: 10, WakeOnMotion: true}
}

// Bytes encodes the configuration (9 bytes).
func (c MotionConfigValue) Bytes() []byte {
	b := make([]byte, 9)
	le.PutUint16(b[0:], c.PedometerMS)
	le.PutUint16(b[2:], c.TemperatureMS)
	le.PutUint16(b[4:], c.CompassMS)
	le.PutUint16(b[6:], c.MotionHz)
	if c.WakeOnMotion {
		b[8] = 1
	}
	return b
}

// EnvConfigValue is the 0206 characteristic.
type EnvConfigValue struct {
	TempMS, PressureMS, HumidityMS, ColorMS uint16
	GasMode                                 byte
	LED                                     [3]byte
}

// DecodeEnvConfig decodes the 12 byte environment configuration.
func DecodeEnvConfig(b []byte) (EnvConfigValue, error) {
	if err := need(b, 12); err != nil {
		return EnvConfigValue{}, err
	}
	return EnvConfigValue{
		TempMS: le.Uint16(b), PressureMS: le.Uint16(b[2:]),
		HumidityMS: le.Uint16(b[4:]), ColorMS: le.Uint16(b[6:]),
		GasMode: b[8], LED: [3]byte{b[9], b[10], b[11]},
	}, nil
}

// WithDemoIntervals keeps the LED calibration and sets 1 s intervals and gas mode 1 s.
func (c EnvConfigValue) WithDemoIntervals() EnvConfigValue {
	c.TempMS, c.PressureMS, c.HumidityMS, c.ColorMS = 1000, 1000, 1000, 1000
	c.GasMode = 1
	return c
}

// Bytes encodes the configuration (12 bytes).
func (c EnvConfigValue) Bytes() []byte {
	b := make([]byte, 12)
	le.PutUint16(b[0:], c.TempMS)
	le.PutUint16(b[2:], c.PressureMS)
	le.PutUint16(b[4:], c.HumidityMS)
	le.PutUint16(b[6:], c.ColorMS)
	b[8] = c.GasMode
	copy(b[9:], c.LED[:])
	return b
}

// Speaker and microphone modes of the 0501 characteristic.
const (
	SpeakerModeFrequency byte = 1
	MicModeADPCM         byte = 1
)

// SoundConfig encodes the 0501 characteristic.
func SoundConfig(speakerMode, micMode byte) []byte { return []byte{speakerMode, micMode} }

// SpeakerTone encodes a tone for the speaker in frequency mode. Volume is clamped to 0..100.
func SpeakerTone(hz, durationMS uint16, volume int) []byte {
	b := make([]byte, 5)
	le.PutUint16(b[0:], hz)
	le.PutUint16(b[2:], durationMS)
	b[4] = byte(max(0, min(100, volume)))
	return b
}

// LEDConstant encodes a constant LED color.
func LEDConstant(r, g, b byte) []byte { return []byte{1, r, g, b} }

// LEDOff switches the LED off.
func LEDOff() []byte { return []byte{0} }

// AndroidAppRecord builds a single record NDEF message with an Android Application Record.
func AndroidAppRecord(pkg string) []byte {
	const recordType = "android.com:pkg"
	const header = 0x80 | 0x40 | 0x10 | 0x04 // MB | ME | SR | TNF external
	msg := []byte{header, byte(len(recordType)), byte(len(pkg))}
	msg = append(msg, recordType...)
	return append(msg, pkg...)
}
