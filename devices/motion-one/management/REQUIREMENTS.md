# Anforderungen V1 – Disroop Motion One (req-r1, systems-engineer, 2026-11-07)

Startwerte (aus r0 übernommen, QUELLE Repo): 100 Hz Motion, min. 50 Hz (docs/TENNIS.md:4,111); Schlag ab ~350 °/s, Tempo-Skala bis ~1200 °/s
(docs/TENNIS.md:36-37); Sprung bei Ruck > 2,1 g, Lenken 3° Totzone / ~32° voll (docs/SKI.md:14,16); BLE-Latenz ≈ 30–60 ms (docs/TENNIS.md:123).

Kennzeichnung: QUELLE (Repo-Datei:Zeile oder URL + Abrufdatum) · BERECHNUNG (`scripts/systems/budgets.py`, Ausgabe
`requirements/budgets_output.md`) · ANNAHME (mit Begründung). Status: alles, was Hardware braucht, ist NOT RUN.
Web-Quellen (Abruf 2026-11-07): [FLEISIG] Fleisig et al. 2003, Sports Biomech 2(1):51-64, https://europepmc.org/article/MED/14658245 ·
[TRIGT] van Trigt et al. 2025, Front. Sports Act. Living 6:1463299, https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1463299/full ·
[ICM] https://invensense.tdk.com/products/motion-tracking/6-axis/icm-45686/ · [JLC] `requirements/stock_jlcpcb_2026-11-07.csv`.

## A. Bewegung und Sensorik

| ID | Anforderung | Wert | Kennz. | Beleg | Verifikation | Status |
|---|---|---|---|---|---|---|
| REQ-001 | Motion-Ausgaberate im Spielmodus stabil über BLE | 100 Hz (min. 50 Hz) | QUELLE | docs/TENNIS.md:4, :111; docs/protocol.md:118 | Bridge `/api/motion` ≥ 50 Hz, 5 min Dauerlauf am Gerät | NOT RUN |
| REQ-002 | `motion_freq_hz` über `EF680401` einstellbar | 5..200 Hz | QUELLE | docs/protocol.md:21; bridge/internal/thingy/uuids.go:82-83 | Host-Unittest Config-Parser; Gerät | NOT RUN |
| REQ-003 | Interne IMU-ODR ≥ 4 × Ausgaberate | ≥ 400 Hz | ANNAHME | Abtastlatenz ≤ 2,5 ms (budgets_output.md §5), Fusion ohne Aliasing | Review Firmware-Config | NOT RUN |
| REQ-004 | Gyro-Messbereich | ±4000 °/s | BERECHNUNG | Spitzen 1950 °/s Handgelenk, 2420 °/s Schulter [FLEISIG]; Oberarm 3207 ± 808 °/s [TRIGT]; budgets_output.md §1 | Datenblatt-Review; Schwungtest mit Saturierungszähler | NOT RUN |
| REQ-005 | Accel-Messbereich | ±32 g | BERECHNUNG | a = ω²·r: 9–55 g bei Studienspitzen (budgets_output.md §2, Hebelarme ANNAHME); Ski-Sprung 2,1 g docs/SKI.md:16 | Datenblatt-Review; Schlagtest | NOT RUN |
| REQ-006 | Gyro-Rauschen RMS bei 100 Hz | ≤ 0,1 °/s (berechnet 0,034) | BERECHNUNG | budgets_output.md §3; [ICM] 3,8 mdps/√Hz | Ruhemessung 60 s | NOT RUN |
| REQ-007 | Neigungsfehler Roll/Pitch in Ruhe ≪ Totzone 3° | ≤ 0,3° (berechnet 0,036°) | BERECHNUNG | docs/SKI.md:14; budgets_output.md §3 | Ruhemessung Euler | NOT RUN |
| REQ-008 | Yaw-Drift über 60 s nach Kalibrierung | < 3° (berechnet 2,7° worst case) | BERECHNUNG | budgets_output.md §3 (ΔT 5 K und Rest-Bias 0,02 °/s ANNAHME) | 60-s-Test | NOT RUN |
| REQ-009 | Sensorfusion (Quaternion, Euler, Heading) im Gerät; Gyro-Bias-Kalibrierung in Ruhe | – | QUELLE | PROMPT_1 §0, §6 | Host-Unittests mit Testvektoren | NOT RUN |
| REQ-010 | Magnetometer optional; ohne Magnetometer: Heading = relativer Yaw, Compass-Felder = 0 | – | ANNAHME | PROMPT_1 §0 („optional“); Spiele nutzen Kompass nicht (docs/TENNIS.md:61-64, :106) | Review | NOT RUN |

