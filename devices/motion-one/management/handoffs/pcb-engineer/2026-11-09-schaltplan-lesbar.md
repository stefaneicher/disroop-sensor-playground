# Schaltplan-Lesbarkeit Haupt- und Bedienplatine (Board r4)

## Status
PARTIAL. Die gezielt beanstandeten Detailbereiche U3/TH1/R3, U4, IMU/MCU und SW1 wurden nachbearbeitet und visuell geprüft. Die elektrische Struktur ist unverändert. Die A2-Hauptübersicht bleibt jedoch weitläufig; zwischen Funktionsblöcken sind weiterhin viele Verbindungen labelbasiert und zahlreiche passive Teile stehen als einzelne, nur über Netzlabels angebundene Symbole. Die Detailseiten sind die lesbare Referenz. Eine vollständige Verdichtung der Hauptübersicht wurde nicht behauptet.

## Bearbeitete Anforderungen
- Lokale U1/U6-Symbole in `motion-one.kicad_sym` auf gridkompatiblen Koordinaten vergrössert. Pin-IDs, Pin-Nummern, Namen und Typen blieben unverändert. Die Transformationen sind nun in `mo_lib.py` reproduzierbar; die nachträgliche Skalierung im Schaltplangenerator wurde entfernt.
- U3-Labels CHG_TEMP/CHG_PROG mit 1.0-mm-Schrift differenziert, sodass sie im Lade-Detail nicht mehr in TH1/R3 hineinragen. Die direkte Verbindung U3–TH1/R3 bleibt bestehen.
- U4-Labelroute DW_OC gegenüber DW_OD um 2.54 mm (2 × 1.27-mm-Raster) weiter abgesetzt.
- Vektor-Detail-PDFs aus KiCad-SVG erzeugt: Hauptübersicht plus acht Ausschnitte; UI-Übersicht plus drei Ausschnitte.
- Keine Absicht, Bauteilwerte, Referenzen, Footprints, PCB-Layout, Netzzuordnung oder Pinbelegung zu ändern. Keine Commit-, Upload- oder Bestellaktionen.
- `.github/skills/kicad-pcb-workflow/SKILL.md` (Nutzeränderung) und die vorbestehende ungetrackte STEP-ZIP blieben unangetastet.

## Eingangsrevisionen
- Board-Revision r4; KiCad CLI 10.0.8 im Container `./project hw run`.
- Baseline-Netlisten:
  - Haupt: `electronics/exports/.readability-work/structural/baseline/motion-one.xml`
  - UI: `electronics/exports/.readability-work/structural/baseline/motion-one-ui.xml`
- Zuvor dokumentierte Baseline-Netlisten-SHA-256: Haupt `32e7944ebcf6e87f9c04df57eb339a5c31203ae32582f193c510dd68b2544131`; UI `31a989b08f251bfe213ff466e43892cc47043643ba18c777dc1fab4b01dd1c6d`.

## Ausgabedateien (Pfad + SHA-256)
Pfade relativ zum Repository-Root.

Quellen:
- `devices/motion-one/electronics/kicad/motion-one/motion-one.kicad_sch` — `9e0ec4ad047b4ac0ca2c3f7c0e505b73fe5434f65a7d65be5c60f11f9c73e5a6`
- `devices/motion-one/electronics/kicad/motion-one-ui/motion-one-ui.kicad_sch` — `67719ef605ba031ff7f4625c8dd925d8870569ddf1894e7632c3609bd65c94f5`
- `devices/motion-one/electronics/kicad/motion-one/motion-one.kicad_sym` — `025762f6659dc2cff6deb199e7b37899c218bd7e24786329eb45882fa817497c`
- `devices/motion-one/scripts/electronics/gen_mo_sch.py` — `33f4755292b255ae0cf832febb4f7f1564a0d97e46d059e12b41563d7adc815c`
- `devices/motion-one/scripts/electronics/mo_lib.py` — `40e70db97f798167fb17a5f9020560e80fd444a626d40bed580c93bce62ae24e`
- `devices/motion-one/scripts/electronics/render_schematic_details.py` — `2101eaefbb41f3a671435c57344994d65c372525248aac5db51d86b0b7b0d4ca`

