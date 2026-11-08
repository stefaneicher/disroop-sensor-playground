// Package sim is a simulated Thingy:52. It emits the same raw GATT payloads as the real
// firmware, so the decoders run end to end without hardware.
package sim

import (
	"context"
	"encoding/binary"
	"math"
	"sync"
	"time"

	"github.com/stefaneicher/disroop-sensor-playground/hardware/thingy-bridge/internal/device"
	"github.com/stefaneicher/disroop-sensor-playground/hardware/thingy-bridge/internal/thingy"
)

// Options tune the simulation.
type Options struct {
	// Tick is the motion/mic period. Zero follows motion_freq_hz of the motion config (default 10 Hz = 100 ms),
	// like the firmware; a non-zero Tick is fixed.
	Tick        time.Duration
	ButtonEvery time.Duration // simulated button press period, 0 = never
	Manual      bool          // no background ticker; advance with Step (deterministic tests)
	// Battery returns the level in % after the simulated time since connecting, default ChargeCycle.
	Battery func(elapsed time.Duration) int
}

// ChargeCycle is the default simulated battery: it charges from 60 to 70 % (1 % per minute),
// then runs on battery back to 60 %, so both charging trends show up in a demo.
func ChargeCycle(elapsed time.Duration) int {
	minute := int(elapsed/time.Minute) % 20
	if minute <= 10 {
		return 60 + minute
	}
	return 80 - minute
}

func (o Options) withDefaults() Options {
	if o.Tick == 0 {
		o.Tick = 100 * time.Millisecond
	}
	if o.Battery == nil {
		o.Battery = ChargeCycle
	}
	return o
}

// Connector creates simulated devices.
type Connector struct{ opts Options }

// Motion frequency limits of the firmware (motion_freq_hz).
const (
	minMotionHz = 5
	maxMotionHz = 200
)

// NewConnector returns a simulator connector.
func NewConnector(opts Options) *Connector {
	return &Connector{opts: opts} // Start applies the defaults; a zero Tick must stay "follow motion_freq_hz"
}

// Source implements device.Connector.
func (c *Connector) Source() string { return "sim" }

// Connect implements device.Connector.
func (c *Connector) Connect(ctx context.Context) (device.Device, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return Start(c.opts), nil
}

// Scan implements device.Scanner.
func (c *Connector) Scan(ctx context.Context, found func(device.Info)) error {
	found(simInfo)
	return nil
}

var simInfo = device.Info{Name: "Thingy (Simulator)", Address: "SIM:00:00:00:00:52", RSSI: -43}

// DefaultNFC resembles the factory NDEF message (AAR of the Nordic app).
var DefaultNFC = thingy.AndroidAppRecord("no.nordicsemi.android.nrfthingy")

// Device is a simulated, connected Thingy.
type Device struct {
	opts      Options
	mu        sync.Mutex
	subs      map[string]func([]byte)
	values    map[string][]byte
	done      chan struct{}
	closeOnce sync.Once
	stepMu    sync.Mutex
	elapsed   time.Duration // simulated time, advanced by Step
	period    time.Duration // current tick, guarded by mu
	fixedTick bool
	steps     uint32
	battery   byte
}

// Start returns a connected simulated device that emits notifications until Close.
func Start(opts Options) *Device {
	fixed := opts.Tick != 0
	opts = opts.withDefaults()
	battery := byte(opts.Battery(0))
	d := &Device{
		opts: opts,
		subs: map[string]func([]byte){},
		values: map[string][]byte{
			thingy.EnvConfigChar.UUID:    thingy.EnvConfigValue{TempMS: 2000, PressureMS: 2000, HumidityMS: 2000, ColorMS: 1500, GasMode: 2, LED: [3]byte{103, 78, 29}}.Bytes(),
			thingy.MotionConfigChar.UUID: thingy.MotionConfigValue{PedometerMS: 1000, TemperatureMS: 500, CompassMS: 500, MotionHz: 60}.Bytes(),
			thingy.NFCChar.UUID:          DefaultNFC,
			thingy.BatteryChar.UUID:      {battery},
			thingy.LEDChar.UUID:          {2, 3, 20, 0x0D, 0x0D},
		},
		done:      make(chan struct{}),
		battery:   battery,
		period:    opts.Tick,
		fixedTick: fixed,
	}
	if !opts.Manual {
		go d.run()
	}
	return d
}

// Info implements device.Device.
func (d *Device) Info() device.Info { return simInfo }

// Done implements device.Device.
func (d *Device) Done() <-chan struct{} { return d.done }

