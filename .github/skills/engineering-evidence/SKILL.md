---
name: engineering-evidence
description: "Belege für alle Disziplinen: Anforderungs-IDs, Revisionen, Zahlen-Labels, SHA-256, Locks und Handoffs im Projekt Motion One."
---

# engineering-evidence (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- Jede Zahl: Label QUELLE (URL+Datum) | BERECHNUNG (Skriptpfad) | SIMULATION (Netzliste+Log) | MESSUNG | ANNAHME (Begründung).
- Status nur PASS, PARTIAL, FAIL, BLOCKED, NOT RUN. Ergebnisdatei öffnen, bevor PASS gesetzt wird.
- Ausgabedateien mit `sha256sum` im Handoff aufführen. Revisionen als `<teil>-r<N>`.
- Lock: `devices/motion-one/management/locks/<datei>.lock` mit Agent und Zeit, nach dem Schreiben löschen.
- Handoff-Format siehe Agent-Datei; Ablage `management/handoffs/<agent>/`.
- Wichtige Entscheide (Architektur, Bauteilwahl, Gestaltung, Schnittstellen) als ADR mit Bild festhalten: `devices/motion-one/adr/<disziplin>/ADR-NNNN-<kurzname>.md` nach `adr/TEMPLATE.md`, Lavish-Entscheidungsseite + PNG in `adr/<disziplin>/media/`, Index in `adr/README.md` nachführen, ADR im Handoff referenzieren.
- Konsistenz (siehe `devices/motion-one/management/KONSISTENZ.md`): Fakten nur in ihrer Master-Datei ändern, sonst mit Revision verweisen. Artefakt-Kopf nennt eigene Revision und Eingangsrevisionen. Abgeleitete Dateien (BOM, CPL, Gerber, Exporte) neu erzeugen, nicht von Hand ändern.
- Keine Konkurrenzkopien (`_v2`, `_neu`, `_alt`, `_backup`). Ersetzte Arbeitsdateien löschen oder im Handoff zum Löschen melden; ersetzte ADRs und Handoffs mit `Ersetzt durch …` markieren. `VORLAEUFIG_*` nur mit Ablösebedingung in `TODO.md`.
