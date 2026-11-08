//go:build windows

// Package ble is the Bluetooth LE adapter (tinygo.org/x/bluetooth, WinRT) for a Thingy:52.
package ble

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"tinygo.org/x/bluetooth"

	"github.com/stefaneicher/disroop-sensor-playground/hardware/thingy-bridge/internal/device"
	"github.com/stefaneicher/disroop-sensor-playground/hardware/thingy-bridge/internal/thingy"
)

const (
	findTimeout    = 20 * time.Second
	connectTimeout = 15 * time.Second
	pollConnected  = 2 * time.Second
)

// Connector connects to a Thingy by address, or to the first Thingy found if addr is empty.
type Connector struct {
	adapter *bluetooth.Adapter
	addr    string
	logf    func(string, ...any)

	enableOnce sync.Once
	enableErr  error
	mu         sync.Mutex
	current    *Device
}

// New returns a BLE connector using the default adapter.
func New(addr string, logf func(string, ...any)) *Connector {
	return &Connector{adapter: bluetooth.DefaultAdapter, addr: strings.ToUpper(addr), logf: logf}
}

// Source implements device.Connector.
func (c *Connector) Source() string { return "ble" }

func (c *Connector) enable() error {
	c.enableOnce.Do(func() {
		c.adapter.SetConnectionStateHandler(c.onConnectionState)
		c.enableErr = c.adapter.Enable()
	})
	return c.enableErr
}

func (c *Connector) onConnectionState(d bluetooth.Device, state bluetooth.ConnectionState) {
	if state.Connected {
		return
	}
	c.mu.Lock()
	cur := c.current
	c.mu.Unlock()
	if cur != nil && cur.dev.Address.String() == d.Address.String() {
		cur.markDone("Windows meldet Verbindungsabbruch")
	}
}

func isThingy(r bluetooth.ScanResult) bool {
	return strings.Contains(strings.ToLower(r.LocalName()), "thingy") ||
		r.HasServiceUUID(mustUUID(thingy.ConfigService))
}

func mustUUID(s string) bluetooth.UUID {
	u, err := bluetooth.ParseUUID(s)
	if err != nil {
		panic(err)
	}
	return u
}

func infoOf(r bluetooth.ScanResult) device.Info {
	name := r.LocalName()
	if name == "" {
		name = "Thingy"
	}
	return device.Info{Name: name, Address: r.Address.String(), RSSI: int(r.RSSI)}
}

// scan reports every Thingy once until ctx ends or stop returns true.
func (c *Connector) scan(ctx context.Context, onThingy func(bluetooth.ScanResult) (stop bool)) error {
	if err := c.enable(); err != nil {
		return fmt.Errorf("Bluetooth-Adapter: %w", err)
	}
	stopCh := make(chan struct{})
	var stopOnce sync.Once
	stop := func() { stopOnce.Do(func() { close(stopCh) }) }
	go func() {
		select {
		case <-ctx.Done():
		case <-stopCh:
		}
		_ = c.adapter.StopScan()
	}()
	defer stop()
	seen := map[string]bool{}
	return c.adapter.Scan(func(_ *bluetooth.Adapter, r bluetooth.ScanResult) {
		key := r.Address.String()
		if seen[key] || !isThingy(r) {
			return
		}
		seen[key] = true
		if onThingy(r) {
			stop()
		}
	})
}

// Scan implements device.Scanner.
func (c *Connector) Scan(ctx context.Context, found func(device.Info)) error {
	return c.scan(ctx, func(r bluetooth.ScanResult) bool { found(infoOf(r)); return false })
}

func (c *Connector) find(ctx context.Context) (bluetooth.ScanResult, error) {
	ctx, cancel := context.WithTimeout(ctx, findTimeout)
	defer cancel()
	var match *bluetooth.ScanResult
	err := c.scan(ctx, func(r bluetooth.ScanResult) bool {
		if c.addr == "" || strings.EqualFold(r.Address.String(), c.addr) {
			match = &r
			return true
		}
		return false
	})
	if err != nil {
		return bluetooth.ScanResult{}, err
	}
	if match == nil {
		if c.addr != "" {
			return bluetooth.ScanResult{}, fmt.Errorf("%w (Adresse %s)", device.ErrNotFound, c.addr)
		}
		return bluetooth.ScanResult{}, device.ErrNotFound
	}
	return *match, nil
}

// Connect implements device.Connector.
func (c *Connector) Connect(ctx context.Context) (device.Device, error) {
	found, err := c.find(ctx)
	if err != nil {
		return nil, err
	}
	info := infoOf(found)
	c.logf("Gefunden: %s %s (%d dBm), verbinde …", info.Name, info.Address, info.RSSI)
	dev, err := c.adapter.Connect(found.Address, bluetooth.ConnectionParams{
		ConnectionTimeout: bluetooth.NewDuration(connectTimeout),
	})
	if err != nil {
		return nil, fmt.Errorf("verbinden: %w", err)
	}
	// Short connection interval for the fast motion channel (Windows 11: ThroughputOptimized).
	// tinygo would request it inside Connect too, but hides the error.
	if err := dev.RequestConnectionParams(bluetooth.ConnectionParams{Priority: bluetooth.ConnectionPriorityThroughput}); err != nil {
		c.logf("Verbindungsparameter „Durchsatz“ nicht übernommen: %v", err)
	}
	d := &Device{dev: dev, info: info, logf: c.logf, gens: map[string]*atomic.Int64{}, chars: map[string]bluetooth.DeviceCharacteristic{}, done: make(chan struct{})}
	if err := d.discover(); err != nil {
		_ = dev.Disconnect()
		return nil, err
	}
	if ch, ok := d.chars[thingy.RawMotionChar.UUID]; ok {
		mtu, err := ch.GetMTU()
		c.logf("GATT bereit, MTU %d (%v)", mtu, err)
	}
	c.mu.Lock()
	c.current = d
	c.mu.Unlock()
	go d.watch()
	return d, nil
}

