//go:build !windows

// Package ble is the Bluetooth LE adapter. Only Windows is supported; elsewhere use --sim.
package ble

import (
	"context"
	"errors"

	"github.com/stefaneicher/disroop-thingy-arcade/bridge/internal/device"
)

var errUnsupported = errors.New("Bluetooth wird nur unter Windows unterstützt (--sim verwenden)")

// Connector always fails outside Windows.
type Connector struct{}

// New returns the unsupported connector.
func New(string, func(string, ...any)) *Connector { return &Connector{} }

// Source implements device.Connector.
func (c *Connector) Source() string { return "ble" }

// Connect implements device.Connector.
func (c *Connector) Connect(context.Context) (device.Device, error) { return nil, errUnsupported }

// Scan implements device.Scanner.
func (c *Connector) Scan(context.Context, func(device.Info)) error { return errUnsupported }
