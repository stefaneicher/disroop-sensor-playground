# Checkliste Code und Firmware (systems-engineer, 2026-11-07, Quelle PROMPT_1 §2)

Status je Punkt: PASS / PARTIAL / FAIL / BLOCKED / NOT RUN mit Beleg.

- [ ] Tests zuerst geschrieben (TDD), Host-Tests laufen im Container grün
- [ ] Kodierer aller Characteristics gegen hardware/thingy-bridge/internal/thingy-Decoder getestet (REQ-022, REQ-024, REQ-025)
- [ ] Gyro-Klemmung ±1023,97 °/s in Raw, Saturierungsflags in Raw-HR getestet
- [ ] Bridge-Startsequenz inkl. EF680206/EF680501 ohne Fehler (REQ-023)
- [ ] Clean Code: keine Magic Numbers, Funktionen klein, Warnungen = Fehler
- [ ] Smoke-Test: Build + Flash-Image + UF2-Erzeugung im Container
- [ ] Latenz im Gerät gemessen < 10 ms (REQ-032)
- [ ] ≤ 200 Notifications/s im Spielmodus (REQ-030)