// Device is a connected Thingy.
type Device struct {
	dev   bluetooth.Device
	info  device.Info
	chars map[string]bluetooth.DeviceCharacteristic

	logf func(string, ...any)
	// gens invalidates callbacks of earlier subscriptions: tinygo registers a new WinRT handler on every
	// EnableNotifications and cannot remove the old one.
	gens     map[string]*atomic.Int64
	mu       sync.Mutex // serializes GATT operations
	done     chan struct{}
	doneOnce sync.Once
}

func (d *Device) discover() error {
	services, err := d.dev.DiscoverServices(nil)
	if err != nil {
		return fmt.Errorf("Services suchen: %w", err)
	}
	wanted := map[string]bool{}
	for _, s := range thingy.Services {
		wanted[s] = true
	}
	for _, svc := range services {
		if !wanted[svc.UUID().String()] {
			continue
		}
		chars, err := svc.DiscoverCharacteristics(nil)
		if err != nil {
			return fmt.Errorf("Characteristics von %s: %w", svc.UUID(), err)
		}
		for _, ch := range chars {
			d.chars[ch.UUID().String()] = ch
			d.gens[ch.UUID().String()] = new(atomic.Int64)
		}
	}
	if _, ok := d.chars[thingy.RawMotionChar.UUID]; !ok {
		return errors.New("Motion-Service nicht gefunden – ist das ein Thingy:52 mit Werksfirmware?")
	}
	return nil
}

func (d *Device) watch() {
	t := time.NewTicker(pollConnected)
	defer t.Stop()
	for {
		select {
		case <-d.done:
			return
		case <-t.C:
			if ok, err := d.dev.Connected(); err == nil && !ok {
				d.markDone("Verbindungsstatus: getrennt")
			}
		}
	}
}

func (d *Device) markDone(reason string) {
	d.doneOnce.Do(func() {
		d.logf("BLE: %s", reason)
		close(d.done)
	})
}

func (d *Device) char(c thingy.Char) (bluetooth.DeviceCharacteristic, error) {
	select {
	case <-d.done:
		return bluetooth.DeviceCharacteristic{}, device.ErrNotConnected
	default:
	}
	ch, ok := d.chars[c.UUID]
	if !ok {
		return ch, fmt.Errorf("Characteristic %s nicht gefunden", c.Name)
	}
	return ch, nil
}

// Info implements device.Device.
func (d *Device) Info() device.Info { return d.info }

// Read implements device.Device.
func (d *Device) Read(c thingy.Char) ([]byte, error) {
	ch, err := d.char(c)
	if err != nil {
		return nil, err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	buf := make([]byte, 512)
	n, err := ch.Read(buf)
	if err != nil {
		return nil, fmt.Errorf("%s lesen: %w", c.Name, err)
	}
	return buf[:n], nil
}

// Write implements device.Device.
func (d *Device) Write(c thingy.Char, data []byte) error {
	ch, err := d.char(c)
	if err != nil {
		return err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if _, err := ch.Write(data); err != nil {
		return fmt.Errorf("%s schreiben: %w", c.Name, err)
	}
	return nil
}

// WriteNoResponse implements device.Device.
func (d *Device) WriteNoResponse(c thingy.Char, data []byte) error {
	ch, err := d.char(c)
	if err != nil {
		return err
	}
	d.mu.Lock()
	_, err = ch.WriteWithoutResponse(data)
	d.mu.Unlock()
	if err != nil {
		return d.Write(c, data)
	}
	return nil
}

// Subscribe implements device.Device.
func (d *Device) Subscribe(c thingy.Char, fn func([]byte)) error {
	ch, err := d.char(c)
	if err != nil {
		return err
	}
	gen := d.gens[c.UUID]
	mine := gen.Add(1)
	d.mu.Lock()
	defer d.mu.Unlock()
	return ch.EnableNotifications(func(buf []byte) {
		if gen.Load() == mine {
			fn(append([]byte(nil), buf...))
		}
	})
}

// Unsubscribe implements device.Device (writes the CCCD to "none").
func (d *Device) Unsubscribe(c thingy.Char) error {
	ch, err := d.char(c)
	if err != nil {
		return err
	}
	d.gens[c.UUID].Add(1)
	d.mu.Lock()
	defer d.mu.Unlock()
	return ch.EnableNotifications(nil)
}

// Done implements device.Device.
func (d *Device) Done() <-chan struct{} { return d.done }

// Close implements device.Device.
func (d *Device) Close() error {
	d.markDone("getrennt (Close)")
	return d.dev.Disconnect()
}
