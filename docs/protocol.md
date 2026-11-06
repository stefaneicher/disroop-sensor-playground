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
| `EF680109` | NFC | read/write | rohe **NDEF-Message** (ohne TLV), max. 247 B, wird persistent gespeichert |
| `2A19` (Service `180F`) | Akku | read/notify | u8 % |

### Startsequenz (Client)
1. Verbinden (keine Bonding-Pflicht).
2. Motion-Config schreiben: `pedo 1000, temp 500, compass 100, motion_freq_hz 10, wake 1`.
3. Env-Config: zuerst lesen, dann `temp/press/hum/color 1000 ms, gas_mode 1` schreiben. Die LED-Bytes aus dem Lesen übernehmen.
4. Sound-Config schreiben: `[1, 1]` (Freq-Speaker, ADPCM-Mikrofon).
5. Notifications abonnieren: alle `notify`-Zeilen oben. Gravity und Quaternion sind optional.

### Lautstärke aus dem Mikrofon
Das Mikrofon ist **standardmässig aus**, weil der Audio-Stream (~32 kB/s) zusammen mit allen anderen Notifications die BLE-Verbindung unter Windows abbrechen lässt. Einschalten auf Wunsch über `POST /api/mic` oder `--mic`. Bei Abbruch schaltet die Bridge es automatisch wieder aus.
Frame IMA-ADPCM-dekodieren, RMS über den Frame bilden, `level_dbfs = 20*log10(rms/32768)` auf −100..0 klemmen.
Geglättet (EMA α=0.3) mit ~10 Hz publizieren.

### Lied
`shared/chorus.json` ist die einzige Quelle: `notes[] {on_ms, off_ms, hz}`, `pause_ms`.
Pro Note `[hz u16, on_ms u16, volume u8]` an `EF680502` schreiben und `on_ms + off_ms` warten. Volume Default 100.
Parallel die LED setzen: Note an = Farbe je Tonhöhe, Note aus = LED aus.
Ein Tastendruck am Thingy startet oder stoppt das Lied.

### NFC → eigene App
NDEF-Message mit einem Record: TNF=4 (External), Type `android.com:pkg`, Payload `ch.disroop.thingylive`.
Bytes: `D4 0F 15` + ASCII `android.com:pkg` + ASCII `ch.disroop.thingylive` (39 B gesamt).
`D4` = MB|ME|SR|TNF 4, `0F` = Type-Länge 15, `15` = Payload-Länge 21.

## 2. Bridge-API (HTTP auf `127.0.0.1:8052`, Web-GUI und Smoke-Tests)

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/` | Dashboard (eingebettet aus `bridge/web/`) |
| GET | `/api/state` | aktueller Snapshot (JSON) |
| GET | `/api/stream` | Server-Sent Events: `event: telemetry` + `data: <Snapshot>` mit ≤ 10 Hz; `event: log` + `data: {"msg": "..."}` |
| POST | `/api/song` | Body `{"action":"play"\|"stop","volume":0..100}` → 202 |
| POST | `/api/led` | Body `{"r":0..255,"g":..,"b":..}` → 204 |
| POST | `/api/mic` | Body `{"enabled":true\|false}` → 202, Mikrofon/Lautstärke ein/aus |
| GET | `/healthz` | `ok` |

Fehler: 400 ungültige Eingabe, 405 falsche Methode, 502 Schreibfehler am Gerät, 503 nicht verbunden. CORS `*`.

### Snapshot
Schema: `docs/telemetry.schema.json`, Beispiel: `shared/telemetry.example.json`.
Noch nicht empfangene Werte sind `null`. `device.source` ist `"ble"` oder `"sim"` (Simulator).
