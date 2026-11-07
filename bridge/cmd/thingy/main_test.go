package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestParseArgs(t *testing.T) {
	tests := []struct {
		args []string
		want options
	}{
		{nil, options{command: "live", port: 8052, volume: 100, backup: "build/nfc-backup.hex"}},
		{[]string{"--sim", "--no-tui", "--port", "9000"}, options{command: "live", sim: true, noTUI: true, port: 9000, volume: 100, backup: "build/nfc-backup-sim.hex"}},
		{[]string{"--mic", "--skip", "euler"}, options{command: "live", mic: true, skip: "euler", port: 8052, volume: 100, backup: "build/nfc-backup.hex"}},
		{[]string{"song", "--volume", "40", "--addr", "E3:58:08:1B:53:5F"}, options{command: "song", addr: "E3:58:08:1B:53:5F", port: 8052, volume: 40, backup: "build/nfc-backup.hex"}},
		{[]string{"nfc", "--restore"}, options{command: "nfc", restore: true, port: 8052, volume: 100, backup: "build/nfc-backup.hex"}},
		{[]string{"tennis", "--sim", "--no-browser"}, options{command: "tennis", sim: true, noBrowser: true, port: 8052, volume: 100, backup: "build/nfc-backup-sim.hex"}},
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

type syncBuffer struct {
	mu sync.Mutex
	b  bytes.Buffer
}

func (s *syncBuffer) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.b.Write(p)
}
func (s *syncBuffer) String() string { s.mu.Lock(); defer s.mu.Unlock(); return s.b.String() }

func TestTennisCommandServesTheGameAndOpensTheBrowser(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	opened := make(chan string, 1)
	orig := openBrowser
	openBrowser = func(url string) error { opened <- url; return nil }
	defer func() { openBrowser = orig }()

	ctx, cancel := context.WithCancel(context.Background())
	var out syncBuffer
	done := make(chan int)
	go func() {
		done <- runContext(ctx, []string{"tennis", "--sim", "--no-tui", "--port", fmt.Sprint(port)}, &out, &out)
	}()
	var url string
	select {
	case url = <-opened:
	case <-time.After(10 * time.Second):
		t.Fatalf("browser not opened: %s", out.String())
	}
	if want := fmt.Sprintf("http://127.0.0.1:%d/tennis/", port); url != want {
		t.Fatalf("opened %q, want %q", url, want)
	}
	res, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if !strings.Contains(string(body), "Tennis") {
		t.Fatalf("/tennis/: %d %q", res.StatusCode, body)
	}
	cancel()
	select {
	case code := <-done:
		if code != 0 {
			t.Fatalf("exit %d: %s", code, out.String())
		}
	case <-time.After(10 * time.Second):
		t.Fatal("no shutdown")
	}
}
