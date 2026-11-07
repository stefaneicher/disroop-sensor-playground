package app

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stefaneicher/disroop-sensor-playground/bridge/internal/device"
	"github.com/stefaneicher/disroop-sensor-playground/bridge/internal/device/sim"
	"github.com/stefaneicher/disroop-sensor-playground/bridge/internal/motion"
	"github.com/stefaneicher/disroop-sensor-playground/bridge/internal/telemetry"
	"github.com/stefaneicher/disroop-sensor-playground/bridge/internal/thingy"
)

// fakeDevice records every operation.
type fakeDevice struct {
	mu    sync.Mutex
	ops   []string
	reads map[thingy.Char][]byte
	subs  map[thingy.Char]func([]byte)
	done  chan struct{}
}

func newFakeDevice() *fakeDevice {
	return &fakeDevice{
		reads: map[thingy.Char][]byte{
			thingy.EnvConfigChar: {0xD0, 0x07, 0xD0, 0x07, 0xD0, 0x07, 0xE8, 0x03, 2, 0x11, 0x22, 0x33},
			thingy.BatteryChar:   {77},
		},
		subs: map[thingy.Char]func([]byte){},
		done: make(chan struct{}),
	}
}

func (f *fakeDevice) op(s string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.ops = append(f.ops, s)
}
func (f *fakeDevice) Info() device.Info {
	return device.Info{Name: "Thingy", Address: "E3:58:08:1B:53:5F", RSSI: -43}
}
func (f *fakeDevice) Read(c thingy.Char) ([]byte, error) {
	f.op("read " + c.Name)
	return f.reads[c], nil
}
func (f *fakeDevice) Write(c thingy.Char, b []byte) error {
	f.op(fmt.Sprintf("write %s % X", c.Name, b))
	return nil
}
func (f *fakeDevice) WriteNoResponse(c thingy.Char, b []byte) error {
	f.op(fmt.Sprintf("cmd %s % X", c.Name, b))
	return nil
}
func (f *fakeDevice) Subscribe(c thingy.Char, fn func([]byte)) error {
	f.mu.Lock()
	f.subs[c] = fn
	f.mu.Unlock()
	f.op("sub " + c.Name)
	return nil
}
func (f *fakeDevice) Unsubscribe(c thingy.Char) error {
	f.mu.Lock()
	delete(f.subs, c)
	f.mu.Unlock()
	f.op("unsub " + c.Name)
	return nil
}
func (f *fakeDevice) notify(c thingy.Char, b []byte) {
	f.mu.Lock()
	fn := f.subs[c]
	f.mu.Unlock()
	if fn != nil {
		fn(b)
	}
}
func (f *fakeDevice) Done() <-chan struct{} { return f.done }
func (f *fakeDevice) Close() error          { return nil }
func (f *fakeDevice) list() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.ops...)
}

type fixedClock struct{ t atomic.Int64 }

func (c *fixedClock) now() time.Time          { return time.UnixMilli(c.t.Load()) }
func (c *fixedClock) advance(d time.Duration) { c.t.Add(d.Milliseconds()) }

func newTestSession(source string) (*Session, *telemetry.Store, *fixedClock) {
	clock := &fixedClock{}
	clock.t.Store(1762460000000)
	store := telemetry.NewStore(telemetry.New(source), clock.now)
	return NewSession(store, telemetry.NewLogBus(50).Logf, clock.now), store, clock
}

func TestAttachRunsStartupSequence(t *testing.T) {
	s, store, _ := newTestSession("ble")
	dev := newFakeDevice()
	if err := s.Attach(dev); err != nil {
		t.Fatal(err)
	}
	ops := dev.list()
	want := []string{
		"write motion_config E8 03 F4 01 64 00 0A 00 01",
		"read env_config",
		"write env_config E8 03 E8 03 E8 03 E8 03 01 11 22 33",
		"write sound_config 01 01",
	}
	for i, w := range want {
		if ops[i] != w {
			t.Fatalf("op %d = %q, want %q (all: %v)", i, ops[i], w, ops)
		}
	}
	for _, c := range thingy.NotifyChars {
		if c != thingy.MicrophoneChar && !contains(ops, "sub "+c.Name) {
			t.Errorf("missing subscription %s", c.Name)
		}
	}
	snap := store.Snapshot()
	if !snap.Connected || *snap.Device.Address != "E3:58:08:1B:53:5F" || *snap.Device.RSSI != -43 || *snap.Device.BatteryPct != 77 {
		t.Fatalf("device %+v connected=%v", snap.Device, snap.Connected)
	}
}

