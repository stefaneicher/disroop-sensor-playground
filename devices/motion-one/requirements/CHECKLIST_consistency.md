# Checkliste Konsistenz und Aufräumen (Manager, 2026-11-08, VORSCHLAG, Quelle `management/KONSISTENZ.md`)

Status je Punkt: PASS / PARTIAL / FAIL / BLOCKED / NOT RUN mit Beleg. Befunde zuerst auflisten, nichts löschen.

- [ ] Alle Disziplinen (PCB, Mechanik, Firmware, Doku) nennen dieselbe `INTERFACES`-Revision
- [ ] Kein Dokument zitiert eine ältere Revision als die aktuelle Master-Revision (`grep` nach `r\d+`)
- [ ] BOM, CPL und Gerber sind aus dem aktuellen KiCad-Stand erzeugt (Vergleich mit neuem Export, keine Abweichung)
- [ ] Pinbelegung in `PINOUT_V1.json` und Firmware-DTS stimmen überein
- [ ] Jede Lagerangabe ist höchstens 7 Tage alt, vor einer Bestellung neu abgefragt
- [ ] Jede REQ-ID hat Designelement, Nachweis und Status in `TRACEABILITY.md`
- [ ] Jedes Bauteil und Zukaufteil hat Anforderung bzw. ADR, 3D-Modell und Platz in der Kollisionsprüfung
- [ ] Jede Zahl in Bericht, Anleitungen und Marketing verweist auf `metrics.json` bzw. ihre Master-Datei, Werte gleich
- [ ] Keine Dateien mit `_v2`, `_neu`, `_alt`, `_backup`; jede `VORLAEUFIG_*`-Datei hat einen `TODO.md`-Eintrag mit Ablösebedingung
- [ ] Keine unreferenzierten Arbeitsdateien und keine kaputten relativen Links
- [ ] Ersetzte ADRs und Handoffs tragen `Ersetzt durch …`
- [ ] `RESUME.md`, `PROJECT_STATE.md`, `TASK_BOARD.md`, Root-`PROGRESS.md` und `TODO.md` zeigen denselben Stand
- [ ] `RESUME.md` enthält nur den aktuellen Stand, Verlauf steht in `JOURNAL.md`
- [ ] Abweichungen vom Prompt (Abschnitt 0 ist Startannahme) sind per ADR begründet, z. B. SLS PA12 statt FDM PETG
