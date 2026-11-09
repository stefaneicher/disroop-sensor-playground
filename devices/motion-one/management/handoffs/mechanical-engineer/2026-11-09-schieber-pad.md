# Handoff mechanical-engineer – Schieber SW1: Anlage-Pad und Führungsleisten (r4-Pad)

## Status
PARTIAL. Geometrie, Kollision, Spiel, Dichtheit und Hebel-Eingriff sind geprüft. Render-Nahaufnahme und Wandstärken-EDT (check_r4_final.py) sind NOT RUN, weil das Zeitbudget überschritten war. Druck und Messung am Teil: NOT RUN.

## Bearbeitete Anforderungen
Auftrag Nutzer 2026-11-09: Schieber SW1 darf nicht wackeln (Pad, Spiel 0,15/0,2, Führungsleisten, gefangener Kragen, kollisionsfrei, ohne Support druckbar).

## Eingangsrevisionen
oberschale-r4 → oberschale-r4-pad, schieber-r4 → schieber-r4-pad. unterschale_glatt-r4 unverändert (nicht neu gebaut, STL aus HEAD).

## Umsetzung
- params.py: `SLIDER_PAD_CLR = 0.15` (A), `SLIDER_SIDE_CLR = 0.2` (A), `SLIDER_GUIDE` (A).
- build_enclosure.py:
  - `slider_pad()`: plane Fläche bei y = 14,10, parallel zu x, über x 13,9..35,3. Die Länge 21,4 setzt sich zusammen aus Fenster 7 + 2×1,5 Weg + Kragen 11,4.
  - Obere Leiste ab z 4,2, ragt 0,6 vor, Unterseite 45°. Untere Leiste z 0,25..0,85, Oberseite 45°.
  - `slider_pocket()` stellt das Fügeband im Kragen-Hüllraum frei; vorher kollidierte das Band bei z 3,2..3,4 mit 0,03–0,07 mm³.
- slider_geom():
  - Kragen 11,4 × 0,9 × 4,4 mm (x × y 13,05..13,95 × z 0,2..4,6), Dach und Unterkante unter 45°, parallel zu den Leisten.
  - Griff ab z 0,2 (plane Bettfläche).
  - Hebelschlitz bis y 13,70.
- Neu: `rebuild_top.py` (Teilneubau Oberschale) und `check_slider_pad.py`.

## Tatsächlich durchgeführte Prüfungen
| Prüfung | Befehl | Ergebnis | Status |
|---|---|---|---|
| Kollision Schieber↔Ober-/Unterschale, dx −1,5 / 0 / +1,5 | check_slider_pad.py (OCC-BREP) | 0,0 / 0,0 / 0,0 mm³ | PASS (SIMULATION) |
| Spiel +y zum Pad | Verschiebung in Schritten von 0,01 bis zum Erstkontakt | 0,15 mm | PASS (SIMULATION) |
| Spiel normal zu Dach bzw. Unterkante | wie oben | 0,20 / 0,20 mm | PASS (SIMULATION) |
| Spiel +z / −z | wie oben | 0,20 / 0,28 mm | PASS (SIMULATION) |
| Kippen um x bis Kontakt | Drehung um die Kragenmitte | +2,05° / −5,25° | PARTIAL (SIMULATION; ohne Hebel im Schlitz) |
| Hebel-Eingriff | BERECHNUNG | Eingriff 0,5 mm in y, Spiel Spitze 0,15, x ±0,1, Kragen gefangen = true, identisch in beiden Endlagen (Schlitz fährt mit) | PASS (BERECHNUNG, Hebelmasse = ANNAHME, Datenblatt MSK12C02 nicht geprüft) |
| Mesh-Kollision Gesamtbaugruppe (PCB, Akku, Clips, Lichtleiter, Kappe, Motor) | check_collision_mesh.py | collisions = [], status_mechanik_teile PASS, status PARTIAL (nur wegen pcb_r4.stl nicht dicht, Fremdteil); Abstand Lichtleiter↔Oberschale 0,171, Kappe 0,202 | PASS (Mechanik) |
| Dichtheit | trimesh | oberschale True (20390 mm³), schieber True (176,0 mm³) | PASS |
| Überhang Pad-Bereich | Face-Normalen > 45° | eine 0,9 mm² grosse waagrechte Fläche an der Klemmrippe x = 33, z = 4,8 (Taschenschnitt durch die Rippe), Brücke < 1,5 mm | PARTIAL (unkritische Kurzbrücke, ANNAHME) |
| Wandstärke | check_r4_final.py | nicht gelaufen. Pad liegt nur innen auf der Wand, Fensterschnitt unverändert, Mindestwand wird deshalb nicht dünner (ANNAHME) | NOT RUN |
| Render-Nahaufnahme | – | – | NOT RUN |
| Druck / Wackeltest | – | – | NOT RUN (Hardware) |