PDFs:
- `devices/motion-one/electronics/exports/SCHALTPLAN_r4_vector_details.pdf` — `e9dbb447d72765d40db6fa02fc4bf58f6ffb74762d7fe5f292693fd08aec5619`
- `devices/motion-one/electronics/exports/SCHALTPLAN_UI_r4_vector_details.pdf` — `d4d07fe7415faf6988c6cc4d3780d05049437ba02d587193827a00168d2f4c57`

Prüfresultate:
- `devices/motion-one/electronics/exports/.readability-work/structural/final/motion-one.xml` — `aa428f04cbad440f163148925adba3185e9cf4abf892d7c2ebbcd3aca5ad418c`
- `devices/motion-one/electronics/exports/.readability-work/structural/final/motion-one-ui.xml` — `474b6b19a8ac82721c1011511043689d1d7de6a4ef10582f147b2158d6554a92`
- `devices/motion-one/electronics/exports/.readability-work/structural/final/motion-one-erc.json` — `d6035c93e6a2df882ab859a0321ffc9707c5333d8d0d9ed13b40a5c82693ac2b`
- `devices/motion-one/electronics/exports/.readability-work/structural/final/motion-one-ui-erc.json` — `8279b8923fcb68e55194ce94370c2d2aee5fedbf89434e87aa60d750fb491ea0`
- `devices/motion-one/electronics/exports/.readability-work/structural/final/motion-one-drc.json` — `ff6e7f0c7c53c81aae7f35e0c94a9468b925561abe7ebbe926c7d8fc37e3a7b5`
- `devices/motion-one/electronics/exports/.readability-work/structural/final/motion-one-ui-drc.json` — `4ecbce16ef7e02c5be29dcc8a55f7046408990eb16be0ff07f3520dd18202743`

