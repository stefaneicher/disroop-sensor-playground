---
name: kicad-pcb-workflow
description: "KiCad 10 headless: Schaltplan, Layout, ERC/DRC, Gerber/Bohrdaten, BOM/CPL im JLCPCB-Format."
---

# kicad-pcb-workflow (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- Alles über `./project hw run "kicad-cli …"`. ERC: `kicad-cli sch erc --severity-all --format json`. DRC: `kicad-cli pcb drc --schematic-parity --format json`.
- Gerber: `kicad-cli pcb export gerbers`, Bohrdaten: `kicad-cli pcb export drill --format excellon`, CPL: `kicad-cli pcb export pos --format csv --units mm`.
- JLCPCB-BOM-Spalten: Comment, Designator, Footprint, LCSC Part #. CPL-Spalten: Designator, Mid X, Mid Y, Layer, Rotation. Rotationen gegen die JLC-Vorschau prüfen.
- Gerber mit `kicad-cli pcb render` bzw. `gerbv`-Export sichtprüfen.
