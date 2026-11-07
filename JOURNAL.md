# Journal

| Zeit | Was | Ergebnis |
|---|---|---|
| 2026-11-06 21:05 | Neues Projekt `thingy52-live` angelegt | Abgespalten vom Blinky-Repo |
| 2026-11-06 21:05 | Werksfirmware analysiert (Nordic-Thingy52-FW) | Alle Sensoren und der Lautsprecher sind per BLE erreichbar. NFC-Inhalt ist per BLE beschreibbar, kein Flashen nötig. |
| 2026-11-06 21:05 | Idee als Lavish-Plan zusammengefasst | `docs/plan.html` |
| 2026-11-06 21:10 | Plan freigegeben: Werksfirmware/BLE, Repo öffentlich, Paket `ch.disroop.thingylive`, AI als Projektmanager, TDD | Repo auf öffentlich gestellt |
| 2026-11-06 21:12 | Protokoll aus Nordic-FW extrahiert (UUIDs, Q-Formate, NFC-Raw, Speaker) | Details in RESUME.md |
| 2026-11-06 21:14 | `shared/chorus.json` erzeugt | 24 Noten |
| 2026-11-06 21:15 | Neue Vorgabe: alles im Devcontainer bauen | eingeplant |
| 2026-11-06 21:18 | BLE-Machbarkeit: PowerShell geht nicht (WinRT-Events) → Go-Scanner mit tinygo bluetooth | läuft |
| 2026-11-06 21:20 | PROGRESS.md angelegt, RESUME.md mit vollem State | |
| 2026-11-06 21:12 | BLE-Scan mit Go-exe (tinygo bluetooth) | Thingy gefunden: E3:58:08:1B:53:5F, −43 dBm ✅ |
| 2026-11-06 21:25 | Devcontainer, ./project, protocol.md, Schema, ENGINEERING.md | committed e62a051 |
| 2026-11-06 21:28 | Agents bridge, web, android parallel gestartet | 🔄 |
| 2026-11-06 21:40 | Agent web fertig: 56 Unit-Tests grün, Smoke OK, Screenshots | committed |
| 2026-11-06 22:53 | NFC schreiben scheitert: Thingy hat FW v2.1.0 (TCS 0107 = 02 01 00), NFC-Char 0109 gibt es erst ab v2.2.0 → User macht DFU-Update per nRF-Thingy-App | wartet auf User |
| 2026-11-06 23:25 | NFC | DFU auf FW v2.2.0 erfolgreich (0107=02 02 00), NFC-Tag auf AAR ch.disroop.thingylive geschrieben+verifiziert, Backup build/nfc-backup.hex |
| 2026-11-07 11:45 | Thingy Tennis als eigenes Programm `tennis/` (three.js, TS ohne Bundler), WebSocket `/api/motion` 100 Hz, `/api/beep`, `thingy.exe tennis`, Sim-Schwünge | Tests grün (Go, 36 TS-Unit, Smokes), Doku docs/TENNIS.md |
| 2026-11-07 12:20 | Bug: `thingy.exe tennis` am echten Thingy, BLE bricht alle 2–10 s ab (10 Hz stabil). Experimente mit `--skip` am Thingy: 100 Hz mit allen Abos → 5 Abbrüche/60 s, nur ~15 Frames/s; ohne Euler, ohne Kompass oder ohne beide → 0 Abbrüche, 100 Frames/s. Ursache: 4 Ströme × 100 Hz = 400 Notifications/s überlasten den Link | Fix: Spielmodus (Euler + Kompass abbestellen, dann 100 Hz; Rückweg umgekehrt; nach Reconnect Rate erst nach den Abos), `--motion-hz`, Fehler der Durchsatz-Verbindungsparameter wird geloggt. Hardware: 100,0 Frames/s, 5 min + 2,5 min ohne Abbruch, 134 Beeps, Euler danach wieder live |
| 2026-11-07 16:30 | Bug: im Tennis-Spielmodus Mikrofon per Dashboard eingeschaltet → 3 s später „BLE: Windows meldet Verbindungsabbruch“. ADPCM-Strom (0504) plus 100 Hz Quaternion/Raw überlastet den Link wie zuvor Euler/Kompass | Fix: Mikrofon im Spielmodus gesperrt (`POST /api/mic` → 409, `sound.mic_blocked`, Schalter im Dashboard grau mit Tooltip); war es an (auch `--mic`), schaltet die Bridge es beim Spielstart zuerst aus und danach wieder ein |
| 2026-11-07 17:30 | Thingy Ski (`tennis/src/ski/`): Lauberhorn (Russisprung, Hundschopf, Minschkante, Kernen-S, Wasserstation, Hanneggschuss, Ziel-S) und Streif (Mausefalle, Steilhang, Hausbergkante, Traverse, Zielschuss) in three.js, mit Toren, Netzen, Publikum, Wixi-Lift und Ton; in der Android-App per WebView | docs/SKI.md, Smoke `ski-smoke.js` |
| 2026-11-07 18:40 | FPS-Anzeige unten links (Tennis, Ski) | `tennis/src/fps.ts` |
| 2026-11-07 19:10 | Bug: Ski oft nur 30 FPS, ruckelt, Lenkung nervös. Ursachen: 14 000 Instanzen ohne Culling (auch im Schattenpass), DPR 2, PCFSoft, `preserveDrawingBuffer`; fixe 60-Hz-Physik ohne Interpolation; Roll ungefiltert | Fix: Chunks à 160 m mit Distanz-Culling, adaptive Render-Skala, variable Teilschritte, Tiefpass + Totzone + Expo-Kurve für die Lenkung. Lauberhorn ~350k statt >1 Mio Dreiecke |
| 2026-11-07 19:20 | Android-UI dem Web angeglichen (Header, Pills „🎾 Tennis“/„⛷ Ski“, Kartenstil, Kompass-HSI, ⓘ-Dialoge) | Agent android-ski, 0c38ca9 |
| 2026-11-07 19:40 | Recherche: Thingy-Darstellung im Dashboard wirkt 180° gedreht. Würfel/Kompass nutzen absoluten Yaw (Magnetometer unkalibriert, 78 µT); LED im CSS-Würfel oben rechts | Korrektur wartet auf Kompass-Test des Users (Heading bei USB zum User, ferne Kante nach Norden) |
| 2026-11-07 20:30 | Umbenennung: Repo `thingy52-live` → `disroop-thingy-arcade`, Android `ch.disroop.thingylive` → `ch.disroop.thingyarcade`, Go-Modul, Docker-Image/-Volume, APK, Titel „Thingy Arcade by Disroop“; README in drei Teile (Sensorübersicht, Tennis, Skiabfahrt) | NFC-Tag muss neu geschrieben werden (`thingy.exe nfc`), alte App deinstallieren |
| 2026-11-07 21:15 | Erneute Umbenennung: `disroop-thingy-arcade` → `disroop-sensor-playground` (Repo, Ordner, Go-Modul, Android `ch.disroop.sensorplayground`, Docker, APK, Titel „Sensor Playground by Disroop“) | Grund: Repo wird Playground für Sensoren, Spiele und ein späteres eigenes Device |
| 2026-11-07 21:40 | Master-Prompt für eigenen Controller „Disroop Motion One“ (`devices/motion-one/`): Analyse des Vacuum-Master-Prompts (203x Uplink), Prompt mit Thingy-kompatiblem BLE-Profil, IMU 100 Hz, USB-C-LiPo, JLCPCB-PCBA, elektrischer Analyse, 3MF-Gehäuse, Anleitungen, Marketingvideo | Prompt bereit, noch nicht ausgeführt |
| 2026-11-07 21:50 | Master-Prompt in zwei Teile geteilt: `PROMPT_1_ENTWICKLUNG.md` (Gerät) und `PROMPT_2_MARKTAUFTRITT.md` (Marketingvideo nach dem fal.ai-Verfahren aus dem Vacuum-Video, Produktseite DE/EN/FR/IT auf GitHub Pages mit Live-Demo der Spiele, Thingy:52-Variante, Stripe-Kauf im Testmodus, Warteliste, Preis = 4 × Herstellkosten). Vorab-Smoke-Test `preflight.sh`: bereit sind Docker, gh, Copilot CLI, GitHub MCP, KiCad 10.0.7, FreeCAD 1.1, Blender 5.2.3; fehlen Playwright MCP, Slicer, ffmpeg/pandoc/ngspice/xelatex im Image, GitHub Pages | `LICENSE`: © 2026 Stefan Eicher, alle Rechte vorbehalten |
| 2026-11-07 21:55 | Vorab-Setup Schritt 1: Playwright MCP eingerichtet und getestet (JLCPCB-Teileseite per MCP geladen). Drucker-Hypothese Bambu Lab P2S Combo mit Bambu Studio in Prompt 1. VS-Code-Farben im Disroop-Stil (`.vscode/settings.json`) | Slicer-Installation wartet auf User |
