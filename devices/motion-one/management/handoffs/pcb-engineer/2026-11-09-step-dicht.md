# Handoff pcb-engineer – Board-STEP r4 dicht, Hauptboard-ERC

## Status
PARTIAL: STEP/STL dicht (PASS), aber 3 Körper nur als Quader-Hüllkörper (vereinfacht). ERC Hauptboard: PASS (0 Verletzungen).

## Bearbeitete Anforderungen
Befund aus [mechanical-engineer r4](../mechanical-engineer/2026-11-08-r4.md): pcb_r4.stl 10 offen / 60 nichtmanifold.

## Eingangsrevisionen
Board-STEP r4 (40 Körper), Hauptboard-Schaltplan r4c.

## Ursache (MESSUNG, trimesh pro Körper, Tessellierung 0.01 mm)
| Körper | Bauteil (ANNAHME aus Bbox/Position) | offen / nichtmanifold |
|---|---|---|
| 0 | E73-Modul U1 (x 51.6–69.6, y −18…−5) | 4 / 4 |
| 23 | Schiebeschalter SW1 (x 16.7–23.3) | 4 / 4 |
| 25 | USB-C J1 (x 2.3–10.2) | 2 / 3090 |
Ursache: die KiCad-/Hersteller-3D-Modelle (E73, MSK12C02, USB-C TYPE-C-31-M-12) haben selbst nicht geschlossene bzw. überlappende Flächen (Netzqualität des Modells im STEP; Einzelmodell nicht separat geprüft, daher ANNAHME).

## Behebung
Die 3 Körper wurden durch ihre Bounding-Box-Quader ersetzt (vereinfachter Körper, deckt Hüllmass; USB-C-Rundungen und Modulinnenform gehen verloren, für Kollision/Explosion ausreichend, für Render weniger detailreich). Skript [step_fix_leaky.py](../../../scripts/electronics/step_fix_leaky.py), Prüfung [step_body_check.py](../../../scripts/electronics/step_body_check.py), STL [export_pcb_stl.py](../../../scripts/electronics/export_pcb_stl.py).
Nachweis: [step_fix.json](../../../logs/pcb-r4d/step_fix.json) (STEP neu eingelesen: 0 offen / 0 nichtmanifold, 40 Körper), [pcb_r4_stl_check.json](../../../logs/pcb-r4d/pcb_r4_stl_check.json): pcb_r4.stl 40/40 Körper wasserdicht, 0 offen / 0 nichtmanifold → **PASS**.
Nicht erfolgt: kicad-pcb-Quelle unverändert; ein erneuter `kicad-cli pcb export step` würde die undichten Modelle wieder erzeugen (Skript step_fix_leaky.py danach erneut anwenden).

## Ausgabedateien
- `electronics/kicad/motion-one/export/motion-one-board.step` (geändert, SHA-256 siehe `git`)
- `mechanics/assembly_stl/pcb_r4.stl` SHA-256 19681e13daa6c91bd9b8acf58c77918afebc0ed0093c21f10c2a74e83f69dd74; `explode.json` aktualisiert

## Hauptboard-ERC
`kicad-cli sch erc --severity-all` (KiCad 10, Container): 0 Verletzungen, [erc.json](../../../logs/pcb-r4d/erc.json) → **PASS** (bisher NOT RUN). Nur Schaltplan geprüft; nicht heisst das Hardware-Funktion.

## Offene Fragen
Mechanik: pcb_r4.stl muss neu in Kollisions-/Gehäuselauf einfliessen (Hüllquader von U1/SW1/J1 sind grösser als die Echtform → konservativ). Render: Docs-Engineer sieht für diese 3 Teile Quader.

## Nächste Schritte
Optional: Modelle reparieren (Blender/gmsh-Remesh) oder alternative STEP-Modelle. Nichts bestellt.