func TestNotificationsUpdateSnapshot(t *testing.T) {
	s, store, _ := newTestSession("ble")
	dev := newFakeDevice()
	if err := s.Attach(dev); err != nil {
		t.Fatal(err)
	}
	send := func(c thingy.Char, b ...byte) { dev.subs[c](b) }
	send(thingy.TemperatureChar, 23, 40)
	send(thingy.PressureChar, 0xC3, 0x03, 0, 0, 20)
	send(thingy.HumidityChar, 41)
	send(thingy.GasChar, 0x64, 0x02, 0x0E, 0x00)
	send(thingy.ColorChar, 180, 0, 160, 0, 120, 0, 0x90, 0x01)
	send(thingy.RawMotionChar, 0, 4, 0, 0, 0, 0, 0x40, 0, 0, 0, 0, 0, 0x50, 0x01, 0, 0, 0, 0)
	send(thingy.EulerChar, 0, 0, 1, 0, 0, 0, 0xFE, 0xFF, 0, 0, 0x2F, 0)
	send(thingy.HeadingChar, 0, 0, 0x2F, 0)
	send(thingy.QuaternionChar, 0, 0, 0, 0x40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	send(thingy.OrientationChar, 1)
	send(thingy.PedometerChar, 12, 0, 0, 0, 0, 0, 0, 0)
	send(thingy.TapChar, 5, 2)
	send(thingy.ButtonChar, 1)
	send(thingy.BatteryChar, 55)

	g := store.Snapshot()
	e, m := g.Environment, g.Motion
	checks := map[string]bool{
		"temperature": *e.TemperatureC == 23.4,
		"pressure":    *e.PressureHPa == 963.2,
		"humidity":    *e.HumidityPct == 41,
		"gas":         *e.ECO2PPM == 612 && *e.TVOCPPB == 14,
		"color":       *e.Color == telemetry.Color{R: 180, G: 160, B: 120, Clear: 400},
		"accel":       *m.AccelG == telemetry.XYZ{X: 1},
		"gyro":        *m.GyroDPS == telemetry.XYZ{X: 2},
		"compass":     *m.CompassUT == telemetry.XYZ{X: 21},
		"euler":       *m.EulerDeg == telemetry.Euler{Roll: 1, Pitch: -2, Yaw: 47},
		"heading":     *m.HeadingDeg == 47,
		"quaternion":  *m.Quaternion == telemetry.Quaternion{W: 1},
		"orientation": *m.Orientation == "landscape",
		"steps":       *m.Steps == 12,
		"tap":         *m.Tap == telemetry.Tap{Direction: "Z+", Count: 2, TS: 1762460000000},
		"button":      *g.UI.ButtonPressed,
		"battery":     *g.Device.BatteryPct == 55,
	}
	for name, ok := range checks {
		if !ok {
			t.Errorf("%s not applied: %+v", name, g)
		}
	}
}

func TestBatteryTrendFollowsTheLevelAndResetsOnReconnect(t *testing.T) {
	s, store, clock := newTestSession("ble")
	dev := newFakeDevice() // initial read: 77 %
	_ = s.Attach(dev)
	trend := func() string { return store.Snapshot().Device.BatteryTrend }
	if got := trend(); got != "unknown" {
		t.Fatalf("after connect: %q", got)
	}
	for _, level := range []byte{78, 79} {
		clock.advance(time.Minute)
		dev.notify(thingy.BatteryChar, []byte{level})
	}
	if got := trend(); got != "charging" {
		t.Fatalf("77→79 %% in 2 min: %q, want charging", got)
	}

	// Unplugged: the level drops, then only other notifications arrive (the firmware notifies on change).
	for _, level := range []byte{78, 77} {
		clock.advance(time.Minute)
		dev.notify(thingy.BatteryChar, []byte{level})
	}
	for range 18 {
		clock.advance(10 * time.Second)
		dev.notify(thingy.ButtonChar, []byte{0})
	}
	if got := trend(); got != "discharging" {
		t.Fatalf("after the level dropped: %q, want discharging", got)
	}

	s.Detach()
	_ = s.Attach(newFakeDevice())
	if got := trend(); got != "unknown" {
		t.Fatalf("after reconnect: %q, want unknown", got)
	}
}

func TestSimulatorBatteryShowsChargingThenDischarging(t *testing.T) {
	s, store, clock := newTestSession("sim")
	dev := sim.Start(sim.Options{Manual: true, Tick: time.Second})
	defer dev.Close()
	_ = s.Attach(dev)
	run := func(d time.Duration) string {
		for range int(d / time.Second) {
			clock.advance(time.Second)
			dev.Step()
		}
		return store.Snapshot().Device.BatteryTrend
	}
	if got := run(time.Minute); got != "unknown" {
		t.Fatalf("after 1 min: %q, want unknown", got)
	}
	if got := run(2 * time.Minute); got != "charging" {
		t.Fatalf("after 3 min: %q, want charging", got)
	}
	if got := run(11 * time.Minute); got != "discharging" {
		t.Fatalf("after 14 min: %q, want discharging", got)
	}
}

func TestMicLevelIsSmoothedAndThrottled(t *testing.T) {
	s, store, clock := newTestSession("ble")
	s.SetMic(true)
	dev := newFakeDevice()
	_ = s.Attach(dev)
	waitFor(t, func() bool { return subscribed(dev, thingy.MicrophoneChar) })
	loud := make([]int16, 64)
	for i := range loud {
		loud[i] = 16384
	}
	frame := thingy.EncodeADPCMFrame(loud)

	dev.notify(thingy.MicrophoneChar, frame)
	first := *store.Snapshot().Sound.LevelDBFS
	if first > -5 || first < -8 {
		t.Fatalf("level %v, want ≈ -6 dBFS", first)
	}
	dev.notify(thingy.MicrophoneChar, thingy.EncodeADPCMFrame(make([]int16, 64)))
	if got := *store.Snapshot().Sound.LevelDBFS; got != first {
		t.Fatalf("level published within 100 ms: %v", got)
	}
	clock.advance(100 * time.Millisecond)
	dev.notify(thingy.MicrophoneChar, thingy.EncodeADPCMFrame(make([]int16, 64)))
	if got := *store.Snapshot().Sound.LevelDBFS; got >= first {
		t.Fatalf("level not updated after 100 ms: %v", got)
	}
}

func TestButtonPressCallsHandler(t *testing.T) {
	s, _, _ := newTestSession("ble")
	pressed := make(chan bool, 2)
	s.OnButton = func(p bool) { pressed <- p }
	dev := newFakeDevice()
	_ = s.Attach(dev)
	dev.subs[thingy.ButtonChar]([]byte{1})
	select {
	case p := <-pressed:
		if !p {
			t.Fatal("want pressed")
		}
	case <-time.After(10 * time.Second):
		t.Fatal("handler not called")
	}
}

func TestOutputWritesSpeakerAndLED(t *testing.T) {
	s, store, _ := newTestSession("ble")
	if err := s.Tone(440, 180, 100); err != device.ErrNotConnected {
		t.Fatalf("tone without device: %v", err)
	}
	dev := newFakeDevice()
	_ = s.Attach(dev)
	_ = s.Tone(440, 180, 100)
	_ = s.LED(255, 16, 0)
	ops := strings.Join(dev.list(), "|")
	if !strings.Contains(ops, "cmd speaker B8 01 B4 00 64") || !strings.Contains(ops, "write led 01 FF 10 00") {
		t.Fatalf("ops %s", ops)
	}
	if led := store.Snapshot().UI.LED; led == nil || *led != (telemetry.RGB{R: 255, G: 16}) {
		t.Fatalf("led %+v", led)
	}
	_ = s.LEDOff()
	if led := store.Snapshot().UI.LED; *led != (telemetry.RGB{}) {
		t.Fatalf("led after off %+v", led)
	}
}

type countingConnector struct {
	inner    device.Connector
	connects atomic.Int32
	devices  chan *sim.Device
}

func (c *countingConnector) Source() string { return "sim" }
func (c *countingConnector) Connect(ctx context.Context) (device.Device, error) {
	c.connects.Add(1)
	d, err := c.inner.Connect(ctx)
	if err == nil {
		c.devices <- d.(*sim.Device)
	}
	return d, err
}

func TestRunReconnectsAfterDrop(t *testing.T) {
	s, store, _ := newTestSession("sim")
	conn := &countingConnector{inner: sim.NewConnector(sim.Options{}), devices: make(chan *sim.Device, 4)}
	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})
	go func() { s.Run(ctx, conn, 10*time.Millisecond); close(stopped) }()

	first := <-conn.devices
	waitFor(t, func() bool { return store.Snapshot().Connected })
	first.Drop()
	<-conn.devices
	waitFor(t, func() bool { return conn.connects.Load() == 2 && store.Snapshot().Connected })

	cancel()
	<-stopped
	if store.Snapshot().Connected {
		t.Fatal("still connected after stop")
	}
}

