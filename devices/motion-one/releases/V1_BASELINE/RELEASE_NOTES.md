# Motion One V1 Baseline (motion-one-v1.0)

Pre-release, kein Fertigungs-/Hardware-Release. Verifikationsmatrix: 0 PASS, 17 PARTIAL, 26 NOT RUN (keine Hardware). Nichts bestellt, gedruckt oder geflasht. Vollständiger Plan mit Lücken: `RELEASE_INHALT.md`. Prüfsummen: `SHA256_MANIFEST.txt`.

## Produktion/Fertigung
fertigung_paket_r4.zip (Gerber, Bohrdaten, BOM, CPL, Angebote, Sourcing), motion-one_gerber_r4.zip, BOM/CPL CSV, ANGEBOTE_V1.md, BOM_V1.md. Label: QUELLE/BERECHNUNG/ANNAHME; Sofortpreise und Versand NOT RUN; E73-Lager vor Bestellung neu prüfen.
## PCB
kicad_quellen_r4.zip, SCHALTPLAN_r4.pdf (neu: hierarchisch, 11 Blätter, verdrahtet; Netzliste MATCH, ERC 0, Parität 0; UI-Platine optional, nicht Teil des Geräts r4; PCB-Netze 54/12 umbenannt, Geometrie unverändert), Layout-PDF/SVG, motion-one-board_r4.step, PINOUT_V1.json, INTERFACES.json, pruefbelege_r4.zip (ERC 0 Verletzungen, DRC Hauptboard 2 Silk-Warnungen; MESSUNG). pcb_r4.stl Dichtheit widersprüchlich (38/72 vs 40/40).
## Mechanik
Neu: SW1-Schieber mit innerer Anlagefläche und Führungsleisten (Spiel 0,15/0,2 mm; Kollision 0 in beiden Endlagen, SIMULATION; Wandstärke/Slice/Probedruck NOT RUN). STL/3MF aller Druckteile, mechanik_quellen.zip (Skripte, params, JSON-Berichte, STEP <30 MB), mechanik_step_gross_r4.zip (198 MB, nur Asset). Wand 0.8 mm < 1.0 mm FAIL (SIMULATION), Lippenspiel min 0.191 mm < 0.25 mm; FEM/Slice r4 NOT RUN.
## Firmware
zephyr.uf2/.hex/.bin, firmware_quellen.zip, DTS-Pinmap, protocol.md, FLASH_ANLEITUNG.md, Hosttests 69/0 PASS (nur Host). Flashen NOT RUN; Bootloader-HEX nicht archiviert.
## Elektrische Analyse
analyse_spice_budget.zip, ANALYSE_V1.md (SIMULATION/BERECHNUNG). Eigenständige Thermik-/Toleranzberichte: Lücke.
## Messungen/Berichte
TECHNISCHER_BERICHT_V1.pdf, VERIFIKATIONSMATRIX.md, metrics.json (firmware_* veraltet), BEKANNTE_WIDERSPRUECHE.md. Gerätemessungen: keine (NOT RUN).
## Anleitungen
ASSEMBLY, USER (PDF/MD), REPRODUCE.md, DEMO_RUNBOOK.md, HANDOFF_MARKETING.md. Anzugsmomente offen.
## Software / Bilder
SOFTWARE_HINWEIS.md (Bridge, Android, Spiele, Pages im Repo); 5 Renders (PNG).
## Nutzer-ToDos
PCBA-Bestellung, Gehäusedruck, Flash mit SWD-Probe, Passprobe, Wand-/FEM-Prüfung.