## Bekannte Widersprüche
- Die Spielvorgabe „seitlich 0,2“ ist normal zu den 45°-Flächen umgesetzt. Rein in −z ergibt sich 0,28 mm.
- Der Kragen kann frei um +2°/−5° kippen, bevor er die Leisten berührt. Das tatsächliche Kippen begrenzt der Hebel im Schlitz (±0,1 mm). Die Wirkung ist erst nach dem Druck messbar.
- BEKANNTE_WIDERSPRUECHE.md liegt unter releases/ (Bereich des PCB-Agents) und wurde deshalb nicht bearbeitet. Der Manager soll den Eintrag übernehmen.

## Annahmen
- Hebelmasse SW1 (y_tip 13,55, Breite 1,4, z 1,0..2,5) aus params.py, Datenblatt ungeprüft.
- FDM-Spiel 0,15/0,2 für P2S, 0,4 mm.

## Nächste Schritte
- check_r4_final.py und den Vollbau ausführen, dann die Render-Nahaufnahme (mechanics/renders/schieber_pad_nah.png).
- Bambu-Slice für Oberschale und Schieber neu erstellen.
- Probedruck, danach Spiel und Wackeln messen (MESSUNG).

## Ausgabedateien (SHA-256)
```
f704dd991a0664610e6f4c67af1f2c29b1e6e313f7f840131bdd675435072739  devices/motion-one/scripts/mechanics/params.py
0494d7cb78bfff44d388bde442a78b9930745222c0cb5e4af3818423782f0b4e  devices/motion-one/scripts/mechanics/build_enclosure.py
40548eadfd55591df90c02c2435dbac086678f382d74137de7534dba01682004  devices/motion-one/scripts/mechanics/rebuild_top.py
895af9f4d21d7ee588e6938b802ad3ae48d43ca6204d220ca560c75dfda2fe4b  devices/motion-one/scripts/mechanics/check_slider_pad.py
4ecbf03f4c32a74a7fb8e7c2b342cae791c854e1d95becc1e2b41b3357431be8  devices/motion-one/mechanics/cad/oberschale.brep
61e188de8035cb2c5ce065d9e5dc31059f0c266d928d0c2904efdab653b1ebcd  devices/motion-one/mechanics/cad/oberschale.step
afded960bdc0722e70279b61513b7ba3ef5d87adac47cffb9130084425183afe  devices/motion-one/mechanics/cad/schieber.brep
0d33bdf317dc3009929043ea567a18d6beb743cf04e7acd6ca5aa57fb22aea5e  devices/motion-one/mechanics/cad/schieber.step
af1b5f331fe6da6f177efb1ee2947d646c27030c9ebfc819f8f9968ae5996ed0  devices/motion-one/mechanics/cad/cad_results.json
c58480c958ea4581274dec4af644de50b6828c19f54836a28e56c7c4de878e71  devices/motion-one/mechanics/cad/collision_r4.json
776a5512d275a4653d6c6911b19739b6b219a74ef19a1babdc99c62a93ce2e8a  devices/motion-one/mechanics/cad/slider_pad_checks.json
33dbe77484ae4ffdebbc03e70c13c5c1d14115346a7a7bd46278bdec49a8dbe3  devices/motion-one/mechanics/print/oberschale.stl
0b0f9b739c280327461f733ac2d4808e831859b11ca6b53ede7208c90f6ad824  devices/motion-one/mechanics/print/oberschale.3mf
ca1725085d845248dcf00522659a6b014a9a2b43513e21200249c1fd9056d84e  devices/motion-one/mechanics/print/schieber.stl
184e29efb94964610eae7c0413e1d729984ce9a2209a173347cf2ec749274e30  devices/motion-one/mechanics/print/schieber.3mf
438a7f87746bc5e6387f57c557661432426eba278d1592cccb9fd3dc629733c8  devices/motion-one/mechanics/assembly_stl/oberschale.stl
1595ac05d581bc9198b07d54903d329d5cd812c658097a58c60f6f368daca288  devices/motion-one/mechanics/assembly_stl/schieber.stl
1e58cd91c4d37aa74b5a7800246a53e542f60f23919fbaaf35124f267ef7a34a  devices/motion-one/mechanics/assembly_stl/explode.json
```