func TestProgramNFCBacksUpWritesAndVerifies(t *testing.T) {
	dev := sim.Start(sim.Options{})
	defer dev.Close()
	backup := t.TempDir() + "/nfc-backup.hex"
	logs := telemetry.NewLogBus(20)

	if err := ProgramNFC(dev, backup, logs.Logf); err != nil {
		t.Fatal(err)
	}
	got, _ := dev.Read(thingy.NFCChar)
	if !bytes.Equal(got, thingy.AndroidAppRecord(thingy.AppPackage)) {
		t.Fatalf("tag holds % X", got)
	}
	saved, err := ReadBackup(backup)
	if err != nil || !bytes.Equal(saved, sim.DefaultNFC) {
		t.Fatalf("backup % X, %v", saved, err)
	}

	// A second run must keep the original backup.
	if err := ProgramNFC(dev, backup, logs.Logf); err != nil {
		t.Fatal(err)
	}
	if saved, _ := ReadBackup(backup); !bytes.Equal(saved, sim.DefaultNFC) {
		t.Fatal("backup overwritten")
	}

	if err := RestoreNFC(dev, backup, logs.Logf); err != nil {
		t.Fatal(err)
	}
	if got, _ := dev.Read(thingy.NFCChar); !bytes.Equal(got, sim.DefaultNFC) {
		t.Fatalf("restore left % X", got)
	}
}

