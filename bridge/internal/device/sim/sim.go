// Package sim is a simulated Thingy:52. It emits the same raw GATT payloads as the real
// firmware, so the decoders run end to end without hardware.
package sim

import (
	"context"
	"encoding/binary"
	"math"
	"sync"
	"time"

	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/thingy"
)

// Options tune the simulation.
type Options struct {
	Tick        time.Duration // motion/mic period, default 100 ms
	ButtonEvery time.Duration // simulated button press period, 0 = never
	Manual      bool          // no background ticker; advance with Step (deterministic tests)
}

// Connector creates simulated devices.
type Connector struct{ opts Options }

// NewConnector returns a simulator connector.
func NewConnector(opts Options) *Connector {
	if opts.Tick == 0 {
		opts.Tick = 100 * time.Millisecond
	}
	return &Connector{opts: opts}
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
	tick      int
	steps     uint32
}

// Start returns a connected simulated device that emits notifications until Close.
func Start(opts Options) *Device {
	if opts.Tick == 0 {
		opts.Tick = 100 * time.Millisecond
	}
	d := &Device{
		opts: opts,
		subs: map[string]func([]byte){},
		values: map[string][]byte{
			thingy.EnvConfigChar.UUID:    thingy.EnvConfigValue{TempMS: 2000, PressureMS: 2000, HumidityMS: 2000, ColorMS: 1500, GasMode: 2, LED: [3]byte{103, 78, 29}}.Bytes(),
			thingy.MotionConfigChar.UUID: thingy.MotionConfigValue{PedometerMS: 1000, TemperatureMS: 500, CompassMS: 500, MotionHz: 60}.Bytes(),
			thingy.NFCChar.UUID:          DefaultNFC,
			thingy.BatteryChar.UUID:      {87},
			thingy.LEDChar.UUID:          {2, 3, 20, 0x0D, 0x0D},
		},
		done: make(chan struct{}),
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

func (d *Device) run() {
	ticker := time.NewTicker(d.opts.Tick)
	defer ticker.Stop()
	for {
		d.Step()
		select {
		case <-d.done:
			return
		case <-ticker.C:
		}
	}
}

// Step emits one tick of notifications. Simulated time is tick count × Tick, so the schedule
// (environment every second starting at tick 0, taps every 7 s, …) never depends on wall-clock jitter.
func (d *Device) Step() {
	d.stepMu.Lock()
	defer d.stepMu.Unlock()
	tick := d.tick
	d.tick++
	elapsed := time.Duration(tick) * d.opts.Tick
	t := elapsed.Seconds()

	d.notify(thingy.RawMotionChar, rawMotion(t))
	yaw := heading(t)
	d.notify(thingy.EulerChar, euler(2*math.Sin(0.5*t), -2+1.5*math.Sin(0.4*t), yaw))
	d.notify(thingy.HeadingChar, q16(yaw))
	d.notify(thingy.QuaternionChar, quaternion(yaw))
	d.notify(thingy.MicrophoneChar, micFrame(t))

	if d.every(elapsed, time.Second) {
		d.emitEnvironment(t)
		d.steps += uint32(tick % 3)
		d.notify(thingy.PedometerChar, u32s(d.steps, uint32(elapsed.Milliseconds())))
	}
	if d.every(elapsed, 7*time.Second) && tick > 0 {
		d.notify(thingy.TapChar, []byte{byte(1 + (tick/70)%6), 1})
	}
	if d.every(elapsed, 15*time.Second) {
		d.notify(thingy.OrientationChar, []byte{byte((tick / 150) % 2)})
	}
	if d.every(elapsed, time.Minute) {
		d.notify(thingy.BatteryChar, []byte{87})
	}
	if d.every(elapsed, d.opts.ButtonEvery) && elapsed >= d.opts.ButtonEvery {
		d.notify(thingy.ButtonChar, []byte{1})
		time.AfterFunc(300*time.Millisecond, func() { d.notify(thingy.ButtonChar, []byte{0}) })
	}
}

func (d *Device) every(elapsed, period time.Duration) bool {
	return period > 0 && elapsed%period < d.opts.Tick
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

func rawMotion(t float64) []byte {
	return i16s(
		1024*0.02*math.Sin(0.7*t), 1024*0.03*math.Sin(0.5*t+1), 1024*(1+0.01*math.Sin(1.3*t)),
		32*1.5*math.Sin(0.9*t), 32*0.8*math.Sin(0.6*t), 32*0.4*math.Sin(1.1*t),
		16*(21+3*math.Sin(0.2*t)), 16*(-8+2*math.Cos(0.2*t)), 16*40.0,
	)
}

func heading(t float64) float64 { return math.Mod(47+30*math.Sin(0.05*t)+360, 360) }

func euler(roll, pitch, yaw float64) []byte {
	return append(append(q16(roll), q16(pitch)...), q16(yaw)...)
}

func quaternion(yawDeg float64) []byte {
	half := yawDeg * math.Pi / 360
	b := make([]byte, 0, 16)
	for _, v := range []float64{math.Cos(half), 0, 0, math.Sin(half)} {
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
