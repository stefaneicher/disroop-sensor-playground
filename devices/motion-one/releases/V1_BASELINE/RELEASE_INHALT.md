# Release-Inhalt Motion One V1 Baseline (motion-one-v1.0)

Pre-release, kein Fertigungs-/Hardware-Release. Alle Hardware-Schritte NOT RUN. Pfade der Assets relativ zu `releases/V1_BASELINE/artifacts/`. "Im Release" = als GitHub-Asset und (ausser Gross-STEP) im Repo.

## Produktion/Fertigung
| Artefakt | Quelle im Repo | Im Release | Label | Lücke |
|---|---|---|---|---|
| Gerber+Bohrdaten Hauptboard r4 | manufacturing/pcba/ | ja (electronics/motion-one_gerber_r4.zip, in fertigung_paket_r4.zip) | MESSUNG (Export) | – |
| Gerber+Bohrdaten Bedienplatine UI | manufacturing/pcba/ui/ | ja (fertigung_paket_r4.zip) | MESSUNG | – |
| BOM/CPL Hauptboard, UI | manufacturing/pcba/ | ja | QUELLE | – |
| Angebote/Kosten ANGEBOTE_V1.md | sourcing/ | ja (manufacturing/) | BERECHNUNG/ANNAHME | Board-Stand r3-Basis, Sofortpreise/Versand NOT RUN |
| Sourcing/Lagerprüfung | sourcing/raw, smoke_C1525.md | ja (fertigung_paket_r4.zip) | QUELLE (2026-11-08) | E73-Lager vor Bestellung neu prüfen |
| Stückliste mit LCSC-Nummern BOM_V1.md | sourcing/ | ja | QUELLE | – |
| Upload-Pakete JLC/Swiss3D | manufacturing/upload/ | nein | r3-Stand | veraltet (r3), bewusst nicht aufgenommen |

## PCB
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| KiCad-Projekte (Quellen) | electronics/kicad | ja (kicad/kicad_quellen_r4.zip) | QUELLE | .ses und Board-STEP-Exports nicht im Zip |
| Schaltplan-PDF | electronics/exports | ja | QUELLE | – |
| Layout-PDF/SVG | electronics/exports | ja | QUELLE | – |
| STEP Board | electronics/kicad/motion-one/export | ja (step/motion-one-board_r4.step) | QUELLE | Dichtheit pcb_r4.stl widersprüchlich |
| PINOUT_V1.json, INTERFACES.json | electronics, management | ja (kicad/) | QUELLE | – |
| ERC/DRC-Belege | pruefbelege_r4.zip | ja | MESSUNG | 2 Silk-Warnungen DRC |

## Mechanik
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| STL/3MF Druckteile | mechanics/print | ja (mechanics/) | QUELLE | – |
| STEP Teile+Baugruppe | mechanics/cad | ja (step/mechanik_step_gross_r4.zip, 198 MB, nur Release-Asset, nicht im Git) | QUELLE | grosse Dateien nicht im Repo-Commit |
| STEP < 30 MB, Skripte, params.py, JSON-Berichte | scripts/mechanics, mechanics/cad | ja (mechanics/mechanik_quellen.zip) | QUELLE | – |
| Kollisions-/Wand-/Lippenberichte | mechanics/cad, logs | ja (in mechanik_quellen.zip) | SIMULATION | Wand 0.8 mm < 1.0 mm FAIL; Lippe 0.191 mm |
| FEM-Stand | mechanics/fem | nur fem_results.json | – | FEM r4 NOT RUN; kein FEM-Bericht (Lücke) |
| Slice-Stand | mechanics/print/slice | nur JSON/Logs | – | Slice r4 NOT RUN; G-Code nicht im Release |

## Firmware
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| UF2/HEX/BIN | logs/fw-pinmap | ja (firmware/) | MESSUNG (Build) | nicht geflasht |
| Quellen-Zip | firmware/ | ja (firmware_quellen.zip, ohne build/) | QUELLE | – |
| DTS-Pinmap | firmware/boards | ja (motion_one.dts, -pins.dtsi) | QUELLE | – |
| Testlogs | logs/fw-pinmap | ja (unit-tests_pinmap.log, im Quellen-Zip) | MESSUNG, nur Host | Hardwaretests NOT RUN |
| protocol.md | docs/protocol.md | ja | QUELLE | – |
| Flash-Anleitung | firmware/PROGRAMMING.md | ja (FLASH_ANLEITUNG.md) | NOT RUN | Bootloader-HEX nicht archiviert |

## Elektrische Analyse
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| SPICE, Leistungsbudget, Motorbudget | electronics/spice, analysis | ja (analyse/analyse_spice_budget.zip) | SIMULATION/BERECHNUNG | – |
| ANALYSE_V1.md | electronics/analysis | ja | BERECHNUNG | – |
| Thermik-Bericht, Toleranzbericht (eigenständig) | – | nein | – | LÜCKE: kein separater Bericht vorhanden, nicht erfunden |

## Messungen/Berichte
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| Technischer Bericht | docs/report | ja (PDF) | gemischt | – |
| Verifikationsmatrix | releases | ja | 0 PASS/17 PARTIAL/26 NOT RUN | – |
| metrics.json | management | ja (docs/) | gemischt | firmware_* veraltet (Widerspruch 7) |
| Widersprüche | releases | ja | – | – |
| Messungen am Gerät | – | nein | – | LÜCKE: keine Hardware, NOT RUN |

## Anleitungen
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| ASSEMBLY, USER (PDF+MD) | docs/ | ja | – | Anzugsmomente offen |
| REPRODUCE.md, DEMO_RUNBOOK.md | devices/motion-one | ja (docs/) | – | Demo NOT RUN |
| HANDOFF_MARKETING.md | media | ja (docs/) | – | – |

## Software
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| Bridge/Android/Spiele/Pages | bridge, android, tennis, .github/workflows | Hinweis (software/SOFTWARE_HINWEIS.md) | – | APK nicht im Repo |

## Bilder/Renders
| Artefakt | Quelle | Im Release | Label | Lücke |
|---|---|---|---|---|
| 5 Renders (PNG) | media/renders | ja (renders/) | aus echter Geometrie | Video nicht im Release |

## Nutzer-ToDos
Nichts bestellt, nichts gedruckt, nichts geflasht. Offen beim Nutzer: Bestellung PCBA (Lager E73 prüfen), Gehäusedruck, Flash mit SWD-Probe, Passprobe Lippe, Wand-/FEM-Prüfung.
