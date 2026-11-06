//go:build windows

package tui

import (
	"os"

	"golang.org/x/sys/windows"
)

// enableVT turns on ANSI escape processing and UTF-8 output in the Windows console.
func enableVT() {
	h := windows.Handle(os.Stdout.Fd())
	var mode uint32
	if windows.GetConsoleMode(h, &mode) == nil {
		_ = windows.SetConsoleMode(h, mode|windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING)
	}
	_ = windows.SetConsoleOutputCP(65001) // UTF-8
}
