package app

import (
	"bytes"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/stefaneicher/thingy52-live/bridge/internal/device"
	"github.com/stefaneicher/thingy52-live/bridge/internal/thingy"
)

// ProgramNFC backs up the current NDEF message (only if no backup exists yet), writes the
// Android Application Record for the app, reads it back and verifies it.
func ProgramNFC(dev device.Device, backupPath string, logf Logf) error {
	current, err := dev.Read(thingy.NFCChar)
	if err != nil {
		return fmt.Errorf("NFC lesen: %w", err)
	}
	logf("NFC aktuell (%d B): % X", len(current), current)
	if err := writeBackupOnce(backupPath, current, logf); err != nil {
		return err
	}
	return writeVerified(dev, thingy.AndroidAppRecord(thingy.AppPackage), logf)
}

// RestoreNFC writes the backup back to the tag and verifies it.
func RestoreNFC(dev device.Device, backupPath string, logf Logf) error {
	backup, err := ReadBackup(backupPath)
	if err != nil {
		return err
	}
	return writeVerified(dev, backup, logf)
}

// ReadBackup reads a hex backup file.
func ReadBackup(path string) ([]byte, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("NFC-Backup lesen: %w", err)
	}
	return hex.DecodeString(strings.Join(strings.Fields(string(raw)), ""))
}

func writeBackupOnce(path string, data []byte, logf Logf) error {
	if _, err := os.Stat(path); err == nil {
		logf("NFC-Backup existiert bereits: %s (bleibt unverändert)", path)
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(path, []byte(strings.ToUpper(hex.EncodeToString(data))+"\n"), 0o644); err != nil {
		return fmt.Errorf("NFC-Backup schreiben: %w", err)
	}
	logf("NFC-Backup gespeichert: %s", path)
	return nil
}

func writeVerified(dev device.Device, msg []byte, logf Logf) error {
	if err := dev.Write(thingy.NFCChar, msg); err != nil {
		return fmt.Errorf("NFC schreiben: %w", err)
	}
	back, err := dev.Read(thingy.NFCChar)
	if err != nil {
		return fmt.Errorf("NFC zurücklesen: %w", err)
	}
	if !bytes.Equal(back, msg) {
		return fmt.Errorf("NFC-Prüfung fehlgeschlagen: geschrieben % X, gelesen % X", msg, back)
	}
	logf("NFC geschrieben und geprüft (%d B): % X", len(msg), msg)
	return nil
}
