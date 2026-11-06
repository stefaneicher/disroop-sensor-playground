package main

import (
	"bytes"
	"strings"
	"testing"
)

func TestParseArgs(t *testing.T) {
	tests := []struct {
		args []string
		want options
	}{
		{nil, options{command: "live", port: 8052, volume: 100, backup: "build/nfc-backup.hex"}},
		{[]string{"--sim", "--no-tui", "--port", "9000"}, options{command: "live", sim: true, noTUI: true, port: 9000, volume: 100, backup: "build/nfc-backup-sim.hex"}},
		{[]string{"song", "--volume", "40", "--addr", "E3:58:08:1B:53:5F"}, options{command: "song", addr: "E3:58:08:1B:53:5F", port: 8052, volume: 40, backup: "build/nfc-backup.hex"}},
		{[]string{"nfc", "--restore"}, options{command: "nfc", restore: true, port: 8052, volume: 100, backup: "build/nfc-backup.hex"}},
	}
	for _, tt := range tests {
		got, err := parseArgs(tt.args, &bytes.Buffer{})
		got.timeout = 0
		if err != nil || got != tt.want {
			t.Errorf("%v: got %+v, %v want %+v", tt.args, got, err, tt.want)
		}
	}
}

func TestParseArgsRejectsInvalid(t *testing.T) {
	for _, args := range [][]string{{"fly"}, {"--volume", "101"}, {"song", "extra"}} {
		if _, err := parseArgs(args, &bytes.Buffer{}); err == nil {
			t.Errorf("%v: want error", args)
		}
	}
}

func TestNFCCommandWithSimulator(t *testing.T) {
	var out bytes.Buffer
	backup := t.TempDir() + "/nfc.hex"
	if code := run([]string{"nfc", "--sim", "--backup", backup}, &out, &out); code != 0 {
		t.Fatalf("exit %d: %s", code, out.String())
	}
	if !strings.Contains(out.String(), "geprüft") {
		t.Fatalf("output %s", out.String())
	}
}
