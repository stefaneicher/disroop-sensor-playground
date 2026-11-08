# Hardware-Smoke-Test (echtes Thingy:52)

`tests/hardware/smoke.sh` prüft `build/thingy.exe` Ende-zu-Ende gegen das echte Thingy:52 mit Werksfirmware über BLE.
Der Simulator-Smoke-Test (`./project bridge smoke`) deckt die Logik ab. Dieser Test prüft zusätzlich Funk, Firmware und Messwerte.
Er läuft nicht in der CI, weil er Windows-Bluetooth und das Gerät braucht.

## Voraussetzungen
- WSL mit Windows-Interop. `thingy.exe` läuft als Windows-Prozess, `curl.exe` erreicht dessen `127.0.0.1`. Linux-`curl` erreicht ihn nicht.
- `python3` in WSL. Damit werden die JSON-Werte geprüft (`tests/hardware/state_check.py`).
- Optional Chrome unter `C:\Program Files\Google\Chrome` für den Screenshot.
- Thingy wach und **nicht** mit einem anderen Central verbunden (nRF-App, zweite Bridge). Es ist nur eine Verbindung möglich.
- Solange `build/hw-lock` existiert, nutzt jemand anderes das Thingy. Das Skript wartet dann (alle 60 s, max. `LOCK_WAIT` s, Standard 3600) und baut danach frisch.

## Aufruf
```bash
tests/hardware/smoke.sh                 # Standardlauf, ohne NFC
tests/hardware/smoke.sh --wait 2700     # bis 45 min auf das schlafende Thingy warten
tests/hardware/smoke.sh --nfc           # zusätzlich NFC-Tag auf die App umschreiben (verändert das Gerät!)
```
Optionen: `--wait SEK` (Scan-Gesamtbudget, Standard 600), `--scan-secs SEK` (Standard 15), `--port` (Standard 8052), `--no-build`, `--no-screenshot`.
Umgebung: `THINGY_ADDR` (Standard `E3:58:08:1B:53:5F`), `SONG_VOLUME` (Standard 30).
Exit-Code 0 = alle Schritte PASS (WARN zählt nicht als Fehler), sonst 1.

## Was geprüft wird
| Schritt | Prüfung |
|---|---|
| build | `./project bridge build`, wenn `thingy.exe` fehlt oder älter als `hardware/thingy-bridge/`/`hardware/shared/` ist |
| scan | `thingy.exe scan` findet die Adresse. Scans à 15 s, dazwischen 15 s Pause, bis `--wait` abgelaufen ist („Thingy schläft? Taste drücken“) |
| connect | `thingy.exe --no-tui` im Hintergrund. `/healthz` = ok, dann `/api/state` mit `connected:true` und `device.source:"ble"` (max. 120 s) |
| values | \|accel\| 0,8–1,2 g, Gyro und Kompass vorhanden, Heading 0–360°, Temperatur 5–45 °C, Feuchte 5–95 %, Druck 850–1100 hPa, eCO₂ ≥ 400 ppm (bis 60 s Aufwärmzeit), Akku 1–100 %, Mikrofon −100..0 dBFS, RSSI vorhanden |
| live | zwei Snapshots im Abstand von 2 s: Bewegungswerte **und** Mikrofonpegel ändern sich |
| sse | `/api/stream` liefert in 3 s mindestens 5 `telemetry`-Events |
| song | `POST /api/song play` → 202, `playing:true`, `note_index` läuft weiter, `stop` → `playing:false` |
| led | `POST /api/led` rot → 204, `ui.led` = {255,0,0}, danach aus → {0,0,0} |
| web | `GET /` liefert HTML. Headless-Chrome-Screenshot → `build/hw-dashboard.png` |
| nfc (nur `--nfc`) | Bridge stoppen, `thingy.exe nfc`: Backup nach `build/nfc-backup.hex` (nur beim ersten Mal), AAR `ch.disroop.sensorplayground` schreiben, zurücklesen und vergleichen |

Am Ende stoppt das Skript die Bridge, auch bei Abbruch (`trap EXIT`). Zuerst kommt SIGINT, dann `taskkill` auf die Windows-PID, falls nötig.

## Artefakte
- `build/hw-smoke.log`: Testprotokoll mit Zusammenfassung und Bridge-Log
- `build/hw-bridge.log`: Ausgabe von `thingy.exe --no-tui`
- `build/hw-state.json`: Beispiel-Snapshot von `/api/state`
- `build/hw-dashboard.png`: Screenshot des Dashboards
- `build/nfc-backup.hex`: ursprünglicher NFC-Inhalt (nur mit `--nfc`). Zurückschreiben mit `./project bridge nfc --restore`

## Ergebnisse
_wird nach dem ersten echten Lauf ergänzt_
