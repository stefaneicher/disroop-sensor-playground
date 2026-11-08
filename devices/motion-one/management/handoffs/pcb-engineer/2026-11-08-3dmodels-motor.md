# Handoff pcb-engineer – 3D-Modelle r3 + Vibrationsmotor (2026-11-08)

## Status
PARTIAL – 3D-Modelle eingebunden, DRC 0, STEP neu: PASS. Motor gewählt: PASS. Worst Case: FAIL an USB (VBUS > 500 mA ohne Firmware-Begrenzung). Hardwaretests: NOT RUN.

## Bearbeitete Anforderungen
REQ-040 (Laufzeit), Mechanik-Schnittstelle Motor (INTERFACES "motor"), Board-STEP für Kollisionsprüfung.

## Eingangsrevisionen
Board r3 (`motion-one.kicad_pcb` vor Änderung), INTERFACES r3, ANALYSE_V1 (Stand 2026-11-08 früh), BOM_V1 r3.

## Ausgabedateien (SHA-256)
| Pfad (relativ zu devices/motion-one) | SHA-256 |
|---|---|
| electronics/kicad/motion-one/motion-one.3dshapes/README.md | 11760cd84ce7614f878ff1b1fa272959ce54b1bb7c980af5ff205a0b3e3c2717 |
| electronics/kicad/motion-one/motion-one.3dshapes/SW-SMD_3P-L6.6-W2.7-LS7.8-P1.50.step | 05b22e1e8ef01866ddfb2339a6768d839a7a4555372ad2b0435533b77ad01d04 |
| electronics/kicad/motion-one/motion-one.3dshapes/SW-SMD_4P-L5.1-W5.1-P3.70-LS6.5-TL_H1.5.step | 2b1a5886304dd712e477739b62a80c5f568d59d1771f5a236c6ebefee5b2f5b1 |
| electronics/kicad/motion-one/motion-one.3dshapes/USB-C_SMD-TYPE-C-31-M-12_1.step | b083e67ce4d06850a2c3835a6366f4012b2def64f8f2781636381ebcaa33e9a0 |
| electronics/kicad/motion-one/motion-one.3dshapes/WIRELM-SMD_L18.0-W13.0-H3.0-E73-2G4M08S1C.step | 5e643e50891a8ce2f8fbe40ee6812f0f501ff5ba57c1509f8d70ab11ee270037 |
| electronics/kicad/motion-one/motion-one.kicad_pcb | c9e8ea588fa5d5786a30c75cb413faa6be19468d227750435fb844b9db0a9c47 |
| electronics/kicad/motion-one/export/motion-one-board.step (5.9 MB) | e3d7ab33be3b876a7520bee316dab6956499ba0f7929b570f0db20b617da49f1 |
| electronics/datasheets/LCM0827A3038F_C2759981.pdf | bae8db209db8bf58e3c350d589865894483a42ee0562f9399e0ff79d298179d5 |
| electronics/analysis/ANALYSE_V1.md | 3c0d9326b70d2acf55ba4c364438f84e6e07cc8ca2fd5da9717f6fd9ea3e4199 |
| electronics/analysis/motor_budget.json | 23a6e0e4fe00dd55443625ae8caf8cd6b2ab14e0c4f2fcdf90c1f635b191c281 |
| scripts/electronics/motor_budget.py | a44468ff47c88c8c8ef70e1c39bdc134ef48bdd58ff98ad93072d167df276b32 |
| electronics/spice/worstcase_3v5.cir / .csv / .log | 30d39d2c… / 06cf88e2… / e7c704e4… |
| electronics/spice/worstcase_3v3.cir / .csv / .log | 6bcde056… / 1aebdaf7… / 8974df7c… |
| sourcing/BOM_V1.md | f20565adc5ceaab68b6f4e41c7e9ce52d158e7ae5a1836b998ccdefc9379a9f3 |
| sourcing/raw/jlc_motor_2026-11-08.json | b13032d69197d9b05936c384f2c15de5723755003a889529d288d8fe20794382 |
| management/INTERFACES.json | 8c487ff1cf48962d4a1279fa36c708172f26f128aee3880dee0a1f4840c8d515 |
| (Repo) .lavish/pcb/iso_top.png / iso_bottom.png | 6da74393… / 472b7c73… |