func TestRestoreNFCWithoutBackupFails(t *testing.T) {
	dev := sim.Start(sim.Options{})
	defer dev.Close()
	if err := RestoreNFC(dev, t.TempDir()+"/missing.hex", func(string, ...any) {}); err == nil {
		t.Fatal("want error")
	}
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatal("timeout")
		}
		time.Sleep(time.Millisecond)
	}
}

// sleepyConnector reports ErrNotFound until it has been asked `asleep` times (the user wakes the Thingy).
type sleepyConnector struct {
	asleep int32
	tries  atomic.Int32
}

func (c *sleepyConnector) Source() string { return "ble" }
func (c *sleepyConnector) Connect(ctx context.Context) (device.Device, error) {
	if c.tries.Add(1) <= c.asleep {
		return nil, device.ErrNotFound
	}
	return newFakeDevice(), nil
}

func TestRunKeepsSearchingForASleepingThingyWithAHint(t *testing.T) {
	logs := telemetry.NewLogBus(50)
	store := telemetry.NewStore(telemetry.New("ble"), time.Now)
	s := NewSession(store, logs.Logf, time.Now)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go s.Run(ctx, &sleepyConnector{asleep: 3}, time.Millisecond)

	waitFor(t, func() bool { return store.Snapshot().Connected })
	all := strings.Join(logs.Recent(), "\n")
	if n := strings.Count(all, "Thingy nicht gefunden – Taste drücken oder schütteln, um es zu wecken"); n != 3 {
		t.Fatalf("hint logged %d times, want 3:\n%s", n, all)
	}
	if !strings.Contains(all, "suche weiter") {
		t.Fatalf("no 'suche weiter' line:\n%s", all)
	}
}

