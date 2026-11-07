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