## Tatsächlich durchgeführte Prüfungen
| Prüfung | Befehl / Version | Ergebnis | Status |
|---|---|---|---|
| Modellbeschaffung | easyeda2kicad 1.0.1 im Container, `--3d --lcsc_id` C356849/C165948/C318884/C431540 | 4 STEP, Quelle LCSC/EasyEDA | PASS |
| Offset/Rotation | Pad-Vergleich EasyEDA- vs. KiCad-Footprint (BERECHNUNG): E73 0/0/0°, USB-C y +1.39 / 180°, TS-1187A 0/0/0°, MSK12C02 y +0.55 / 180° | | PASS |
| Höhen gegen heights.json | Bounding-Boxen aus exportiertem STEP: U1 3.0 mm (heights 3.0), J1 3.25 (3.26), SW2 1.5 (1.5), SW1 Gehäuse 1.5 + Hebel (heights 3.5 inkl. Hebel) | | PASS |
| Render | kicad-cli 10.0.8 `pcb render` iso_top/iso_bottom + Draufsicht | Oben angesehen: Module, USB-C, Taster, Schiebeschalter sitzen auf den Pads, Pin-1/Antenne am Kopfende korrekt; iso_bottom erzeugt, nicht detailliert geprüft | PASS (oben) / PARTIAL (unten) |
| DRC | `kicad-cli pcb drc --schematic-parity --severity-error` | 0 Verletzungen, 0 unverbunden, 0 Parität | PASS |
| Board-STEP | `kicad-cli pcb export step --subst-models --no-dnp -f` | 5.9 MB < 50 MB, echte Modelle statt Quader | PASS |
| Lager Motor | `scripts/electronics/jlc_query.py` (öffentliche JLC-API), 2026-11-08T12:28:28Z | C2759981 Bestand 2284 | PASS |
| SPICE Worst Case | ngspice (Container) `worstcase_3v5/3v3.cir` | 3V3 min 2.99 / 2.80 V, VSW min 3.47 / 3.27 V, Motorzweig 136 / 128 mA | PASS |

## Zahlen
- Motor Leader LCM0827A3038F (C2759981): Ø 8.0 ±0.1 mm, Höhe 2.7 ±0.1 mm (max. 3.0), Litzen AWG32 27 ±2 mm, 3M-Klebepad 0.15 mm; 3.0 V nominal (2.7–3.3 V), I_nenn ≤ 80 mA, I_Anlauf ≤ 120 mA, R 30 Ω ±15 % – QUELLE Datenblatt S. 1/9.
- Preis 0.6297 / 0.5087 / 0.4563 USD (1/10/30 Stk), Bestand 2284 (≥ 10 × 10 Geräte = 100: PASS) – QUELLE https://jlcpcb.com/partdetail/C2759981, 2026-11-08T12:28Z.
- Alternative KOTL C1027B603F (C2836604, Ø 10 mm, 90 mA): Bestand 129 → Kriterium 10× knapp erfüllt, aber gering – QUELLE gleiche Abfrage.
- Mittelstrom 11.5 mA → Laufzeit 34.9 h (5 %); 15.5 mA / 25.9 h (10 %); 23.5 mA / 17.0 h (20 %) – BERECHNUNG `motor_budget.py`, Vibrationsanteil ANNAHME.
- Summer separat 0.87 mA (2 % Tonanteil ANNAHME).
- Worst Case: I_3V3 138.6 mA; 3V3 3.15 V (3.5 V) / 2.95 V (3.3 V) – BERECHNUNG; Akkustrom 276 / 268 mA (303 mA bei 4.2 V) – BERECHNUNG; DW01A-OCP ≈ 2.7 A – ANNAHME (150 mV / 2 × 28 mΩ).
- USB während des Ladens: VBUS 614 mA (Motor ohne PWM) / 543 mA (PWM 3.0 V, Anlauf) > 500 mA → FAIL; typisch 433 mA; mit Firmware-Massnahme ≤ 456 mA – BERECHNUNG.

## Annahmen
- Lizenz der EasyEDA-Modelle: keine explizite Lizenz → interne Nutzung zulässig angenommen; vor öffentlicher Weitergabe prüfen.
- Motor-PWM in der Firmware auf U_eff ≤ 3.0 V (Duty = 3.0/Vbat), weil der Motor an VSW (bis 4.2 V bzw. 4.87 V an USB) hängt.
- nRF52840 TX +8 dBm + CPU ≈ 39 mA (Grössenordnung PS), LDO R_DO 2.5 Ω, Kapazität 400 mAh nutzbar.
- SPICE: LDO als Verhaltensquelle; Akkustrom im Modell nur VSW-/Motorzweig.

## Fehler
- Erste Datenblatt-Downloads lieferten HTML (Redirect) → über die Weiterleitungs-URL korrekt geladen.
- ANALYSE §1 hatte Summer+Motor mit 1.5 mA zu tief angesetzt → korrigiert.

## Offene Entscheide / Fragen an andere Disziplinen
- firmware-engineer: Motor-PWM auf ≤ 3.0 V effektiv (Pflicht, Datenblatt max. 3.3 V); an USB Motor nicht gleichzeitig mit Summer, damit VBUS ≤ 500 mA bleibt.
- mechanical-engineer: Mulde in der Unterschale beim Akku Ø 8.6 × 3.2 mm + Litzenkanal (INTERFACES "motor") – nach Freigabe des Mechanik-Locks.
- systems-engineer: Option V2 R_PROG 5.6k (214 mA Ladestrom) prüfen; Soft-Start Q2 (aus Analyse §4).

## Nächste Schritte
1. Manager: Zahlen in metrics.json übernehmen, Commit.
2. iso_bottom-Render im Detail prüfen; Rotation der Teile in der JLC-Vorschau (NOT RUN).
3. Strom- und Laufzeitmessung am Muster (NOT RUN).
