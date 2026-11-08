# Entwicklung

## Devcontainer

Builds und Tests laufen **nur** im Image aus [.devcontainer/Dockerfile](../.devcontainer/Dockerfile). Das Image basiert auf Debian trixie und enthält:
- Go 1.27.3 + staticcheck + gcc (für `-race`)
- Node 26.13.0
- OpenJDK 21
- Android SDK (platform 36, build-tools 36.1.0)
- Chromium

So nutzt du das Image:
- **CLI:** `./project …` startet für jeden Schritt einen Container (`docker run --rm`, Repo unter `/workspace`, eigene UID). Fehlt das Image, baut `./project` es automatisch. Neu bauen: `./project image`.
- **Caches** liegen im Docker-Volume `disroop-sensor-playground-cache` (`/opt/cache`): Go-Build, Go-Module, Gradle. Leeren mit `docker volume rm disroop-sensor-playground-cache`.
- **VS Code:** „Reopen in Container“ ([devcontainer.json](../.devcontainer/devcontainer.json)) mit den Extensions Go, Kotlin, Gradle und ESLint.

Lokal brauchst du nur WSL2 und Docker. Installiere keine Toolchains lokal.

## VS Code: Disroop-Farben

`.vscode/settings.json` färbt VS Code für dieses Projekt in den Disroop-Farben des Dashboards (Grau-Blau `#111827`,
Limette `#a3e635`, Petrol `#2aa5a1`). Grundlage ist das eingebaute Theme „Default Dark Modern“; die Farben gelten nur in
diesem Ordner, auch im Devcontainer.

## Regeln (Kurzfassung von [ENGINEERING.md](ENGINEERING.md))

- **TDD:** Zuerst ein fehlschlagender Test, dann die minimale Implementierung, dann refactoren. Decoder testest du mit den Bytes aus [protocol.md](protocol.md).
- **Ports & Adapters:** Hardware liegt hinter Interfaces (Go `device.Device`, Android `ThingyConnection`). Die Logik läuft ohne Gerät.
- **Simulator first:** Jede App hat eine Simulator-Quelle (`source: "sim"`), und jede App hat einen Smoke-Test gegen den Simulator.
- **Verträge:** [protocol.md](protocol.md), [telemetry.schema.json](telemetry.schema.json) und [hardware/shared/chorus.json](../hardware/shared/chorus.json) sind verbindlich. Änderst du sie, passt du alle drei Clients an.
- **Ordner-Besitz:** `scripts/<bereich>.sh` gehört zum jeweiligen Bereich (bridge, web, android).

## Tests je Bereich

| Bereich | Befehl | Was läuft |
|---|---|---|
| alles | `./project test` | bridge → web → tennis → android |
| Bridge (Go) | `./project bridge test` | `gofmt -l`, `go vet` + `staticcheck` (Linux **und** `GOOS=windows`), `go test -race ./...`, Build, Smoke |
| Bridge-Smoke | `./project bridge smoke` | [hardware/thingy-bridge/scripts/smoke.sh](../hardware/thingy-bridge/scripts/smoke.sh): siehe unten |
| Web-Unit | `./project web unit` | `node --test hardware/thingy-bridge/web/test/` |
| Web-Smoke | `./project web smoke` | [dev/smoke.js](../hardware/thingy-bridge/web/dev/smoke.js): Mock-Server + headless Chromium (CDP) |
| Spiele | `./project games test` | Build, `tsc` strikt, `node --test games/test/`, Smoke im headless Chromium (Software-WebGL) |
| Android | `./project android test` | `./gradlew test :app:lintDebug` (JUnit `:protocol` + `:app`, Lint mit `abortOnError`) |

Einzelne Go-Tests im Container:

```bash
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/workspace -v disroop-sensor-playground-cache:/opt/cache \
  -e GOMODCACHE=/opt/cache/gomod -e GOFLAGS=-buildvcs=false -w /workspace/hardware/thingy-bridge disroop-sensor-playground-dev \
  bash -c 'cp ../shared/chorus.json internal/song/ && go test ./internal/thingy -run Decode -v'
```

`hardware/thingy-bridge/internal/song/chorus.json` ist eine gitignorierte Kopie von `hardware/shared/chorus.json`, weil `go:embed` die Datei im Modul braucht. `scripts/bridge.sh` kopiert sie vor jedem Build und Test.

