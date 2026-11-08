# Checkliste Schaltplan (systems-engineer, 2026-11-07, Quelle PROMPT_1 §2)

Status je Punkt: PASS / PARTIAL / FAIL / BLOCKED / NOT RUN mit Beleg.

- [ ] ERC ohne Fehler (kicad-cli Bericht abgelegt)
- [ ] Referenzschaltungen aus Datenblatt für Modul, IMU, Lader, Regler zitiert
- [ ] ESD-Schutz an USB-C, CC-Widerstände 5,1 kΩ
- [ ] Verpolschutz und Zellschutz Akku, NTC am Lader (REQ-045, REQ-058)
- [ ] Power-Path: Spielen beim Laden (REQ-044)
- [ ] Testpunkte für VBAT, 3V3, GND, SWD, IMU-INT
- [ ] Motor mit Treiber und Freilaufdiode (REQ-054)
- [ ] Akku-Teiler schaltbar, Ruhestrom ≤ 10 µA (REQ-047)
