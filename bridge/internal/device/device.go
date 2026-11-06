// Package device is the port to a Thingy:52. Adapters: sim (simulator) and ble (Windows, tinygo bluetooth).
package device

import (
	"context"
	"errors"

	"github.com/stefaneicher/thingy52-live/bridge/internal/thingy"
)

// ErrNotConnected is returned by operations that need a connection.
var ErrNotConnected = errors.New("Thingy nicht verbunden")

// ErrNotFound is returned when no Thingy advertises – usually it sleeps after a few minutes without connection.
var ErrNotFound = errors.New("Thingy nicht gefunden – Taste drücken oder schütteln, um es zu wecken")

// Info describes a connected or discovered device.
type Info struct {
	Name    string
	Address string
	RSSI    int // dBm, 0 if unknown
}

// Device is a connected Thingy.
type Device interface {
	Info() Info
	Read(c thingy.Char) ([]byte, error)
	// Write writes with response.
	Write(c thingy.Char, data []byte) error
	// WriteNoResponse writes without response if the characteristic supports it, otherwise with response.
	WriteNoResponse(c thingy.Char, data []byte) error
	// Subscribe enables notifications. fn runs on an adapter goroutine and must not block.
	Subscribe(c thingy.Char, fn func([]byte)) error
	// Unsubscribe disables notifications; fn of the previous Subscribe is not called anymore.
	Unsubscribe(c thingy.Char) error
	// Done is closed when the connection is lost or closed.
	Done() <-chan struct{}
	Close() error
}

// Connector creates connections.
type Connector interface {
	// Source is "ble" or "sim".
	Source() string
	Connect(ctx context.Context) (Device, error)
}

// Scanner lists Thingys in range.
type Scanner interface {
	Scan(ctx context.Context, found func(Info)) error
}
