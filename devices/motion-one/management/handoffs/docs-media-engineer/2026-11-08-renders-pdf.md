# Handoff docs-media-engineer – Renders, Anleitungen, PDF (2026-11-08)

## Status
**PARTIAL**. Alle Bilder und Texte sind **r3-Stand** (`mechanics/assembly_stl/`, `pcb_r3`); r4-Gehäuse ist nicht gebaut. Anleitungen bleiben DRAFT. Hardwareabhängiges: NOT RUN.

## Bearbeitete Anforderungen
PROMPT_1 §11 (Renderings, Montage-/Bedienungsanleitung, Marketing-Handoff).

## Eingangsrevisionen
`mechanics/assembly_stl/*.stl` + `explode.json` (r3), `management/metrics.json`.

## Ausgabedateien (SHA-256)
| Pfad | SHA-256 |
|---|---|
| media/renders/iso_closed.png | bf8cb0adc8d22d68b4402d50e95386c14c86e47247f067dcadd1158887e1d241 |
| media/renders/iso_open.png | 514102c3bf929fdbd663bfab6d6c499f2e005889926b62c370017f1aee1ec1e3 |
| media/renders/exploded_raw.png | 4384d5b26d9f32f038d89ae4feaafe821ed1bd9597a15b897b552f90ba3a2dd2 |
| media/renders/top_open.png | f7b814a41e381a3749b4546a21e6f016e2e13c8c7998b8fbb429cee2adfd60a5 |
| docs/assembly/ASSEMBLY.md | d3d12b8c87329836a49b04f9c32d8165222b0253b3187e4b318b6c360204f0ea |
| docs/user/USER.md | c47060259e6baf5c142d8da7eec5c924bc2811f843a5cff9d4ce69b64f74c51e |
| docs/assembly/ASSEMBLY.pdf | ab2d60d145c5e9bb2808cb6d307924145ce38bdcca75cc640172e2de61b1594d |
| docs/user/USER.pdf | 4c79ebd3c7f6b8d841b2d24cd602a3b425a8bd8e20bec14f030f884a2e8d7566 |
| media/HANDOFF_MARKETING.md | e56984fad24a8faa946842e28c02508dc44ebc7cdbc3c85510746ebc51b51a5a |

## Durchgeführte Prüfungen
- (1) PNG-Header aller 4 Renders: 3840x2160, 8 Bit RGBA → PASS (Format). iso_closed visuell geöffnet. Die drei anderen Bilder nicht visuell geprüft; Einheiten-Skalierung (mm→m) nur per Skript, DIM_MM-Log nicht ausgewertet → PARTIAL. Beschriftete Explosionsansicht fehlt (nur Rohbild).
- (2) Bilder in ASSEMBLY.md/USER.md eingebunden, als r3/DRAFT gekennzeichnet → PASS (Text).
- (3) Pandoc/xelatex im Container: ASSEMBLY.pdf 6 Seiten, USER.pdf 4 Seiten (pdfinfo). Seiten nicht visuell geprüft → PARTIAL. HANDOFF_MARKETING nur mit metrics.json-Werten.
- Hardware, Montage, Anzugsmomente: NOT RUN / offen.

## Zahlen
Keine neuen Zahlen; Marketingwerte stammen aus metrics.json mit deren Klassen.

## Fehler / Hinweise
- Erster Renderlauf mit relativen Pfaden scheiterte (Container-Workdir = Repo-Root); parallel lief ein build_enclosure.py im Container und verlangsamte Blender stark (~15 min je Bild).
- Log: logs/media/render_iso.log.

## Offene Fragen
Nach r4-Build: alle Renders und PDFs neu erzeugen, Explosionsansicht beschriften, Video.

## Nächste Schritte
r4 abwarten, Renders neu, Seiten visuell prüfen.