func TestConnectWaitsUntilTheThingyWakesUp(t *testing.T) {
	var lines []string
	conn := &sleepyConnector{asleep: 2}
	dev, err := Connect(context.Background(), conn, time.Millisecond, func(f string, a ...any) { lines = append(lines, fmt.Sprintf(f, a...)) })
	if err != nil || dev == nil || conn.tries.Load() != 3 {
		t.Fatalf("dev %v err %v after %d tries", dev, err, conn.tries.Load())
	}
	if !strings.Contains(strings.Join(lines, "\n"), "Taste drücken") {
		t.Fatalf("no hint: %v", lines)
	}
}

func TestConnectGivesUpOnCancelAndOtherErrors(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := Connect(ctx, &sleepyConnector{asleep: 1000}, time.Millisecond, func(string, ...any) {}); err == nil {
		t.Fatal("want error after cancel")
	}
}

func subscribed(dev *fakeDevice, c thingy.Char) bool { return contains(dev.list(), "sub "+c.Name) }

func TestMicIsSubscribedOnlyAfterMicDelay(t *testing.T) {
	s, _, _ := newTestSession("ble")
	s.MicDelay = 50 * time.Millisecond
	s.SetMic(true)
	dev := newFakeDevice()
	_ = s.Attach(dev)
	if subscribed(dev, thingy.MicrophoneChar) {
		t.Fatal("mic subscribed immediately")
	}
	if !subscribed(dev, thingy.RawMotionChar) {
		t.Fatal("other notifications must be subscribed immediately")
	}
	waitFor(t, func() bool { return subscribed(dev, thingy.MicrophoneChar) })
}

func TestMicIsOffByDefault(t *testing.T) {
	s, store, _ := newTestSession("ble")
	dev := newFakeDevice()
	_ = s.Attach(dev)
	time.Sleep(20 * time.Millisecond)
	if subscribed(dev, thingy.MicrophoneChar) {
		t.Fatal("mic subscribed although off")
	}
	if snap := store.Snapshot(); snap.Sound.MicEnabled || snap.Sound.LevelDBFS != nil {
		t.Fatalf("sound %+v", snap.Sound)
	}
}

func TestSetMicWhileConnected(t *testing.T) {
	s, store, clock := newTestSession("ble")
	dev := newFakeDevice()
	_ = s.Attach(dev)
	waitFor(t, func() bool { s.mu.Lock(); defer s.mu.Unlock(); return s.micReady })

	s.SetMic(true)
	if !subscribed(dev, thingy.MicrophoneChar) || !store.Snapshot().Sound.MicEnabled {
		t.Fatalf("mic not on: %v", dev.list())
	}
	frame := thingy.EncodeADPCMFrame([]int16{8000, -8000, 8000, -8000})
	dev.notify(thingy.MicrophoneChar, frame)
	if store.Snapshot().Sound.LevelDBFS == nil {
		t.Fatal("no level while mic on")
	}

	s.SetMic(false)
	clock.advance(time.Second)
	dev.notify(thingy.MicrophoneChar, frame) // a late frame must not bring the level back
	snap := store.Snapshot()
	if !contains(dev.list(), "unsub microphone") || snap.Sound.MicEnabled || snap.Sound.LevelDBFS != nil {
		t.Fatalf("mic not off: %+v %v", snap.Sound, dev.list())
	}
}

