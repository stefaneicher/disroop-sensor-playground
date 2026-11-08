# Protokoll-Vertrag (verbindlich für bridge, web, android)

Quelle: Nordic-Thingy52-FW v2.x (`include/ble_services/*.h`, `source/modules/m_motion.c`, `m_ble.c`).
Alle Mehrbyte-Werte sind **little-endian** (Ausnahme: ADPCM-Predictor, big-endian).

## 1. BLE GATT (Thingy-Werksfirmware)

Basis-UUID: `EF68xxxx-9B35-4933-9B10-52FFA9740042`. Advertising-Name: „Thingy“. Der Config-Service `EF680100` wird advertised.
Gefundenes Gerät: `E3:58:08:1B:53:5F`.

| Char | Name | Zugriff | Format → Einheit |
|---|---|---|---|
| `EF680201` | Temperatur | notify | i8 int, u8 dec → `int + dec/100` °C |
| `EF680202` | Druck | notify | i32 int, u8 dec → `int + dec/100` hPa |
| `EF680203` | Feuchte | notify | u8 → % |
| `EF680204` | Gas | notify | u16 eCO₂ ppm, u16 TVOC ppb |
| `EF680205` | Farbe | notify | u16 r, g, b, clear |
| `EF680206` | Env-Config | read/write | u16 temp_ms, u16 press_ms, u16 hum_ms, u16 color_ms, u8 gas_mode (0=250 ms, 1=1 s, 2=10 s, 3=60 s), u8 led_r, u8 led_g, u8 led_b (12 B) |
| `EF680301` | LED | read/write | `[0]` aus · `[1,r,g,b]` konstant · `[2,mix,intens,u16 delay]` atmen · `[3,mix,intens]` one-shot |
| `EF680302` | Taster | notify | u8 0 = los, 1 = gedrückt |
| `EF680401` | Motion-Config | read/write | u16 pedo_ms, u16 temp_ms, u16 compass_ms, u16 motion_freq_hz (5..200), u8 wake_on_motion (9 B) |
| `EF680402` | Tap | notify | u8 dir (1 = X+, 2 = X−, 3 = Y+, 4 = Y−, 5 = Z+, 6 = Z−), u8 count |
| `EF680403` | Lage | notify | u8 0 portrait, 1 landscape, 2 reverse_portrait, 3 reverse_landscape |
| `EF680404` | Quaternion | notify | 4× i32 w, x, y, z, je `/2^30` |
| `EF680405` | Schritte | notify | u32 steps, u32 time_ms |
| `EF680406` | Raw | notify | 9× i16: accel xyz `/1024` → g · gyro xyz `/32` → °/s · compass xyz `/16` → µT |
| `EF680407` | Euler | notify | 3× i32 roll, pitch, yaw, je `/65536` → ° |
| `EF680409` | Heading | notify | i32 `/65536` → ° (0..360) |
| `EF68040A` | Gravity | notify | 3× float32 (m/s²) |
| `EF680501` | Sound-Config | write | u8 speaker_mode (1 freq, 2 pcm 8 kHz, 3 sample), u8 mic_mode (1 adpcm) |
| `EF680502` | Speaker | write w/o resp | im Freq-Modus: u16 hz, u16 duration_ms, u8 volume 0..100 |
| `EF680503` | Speaker-Status | notify | u8 |
| `EF680504` | Mikrofon | notify | IMA/DVI-ADPCM-Frame: i16 predictor **big-endian** (htons in FW), u8 step_index, danach 4-Bit-Samples (**high nibble zuerst**), 16 kHz mono |
| `EF680109` | NFC (**erst ab FW v2.2.0**, fehlt in v2.1.0) | read/write | rohe **NDEF-Message** (ohne TLV), max. 247 B, wird persistent gespeichert |
| `2A19` (Service `180F`) | Akku | read/notify | u8 % (aus der Akkuspannung; Notify nur bei Änderung) |

### Motion One: Bedienplatine `EF680380` (Erweiterung, nicht Thingy)
Nur Motion One (hardware/motion-one, ADR `adr/systems/ADR-0002`). Zusatz-Characteristic im UI-Service `EF680300`, read/notify, 8 B LE.
Die Thingy-Characteristics bleiben unverändert; `EF680302` meldet nur den Taster der Hauptplatine. Clients ohne Kenntnis ignorieren die UUID.

