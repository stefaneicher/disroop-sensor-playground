package app

import (
	"fmt"
	"time"

	"github.com/stefaneicher/disroop-thingy-arcade/bridge/internal/telemetry"
	"github.com/stefaneicher/disroop-thingy-arcade/bridge/internal/thingy"
)

// Handle decodes one notification and applies it to the store.
func (s *Session) Handle(c thingy.Char, b []byte) {
	if err := s.apply(c, b); err != nil {
		s.mu.Lock()
		first := !s.decodeFailures[c.Name]
		if s.decodeFailures == nil {
			s.decodeFailures = map[string]bool{}
		}
		s.decodeFailures[c.Name] = true
		s.mu.Unlock()
		if first {
			s.logf("%s: %v (% X)", c.Name, err, b)
		}
	}
	s.refreshBatteryTrend()
}

func xyz(v thingy.XYZ) *telemetry.XYZ { return &telemetry.XYZ{X: v.X, Y: v.Y, Z: v.Z} }

func (s *Session) apply(c thingy.Char, b []byte) error {
	switch c {
	case thingy.TemperatureChar:
		v, err := thingy.DecodeTemperature(b)
		return s.set(err, func(t *telemetry.Snapshot) { t.Environment.TemperatureC = telemetry.F(v) })
	case thingy.PressureChar:
		v, err := thingy.DecodePressure(b)
		return s.set(err, func(t *telemetry.Snapshot) { t.Environment.PressureHPa = telemetry.F(v) })
	case thingy.HumidityChar:
		v, err := thingy.DecodeHumidity(b)
		return s.set(err, func(t *telemetry.Snapshot) { t.Environment.HumidityPct = telemetry.F(float64(v)) })
	case thingy.GasChar:
		v, err := thingy.DecodeGas(b)
		return s.set(err, func(t *telemetry.Snapshot) {
			t.Environment.ECO2PPM, t.Environment.TVOCPPB = telemetry.F(float64(v.ECO2)), telemetry.F(float64(v.TVOC))
		})
	case thingy.ColorChar:
		v, err := thingy.DecodeColor(b)
		return s.set(err, func(t *telemetry.Snapshot) {
			t.Environment.Color = &telemetry.Color{R: float64(v.R), G: float64(v.G), B: float64(v.B), Clear: float64(v.Clear)}
		})
	case thingy.RawMotionChar:
		v, err := thingy.DecodeRawMotion(b)
		if err == nil && s.Motion != nil {
			s.Motion.Raw([3]float64{v.Accel.X, v.Accel.Y, v.Accel.Z}, [3]float64{v.Gyro.X, v.Gyro.Y, v.Gyro.Z})
		}
		return s.set(err, func(t *telemetry.Snapshot) {
			t.Motion.AccelG, t.Motion.GyroDPS, t.Motion.CompassUT = xyz(v.Accel), xyz(v.Gyro), xyz(v.Compass)
		})
	case thingy.EulerChar:
		v, err := thingy.DecodeEuler(b)
		return s.set(err, func(t *telemetry.Snapshot) {
			t.Motion.EulerDeg = &telemetry.Euler{Roll: v.Roll, Pitch: v.Pitch, Yaw: v.Yaw}
		})
	case thingy.HeadingChar:
		v, err := thingy.DecodeHeading(b)
		return s.set(err, func(t *telemetry.Snapshot) { t.Motion.HeadingDeg = telemetry.F(v) })
	case thingy.QuaternionChar:
		v, err := thingy.DecodeQuaternion(b)
		if err == nil && s.Motion != nil {
			s.Motion.Quaternion([4]float64{v.W, v.X, v.Y, v.Z})
		}
		return s.set(err, func(t *telemetry.Snapshot) {
			t.Motion.Quaternion = &telemetry.Quaternion{W: v.W, X: v.X, Y: v.Y, Z: v.Z}
		})
	case thingy.OrientationChar:
		v, err := thingy.DecodeOrientation(b)
		return s.set(err, func(t *telemetry.Snapshot) { t.Motion.Orientation = telemetry.S(v) })
	case thingy.PedometerChar:
		v, err := thingy.DecodePedometer(b)
		return s.set(err, func(t *telemetry.Snapshot) { t.Motion.Steps = telemetry.F(float64(v.Steps)) })
	case thingy.TapChar:
		v, err := thingy.DecodeTap(b)
		if err == nil && s.Motion != nil {
			s.Motion.Tap(v.Direction, v.Count)
		}
		ts := s.now().UnixMilli()
		return s.set(err, func(t *telemetry.Snapshot) {
			t.Motion.Tap = &telemetry.Tap{Direction: v.Direction, Count: v.Count, TS: ts}
		})
	case thingy.ButtonChar:
		return s.button(b)
	case thingy.BatteryChar:
		return s.batteryLevel(b)
	case thingy.MicrophoneChar:
		return s.microphone(b)
	case thingy.SpeakerStatusChar:
		return s.speaker(b)
	}
	return fmt.Errorf("unerwartete Characteristic")
}