### Smoke-Tests

- **Bridge** (`hardware/thingy-bridge/scripts/smoke.sh`) startet `thingy-linux --sim --no-tui` und prüft:
  - `/healthz`
  - `/api/state`: alle Schema-Pflichtfelder vorhanden, `source = sim`
  - SSE: 3–32 `telemetry`-Events in 3 s
  - `POST /api/song` play/stop, `POST /api/led`
  - MIME-Typ von `/`
  - `POST /api/beep` (204, unbekannte Art 400), `/tennis/` samt lokalem three.js
  - WebSocket `/api/motion` mit ≥ 50 Frames/s (`games/dev/motion-rate.js`)
  - Tennis-Smoke (SIM-Badge, Motion-Frames im Browser) und Dashboard-Smoke im headless Chromium gegen die echte Bridge
  - sauberes Beenden bei `SIGINT`

  Das Log liegt in `build/smoke-bridge.log`.
- **Web** (`hardware/thingy-bridge/web/dev/smoke.js`, Optionen `--url`, `--screenshot`): lädt das Dashboard, wartet auf Live-Werte, bedient Lied und LED und schlägt bei jedem JS-Fehler fehl.
- **Android** (`SimulatorSmokeTest`): Simulator-Rohbytes → echte Decoder → Reducer → ViewModel-State, auf der JVM.
- **Hardware:** Diese Tests brauchen einen echten Thingy und laufen nicht in der CI. TODO (in Arbeit): Hardware-Smoke-Test (`tests/hardware/`).

## Sensor end-to-end hinzufügen

Beispiel: eine neue Notify-Characteristic `EF68040X`.

1. **Vertrag:**
   - [docs/protocol.md](protocol.md): Zeile mit Format und Einheit, falls nötig die Startsequenz anpassen.
   - [docs/telemetry.schema.json](telemetry.schema.json): neues Feld, nullable.
   - [hardware/shared/telemetry.example.json](../hardware/shared/telemetry.example.json): Beispielwert ergänzen.
2. **Go-Decoder** (`hardware/thingy-bridge/internal/thingy`):
   - Test in `decode_test.go` mit Beispiel-Bytes zuerst, dann `DecodeXyz` in `decode.go`.
   - UUID in `uuids.go` und in `NotifyChars` eintragen.
3. **Snapshot + Session:**
   - Feld in `internal/telemetry/snapshot.go`, inkl. `Clone`.
   - `case` in `internal/app/handle.go` (`apply`), dazu ein Test in `session_test.go`.
4. **Simulator:** In `internal/device/sim/sim.go` die rohen Firmware-Bytes erzeugen und senden. So deckt der Smoke-Test das Feld ab.
5. **Terminal:** Zeile in `internal/tui/tui.go` (`Render`) + `tui_test.go`.
6. **Web** (`hardware/thingy-bridge/web`):
   - Wert in `dev/sim.js` erzeugen.
   - Formatierung und Logik in einem reinen Modul unter `static/js/` mit Test in `test/`.
   - Element in `static/index.html`, Ausgabe in `view.js`.
   - Zum Schluss `./project web test`.
7. **Android** (`hardware/android/protocol`, dann `hardware/android/app`):
   - `ThingyUuids`, Decoder in `ThingyDecoders` + `DecodersTest`
   - `TelemetryEvent` und Mapping in `NotificationDecoder`
   - Feld in `Snapshot` + `reduce` (`SnapshotTest`)
   - `NotificationEncoder` für den Simulator, `SimulatedThingy` emittiert den Wert
   - Abo in `StartSequence`, falls nötig
   - Anzeige in `ui/ThingyScreen.kt`
8. **Alles prüfen:** `./project test`, dann mit Hardware `./project bridge run` und die App.

## CI

Geplant: je Bereich ein Workflow `.github/workflows/<bereich>.yml`. Er nutzt dasselbe Devcontainer-Image und ruft `./project <bereich> test` auf. Dazu kommt ein Release mit `thingy.exe` und der APK. TODO: Es existieren noch keine Workflows.

## Commits

Commits gehen direkt auf `main`, in kleinen Schritten, mit dem Trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`. Im Multi-Agent-Betrieb committet nur der Manager.
