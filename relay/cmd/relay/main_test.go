package main

import (
	"bytes"
	"context"
	"testing"
)

func TestRejectsMissingStaticDir(t *testing.T) {
	var out bytes.Buffer
	if err := run(context.Background(), []string{"-static", "/does/not/exist"}, &out); err == nil {
		t.Fatal("want error")
	}
}

func TestRejectsUnknownFlag(t *testing.T) {
	var out bytes.Buffer
	if err := run(context.Background(), []string{"-nope"}, &out); err == nil {
		t.Fatal("want error")
	}
}
