# Handoff mechanical-engineer: r4 Abschlussdurchlauf (2026-11-09)

## Status
PARTIAL. Vollbau (glatt) und Netzprüfungen gelaufen; Wand unter Ziel, FEM/Slice NOT RUN.

## Ausgabedateien
- `mechanics/print/*.stl/.3mf`, `mechanics/assembly_stl/*`, `mechanics/cad/collision_r4.json`, `mechanics/cad/final_checks_r4.json` (SHA über `collision_r4.json` build_hash).
- Skripte: `scripts/mechanics/check_r4_final.py`, `fix_tjunction.py`, geänderte `build_enclosure.py`, `params.py`, `check_collision_mesh.py`.

## Prüfungen und Zahlen
| Punkt | Ergebnis | Label |
|---|---|---|
| Netz-Kollision, 16 Paare | 0 Kollisionen, Keepout PASS | SIMULATION, PASS |
| Schieber dx -1.5/0/+1.5 gegen Oberschale, Unterschale, Platine | 0.0 mm³ | SIMULATION, PASS |
| Lippenspiel | min 0.191 mm, p5 0.252 mm, Soll 0.25 | SIMULATION, PASS |
| Wand Voxel-EDT, Pitch 0.4 mm | Min 0.8 mm (Oberschale 4.4/-6.8/3.2: 313 von 41267 Medialpunkten <1 mm; Unterschale 35.2/-15.2/0.0: 130 von 46335) | SIMULATION, FAIL gegen 1.0 mm (Auflösung grob, Rundungen können Artefakt sein) |
| Clip-Balken L 14, t 1.0, Hub 0.7, E 1.5 GPa | Dehnung 0.54 %, 8 MPa, 0.48 N | BERECHNUNG, PASS (Einspannung starr: ANNAHME) |
| Dichtheit print/*.stl | alle dicht, Unterschale erst nach STL-Flick (Lippe, 4 Kanten, T-Verbindung) | PASS mit Nachbesserung; BREP unverändert |
| `pcb_r4.stl` | SHA 19681e13…; Körper 72, davon 38 dicht (Mechanik) vs. 40/40 (PCB) | ungeklärt, Gesamtlabel PARTIAL |
| FEM Schraubdom/Clip, Bambu-Slice P2S | nicht gelaufen (Werkzeuge im Container vorhanden) | NOT RUN |

## Umgesetzt
Akku-Halte-Nasen `BAT_TABS` (x 28.3 und 45.7, Länge 5.6, ragen 0.4 über Akkukante; ursprüngliche Länge 6.0 erzeugte offene Kanten), J1-Stützrippe `J1_RIB` (nur Steckkraft, keine Zugentlastung). 4. Clip nicht gebaut (J5 und Akkurahmen blockieren, Board nicht verschoben).

## Offen / Fragen
- Wand <1 mm: feinere Messung (Pitch 0.2) oder `LIP_D0`/Nutwand erhöhen; Fragen an Druck-Test.
- pcb-engineer: Zählmethode der 40/40 Körper nennen, um Messung anzugleichen.
- Kabelzugentlastung echt (Nut/Klemme) fehlt. SW1-Y-Spiegelung, y_tip 13.55, Hebelhöhe weiter ANNAHME.
- FEM, Slice, Toleranzkörper-Druck: NOT RUN.
