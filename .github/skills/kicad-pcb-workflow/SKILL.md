---
name: kicad-pcb-workflow
description: "KiCad 10 headless: Schaltplan, Layout, ERC/DRC, Gerber/Bohrdaten, BOM/CPL im JLCPCB-Format."
---

# kicad-pcb-workflow (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- Alles über `./project hw run "kicad-cli …"`. ERC: `kicad-cli sch erc --severity-all --format json`. DRC: `kicad-cli pcb drc --schematic-parity --format json`.
- Gerber: `kicad-cli pcb export gerbers`, Bohrdaten: `kicad-cli pcb export drill --format excellon`, CPL: `kicad-cli pcb export pos --format csv --units mm`.
- JLCPCB-BOM-Spalten: Comment, Designator, Footprint, LCSC Part #. CPL-Spalten: Designator, Mid X, Mid Y, Layer, Rotation. Rotationen gegen die JLC-Vorschau prüfen.
- Gerber mit `kicad-cli pcb render` bzw. `gerbv`-Export sichtprüfen.

## Lesbare Schaltpläne
- Schaltungen nach Funktion anordnen; innerhalb eines Funktionsblocks Verbindungen möglichst als Leitungen zeigen, gleichnamige Netzlabels für Verbindungen zwischen Blöcken verwenden.
- Bauteile, Pins, Werte und Netzlabels dürfen sich nicht überlappen. Ausreichende Schriftgrösse und bei Bedarf mehrere Blätter oder Detailansichten vorsehen.
- Exportierte PDF-Seiten und dichte Bereiche gerendert in Gesamt- und Detailansicht prüfen; ein erfolgreicher Export oder ERC allein bestätigt keine Lesbarkeit. Grenzen und nicht geprüfte Ansichten dokumentieren.
- Bei rein grafischer Überarbeitung Netzlisten vor und nach der Änderung anhand von Bauteilen, Footprints und Netz-/Pinzuordnungen vergleichen; ERC und PCB-Parität erneut prüfen. Keine elektrische Änderung als Layoutkorrektur ausgeben.
- Aktualisierte Schaltplan-PDFs, KiCad-Quellenarchive und Prüfsummen im Release konsistent halten.