## B. Kompatibilität (Pflicht, bestehende Software ohne Änderung)

| ID | Anforderung | Wert | Kennz. | Beleg | Verifikation | Status |
|---|---|---|---|---|---|---|
| REQ-020 | Advertising-Name „Thingy“, Config-Service `EF680100` wird advertised | „Thingy“ | QUELLE | docs/protocol.md:8; bridge/internal/device/ble/ble_windows.go:67-69; android BleThingyConnection.kt:151-152 | Scan; Bridge findet Gerät | NOT RUN |
| REQ-021 | Basis-UUID `EF68xxxx-9B35-4933-9B10-52FFA9740042`; Services 0100, 0300, 0400, 0500, 180F | – | QUELLE | docs/protocol.md:8; bridge/internal/thingy/uuids.go:24-31 | GATT-Tabelle vs. uuids.go (Host-Test) | NOT RUN |
| REQ-022 | Characteristics `EF680401/0404/0406/0407/0409/0302/0301/0502/2A19` mit Formaten laut Protokoll | INTERFACES.json `ble_profile` | QUELLE | PROMPT_1 §0; docs/protocol.md:11-35 | Host-Test FW-Kodierer gegen bridge/internal/thingy-Decoder | NOT RUN |
| REQ-023 | `EF680206` Env-Config (read/write, 12 B) und `EF680501` Sound-Config (write) vorhanden, Schreiben akzeptiert (Werte dürfen ignoriert werden) – sonst bricht die Bridge-Startsequenz ab | – | QUELLE | bridge/internal/app/session.go:309-325 | Bridge gegen Gerät | NOT RUN |
| REQ-024 | Raw `EF680406`: accel i16 /1024 (±32 g), gyro i16 /32 auf ±1023,97 °/s geklemmt, compass i16 /16 | 18 B | QUELLE | docs/protocol.md:26; bridge/internal/thingy/decode.go:106-115 | Host-Test Klemmung | NOT RUN |
| REQ-025 | Erweiterter Kanal Raw-HR `EF680480` (Motion-Service, notify, 16 B): accel /1024, gyro /8 (±4096 °/s), u16 Sample-Zähler, u16 Flags (Saturierung je Achse) | INTERFACES.json | ANNAHME | Thingy-Basis-Schema docs/protocol.md:8; 0480 im genutzten Profil nicht belegt (docs/protocol.md:11-35) – Kollisionsfreiheit mit Original-Thingy-FW nicht geprüft | Host-Test; Bridge-Change separat | NOT RUN |
| REQ-026 | Weitere Thingy-Notify-Chars dürfen fehlen; Bridge loggt nur | – | QUELLE | bridge/internal/app/session.go:273-276, 301-305 | Bridge-Log ohne Abbruch | NOT RUN |
| REQ-027 | Kein Bonding; MTU-Anfrage 247 akzeptieren | 247 B | QUELLE | docs/protocol.md:59; BleThingyConnection.kt:320 | Android-App verbindet | NOT RUN |

## C. Funk, Latenz, Durchsatz

| ID | Anforderung | Wert | Kennz. | Beleg | Verifikation | Status |
|---|---|---|---|---|---|---|
| REQ-030 | Spielmodus ≤ 200 Notifications/s stabil | 0 Abbrüche / 5 min | QUELLE | JOURNAL.md:21; docs/protocol.md:117-121 | Dauertest Windows 11 | NOT RUN |
| REQ-031 | Verbindungsintervall 7,5–15 ms bevorzugt, bis 30 ms akzeptiert; Nutzlast je Notification ≤ 20 B | – | BERECHNUNG | budgets_output.md §4 (Funkzeit 13 % des CI) | Log/Sniffer | NOT RUN |
| REQ-032 | Latenz im Gerät Sensor → Notification bereit | < 10 ms (berechnet 2,8 typ. / 6,0 worst) | BERECHNUNG | PROMPT_1 §6; budgets_output.md §5 | GPIO-Toggle + Logikanalysator | NOT RUN |
| REQ-033 | Latenz Bewegung → Bildschirm (Information) | 45 ms typ. / 113 ms worst | BERECHNUNG | budgets_output.md §5; docs/TENNIS.md:123 | Highspeed-Video | NOT RUN |
| REQ-034 | Sendeleistung 0 dBm | 0 dBm | ANNAHME | Basis des Strombudgets | Reichweitentest | NOT RUN |

## D. Energie, Akku, Laden