func TestSkipLeavesCharacteristicsUnsubscribed(t *testing.T) {
	s, _, _ := newTestSession("ble")
	s.Skip = map[string]bool{"euler": true, "microphone": true}
	s.SetMic(true)
	dev := newFakeDevice()
	_ = s.Attach(dev)
	time.Sleep(20 * time.Millisecond)
	if subscribed(dev, thingy.EulerChar) || subscribed(dev, thingy.MicrophoneChar) || !subscribed(dev, thingy.HeadingChar) {
		t.Fatalf("ops %v", dev.list())
	}
}

// droppingConnector hands out fake devices; the test closes them to simulate drops.
type droppingConnector struct{ devices chan *fakeDevice }

func (c *droppingConnector) Source() string { return "ble" }
func (c *droppingConnector) Connect(ctx context.Context) (device.Device, error) {
	d := newFakeDevice()
	c.devices <- d
	return d, nil
}

func runWithMic(t *testing.T) (*Session, *telemetry.Store, *telemetry.LogBus, *fixedClock, *droppingConnector) {
	t.Helper()
	logs := telemetry.NewLogBus(50)
	clock := &fixedClock{}
	store := telemetry.NewStore(telemetry.New("ble"), clock.now)
	s := NewSession(store, logs.Logf, clock.now)
	s.SetMic(true)
	conn := &droppingConnector{devices: make(chan *fakeDevice, 4)}
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go s.Run(ctx, conn, time.Millisecond)
	return s, store, logs, clock, conn
}

func TestRunDisablesMicAfterRepeatedDropsWithMic(t *testing.T) {
	_, store, logs, clock, conn := runWithMic(t)
	for range MicMaxDrops {
		dev := <-conn.devices
		waitFor(t, func() bool { return subscribed(dev, thingy.MicrophoneChar) })
		clock.advance(MicDropWindow / 2) // drops shortly after the mic stream started
		close(dev.done)
	}
	dev := <-conn.devices
	waitFor(t, func() bool { return subscribed(dev, thingy.RawMotionChar) })
	time.Sleep(20 * time.Millisecond)
	if subscribed(dev, thingy.MicrophoneChar) || store.Snapshot().Sound.MicEnabled {
		t.Fatal("mic still on after repeated drops")
	}
	if !strings.Contains(strings.Join(logs.Recent(), "\n"), "Mikrofon automatisch ausgeschaltet") {
		t.Fatalf("no log line: %v", logs.Recent())
	}
}

func TestRunKeepsMicWhenConnectionWasStable(t *testing.T) {
	_, _, _, clock, conn := runWithMic(t)
	for range MicMaxDrops + 1 {
		dev := <-conn.devices
		waitFor(t, func() bool { return subscribed(dev, thingy.MicrophoneChar) })
		clock.advance(2 * MicDropWindow) // ran fine for a while, then dropped (e.g. out of range)
		close(dev.done)
	}
	dev := <-conn.devices
	waitFor(t, func() bool { return subscribed(dev, thingy.MicrophoneChar) })
}

func TestMotionNotificationsFeedTheMotionHub(t *testing.T) {
	s, _, clock := newTestSession("ble")
	s.Motion = motion.NewHub(clock.now)
	frames, cancel := s.Motion.Subscribe(16)
	defer cancel()
	dev := newFakeDevice()
	_ = s.Attach(dev)
	dev.notify(thingy.QuaternionChar, []byte{0, 0, 0, 0x40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}) // w = 1
	dev.notify(thingy.TapChar, []byte{5, 2})
	dev.notify(thingy.ButtonChar, []byte{1})
	// accel x = 0.5 g, gyro z = 400 °/s
	dev.notify(thingy.RawMotionChar, []byte{0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x32, 0, 0, 0, 0, 0, 0})
	var last motion.Frame
	for len(frames) > 0 {
		last = <-frames
	}
	if last.Q != [4]float64{1, 0, 0, 0} || last.Accel[0] != 0.5 || last.Gyro[2] != 400 || !last.Button {
		t.Fatalf("frame %+v", last)
	}
}