| Byte | Typ | Inhalt |
|---|---|---|
| 0 | u8 | `version` = 1 |
| 1 | u8 | flags: bit0 `present`, bit1 Stick-Taste, bit2 Touch, bit3 Touch gesperrt (Spam), bit4 Mitte kalibriert, Rest 0 |
| 2 | i8 | Stick X −100..100 % (+ = rechts), Totzone 8 % |
| 3 | i8 | Stick Y −100..100 % (+ = vorne/weg vom Griff) |
| 4–5 | u16 | `seq`, +1 je Notify (Überlauf), erkennt Verluste |
| 6–7 | u16 | reserviert = 0 |

Notify nur bei Änderung und nur abonniert, höchstens 20/s, bei `motion_freq_hz` > 50 höchstens 10/s (Stick 50 ms aktiv / 500 ms Ruhe); Touch sofort nach 30 ms Entprellung.
Ohne Bedienplatine: `present` = 0, x = y = 0, alle Bits 0; genau ein Notify nach dem Abo, danach keine. Clients akzeptieren Länge ≥ 8 und ignorieren Bytes ab 8; bei `version` ≠ 1 nur Byte 0–1 auswerten.

### Akku-Trend (lädt / Akkubetrieb) – Heuristik
Die Werksfirmware kennt USB-Versorgung und Ladezustand intern (`m_batt_meas`: Pins USB_DETECT und CSO des Ladereglers),
veröffentlicht sie aber **nicht** über BLE. Über BLE kommt nur der Akkustand in % (Service `180F`), berechnet aus der Spannung.
Ob der Thingy lädt, wird deshalb aus dem **Verlauf des Akkustands geschätzt**. Es ist kein Firmware-Flag.
Bridge (`hardware/thingy-bridge/internal/battery`) und App (`BatteryTrendTracker`) verwenden dieselbe Regel:

1. Jeder Akkuwert wird mit Zeitstempel gespeichert. Zwischen zwei Werten gilt der letzte Wert weiter, denn die Firmware meldet nur Änderungen.
2. Über die letzten **5 Minuten** wird der Wert alle **15 s** abgetastet und mit einem **Median über 5 Werte** (≈ 1 min) geglättet.
   Das filtert kurze Spannungseinbrüche unter Last (Lautsprecher, LED) und ±1-%-Rauschen.
3. Eine Ausgleichsgerade (lineare Regression) liefert die Änderung über das Fenster.
   **≥ +1 Prozentpunkt → `charging`**, **≤ −1 Prozentpunkt → `discharging`**.
   Eine kleinere Änderung **behält die letzte Entscheidung** (Hysterese).
4. **`unknown`**, solange seit dem Verbinden weniger als **2 Minuten** Daten vorliegen, und solange sich der Wert noch nie deutlich bewegt hat.
   Bei jedem (Neu-)Verbinden beginnt die Schätzung von vorn.
5. Ohne neue Akkuwerte wird die Regel höchstens alle 10 s neu bewertet, ausgelöst durch andere Notifications.

Grenzen: **„Voll“ ist nicht erkennbar.** Bei 100 % am Kabel bleibt der Wert stehen, die Anzeige bleibt beim letzten Trend
(meist `charging`). Wird das Kabel bei konstantem Wert gezogen, wechselt die Anzeige erst nach einem Abfall um ≥ 1 Prozentpunkt.
Im Akkubetrieb sinkt der Stand nur langsam. `discharging` erscheint deshalb oft erst nach dem ersten Schritt nach unten.
Lange Lastspitzen (Lied in Endlosschleife) können den Wert vorübergehend senken.

### Startsequenz (Client)
1. Verbinden (keine Bonding-Pflicht).
2. Motion-Config schreiben: `pedo 1000, temp 500, compass 100, motion_freq_hz 10, wake 1`.
3. Env-Config: zuerst lesen, dann `temp/press/hum/color 1000 ms, gas_mode 1` schreiben. Die LED-Bytes aus dem Lesen übernehmen.
4. Sound-Config schreiben: `[1, 1]` (Freq-Speaker, ADPCM-Mikrofon).
5. Notifications abonnieren: alle `notify`-Zeilen oben. Gravity und Quaternion sind optional.

