// Package telemetry holds the snapshot (docs/telemetry.schema.json) and a thread-safe store.
package telemetry

// XYZ is a three axis vector.
type XYZ struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// Euler angles in degrees.
type Euler struct {
	Roll  float64 `json:"roll"`
	Pitch float64 `json:"pitch"`
	Yaw   float64 `json:"yaw"`
}

// Quaternion is the orientation quaternion.
type Quaternion struct {
	W float64 `json:"w"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// Tap is the last tap event.
type Tap struct {
	Direction string `json:"direction"`
	Count     int    `json:"count"`
	TS        int64  `json:"ts"`
}

// Color are raw RGBC sensor counts.
type Color struct {
	R     float64 `json:"r"`
	G     float64 `json:"g"`
	B     float64 `json:"b"`
	Clear float64 `json:"clear"`
}

// RGB is an LED color.
type RGB struct {
	R float64 `json:"r"`
	G float64 `json:"g"`
	B float64 `json:"b"`
}

// Device describes the data source.
type Device struct {
	Name       *string  `json:"name"`
	Address    *string  `json:"address"`
	RSSI       *float64 `json:"rssi"`
	BatteryPct *float64 `json:"battery_pct"`
	// BatteryTrend is "charging", "discharging" or "unknown", estimated from BatteryPct (package battery).
	BatteryTrend string `json:"battery_trend"`
	Source       string `json:"source"`
}

// Motion values.
type Motion struct {
	AccelG      *XYZ        `json:"accel_g"`
	GyroDPS     *XYZ        `json:"gyro_dps"`
	CompassUT   *XYZ        `json:"compass_ut"`
	EulerDeg    *Euler      `json:"euler_deg"`
	Quaternion  *Quaternion `json:"quaternion"`
	HeadingDeg  *float64    `json:"heading_deg"`
	Orientation *string     `json:"orientation"`
	Steps       *float64    `json:"steps"`
	Tap         *Tap        `json:"tap"`
}

// Environment values.
type Environment struct {
	TemperatureC *float64 `json:"temperature_c"`
	HumidityPct  *float64 `json:"humidity_pct"`
	PressureHPa  *float64 `json:"pressure_hpa"`
	ECO2PPM      *float64 `json:"eco2_ppm"`
	TVOCPPB      *float64 `json:"tvoc_ppb"`
	Color        *Color   `json:"color"`
}

// Song is the player state. NoteIndex is -1 when idle.
type Song struct {
	Playing   bool `json:"playing"`
	NoteIndex int  `json:"note_index"`
}

// Sound values.
type Sound struct {
	LevelDBFS  *float64 `json:"level_dbfs"`
	MicEnabled bool     `json:"mic_enabled"`
	MicBlocked bool     `json:"mic_blocked"` // game mode: the mic cannot be switched on (BLE bandwidth)
	Song       Song     `json:"song"`
}

// UI values.
type UI struct {
	ButtonPressed *bool `json:"button_pressed"`
	LED           *RGB  `json:"led"`
}

// Snapshot is the complete telemetry state. Values not received yet are nil (JSON null).
type Snapshot struct {
	TS          int64       `json:"ts"`
	Connected   bool        `json:"connected"`
	Device      Device      `json:"device"`
	Motion      Motion      `json:"motion"`
	Environment Environment `json:"environment"`
	Sound       Sound       `json:"sound"`
	UI          UI          `json:"ui"`
}

// New returns an empty snapshot for the given source ("ble" or "sim").
func New(source string) Snapshot {
	return Snapshot{Device: Device{Source: source, BatteryTrend: "unknown"}, Sound: Sound{Song: Song{NoteIndex: -1}}}
}

// F returns a pointer to v.
func F(v float64) *float64 { return &v }

// S returns a pointer to v.
func S(v string) *string { return &v }

// B returns a pointer to v.
func B(v bool) *bool { return &v }

func clone[T any](p *T) *T {
	if p == nil {
		return nil
	}
	v := *p
	return &v
}

// Clone returns a deep copy.
func (s Snapshot) Clone() Snapshot {
	c := s
	c.Device.Name, c.Device.Address = clone(s.Device.Name), clone(s.Device.Address)
	c.Device.RSSI, c.Device.BatteryPct = clone(s.Device.RSSI), clone(s.Device.BatteryPct)
	m := &c.Motion
	m.AccelG, m.GyroDPS, m.CompassUT = clone(s.Motion.AccelG), clone(s.Motion.GyroDPS), clone(s.Motion.CompassUT)
	m.EulerDeg, m.Quaternion, m.Tap = clone(s.Motion.EulerDeg), clone(s.Motion.Quaternion), clone(s.Motion.Tap)
	m.HeadingDeg, m.Orientation, m.Steps = clone(s.Motion.HeadingDeg), clone(s.Motion.Orientation), clone(s.Motion.Steps)
	e := &c.Environment
	e.TemperatureC, e.HumidityPct, e.PressureHPa = clone(s.Environment.TemperatureC), clone(s.Environment.HumidityPct), clone(s.Environment.PressureHPa)
	e.ECO2PPM, e.TVOCPPB, e.Color = clone(s.Environment.ECO2PPM), clone(s.Environment.TVOCPPB), clone(s.Environment.Color)
	c.Sound.LevelDBFS = clone(s.Sound.LevelDBFS)
	c.UI.ButtonPressed, c.UI.LED = clone(s.UI.ButtonPressed), clone(s.UI.LED)
	return c
}
