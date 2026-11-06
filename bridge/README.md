# bridge – `thingy.exe`

Die Go-Bridge verbindet sich per Bluetooth LE mit dem Thingy:52 (Werksfirmware). Sie zeigt alle Werte live im Terminal und stellt sie über HTTP/SSE auf `127.0.0.1:8052` bereit. Dort liefert sie auch das eingebettete [Web-Dashboard](web/README.md) aus. Ausserdem spielt sie das Lied und schreibt den NFC-Tag.

## Befehle

```bash
./project bridge test            # gofmt, vet, staticcheck (linux + windows), go test -race, build, smoke
./project bridge build           # ../build/thingy.exe + ../build/thingy-linux
./project bridge smoke           # thingy-linux --sim im Container gegen die HTTP-API + Dashboard prüfen
./project bridge run [--sim]     # bauen und auf Windows starten
./project bridge scan | song | nfc [--restore]
```

Alle Flags und Unterbefehle: [docs/USAGE.md](../docs/USAGE.md#thingyexe).

## Aufbau

```
cmd/thingy/           main: Flags, Unterbefehle, Verdrahtung (main_test.go: Argumente)
internal/thingy/      UUIDs, Decoder, Encoder (LED, Speaker, Configs, AAR), IMA-ADPCM, Pegelmesser
internal/device/      Port: Connector, Scanner, Device
  ble/                Adapter Windows (tinygo.org/x/bluetooth); ble_other.go = Stub
  sim/                Simulator, sendet rohe Firmware-Bytes
internal/app/         Session: Startsequenz, Reconnect, Notifications → Store; NFC programmieren
internal/telemetry/   Snapshot (= docs/telemetry.schema.json), Store mit Abos, LogBus
internal/song/        chorus.json parsen, Player (Schleife/einmal), Farbe je Tonhöhe
internal/server/      HTTP-API + SSE (≤ 10 Hz), explizite MIME-Typen, CORS
internal/tui/         Terminal-Live-Ansicht (ANSI; vt_windows.go aktiviert VT-Modus)
web/                  go:embed des Dashboards (web/static)
scripts/smoke.sh      Ende-zu-Ende-Smoke gegen den Simulator
```

Architektur und Datenfluss: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md). Protokoll und API: [docs/protocol.md](../docs/protocol.md).

## Hinweise

- **Cross-Compile:** `GOOS=windows GOARCH=amd64 CGO_ENABLED=0`. Der WinRT-Zugriff von `tinygo.org/x/bluetooth` braucht kein cgo.
- **Lied:** `internal/song/chorus.json` ist eine gitignorierte Kopie von `shared/chorus.json`, weil `go:embed` nur Dateien im Modul einbetten kann. `scripts/bridge.sh` kopiert sie vor jedem Build und Test.
- **Ohne Windows** liefert `device/ble` den Fehler „--sim verwenden“. Tests und Smoke laufen deshalb komplett mit `device/sim`.
- **Statische Analyse:** `staticcheck.conf` enthält die Projekt-Einstellungen.
- **Logs:** Die TUI zeigt die letzten Meldungen. `--no-tui` schreibt sie zeilenweise mit Zeitstempel. Im Dashboard erscheinen sie als SSE-Event `log`.
