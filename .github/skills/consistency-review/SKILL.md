---
name: consistency-review
description: "Manager-Skill: Konsistenz-Review und Aufräumen für Motion One – veraltete Revisionsverweise, doppelte Wahrheiten, tote Artefakte, Lücken in der Rückverfolgung. Nach Revisionswechsel, vor Bestellung/Release, vor Session-Wechsel."
---

# consistency-review (VORSCHLAG, lokal verfasst für Disroop Motion One; Konzept in `devices/motion-one/management/KONSISTENZ.md`, noch ohne getestetes Skript)

Wann: nach jeder neuen `INTERFACES`- bzw. Board-Revision, vor jedem Upload oder jeder Bestellung beim Hersteller, vor jedem
Release, vor einem Session-Wechsel und sonst mindestens einmal pro Arbeitstag.

Ablauf:
1. Möglichst in einer frischen Session oder durch einen Agent prüfen lassen, der den Stand nicht erzeugt hat.
2. Wahrheitsquellen-Tabelle in `KONSISTENZ.md` §1 als Referenz nehmen. Pro Fakt prüfen: Stimmt jede Kopie bzw. jeder
   Verweis mit der Master-Datei überein, und ist die Revision aktuell?
3. `requirements/CHECKLIST_consistency.md` abarbeiten. Sobald es `scripts/management/check_consistency.py` gibt, dieses im
   Container laufen lassen: `./project hw run "python3 devices/motion-one/scripts/management/check_consistency.py"`.
4. Befunde in `devices/motion-one/management/reviews/<JJJJ-MM-TT>-konsistenz.md` schreiben (Spalten: #, Befund, Fundstelle,
   Master-Datei, Vorschlag, Status). **Erst auflisten, nichts löschen oder überschreiben.**
5. Löschen nur mit Entscheid des Users. Nachführen delegiert der Manager an den zuständigen Spezialisten (ein Schreiber pro
   Datei, Lock).
6. Danach Statusdateien (`RESUME.md`, `PROJECT_STATE.md`, `TASK_BOARD.md`, Root-`PROGRESS.md`, `TODO.md`) auf dieselbe
   Zeitmarke bringen, Verlauf in `JOURNAL.md`, Thread im Board aktualisieren, committen.

Regeln:
- Abgeleitete Dateien (BOM, CPL, Gerber, Exporte) neu erzeugen statt von Hand korrigieren.
- Ein Befund ohne Fundstelle (Datei:Zeile oder Befehl) zählt nicht.
- Der Review ist kein PASS für das Design, nur für die Konsistenz der Unterlagen.