Visuelle Prüfseiten:
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-main-overview.png` — `9219f55ddb28a062707bc11b47bdf34153f8dc10fef4959ffd883697d2fc53c3`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-main-u3.png` — `0ea65f0e03ae1d7e9ed064371442441a06a76d2b55fed0c3dddfd9a9a3a6edb0`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-main-u4.png` — `0e035fd84cb649088c018ebd405284b1ca9ddf1d323f624295df304ab0ab6f68`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-main-imu.png` — `55c284123e3f855f68f7b0df6a9e4c05887e647f54ab3a9be249eafa5fc7760a`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-main-mcu.png` — `d1801bbc72a056ec5af12ee95941915d0a4e191c93f0947bda1a7b96f7b5b133`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-main-imu-mcu.png` — `afe02d2d3eb2f459c4e97fa8562a256e298e7dda037406405fe6eeff1fab8ce4`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-ui-overview.png` — `5dbec0398ed43957f192d8dca88995d9159b3cbbeabdcf04742d59eb3f25572f`
- `devices/motion-one/electronics/exports/.readability-work/structural/rendered/preview-ui-stick.png` — `c8bc8f75ee77dfbc5c318868ee8a5cb5d0881087a9d2356c06cadcaba08a2fb1`

## Tatsächlich durchgeführte Prüfungen
- Werkzeug: `./project hw run "kicad-cli version"` → KiCad 10.0.8.
- Netlisten:
  - `kicad-cli sch export netlist --format kicadxml --output ...`
  - Kanonischer Vergleich mit Baseline anhand Referenz/Wert/Footprint/Bibliothekssymbol und Netz-/Pin-Mitgliedschaften: Haupt MATCH, 68 Bauteile/74 Netze; UI MATCH, 13 Bauteile/14 Netze. Keine Pin- oder Netzabweichung.
- ERC:
  - `kicad-cli sch erc --severity-all --format json --output ...`
  - Ergebnisdateien geöffnet: Haupt 0 Verstösse, UI 0 Verstösse.
- PCB-Prüfung:
  - `kicad-cli pcb drc --schematic-parity --format json --output ...`
  - JSON-Ergebnisse geöffnet: Haupt 2 `silk_edge_clearance`-Warnungen an J1/Boardkante (Silkscreen-Positionen x=1.5 mm, y=7.8 mm und y=17.2 mm), 0 unverbundene Elemente, 0 Paritätsprobleme. UI 0 Verstösse, 0 unverbundene Elemente, 0 Paritätsprobleme. Die zwei Hauptboard-Warnungen entsprechen dem bekannten Baseline-Befund; PCB-Dateien wurden nicht geändert.
- Generator-Stabilität: beide Schaltpläne je zweimal erzeugt; SHA-256 blieb konstant (Haupt `9e0ec4ad…f9c73e5a6`, UI `67719ef6…65c94f5`).
- Symbolquell-Generator: `mo_lib.py` in temporäre Kopie ausgeführt; erzeugte `motion-one.kicad_sym` byteweise mit Quelle verglichen (`cmp`, identisch). `python3 -m py_compile` für Generator, Symbolgenerator und Renderer erfolgreich.
- PDFs: KiCad-SVG mit `rsvg-convert`/Renderer zu vektorisierten PDFs verarbeitet. Renderer-Prüfung und `pdfinfo`: Haupt 9 Seiten (Übersicht A2 plus 8 Detailseiten); UI 4 Seiten (Übersicht A4 plus 3 Detailseiten). Keine leeren Seiten in den geöffneten Ansichten.
- Sichtprüfung: finale Hauptübersicht, U3-Ladebereich, U4/Q3, IMU U6, MCU U1, kombinierte IMU/MCU-Seite sowie UI-Übersicht und SW1-Detailseite gerendert und geöffnet. In diesen Ausschnitten keine Textüberlagerung mehr beobachtet; U3-Labels sind kleiner als die Standardnetlabels.
- `git diff --check`: ohne Befund. Keine Commits, Pushes, Uploads, Bestellungen oder Hardwaretests.

## Zahlen
- Haupt 68 Bauteile/74 Netze und UI 13 Bauteile/14 Netze: MESSUNG aus KiCad-XML-Netzlisten.
- ERC/DRC-Zahlen: MESSUNG aus geöffneten JSON-Berichten (KiCad 10.0.8).
- PDF-Seitenzahl und Übersichtformat: MESSUNG mit `pdfinfo`; Detailseiten stammen aus SVG-Ausschnitten, nicht aus Raster-Crops.
- U1-Symbol-Geometrie sx=1.5/sy=1.5 und U6 sx=2.0/sy=1.5: BERECHNUNG/QUELLE `devices/motion-one/scripts/electronics/mo_lib.py`; Pin-IDs und Pin-Nummern unverändert.
- U3-Labels Schriftgrösse 1.0 mm: QUELLE `devices/motion-one/scripts/electronics/gen_mo_sch.py`.

## Annahmen
- Die angepassten Symbole sind reine Darstellungs-/Pinposition-Geometrieänderungen. Netlist-Vergleich, ERC und PCB-Schematic-Parität bestätigen, dass Referenzen, Footprints und elektrische Mitgliedschaften erhalten blieben.
- Die direkte Hauptverbindung U3–TH1/R3 ersetzt keine Netzzuordnung; sie ist zusätzlich zu den unveränderten Netzlabels im Generator definiert.
- Detail-PDFs sind Lesehilfen. Sie ersetzen weder den KiCad-Quellschaltplan noch Release-Artefakte.

## Fehler
- Hauptboard-DRC: 2 bekannte J1-Silkscreen-/Kanten-Warnungen, keine neuen Fehler.
- Die Hauptübersicht bleibt grossflächig und teilweise labelbasiert. Besonders passive Versorgungsteile sind nicht alle zu kompakten, durchgehend verdrahteten Funktionsketten zusammengezogen. Dichte Bereiche sind als Vektor-Details wesentlich lesbarer; eine vollständige Neuanordnung der Gesamtübersicht ist nicht Teil dieser Iteration.
- Der Screenshot von SW1 zeigt weiterhin eine dichte Pinanordnung, aber die Bezeichnungen sind im vergrösserten Vektordetail getrennt lesbar.

## Offene Entscheide / Fragen an andere Disziplinen
- Engineering-Manager soll entscheiden, ob die verbleibende Weitläufigkeit der A2-Übersicht als Zwischenstand akzeptiert wird oder eine separate Layoutiteration mit noch kompakteren Funktionsblöcken gewünscht ist.
- `SCHALTPLAN_r4.pdf` und Release-Artefakte wurden absichtlich nicht ersetzt; Manager entscheidet über spätere Integration.

## Nächste Schritte
- Handoff und Ergebnisse prüfen; falls akzeptiert, PDFs/Quellen konsistent in die Release-Integration übernehmen.
- Vor Release erneut Sichtprüfung und ERC/DRC-Netlist-Parität gegen den dann aktuellen Boardstand ausführen.

---
## Update 2026-11-09 (Nachfolger nach Timeout) – Status: PARTIAL

**Umsetzung:** `gen_mo_sch.py` neu (Mittelteil): lokale Power-Symbole (`mo_power:GND_L`/`VCC_L`, `power local`, Netzname bleibt `/NETZ`) für GND/3V3/VBAT/VBUS/VSW (Haupt) bzw. GND/3V3 (UI); blockinterne Netze per A*-Routing als echte Leitungen; schlägt eine Gruppe fehl, wird die ganze Gruppe gelabelt (keine halben Leitungen → keine Kurzschlüsse); Labels für Netze zwischen Blöcken. UI: PWR_FLAG für GND/3V3 ergänzt (#FLG91/92, nicht auf Platine). Neue Lib `mo_power.kicad_sym` + sym-lib-table-Eintrag in beiden Projekten. `scripts/electronics/compare_netlists.py` (kanonischer Vergleich, ignoriert `#`-Teile).

