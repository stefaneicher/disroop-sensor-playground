# Resume: hier weitermachen, falls die Session abbricht

Lies zuerst `GOAL.md`, `PROGRESS.md`, `JOURNAL.md` und `docs/plan.html`.

## Rolle und Arbeitsweise (Vorgaben des Users)
- Die AI ist **Projektmanager**. Sie legt die nötigen Subagents an und hält den Haupt-Chat frei.
- **TDD**, Clean Code, Best Practices je Disziplin, **Smoke-Tests**.
- **Keine Fragen stellen**, ausser die Hardware ist nicht erreichbar (keine BLE-Verbindung).
- **Alles wird im Devcontainer-Image gebaut** (`.devcontainer/`), auch von `./project` und der CI. Lokal wird nichts installiert.
- Nach jedem sinnvollen Schritt JOURNAL.md, PROGRESS.md und RESUME.md nachführen, dann **direkt auf `main` committen und pushen** (keine Branches, keine PRs). Commit-Trailer: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
- Antworten an den User kurz und auf Deutsch.

## Entscheide (vom User freigegeben im Lavish-Plan)
- **Datenquelle:** Thingy:52-**Werksfirmware per BLE**, kein Flashen. Es ist keine SWD-Probe vorhanden.
- **Repo:** `stefaneicher/thingy52-live`, öffentlich, Branch `main`.
  - WSL-Pfad: `/mnt/c/Users/stefa/IdeaProjects/thingy52-live`
- **Android-Paket:** `ch.disroop.thingylive`
- **Architektur:**
  - `thingy.exe` (Go, Windows, cross-compiled) verbindet BLE mit Terminal-Ausgabe, Webserver `:8052` mit SSE `/api/stream`, Lied und NFC-Schreiben.
  - Web-GUI ist in die exe eingebettet (`bridge/web/`).
  - Android-App in Kotlin.
- **Aufteilung, damit sich die Agents nicht in die Quere kommen:**
  - `project` dispatcht auf `scripts/<bereich>.sh`.
  - Ordner `bridge/`, `bridge/web/`, `android/`.
  - Je Bereich ein eigener Workflow `.github/workflows/<bereich>.yml`.
  - Agents committen nicht, das macht der Manager.

## Protokoll-Fakten (aus Nordic-Thingy52-FW, `git clone https://github.com/NordicSemiconductor/Nordic-Thingy52-FW`)

**UUIDs:** Basis `EF68xxxx-9B35-4933-9B10-52FFA9740042`. Services:
- `0100` Config (TCS), `0200` Environment, `0300` UI, `0400` Motion, `0500` Sound.
- Battery ist der Standard-Service `180F` / `2A19`.

**Environment (alle Werte little-endian):**
- `0201` Temp: int8 + uint8/100 → °C
- `0202` Druck: int32 + uint8/100 → hPa
- `0203` Feuchte: uint8 %
- `0204` Gas: u16 eCO₂ ppm + u16 TVOC ppb
- `0205` Farbe: 4× u16 RGBC
- `0206` Config: 4× u16 Intervalle ms, u8 gas_mode (0=250ms, 1=1s, 2=10s, 3=60s), 3× u8 LED-Farbe

**Motion:**
- `0401` Config: u16 pedo_ms, u16 temp_ms, u16 compass_ms, u16 motion_freq_hz, u8 wake_on_motion
- `0402` Tap: u8 dir, u8 cnt
- `0403` Orientation: u8 (0 portrait, 1 landscape, 2 rev. portrait, 3 rev. landscape)
- `0404` Quaternion: 4× i32 Q2.30
- `0405` Pedometer: u32 steps, u32 ms
- `0406` Raw: 9× i16
  - Accel /1024 → g
  - Gyro /32 → °/s
  - Kompass /16 → µT
- `0407` Euler: 3× i32 /65536 → °
- `0409` Heading: i32 /65536 → °
- `040A` Gravity: 3× float32

**UI:**
- `0301` LED: [mode 0 off | 1 const r,g,b | 2 breathe mix,int,u16 delay | 3 oneshot mix,int]
- `0302` Button: u8 0/1, Notify
- `0303` MOSFET: 4× u8

**Sound:**
- `0501` Config: [u8 spkr_mode (1 freq, 2 pcm, 3 sample), u8 mic_mode (1 adpcm, 2 spl)]
- `0502` Speaker in Freq-Mode: u16 Hz, u16 ms, u8 Lautstärke 0..100
- `0503` Speaker-Status
- `0504` Mikrofon: IMA-ADPCM-Frames, 3-Byte-Header (i16 predictor, u8 index) plus Nibbles. Aus RMS → dBFS errechnen.
- Die FW v2.x implementiert nur ADPCM, nicht SPL.

**NFC:**
- TCS `0109` (max. 247 B) = rohe NDEF-Message, landet in `nfc_t2t_payload_set` und wird persistent gespeichert.
- Default-Inhalt = AAR `no.nordicsemi.android.nrfthingy` + Text + URI.
- Neuer Inhalt: AAR `ch.disroop.thingylive`.

**Lied:** `shared/chorus.json` mit `{on_ms, off_ms, hz}` × 24 und `pause_ms` 1500.

## Hardware
- Thingy:52 Adresse `E3:58:08:1B:53:5F`, Name „Thingy“, Werksfirmware sendet Advertising.
- Schläft nach einigen Minuten ohne Verbindung. Aufwecken: Knopf drücken oder schütteln.
- `tinygo.org/x/bluetooth` funktioniert: Build im Container `golang:1.27` mit `GOOS=windows CGO_ENABLED=0`, Scan ok.

## Umgebung
- Windows + WSL. WSL hat kein Bluetooth, deshalb läuft die exe über WSL-Interop auf Windows.
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Docker stoppt manchmal. Neustart mit `wsl.exe -d Ubuntu -u root -- systemctl restart docker`.
- Lavish:
  - Plan öffnen: `lavish-axi .lavish/plan.html`. `.lavish/` ist in `.gitignore`, die Kopie liegt in `docs/`.
  - Feedback holen: `lavish-axi poll <file>`.
- Machbarkeits-Scanner: `C:\Users\stefa\AppData\Local\Temp\blescan\` (Go, `tinygo.org/x/bluetooth`, im `golang:1.27`-Container gebaut).

## Nächste Schritte
2. Devcontainer-Image erstellen: `.devcontainer/devcontainer.json` + `.devcontainer/Dockerfile` mit Go 1.27, Node 26, JDK 21, Android SDK 37, Gradle-Wrapper.
3. `docs/protocol.md` + `docs/telemetry.schema.json` + `docs/ENGINEERING.md` (TDD-Regeln) schreiben.
4. Agents bridge, web und android parallel starten.
5. Integrieren, Hardware-Smoke-Test, NFC, CI, Release.