// Close implements device.Device.
func (d *Device) Close() error {
	d.closeOnce.Do(func() { close(d.done) })
	return nil
}

// Drop simulates a lost connection.
func (d *Device) Drop() { _ = d.Close() }

func (d *Device) closed() bool {
	select {
	case <-d.done:
		return true
	default:
		return false
	}
}

// Read implements device.Device.
func (d *Device) Read(c thingy.Char) ([]byte, error) {
	if d.closed() {
		return nil, device.ErrNotConnected
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	return append([]byte(nil), d.values[c.UUID]...), nil
}

// Write implements device.Device.
func (d *Device) Write(c thingy.Char, data []byte) error {
	if d.closed() {
		return device.ErrNotConnected
	}
	d.mu.Lock()
	d.values[c.UUID] = append([]byte(nil), data...)
	if c == thingy.MotionConfigChar && len(data) >= 8 && !d.fixedTick {
		hz := max(minMotionHz, min(maxMotionHz, int(binary.LittleEndian.Uint16(data[6:]))))
		d.period = time.Second / time.Duration(hz)
	}
	d.mu.Unlock()
	if c == thingy.SpeakerChar && len(data) >= 4 {
		duration := time.Duration(binary.LittleEndian.Uint16(data[2:])) * time.Millisecond
		time.AfterFunc(duration, func() { d.notify(thingy.SpeakerStatusChar, []byte{0}) })
	}
	return nil
}

// WriteNoResponse implements device.Device.
func (d *Device) WriteNoResponse(c thingy.Char, data []byte) error { return d.Write(c, data) }

// Subscribe implements device.Device.
func (d *Device) Subscribe(c thingy.Char, fn func([]byte)) error {
	if d.closed() {
		return device.ErrNotConnected
	}
	d.mu.Lock()
	d.subs[c.UUID] = fn
	d.mu.Unlock()
	return nil
}

// Unsubscribe implements device.Device.
func (d *Device) Unsubscribe(c thingy.Char) error {
	if d.closed() {
		return device.ErrNotConnected
	}
	d.mu.Lock()
	delete(d.subs, c.UUID)
	d.mu.Unlock()
	return nil
}

func (d *Device) notify(c thingy.Char, payload []byte) {
	if d.closed() {
		return
	}
	d.mu.Lock()
	fn := d.subs[c.UUID]
	d.mu.Unlock()
	if fn != nil {
		fn(payload)
	}
}

// Period is the current notification period (1 / motion_freq_hz unless Options.Tick is set).
func (d *Device) Period() time.Duration {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.period
}

func (d *Device) run() {
	period := d.Period()
	ticker := time.NewTicker(period)
	defer ticker.Stop()
	for {
		d.Step()
		select {
		case <-d.done:
			return
		case <-ticker.C:
		}
		if p := d.Period(); p != period {
			period = p
			ticker.Reset(p)
		}
	}
}

// Step emits one tick of notifications and advances the simulated time by the current period.
// The schedule (environment every second starting at 0, taps every 7 s, a swing every SwingPeriod, …)
// depends on simulated time only, never on wall-clock jitter.
func (d *Device) Step() {
	d.stepMu.Lock()
	defer d.stepMu.Unlock()
	tick := d.Period()
	elapsed := d.elapsed
	d.elapsed += tick
	t := elapsed.Seconds()

	sw := swingAt(t)
	d.notify(thingy.RawMotionChar, rawMotion(t, sw))
	yaw := math.Mod(heading(t)+sw.angle+360, 360)
	roll := sw.roll + sway(t)
	d.notify(thingy.EulerChar, euler(roll, -2+1.5*math.Sin(0.4*t), yaw))
	d.notify(thingy.HeadingChar, q16(heading(t)))
	d.notify(thingy.QuaternionChar, quaternion(yaw, roll))
	d.notify(thingy.MicrophoneChar, micFrame(t))

	every := func(period time.Duration) bool { return period > 0 && elapsed%period < tick }
	if every(time.Second) {
		d.emitEnvironment(t)
		d.steps += uint32(int(elapsed/time.Second) % 3)
		d.notify(thingy.PedometerChar, u32s(d.steps, uint32(elapsed.Milliseconds())))
	}
	if every(7*time.Second) && elapsed > 0 {
		d.notify(thingy.TapChar, []byte{byte(1 + (elapsed/(7*time.Second))%6), 1})
	}
	if every(15 * time.Second) {
		d.notify(thingy.OrientationChar, []byte{byte((elapsed / (15 * time.Second)) % 2)})
	}
	if every(10 * time.Second) {
		d.emitBattery(elapsed)
	}
	if every(d.opts.ButtonEvery) && elapsed >= d.opts.ButtonEvery {
		d.notify(thingy.ButtonChar, []byte{1})
		time.AfterFunc(300*time.Millisecond, func() { d.notify(thingy.ButtonChar, []byte{0}) })
	}
}

// emitBattery notifies only on change, like the firmware's Battery Service.
func (d *Device) emitBattery(elapsed time.Duration) {
	level := byte(max(0, min(100, d.opts.Battery(elapsed))))
	if level == d.battery {
		return
	}
	d.battery = level
	d.mu.Lock()
	d.values[thingy.BatteryChar.UUID] = []byte{level}
	d.mu.Unlock()
	d.notify(thingy.BatteryChar, []byte{level})
}

func (d *Device) emitEnvironment(t float64) {
	temp := 23.4 + 0.5*math.Sin(t/60)
	d.notify(thingy.TemperatureChar, []byte{byte(int8(math.Floor(temp))), byte(math.Floor((temp - math.Floor(temp)) * 100))})
	press := 963.2 + 0.3*math.Sin(t/120)
	p := make([]byte, 5)
	binary.LittleEndian.PutUint32(p, uint32(int32(math.Floor(press))))
	p[4] = byte(math.Floor((press - math.Floor(press)) * 100))
	d.notify(thingy.PressureChar, p)
	d.notify(thingy.HumidityChar, []byte{byte(41 + 2*math.Sin(t/90))})
	d.notify(thingy.GasChar, u16s(uint16(500+100*math.Sin(t/30)), uint16(15+10*math.Sin(t/30))))
	d.notify(thingy.ColorChar, u16s(uint16(180+20*math.Sin(t/20)), 160, 120, 400))
}

func rawMotion(t float64, sw swingState) []byte {
	// centripetal acceleration along the racket axis (−Y) during the swing
	spin := sw.rate / 800
	return i16s(
		1024*0.02*math.Sin(0.7*t), 1024*(0.03*math.Sin(0.5*t+1)-2.5*spin*spin), 1024*(1+0.01*math.Sin(1.3*t)),
		32*1.5*math.Sin(0.9*t), 32*(0.8*math.Sin(0.6*t)+sw.rollRate), 32*(0.4*math.Sin(1.1*t)+sw.rate),
		16*(21+3*math.Sin(0.2*t)), 16*(-8+2*math.Cos(0.2*t)), 16*40.0,
	)
}

func heading(t float64) float64 { return math.Mod(47+30*math.Sin(0.05*t)+360, 360) }

func euler(roll, pitch, yaw float64) []byte {
	return append(append(q16(roll), q16(pitch)...), q16(yaw)...)
}

// quaternion is a yaw rotation about Z (world up) followed by a roll about the racket axis Y.
func quaternion(yawDeg, rollDeg float64) []byte {
	hy, hr := yawDeg*math.Pi/360, rollDeg*math.Pi/360
	cy, sy, cr, sr := math.Cos(hy), math.Sin(hy), math.Cos(hr), math.Sin(hr)
	b := make([]byte, 0, 16)
	for _, v := range []float64{cy * cr, -sy * sr, cy * sr, sy * cr} {
		b = binary.LittleEndian.AppendUint32(b, uint32(int32(v*(1<<30))))
	}
	return b
}

// micFrame is 256 samples (16 ms at 16 kHz) of a 500 Hz tone with a slowly pulsing level.
func micFrame(t float64) []byte {
	amplitude := 300 + 5700*(0.5+0.5*math.Sin(t*0.8))
	samples := make([]int16, 256)
	for i := range samples {
		samples[i] = int16(amplitude * math.Sin(2*math.Pi*500*(t+float64(i)/16000)))
	}
	return thingy.EncodeADPCMFrame(samples)
}

func q16(v float64) []byte { return binary.LittleEndian.AppendUint32(nil, uint32(int32(v*65536))) }

func i16s(vals ...float64) []byte {
	b := make([]byte, 0, 2*len(vals))
	for _, v := range vals {
		b = binary.LittleEndian.AppendUint16(b, uint16(int16(math.Round(v))))
	}
	return b
}

func u16s(vals ...uint16) []byte {
	b := make([]byte, 0, 2*len(vals))
	for _, v := range vals {
		b = binary.LittleEndian.AppendUint16(b, v)
	}
	return b
}

func u32s(vals ...uint32) []byte {
	b := make([]byte, 0, 4*len(vals))
	for _, v := range vals {
		b = binary.LittleEndian.AppendUint32(b, v)
	}
	return b
}
