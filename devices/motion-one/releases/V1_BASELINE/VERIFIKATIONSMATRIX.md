# Anforderungs-Verifikationsmatrix V1 Baseline (Release 1)

Erzeugt von `scripts/release/make_release.py` aus `management/REQUIREMENTS.md`. Labels: PASS, PARTIAL, FAIL, BLOCKED, NOT RUN.

**Kein Requirement ist PASS**: PASS braucht Messung am Muster; es existiert keine Hardware. PARTIAL = digitaler/Host-Beleg, Hardware-Nachweis NOT RUN. Requirements ohne eigenen Beleg sind NOT RUN (nicht schöngerechnet).

| Req-ID | Anforderung | Beleg / Bemerkung | Label |
|---|---|---|---|
| REQ-001 | Motion-Ausgaberate im Spielmodus stabil über BLE | nur Spezifikation: docs/TENNIS.md:4, :111; docs/protocol.md:118 | NOT RUN |
| REQ-002 | `motion_freq_hz` über `EF680401` einstellbar | Host-Tests 69/0 (logs/fw-pinmap/unit-tests.log); Gerät NOT RUN | PARTIAL |
| REQ-003 | Interne IMU-ODR ≥ 4 × Ausgaberate | nur Spezifikation: Abtastlatenz ≤ 2,5 ms (budgets_output.md §5), Fusion ohne Aliasing | NOT RUN |
| REQ-004 | Gyro-Messbereich | nur Spezifikation: Spitzen 1950 °/s Handgelenk, 2420 °/s Schulter [FLEISIG]; Oberarm 3207 ± 808 °/s [TRIGT];  | NOT RUN |
| REQ-005 | Accel-Messbereich | nur Spezifikation: a = ω²·r: 9–55 g bei Studienspitzen (budgets_output.md §2, Hebelarme ANNAHME); Ski-Sprung  | NOT RUN |
| REQ-006 | Gyro-Rauschen RMS bei 100 Hz | nur Spezifikation: budgets_output.md §3; [ICM] 3,8 mdps/√Hz | NOT RUN |
| REQ-007 | Neigungsfehler Roll/Pitch in Ruhe ≪ Totzone 3° | nur Spezifikation: docs/SKI.md:14; budgets_output.md §3 | NOT RUN |
| REQ-008 | Yaw-Drift über 60 s nach Kalibrierung | nur Spezifikation: budgets_output.md §3 (ΔT 5 K und Rest-Bias 0,02 °/s ANNAHME) | NOT RUN |
| REQ-009 | Sensorfusion (Quaternion, Euler, Heading) im Gerät; Gyro-Bias-Kalibrierung in Ruhe | Fusion-Host-Tests grün (logs/fw-pinmap/unit-tests.log); keine Gerätemessung | PARTIAL |
| REQ-010 | Magnetometer optional; ohne Magnetometer: Heading = relativer Yaw, Compass-Felder = 0 | nur Spezifikation: PROMPT_1 §0 („optional“); Spiele nutzen Kompass nicht (docs/TENNIS.md:61-64, :106) | NOT RUN |
| REQ-020 | Advertising-Name „Thingy“, Config-Service `EF680100` wird advertised | GATT-Profil-Hosttest grün; Scan am Gerät NOT RUN | PARTIAL |
| REQ-021 | Basis-UUID `EF68xxxx-9B35-4933-9B10-52FFA9740042`; Services 0100, 0300, 0400, 0500, 180F | test_thingy_profile grün (Host); Gerät NOT RUN | PARTIAL |
| REQ-022 | Characteristics `EF680401/0404/0406/0407/0409/0302/0301/0502/2A19` mit Formaten laut Protokoll | test_thingy_codec mit Bridge-Vektoren grün (Host); Gerät NOT RUN | PARTIAL |
| REQ-023 | `EF680206` Env-Config (read/write, 12 B) und `EF680501` Sound-Config (write) vorhanden, Schreiben akzeptiert ( | Profil-Hosttest; Bridge gegen Gerät NOT RUN | PARTIAL |
| REQ-024 | Raw `EF680406`: accel i16 /1024 (±32 g), gyro i16 /32 auf ±1023,97 °/s geklemmt, compass i16 /16 | Codec-Hosttest; Gerät NOT RUN | PARTIAL |
| REQ-025 | Erweiterter Kanal Raw-HR `EF680480` (Motion-Service, notify, 16 B): accel /1024, gyro /8 (±4096 °/s), u16 Samp | nur Spezifikation: Thingy-Basis-Schema docs/protocol.md:8; 0480 im genutzten Profil nicht belegt (docs/protoc | NOT RUN |
| REQ-026 | Weitere Thingy-Notify-Chars dürfen fehlen; Bridge loggt nur | nur Spezifikation: bridge/internal/app/session.go:273-276, 301-305 | NOT RUN |
| REQ-027 | Kein Bonding; MTU-Anfrage 247 akzeptieren | nur Spezifikation: docs/protocol.md:59; BleThingyConnection.kt:320 | NOT RUN |
| REQ-030 | Spielmodus ≤ 200 Notifications/s stabil | nur Spezifikation: JOURNAL.md:21; docs/protocol.md:117-121 | NOT RUN |
| REQ-031 | Verbindungsintervall 7,5–15 ms bevorzugt, bis 30 ms akzeptiert; Nutzlast je Notification ≤ 20 B | nur Spezifikation: budgets_output.md §4 (Funkzeit 13 % des CI) | NOT RUN |
| REQ-032 | Latenz im Gerät Sensor → Notification bereit | nur Spezifikation: PROMPT_1 §6; budgets_output.md §5 | NOT RUN |
| REQ-033 | Latenz Bewegung → Bildschirm (Information) | nur Spezifikation: budgets_output.md §5; docs/TENNIS.md:123 | NOT RUN |
| REQ-034 | Sendeleistung 0 dBm | nur Spezifikation: Basis des Strombudgets | NOT RUN |
| REQ-040 | Laufzeit Spielmodus | BERECHNUNG 49 h (PCB) vs. 65 h (Systems), unterschiedliche Annahmen; Entladetest NOT RUN | PARTIAL |
| REQ-041 | 1S-LiPo mit Schutzschaltung, Vorschlag 500 mAh (503040-Klasse) | nur Spezifikation: Budget braucht ≥ 46 mAh; Grösse nach Griffvolumen, Reserve für Alterung/Motor | NOT RUN |
| REQ-042 | Laden über USB-C 5 V, ≤ 1 C, Vorschlag 0,5 C | BERECHNUNG 255 mA (electronics/analysis/ANALYSE_V1.md); Messung NOT RUN | PARTIAL |
| REQ-043 | Ladezeit | nur Spezifikation: budgets_output.md §6 (CV-Phase ANNAHME) | NOT RUN |
| REQ-044 | Spielen während des Ladens (Power-Path) | nur Spezifikation: PROMPT_1 §0 | NOT RUN |
| REQ-045 | NTC-Temperaturüberwachung beim Laden | nur Spezifikation: PROMPT_1 §6 | NOT RUN |
| REQ-046 | Zellschutz + Firmware-Abschaltung bei Unterspannung | nur Spezifikation: übliche LiPo-Schwelle; Regler-Dropout prüft pcb-engineer | NOT RUN |
| REQ-047 | Ruhestrom Aus | BERECHNUNG max. 6 µA; Messung NOT RUN | PARTIAL |
| REQ-048 | Akkustand `2A19` u8 %, Notify bei Änderung | Host-Test Profil; Gerät NOT RUN | PARTIAL |
| REQ-050 | Haupttaster per Daumen, Ereignis `EF680302`; Spiele werten kurz/lang (≥ 0,8 s) aus | Taster BTN P0.28 in PINOUT/DTS (pincheck PASS); Ergonomie/Gerät NOT RUN | PARTIAL |
| REQ-051 | Ein/Aus-Konzept (Lang-Druck oder zweiter Taster) | nur Spezifikation: PROMPT_1 §0 | NOT RUN |
| REQ-052 | RGB-LED über `EF680301` (Modi 0–3) | LED-Pins im DTS (pincheck PASS), Host-Test; Sicht NOT RUN | PARTIAL |
| REQ-053 | Summer im Frequenzmodus `EF680502` | BUZ_PWM im DTS, Host-Test; Gehör NOT RUN | PARTIAL |
| REQ-054 | Vibrationsmotor optional, mit Treiber und Freilaufdiode | nur Spezifikation: PROMPT_1 §0 | NOT RUN |
| REQ-055 | Masse komplett | nur Spezifikation: Einhandgerät für lange Sessions; Akku ~10 g + Board ~10 g + Gehäuse lässt Reserve | NOT RUN |
| REQ-056 | Druckteilgrösse | CAD-Masse (ANNAHME 170 mm Länge), keine Messung am Druck | PARTIAL |
| REQ-057 | Fall 1 m auf Holz: Board und Akku bleiben fixiert | nur Spezifikation: PROMPT_1 §6 | NOT RUN |
| REQ-058 | Akku fixiert und gegen Schrauben geschützt; Verpolschutz; ESD-Schutz USB-C | Akku-Halte-Nasen im CAD, Netzkollision 0 (SIMULATION); Fixierung am Muster NOT RUN | PARTIAL |
| REQ-059 | Akku mit Standardwerkzeug tauschbar (Stecker); Programmieranschluss bei offenem Gehäuse erreichbar | nur Spezifikation: PROMPT_1 §6 | NOT RUN |
| REQ-060 | Programmieren ohne eigene SWD-Probe: UF2/USB-DFU-Bootloader über USB-C; SWD-Pads nur für einmaliges Bootloader | Bootloader/UF2 gebaut (logs/fw-bootloader, logs/fw-pinmap); Flashen NOT RUN | PARTIAL |

## Zusammenfassung
NOT RUN: 26, PARTIAL: 17 (total 43)

## Weitere Prüfungen (Stand r4)
| Prüfung | Label | Beleg |
|---|---|---|
| Hauptboard-ERC (nur Schaltplan) | PASS, 0 Verletzungen | logs/pcb-r4d/erc.json |
| Steuerboard ERC/DRC | PASS | logs/pcb-r4/ |
| Firmware Host-Tests 69/0, pincheck, Build | PASS (nur Host) | logs/fw-pinmap/ |
| Netzkollision 16 Paare | PASS (SIMULATION) | mechanics/cad/collision_r4.json |
| Lippenspiel min 0.191 mm (Soll 0.25) | PASS laut Mechanik-Handoff, unter Soll-Mittel | mechanics/cad/final_checks_r4.json |
| Wandstärke min 0.8 mm, Ziel 1.0 mm | FAIL (grobe Auflösung, evtl. Artefakt) | mechanics/cad/final_checks_r4.json |
| Dichtheit pcb_r4.stl | widersprüchlich 38/72 vs. 40/40 | BEKANNTE_WIDERSPRUECHE.md |
| FEM, Bambu-Slice r4, Toleranzkörperdruck | NOT RUN | - |