func (s *Session) set(err error, fn func(*telemetry.Snapshot)) error {
	if err != nil {
		return err
	}
	s.store.Update(fn)
	return nil
}

func (s *Session) button(b []byte) error {
	pressed, err := thingy.DecodeButton(b)
	if err != nil {
		return err
	}
	s.store.Update(func(t *telemetry.Snapshot) { t.UI.ButtonPressed = telemetry.B(pressed) })
	if s.Motion != nil {
		s.Motion.Button(pressed)
	}
	if s.OnButton != nil {
		go s.OnButton(pressed)
	}
	return nil
}

func (s *Session) microphone(b []byte) error {
	samples, err := thingy.DecodeADPCMFrame(b)
	if err != nil {
		return err
	}
	now := s.now()
	s.mu.Lock()
	if !s.micOn { // late frames after switching the mic off
		s.mu.Unlock()
		return nil
	}
	level := s.meter.Add(thingy.LevelDBFS(samples))
	publish := now.Sub(s.lastLevel) >= levelPublishEvery
	if publish {
		s.lastLevel = now
	}
	s.mu.Unlock()
	if publish {
		s.store.Update(func(t *telemetry.Snapshot) { t.Sound.LevelDBFS = telemetry.F(level) })
	}
	return nil
}

func (s *Session) speaker(b []byte) error {
	if len(b) == 0 {
		return thingy.ErrShortPayload
	}
	s.mu.Lock()
	changed := s.speakerStatus != int(b[0])
	s.speakerStatus = int(b[0])
	s.mu.Unlock()
	if changed {
		s.logf("Lautsprecher-Status: 0x%02X", b[0])
	}
	return nil
}

// batteryLevel stores the level and feeds the charging-trend heuristic.
func (s *Session) batteryLevel(b []byte) error {
	v, err := thingy.DecodeBattery(b)
	if err != nil {
		return err
	}
	now := s.now()
	s.mu.Lock() // held during the store update, so concurrent notifications cannot publish a stale trend
	defer s.mu.Unlock()
	trend := s.battery.Add(now, float64(v))
	s.batteryTrend, s.batteryChecked = trend, now
	s.store.Update(func(t *telemetry.Snapshot) {
		t.Device.BatteryPct, t.Device.BatteryTrend = telemetry.F(float64(v)), string(trend)
	})
	return nil
}

// batteryCheckEvery throttles re-evaluating the trend between battery notifications; the firmware
// notifies on change only, so a steady level would otherwise never be looked at again.
const batteryCheckEvery = 10 * time.Second

func (s *Session) refreshBatteryTrend() {
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	if now.Sub(s.batteryChecked) < batteryCheckEvery {
		return
	}
	s.batteryChecked = now
	if trend := s.battery.Trend(now); trend != s.batteryTrend {
		s.batteryTrend = trend
		s.store.Update(func(t *telemetry.Snapshot) { t.Device.BatteryTrend = string(trend) })
	}
}