| ID | Anforderung | Wert | Kennz. | Beleg | Verifikation | Status |
|---|---|---|---|---|---|---|
| REQ-040 | Laufzeit Spielmodus | ≥ 6 h (konservativer PCB-Rechenwert 49 h; separates Systemmodell 65 h mit 500 mAh, 80 % nutzbar) | BERECHNUNG | `electronics/analysis/ANALYSE_V1.md` §1; `requirements/budgets_output.md` §6; Annahmenvergleich in `requirements/BUDGETS.md` | Stromprofil vereinheitlichen; Entladetest | NOT RUN |
| REQ-041 | 1S-LiPo mit Schutzschaltung, Vorschlag 500 mAh (503040-Klasse) | 500 mAh | ANNAHME | Budget braucht ≥ 46 mAh; Grösse nach Griffvolumen, Reserve für Alterung/Motor | Wareneingang | NOT RUN |
| REQ-042 | Laden über USB-C 5 V, ≤ 1 C, Vorschlag 0,5 C | 250 mA | BERECHNUNG | budgets_output.md §6 | Ladekurve | NOT RUN |
| REQ-043 | Ladezeit | ≤ 3 h | BERECHNUNG | budgets_output.md §6 (CV-Phase ANNAHME) | Ladekurve | NOT RUN |
| REQ-044 | Spielen während des Ladens (Power-Path) | ja | QUELLE | PROMPT_1 §0 | SPICE + Messung | NOT RUN |
| REQ-045 | NTC-Temperaturüberwachung beim Laden | ja | QUELLE | PROMPT_1 §6 | Schaltplan-Review | NOT RUN |
| REQ-046 | Zellschutz + Firmware-Abschaltung bei Unterspannung | 3,3 V | ANNAHME | übliche LiPo-Schwelle; Regler-Dropout prüft pcb-engineer | Test am Netzteil | NOT RUN |
| REQ-047 | Ruhestrom Aus | ≤ 10 µA | ANNAHME | Lagerfähigkeit > 1 Jahr; Budget rechnet 5 µA | Ruhestrommessung | NOT RUN |
| REQ-048 | Akkustand `2A19` u8 %, Notify bei Änderung | – | QUELLE | docs/protocol.md:35 | Host-Test | NOT RUN |

## E. Bedienung, Mechanik, Sicherheit, Wartung

| ID | Anforderung | Wert | Kennz. | Beleg | Verifikation | Status |
|---|---|---|---|---|---|---|
| REQ-050 | Haupttaster per Daumen, Ereignis `EF680302`; Spiele werten kurz/lang (≥ 0,8 s) aus | 1 Taster | QUELLE | docs/TENNIS.md:27, :64; docs/SKI.md:16 | Ergonomie-Review, Gerät | NOT RUN |
| REQ-051 | Ein/Aus-Konzept (Lang-Druck oder zweiter Taster) | – | QUELLE | PROMPT_1 §0 | Review | NOT RUN |
| REQ-052 | RGB-LED über `EF680301` (Modi 0–3) | – | QUELLE | docs/protocol.md:19 | Host-Test + Sicht | NOT RUN |
| REQ-053 | Summer im Frequenzmodus `EF680502` | u16 Hz, u16 ms, u8 Vol | QUELLE | docs/protocol.md:31 | Host-Test + Gehör | NOT RUN |
| REQ-054 | Vibrationsmotor optional, mit Treiber und Freilaufdiode | – | QUELLE | PROMPT_1 §0 | Schaltplan-Review | NOT RUN |
| REQ-055 | Masse komplett | ≤ 120 g | ANNAHME | Einhandgerät für lange Sessions; Akku ~10 g + Board ~10 g + Gehäuse lässt Reserve | Wägung | NOT RUN |
| REQ-056 | Druckteilgrösse | ≤ 180 × 180 × 180 mm | QUELLE | PROMPT_1 §0 | CAD-Bounding-Box | NOT RUN |
| REQ-057 | Fall 1 m auf Holz: Board und Akku bleiben fixiert | – | QUELLE | PROMPT_1 §6 | Abschätzung; Fallversuch | NOT RUN |
| REQ-058 | Akku fixiert und gegen Schrauben geschützt; Verpolschutz; ESD-Schutz USB-C | – | QUELLE | PROMPT_1 §6 | Review Schaltplan/CAD | NOT RUN |
| REQ-059 | Akku mit Standardwerkzeug tauschbar (Stecker); Programmieranschluss bei offenem Gehäuse erreichbar | – | QUELLE | PROMPT_1 §6 | Montageprobe | NOT RUN |
| REQ-060 | Programmieren ohne eigene SWD-Probe: UF2/USB-DFU-Bootloader über USB-C; SWD-Pads nur für einmaliges Bootloader-Flashen | – | ANNAHME | User hat keine SWD-Probe (Auftrag); Moduldetails requirements/ARCHITECTURE.md | Anleitung + Test | NOT RUN |