**Seitenaufteilung:** 1 Blatt Hauptplatine (A3) + 1 Blatt UI (A4) in `electronics/exports/SCHALTPLAN_r4.pdf` (Vektor, pdfunite).

**Zahlen (BERECHNUNG, Generatorausgabe):** Haupt: 286 Leitungssegmente, 107 Labels, 97 Power-Symbole, 18 gerouteten Verbindungen; UI: 57 Segmente, 22 Labels, 21 Power-Symbole.

**Prüfungen (kicad-cli 10.0.8, Container):**
- Netzliste vs. Baseline (Bauteile, Werte, Footprints, Pin-Mitgliedschaft): Haupt MATCH (68 Bauteile/74 Netze), UI MATCH (13/14). Netznamen unverändert.
- ERC --severity-all: Haupt 0, UI 0.
- DRC --schematic-parity: Parität 0/0; Haupt 2× silk_edge_clearance J1 (bekannt, akzeptiert), unconnected 0.
- Belege: `electronics/exports/pruefbelege_schaltplan_r4/*` (auch in pruefbelege_r4.zip).
- Sichtprüfung: Gesamtseiten (50/110 dpi) und Detail USB-C (220 dpi) selbst angesehen.

**Ehrliche Grenzen (deshalb PARTIAL):**
- 28 (Haupt) bzw. 6 (UI) blockinterne Netzgruppen konnten nicht kollisionsfrei geroutet werden und sind weiterhin über Labels verbunden (u. a. Akkuschutz DW_*/FS_D/BATN, IMU-SPI, SWD, XL1/XL2, LED_xK, MOT_EN).
- Blockrahmen überlappen sich (BLE/IMU-Block mit Akku-Block, Touch mit Stick); Platzierung wurde nicht neu gemacht; keine Aufteilung auf mehrere Blätter.
- Kriterium 1–3 damit nur teilweise erfüllt. Nächster Schritt: Platzierung blockweise kompakter neu (LAYOUTS in gen_mo_sch.py), ggf. 3 Blätter, dann Routing-Anteil erhöhen.

**Ausgabedateien (SHA-256):**
- electronics/exports/SCHALTPLAN_r4.pdf 3b37c7828739f94e0b8c5b154e502117ee33485785bf8f975f5028e0b797dde4
- electronics/exports/pruefbelege_r4.zip 78959d522c1c81c5df8b2ff04c76c1d79ba91c7f685f998b2a003e7156254482
- releases/V1_BASELINE/artifacts/kicad/kicad_quellen_r4.zip daeaa179f43765fe267755552a8bc04b224477698949d9285e4f48bf0715b822
- electronics/kicad/motion-one/motion-one.kicad_sch a65eecb35e07d5d265bb8f832fb14fabb72cd88ee1f846b75247b2487695a518
- electronics/kicad/motion-one-ui/motion-one-ui.kicad_sch 0ac9fc5cde3c6d1783dc3c0b567f0ac0b7c592421a4bb2eb30c2144bd8fb76f2
- Aufgeräumt: Zwischen-PDFs (*_lesbar/_mehrseitig/_verstaendlich/_vector_details), render_schematic_details.py, .readability-work/ gelöscht.