### Lautstärke aus dem Mikrofon
Das Mikrofon ist **standardmässig aus**, weil der Audio-Stream (~32 kB/s) zusammen mit allen anderen Notifications die BLE-Verbindung unter Windows abbrechen lässt. Einschalten auf Wunsch über `POST /api/mic` oder `--mic`. Bei Abbruch schaltet die Bridge es automatisch wieder aus.
Im **Spielmodus** (siehe „Motion-Kanal“) ist es gesperrt: `sound.mic_blocked` ist `true`, `POST /api/mic` mit `enabled:true`
antwortet 409.
Frame IMA-ADPCM-dekodieren, RMS über den Frame bilden, `level_dbfs = 20*log10(rms/32768)` auf −100..0 klemmen.
Geglättet (EMA α=0.3) mit ~10 Hz publizieren.

### Lied
`hardware/shared/chorus.json` ist die einzige Quelle: `notes[] {on_ms, off_ms, hz}`, `pause_ms`.
Pro Note `[hz u16, on_ms u16, volume u8]` an `EF680502` schreiben und `on_ms + off_ms` warten. Volume Default 100.
Parallel die LED setzen: Note an = Farbe je Tonhöhe, Note aus = LED aus.
Ein Tastendruck am Thingy startet oder stoppt das Lied.

### NFC → eigene App
NDEF-Message mit einem Record: TNF=4 (External), Type `android.com:pkg`, Payload `ch.disroop.sensorplayground`.
Bytes: `D4 0F 1B` + ASCII `android.com:pkg` + ASCII `ch.disroop.sensorplayground` (45 B gesamt).
`D4` = MB|ME|SR|TNF 4, `0F` = Type-Länge 15, `15` = Payload-Länge 21.