func TestTapReachesTheMotionHub(t *testing.T) {
	s, _, clock := newTestSession("ble")
	s.Motion = motion.NewHub(clock.now)
	frames, cancel := s.Motion.Subscribe(16)
	defer cancel()
	dev := newFakeDevice()
	_ = s.Attach(dev)
	dev.notify(thingy.TapChar, []byte{5, 2})
	dev.notify(thingy.RawMotionChar, make([]byte, 18))
	f := <-frames
	if f.Tap == nil || f.Tap.Count != 2 || f.Tap.Dir == "" {
		t.Fatalf("frame %+v", f)
	}
}

func indexOf(ops []string, s string) int {
	for i, o := range ops {
		if o == s {
			return i
		}
	}
	return -1
}

const (
	motionConfig10Hz  = "write motion_config E8 03 F4 01 64 00 0A 00 01"
	motionConfig100Hz = "write motion_config E8 03 F4 01 64 00 64 00 01"
)

func TestGameModePausesEulerAndHeadingBeforeRaisingTheRate(t *testing.T) {
	s, _, _ := newTestSession("ble")
	dev := newFakeDevice()
	_ = s.Attach(dev)
	before := len(dev.list())
	s.SetGameMode(100)
	ops := dev.list()[before:]
	want := []string{"unsub euler", "unsub heading", motionConfig100Hz}
	if strings.Join(ops, "|") != strings.Join(want, "|") {
		t.Fatalf("ops %v, want %v", ops, want)
	}
	if !s.GameMode() {
		t.Fatal("game mode not reported")
	}
}

func TestLeavingGameModeLowersTheRateBeforeResubscribing(t *testing.T) {
	s, _, _ := newTestSession("ble")
	s.Skip = map[string]bool{"heading": true}
	dev := newFakeDevice()
	_ = s.Attach(dev)
	s.SetGameMode(100)
	before := len(dev.list())
	s.SetGameMode(0)
	ops := dev.list()[before:]
	want := []string{motionConfig10Hz, "sub euler"} // heading stays skipped
	if strings.Join(ops, "|") != strings.Join(want, "|") {
		t.Fatalf("ops %v, want %v", ops, want)
	}
	s.SetGameMode(0) // already off: no BLE traffic
	if n := len(dev.list()); n != before+2 {
		t.Fatalf("second SetGameMode(0) wrote: %v", dev.list()[before+2:])
	}
}

func TestGameModeSurvivesAReconnectWithTheRateWrittenAfterTheSubscriptions(t *testing.T) {
	s, _, _ := newTestSession("ble")
	s.SetGameMode(60) // before the first connection
	for range 2 {
		dev := newFakeDevice()
		_ = s.Attach(dev)
		ops := dev.list()
		if subscribed(dev, thingy.EulerChar) || subscribed(dev, thingy.HeadingChar) {
			t.Fatalf("paused characteristics subscribed: %v", ops)
		}
		if !subscribed(dev, thingy.QuaternionChar) || !subscribed(dev, thingy.RawMotionChar) || !subscribed(dev, thingy.TapChar) {
			t.Fatalf("game characteristics missing: %v", ops)
		}
		game := indexOf(ops, "write motion_config E8 03 F4 01 64 00 3C 00 01")
		lastSub := 0
		for i, o := range ops {
			if strings.HasPrefix(o, "sub ") {
				lastSub = i
			}
		}
		if game < lastSub || ops[0] != motionConfig10Hz {
			t.Fatalf("60 Hz must follow the subscriptions (game %d, last sub %d): %v", game, lastSub, ops)
		}
		s.Detach()
	}
}

func micReadySession(t *testing.T) (*Session, *telemetry.Store, *fakeDevice) {
	t.Helper()
	s, store, _ := newTestSession("ble")
	dev := newFakeDevice()
	_ = s.Attach(dev)
	waitFor(t, func() bool { s.mu.Lock(); defer s.mu.Unlock(); return s.micReady })
	return s, store, dev
}

