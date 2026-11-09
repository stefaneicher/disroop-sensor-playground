# Schaltplan r4-C – Abschluss 2026-11-09

## Status
PARTIAL insgesamt. Lokale Quellen, PDF und Pakete PASS. Kopieren nach releases/,
Anwenden der .gitignore-/Widerspruchsänderungen sowie Commit/Rebase/Push/Upload
NOT RUN; diese Schritte bleiben beim Manager.

## Bearbeitete Anforderungen
Die gewählte C-Fassung ist in den echten Haupt-/UI-Projekten integriert.
Die Hauptplatine hat ein Root-Blatt und neun funktionale Unterblätter, die UI
ein eigenes Blatt. Der Generator ist `scripts/electronics/gen_mo_sch_hier.py`.
Die erste UI-Seite trägt genau: „Optionale Erweiterungsplatine (J5), nicht Teil des Geräts r4“.
`OFFENE_MANAGER_SCHRITTE.md` und `git-status-porcelain.txt` sind gelöscht.

## Eingangsrevisionen
Repo-HEAD vor Integration: 941efd6df7c4ea4ad18ad6a39a78a76e625b9455.
Schaltplanrevision r4-C. Alte Baselines und PCB-/Projektquellen sind im
Prüfbeleg `baseline_before_hierarchy.zip` gesichert; Provenienz mit SHA-256
in `baseline-provenance.json`. Sämtliche SHA-256 beziehen sich auf Datei-Bytes
der Arbeitskopie.

## Ausgabedateien (Pfad + SHA-256)
- `electronics/exports/SCHALTPLAN_r4.pdf`: `d1296aa57b57eb73524d2da30ac484819c36be87e7e8602448d58ac0e608e8f9`
- `electronics/exports/kicad_quellen_r4.zip`: `7d720f482f73f2c12f43bc89c864d51620661c79983572e4e4f5eeea9ddd4315`
- `electronics/exports/pruefbelege_r4.zip`: `90bab9ca5a7b322dad270f28bbb155b90acdb0df2274d48b0705fb8ef3a51bd5`
- `electronics/exports/release_r4_delivery/artifacts/SHA256_MANIFEST.txt`: `0b79595040a7c47ec2a351c0d9c4eef6cf7767835240c90b2094e9d538896571`


Die drei Paket-/PDF-Dateien liegen zusätzlich bytegleich unter
`electronics/exports/release_r4_delivery/artifacts/` in der Zielstruktur.
Dort liegt auch der aktualisierte Manifest-Kandidat. Weitere Quellen- und
Beleg-Hashes: `pruefbelege_schaltplan_r4/hierarchical_SHA256SUMS.txt`.
Der Release-Manifest-Kandidat aktualisiert nur betroffene Einträge; übrige
Einträge wurden unverändert übernommen und nicht neu geprüft.

## Tatsächlich durchgeführte Prüfungen
Alle ausführbaren Werkzeuge im Container via `./project hw run`.
KiCad 10.0.8: Netzlistenexport kicadxml, ERC `--severity-all --format json`,
PCB-DRC `--schematic-parity --format json`; alle Berichte geöffnet/ausgewertet.
Haupt/UI: Netzliste MATCH (68/13 Referenzen, 74/14 Pin-Gruppen), ERC 0,
Parität 0 und offene Verbindungen 0. Haupt nur zwei bekannte J1-Silk-Warnungen,
UI DRC 0. Aktuelle PCB-SHA-256 erneut gegen den geprüften Migrationsstand geprüft.
PDF mit `sch export pdf`, Zusammenführung mit pdfunite; pdfinfo: 11 Seiten.
Mit pdftotext den exakten UI-Hinweis auf Seite 11 nachgewiesen.
Seiten 1 und 11 bei 80 dpi gerendert und persönlich per view angesehen, PASS.
Übrige finale Seiten visuell NOT RUN gemäss reduziertem Abschlussauftrag.
Archiv-CRC und jedes eingebettete Datei-Byte gegen die Quellen geprüft, PASS.
Die Release-Kopien sind SHA-256-identisch mit den neuen lokalen Dateien.
`git diff --check` und Manifest-Prüfung beim abschliessenden Sicherungslauf.
Einzelbefehle und Ausgabe in `pruefbelege_schaltplan_r4/closeout-commands.json`.

## Zahlen (Kennzeichnung)
BERECHNUNG aus KiCad-XML/JSON und pdfinfo: 11 PDF-Seiten; 54/12 explizit
umbenannte PCB-Netze; 0 geänderte Pin-Gruppen und unveränderte Geometrie
gemäss vollständigem AST-Vergleich. Beleg `pcb_namespace_migration.json`.
BERECHNUNG/Sichtprüfparameter: 80 dpi, geprüfte Seiten 1 und 11.

## Annahmen
Kein elektrisches Redesign und keine weitere Optimierung im Abschluss.
Ungeprüfte Hardware, Montage, Betrieb und EMV bleiben NOT RUN.

## Fehler
Nur die zwei bereits erlaubten J1-Silk-Warnungen. Keine weiteren Fehler in
den geprüften ERC-/Paritäts-/Verbindungsberichten.

## Offene Entscheide / Fragen an andere Disziplinen
Die Dateien unter releases/ und die Root-.gitignore wurden nicht verändert.
Die beiden verlangten Widerspruchseinträge und die .gitignore-Ergänzungen
sind als `release_r4_delivery/repo.patch` vorbereitet. Die vorgeschlagene
vollständige Widerspruchsdatei und ihre Artefaktkopie liegen daneben.
Kein Commit-Hash neu erzeugt; kein Pull/Rebase, Push oder Release-Upload.

## Nächste Schritte
Manager: Patch prüfen/anwenden, vorbereitete artifacts/ in V1_BASELINE
kopieren, nur endgültige eigene Dateien gezielt aufnehmen (kein STEP-ZIP,
keine Mechanik-/Editor-Dateien), mit gefordertem Co-authored-by-Trailer
committen, pull --rebase --autostash, push und die vier Artefakte hochladen.
Eigene Arbeitsordner und Locks werden entfernt; Mechanik-Locks bleiben stehen.