## 2. Bridge-API (HTTP auf `127.0.0.1:8052`, Web-GUI und Smoke-Tests)

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/` | Dashboard (eingebettet aus `hardware/thingy-bridge/web/`) |
| GET | `/api/state` | aktueller Snapshot (JSON) |
| GET | `/api/stream` | Server-Sent Events: `event: telemetry` + `data: <Snapshot>` mit ≤ 10 Hz; `event: log` + `data: {"msg": "..."}` |
| POST | `/api/song` | Body `{"action":"play"\|"stop","volume":0..100}` → 202 |
| POST | `/api/led` | Body `{"r":0..255,"g":..,"b":..}` → 204 |
| POST | `/api/mic` | Body `{"enabled":true\|false}` → 202, Mikrofon/Lautstärke ein/aus; im Spielmodus `enabled:true` → 409 `{"error":"Mikrofon ist im Spielmodus gesperrt (Bluetooth-Bandbreite)"}` |
| GET | `/api/motion` | WebSocket, schneller Motion-Kanal für Spiele (siehe „Motion-Kanal“) |
| POST | `/api/beep` | Body `{"kind":"hit"\|"point"\|"miss"}` (leer = `hit`) → 204: kurzer Ton + LED-Farbe, max. 1 pro 100 ms (sonst 429) |
| GET | `/tennis/` | Tennis (eingebettet aus `hardware/thingy-bridge/internal/tennisapp/dist`, gebaut aus `games/`), 404 mit Bauhinweis, wenn nicht eingebaut |
| GET | `/healthz` | `ok` |

Fehler: 400 ungültige Eingabe, 405 falsche Methode, 409 im Spielmodus gesperrt, 502 Schreibfehler am Gerät, 503 nicht verbunden. CORS `*`.

### Motion-Kanal (`GET /api/motion`, WebSocket)
`/api/stream` ist auf 10 Hz gedrosselt – zu langsam für ein Spiel. `/api/motion` schickt dagegen **jede** Motion-Notification
als JSON-Textnachricht (ein Frame pro Raw-Motion-Notification `EF680406`, ohne Raw Motion pro Quaternion `EF680404`):

```json
{"t":1794047798656,"q":[0.996,0.004,0.066,0.056],"gyro":[1.2,-0.8,-525.3],"accel":[-0.01,-1.1,0.99],"button":false,"tap":{"dir":"x+","count":1}}
```

| Feld | Inhalt |
|---|---|
| `t` | Zeitstempel der Bridge, Unix-ms |
| `q` | Quaternion `[w,x,y,z]` (`EF680404`, int32 / 2^30) |
| `gyro` | Gyroskop °/s (`EF680406`, /32), Achsen wie der Thingy |
| `accel` | Beschleunigung g (`EF680406`, /1024) |
| `button` | Taster gedrückt (`EF680302`) |
| `tap` | nur im Frame direkt nach einem Tippen (`EF680402`), sonst weggelassen |

- **Spielmodus:** Meldet sich der **erste** Client an, beendet die Bridge zuerst die Abos von Euler (`EF680407`) und Kompass
  (`EF680409`) und setzt danach `motion_freq_hz` (`EF680401`) auf **100 Hz** (`--motion-hz 5..200`). Nach dem **letzten**
  Abmelden setzt sie zuerst wieder den Standard (10 Hz) und abonniert dann Euler und Kompass neu. Grund: Alle Werte, die
  `motion_freq_hz` folgen (Quaternion, Raw Motion, Euler, Kompass), zusammen ergeben bei 100 Hz 400 Notifications/s. Daran
  bricht die Windows-BLE-Verbindung nach 2–10 s ab. Mit nur Quaternion und Raw Motion (200/s) bleibt sie stabil.
  Umwelt, Taster, Tippen, Orientierung und Schritte laufen weiter; Euler und Kurs im Dashboard stehen während des Spiels still.
- **Mikrofon im Spielmodus:** Der ADPCM-Strom (`EF680504`) zusätzlich zu Quaternion und Raw Motion bei 100 Hz bricht die
  Verbindung ebenfalls ab. Ist das Mikrofon an, beendet die Bridge sein Abo beim Spielstart als Erstes und schaltet es nach
  dem Spiel wieder ein (auch mit `--mic`). Während des Spiels ist `sound.mic_blocked` `true`, `sound.mic_enabled` `false`,
  und `POST /api/mic` mit `enabled:true` antwortet 409. Ausschalten (`enabled:false`) geht immer; dann bleibt es nach dem
  Spiel aus.
- Nach einem Reconnect im Spielmodus abonniert die Bridge Euler und Kompass gar nicht erst und schreibt die Spielfrequenz
  erst, wenn alle Abos stehen.
- Langsame Clients verlieren die ältesten Frames (Puffer 32), die Bridge blockiert nie.
- Origin: nur `127.0.0.1`, `localhost`, `[::1]` (beliebiger Port).
- Simulator: 100 Frames/s mit Vorhand- und Rückhand-Schwüngen (Gyro-Spitzen bis ~700 °/s um die Hochachse, passendes
  Quaternion, jeder dritte Schwung ein Slice mit 50° Roll). Im Tennis-Modus (`thingy tennis`) startet der Taster nie das Lied,
  sonst nur, solange kein Client am Motion-Kanal hängt.

### `thingy tennis`
`thingy.exe tennis [--sim] [--port N] [--no-browser] [--motion-hz N]` startet die Bridge wie ohne Befehl und öffnet
`http://127.0.0.1:<port>/tennis/` im Standardbrowser. Spielanleitung und Sensor-Mapping: [TENNIS.md](TENNIS.md).

### Snapshot
Schema: `docs/telemetry.schema.json`, Beispiel: `hardware/shared/telemetry.example.json`.
Noch nicht empfangene Werte sind `null`. `device.source` ist `"ble"` oder `"sim"` (Simulator).
`device.battery_trend` ist immer vorhanden: `"charging"`, `"discharging"` oder `"unknown"`. Es ist eine Schätzung, siehe „Akku-Trend“ oben.
Im Simulator lädt der Akku von 60 auf 70 % (1 % pro Minute) und entlädt dann wieder auf 60 %.