func TestMicIsRejectedInGameMode(t *testing.T) {
	s, store, dev := micReadySession(t)
	s.SetGameMode(100)
	if err := s.SetMic(true); !errors.Is(err, ErrMicGameMode) {
		t.Fatalf("SetMic(true) in game mode: %v", err)
	}
	snap := store.Snapshot()
	if subscribed(dev, thingy.MicrophoneChar) || snap.Sound.MicEnabled || !snap.Sound.MicBlocked {
		t.Fatalf("mic must stay off and blocked: %+v %v", snap.Sound, dev.list())
	}
	if err := s.SetMic(false); err != nil {
		t.Fatalf("SetMic(false) in game mode: %v", err)
	}
	s.SetGameMode(0)
	if subscribed(dev, thingy.MicrophoneChar) || store.Snapshot().Sound.MicBlocked {
		t.Fatalf("rejected mic came on after the game: %+v %v", store.Snapshot().Sound, dev.list())
	}
}

func TestGameModePausesTheMicFirstAndRestoresItAfterwards(t *testing.T) {
	s, store, dev := micReadySession(t)
	if err := s.SetMic(true); err != nil || !subscribed(dev, thingy.MicrophoneChar) {
		t.Fatalf("mic not on: %v %v", err, dev.list())
	}
	before := len(dev.list())
	s.SetGameMode(100)
	ops := dev.list()[before:]
	if len(ops) == 0 || ops[0] != "unsub microphone" || indexOf(ops, motionConfig100Hz) < 0 {
		t.Fatalf("mic must be unsubscribed before the rate rises: %v", ops)
	}
	if snap := store.Snapshot(); snap.Sound.MicEnabled || !snap.Sound.MicBlocked || snap.Sound.LevelDBFS != nil {
		t.Fatalf("sound in game mode %+v", snap.Sound)
	}
	before = len(dev.list())
	s.SetGameMode(0)
	ops = dev.list()[before:]
	if indexOf(ops, "sub microphone") <= indexOf(ops, motionConfig10Hz) {
		t.Fatalf("mic must come back after the rate is lowered: %v", ops)
	}
	if snap := store.Snapshot(); !snap.Sound.MicEnabled || snap.Sound.MicBlocked || !s.MicEnabled() {
		t.Fatalf("sound after the game %+v", snap.Sound)
	}
}

func TestMicSwitchedOffDuringTheGameStaysOff(t *testing.T) {
	s, store, dev := micReadySession(t)
	_ = s.SetMic(true)
	s.SetGameMode(100)
	_ = s.SetMic(false)
	before := len(dev.list())
	s.SetGameMode(0)
	if contains(dev.list()[before:], "sub microphone") || store.Snapshot().Sound.MicEnabled {
		t.Fatalf("mic came back: %v", dev.list()[before:])
	}
}

func TestBeepPlaysAToneAndSetsTheLED(t *testing.T) {
	s, store, _ := newTestSession("ble")
	if err := s.Beep("hit"); err != device.ErrNotConnected {
		t.Fatalf("beep without device: %v", err)
	}
	dev := newFakeDevice()
	_ = s.Attach(dev)
	for _, kind := range []string{"hit", "point", "miss"} {
		if err := s.Beep(kind); err != nil {
			t.Fatal(err)
		}
	}
	ops := strings.Join(dev.list(), "|")
	if strings.Count(ops, "cmd speaker") != 3 || !strings.Contains(ops, "write led 01 00 FF 00") || !strings.Contains(ops, "write led 01 FF 00 00") {
		t.Fatalf("ops %s", ops)
	}
	if led := store.Snapshot().UI.LED; led == nil || led.R != 255 {
		t.Fatalf("led after miss %+v", led)
	}
	if err := s.Beep("boom"); err == nil {
		t.Fatal("unknown kind accepted")
	}
}
