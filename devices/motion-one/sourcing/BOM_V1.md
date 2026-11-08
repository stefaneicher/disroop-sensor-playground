# BOM V1 Motion One – Board r3 (Stand 2026-11-08 11:45 CET)

r3-Aenderung: J2 JST-PH C295747 -> JST-SH C160402 (Hoehe 2.9 mm). Akku-Gegenstecker: JST SHR-02V-S (nicht ueber JLC bestueckt). Neuabfrage J2/E73/ICM-45686 am 2026-11-08 10:39 UTC (Rohdaten `logs/sourcing-2026-11-08/`).

Quelle Lager/Preis: oeffentliche JLCPCB-Teile-API via `scripts/electronics/jlc_query.py`, Rohdaten `logs/pcb-v1/sourcing/jlc_q*.json` (UTC-Zeit je Zeile), Gegenprobe Teileseiten per Playwright `playwright_stock_2.json`. Teileseite: `https://jlcpcb.com/partdetail/<LCSC>`. Preise USD, Stufe 1 (QUELLE).

Bedarf fuer Bestand-Kriterium: 10 Geraete (ANNAHME) -> Bestand >= 10x Bedarf = 100x Menge/Geraet.

| LCSC | MPN | Wert | Footprint | Refs | Menge | Typ | Bestand | >=10x | USD/Stk | USD/Geraet | Abfrage | Alternative |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C94598 | MLT-5020 | MLT-5020 | Buzzer_MLT-5020 | BZ1 | 1 | Extended | 147110 | PASS | 0.4004 | 0.400 | 2026-11-07T22:59Z jlc_q1.json | MLT-5020 Variante C94599 |
| C15850 | CL21A106KAYNNNE | 10uF | C_0805_2012Metric | C1,C14,C2,C4 | 4 | Basic | 13984402 | PASS | 0.0354 | 0.142 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C1525 | CL05B104KO5NNNC | 100nF | C_0402_1005Metric | C11,C12,C13,C3,C8 | 5 | Basic | 34320311 | PASS | 0.0031 | 0.015 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C19666 | CL10A475KO8NNNC | 4.7uF | C_0603_1608Metric | C5,C7 | 2 | Basic | 3850285 | PASS | 0.015 | 0.030 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C52923 | CL05A105KA5NQNC | 1uF | C_0402_1005Metric | C6 | 1 | Basic | 11553540 | PASS | 0.0058 | 0.006 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C1555 | 0402CG220J500NT | 22pF | C_0402_1005Metric | C10,C9 | 2 | Basic | 1708985 | PASS | 0.0019 | 0.004 | 2026-11-07T23:39Z jlc_q3.json | Basic-Aequivalent |
| C8598 | B5819W SL | B5819W | D_SOD-123 | D1 | 1 | Basic | 859502 | PASS | 0.0262 | 0.026 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C81598 | 1N4148W | 1N4148W | D_SOD-123 | D2,D3 | 2 | Basic | 3537330 | PASS | 0.0124 | 0.025 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C965840 | XL-1615RGBC-RF | XL-1615RGBC | LED_XL-1615RGBC | D4 | 1 | Extended | 715111 | PASS | 0.0197 | 0.020 | 2026-11-07T22:59Z jlc_q1.json | 3 Einzel-LEDs 0603 Basic |
| C2286 | KT-0603R | rot CHRG | LED_0603_1608Metric | D5 | 1 | Basic | 6594087 | PASS | 0.0077 | 0.008 | 2026-11-07T23:39Z jlc_q3.json | Basic-Aequivalent |
| C165948 | TYPE-C-31-M-12 | USB-C TYPE-C-31-M-12 | USB_C_Receptacle_HRO_TYPE-C-31-M-12 | J1 | 1 | Extended | 320167 | PASS | 0.1868 | 0.187 | 2026-11-07T22:59Z jlc_q1.json | TYPE-C-31-M-12 andere Listings (ANNAHME) |
| C160402 | SM02B-SRSS-TB(LF)(SN) | BATT JST-SH | JST_SH_SM02B-SRSS-TB_1x02-1MP_P1.00mm_Horizontal | J2 | 1 | Extended | 69101 | PASS | 0.1322 | 0.132 | 2026-11-08T10:39Z logs/sourcing-2026-11-08/jlc_j2_alt.json | ZX-SH1.0-2PWT C7430444 (40004 Stk, 0.0493 USD, Hoehe 3.15 mm laut LCSC; Footprint-Kompatibilitaet ANNAHME, Datenblatt pruefen) |
| C15127 | AO3401A | AO3401A | SOT-23-3 | Q1,Q2,Q4 | 3 | Basic | 1677120 | PASS | 0.0828 | 0.248 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C2830320 | FS8205A | FS8205A | SOT-23-6 | Q3 | 1 | Extended | 194714 | PASS | 0.0499 | 0.050 | 2026-11-07T23:04Z jlc_q2.json | FS8205A C908265 (q2) |
| C8545 | 2N7002 | 2N7002 | SOT-23-3 | Q5 | 1 | Basic | 5965426 | PASS | 0.0167 | 0.017 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C20917 | AO3400A | AO3400A | SOT-23-3 | Q6,Q7 | 2 | Basic | 1065680 | PASS | 0.0889 | 0.178 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C25905 | 0402WGF5101TCE | 5.1k | R_0402_1005Metric | R1,R2 | 2 | Basic | 4532923 | PASS | 0.0023 | 0.005 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C26083 | 0402WGF1004TCE | 1M | R_0402_1005Metric | R10,R11 | 2 | Basic | 2739301 | PASS | 0.0012 | 0.002 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C17958 | 1206W4F220JT5E | 22 | R_1206_3216Metric | R15 | 1 | Basic | 596379 | PASS | 0.0066 | 0.007 | 2026-11-08T00:37Z jlc_q4.json | Basic-Aequivalent |
| C25117 | 0402WGF4700TCE | 470 | R_0402_1005Metric | R18 | 1 | Basic | 3010720 | PASS | 0.001 | 0.001 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C25900 | 0402WGF4701TCE | 4.7k | R_0402_1005Metric | R3,R4 | 2 | Basic | 15758861 | PASS | 0.0017 | 0.003 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C25879 | 0402WGF2201TCE | 2.2k | R_0402_1005Metric | R5 | 1 | Basic | 3375603 | PASS | 0.0011 | 0.001 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C11702 | 0402WGF1001TCE | 1k | R_0402_1005Metric | R6,R8 | 2 | Basic | 33761603 | PASS | 0.0013 | 0.003 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C25076 | 0402WGF1000TCE | 100 | R_0402_1005Metric | R19,R20,R7 | 3 | Basic | 11744509 | PASS | 0.0012 | 0.004 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C25741 | 0402WGF1003TCE | 100k | R_0402_1005Metric | R12,R13,R14,R16,R17,R9 | 6 | Basic | 8784923 | PASS | 0.0012 | 0.007 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C431540 | MSK12C02 | MSK12C02 | SW_SPDT_Shouhan_MSK12C02 | SW1 | 1 | Extended | 179615 | PASS | 0.0543 | 0.054 | 2026-11-07T23:04Z jlc_q2.json | SK12D07 (ANNAHME) |
| C318884 | TS-1187A-B-A-B | TS-1187A | SW_Push_1P1T_XKB_TS-1187A | SW2 | 1 | Basic | 873144 | PASS | 0.0207 | 0.021 | 2026-11-07T22:59Z jlc_q1.json | Basic-Aequivalent |
| C77131 | NCP15XH103F03RC | 10k B3380 | R_0402_1005Metric | TH1 | 1 | Extended | 304942 | PASS | 0.0167 | 0.017 | 2026-11-07T22:59Z jlc_q1.json | 0402 10k B3950 Basic (ANNAHME) |
| C356849 | E73-2G4M08S1C | E73-2G4M08S1C | E73-2G4M08S1C | U1 | 1 | Extended | 319 | PASS | 7.69 | 7.690 | 2026-11-08T10:39Z jlc_j2_alt.json | C2764963 (E73-2G4M08S1C Alternativlisting) bzw. Modulwechsel; Bestand knapp |
| C7519 | USBLC6-2SC6 | USBLC6-2SC6 | SOT-23-6 | U2 | 1 | Extended | 25258 | PASS | 0.1623 | 0.162 | 2026-11-07T22:59Z jlc_q1.json | USBLC6-2P6 / SRV05-4 (ANNAHME) |
| C16581 | TP4056-42-ESOP8 | TP4056 | SOIC-8-1EP_3.9x4.9mm_P1.27mm_EP2.29x3mm | U3 | 1 | Extended | 110382 | PASS | 0.1852 | 0.185 | 2026-11-07T22:59Z jlc_q1.json | BQ24074 C54313 (Power-Path integriert) |
| C351410 | DW01A | DW01A | SOT-23-6 | U4 | 1 | Extended | 95352 | PASS | 0.0532 | 0.053 | 2026-11-07T22:59Z jlc_q1.json | DW01A anderer Hersteller (JLC-Suche q2) |
| C5446 | XC6206P332MR-G | XC6206P332MR | SOT-23-3 | U5 | 1 | Basic | 493191 | PASS | 0.1477 | 0.148 | 2026-11-07T22:59Z jlc_q1.json | ME6211C33 C82942 / AP2112K-3.3 C51118 (pinkompatibel SOT-23 nur ME6211-SOT23) |
| C22459454 | ICM-45686 | ICM-45686 | LGA-14_3x2.5mm_P0.5mm_LayoutBorder3x4y | U6 | 1 | Extended | 3061 | PASS | 10.2118 | 10.212 | 2026-11-08T10:39Z jlc_j2_alt.json | LSM6DSV16X C5267406 (Footprint-Wechsel) |
| C32346 | Q13FC13500004 | 32.768kHz | Crystal_SMD_3215-2Pin_3.2x1.5mm | Y1 | 1 | Basic | 432670 | PASS | 0.1713 | 0.171 | 2026-11-07T23:04Z jlc_q2.json | Basic-Aequivalent |

Handbestueckung (nicht JLC-SMT), an J3 angeloetet:

| LCSC | MPN | Wert | Bauform | Refs | Menge | Bestand | >=10x | USD/Stk (1/10/30) | USD/Geraet | Abfrage | Alternative |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C2759981 | Leader LCM0827A3038F | ERM 3 V, 80 mA, 30 Ω | Coin Ø8 x 2.7 mm, Litzen 27 mm | M1 (an J3) | 1 | 2284 | PASS | 0.6297 / 0.5087 / 0.4563 | 0.630 | 2026-11-08T12:28:28+00:00 `sourcing/raw/jlc_motor_2026-11-08.json`, https://jlcpcb.com/partdetail/C2759981 | KOTL C1027B603F C2836604 (Ø10, 90 mA, Bestand 129, >=10x knapp PASS) |

Nicht ueber JLC: J3 Motorpads (Litzen, Motor M1 von Hand, siehe oben), J4 TC2030-NL (Tag-Connect Kabel, nur Footprint), TP1-6, H1-2 (keine Teile).

**Summe Teile/Geraet (Stufe 1): 20.24 USD** (r3: 20.33 − 0.2262 + 0.1322) (BERECHNUNG). Extended-Positionen: 12 (Extended-Gebuehr pro Auftrag, siehe ANGEBOTE_V1.md). Davon E73 7.69 + ICM-45686 10.21 = 17.90 USD (QUELLE).

Bewertung Basic vor Extended: alle Passiven, FETs, Dioden, Regler, Quarz, Taster = Basic; Extended nur wo kein Basic-Aequivalent (Modul, IMU, Lader, Schutz, USB-C, ESD, Summer, RGB, Schiebeschalter, JST, NTC).

Kritisch (Bestand < 10x Bedarf): keine. E73 C356849 hat 319 Stk (QUELLE 2026-11-08T10:39Z): fuer 10 Geraete PASS, fuer Serie >32 Geraete Risiko -> vor Bestellung erneut pruefen, Alternative Modul-Listing C2764963.

Ein/Aus: Schiebeschalter MSK12C02 schaltet Gate des P-FET Q2 (Soft-Switch). Begruendung: Aus-Zustand 0 uA ueber R10 (Gate=Source), kein Firmware-Risiko, Schalter traegt keinen Laststrom; Soft-Latch per Taster spart den Schalter, braucht aber Firmware-Halteleitung und hat ~1 uA Leckage -> V2-Option.

## Stand 2026-11-08 (Q-03, JLCPCB + JLC3DP) – Gesamt-BOM r4
Hauptboard r4: 35 Pos. r3 + J5 C160407 (13 Extended). Teile/Geraet Hauptboard 20.24 + 0.32 = **20.56 USD** (BERECHNUNG). Bedienplatine motion-one-ui: **1.65 USD** (BERECHNUNG), Extended 3 (SW1 C146170, U1 C2890349, J1 C160407). Motor M1 C2759981 0.63 USD (Handbestueckung). J2 = C160402 (Hauptboard, oben). **Summe 22.84 USD/Geraet** (BERECHNUNG).
Nicht-elektronische Positionen (JLC3DP, Details `ANGEBOTE_V1.md` §0): Oberschale, Unterschale, Tastenkappe = SLS PA12 (3201 PA-F); Lichtleiter = SLA transparent (Harz 8001); Preis ANNAHME 8–25 USD/Satz, Sofortpreis NOT RUN. STL `mechanics/print/VORLAEUFIG_*` bis Gehaeuse-r4 final.
Offen (NOT RUN): C25076/C11702 Neuabfrage, E73 C356849 Lager vor Bestellung, TVS fuer J5 (PCB offen).

## r4-Ergaenzung (Q-04, Stand 2026-11-08, Abfrage 12:42 UTC, Rohdaten `logs/pcb-r4/sourcing/jlc_r4.json`, URL `https://jlcpcb.com/partdetail/<LCSC>`, USD Stufe 1, QUELLE)

Hauptboard r4: neu J5; TP3/TP4 entfallen; H1/H2 NPTH (keine BOM-Position).

| LCSC | MPN | Wert | Refs | Menge | Bestand | >=10x | USD/Stk | Alternative |
|---|---|---|---|---|---|---|---|---|
| C160407 | SM08B-SRSS-TB(LF)(SN) | JST-SH 8p | J5 (Haupt), J1 (UI) | 1+1 | 180688 | PASS | 0.3235 | XY-SM08B-SRSS-TB C54582896 (2000 Stk, 0.0892 USD; Footprint-Kompat. ANNAHME) |

Bedienplatine motion-one-ui (BOM `manufacturing/pcba/ui/BOM_motion-one-ui_JLC.csv`):

| LCSC | MPN | Wert | Refs | Menge | Bestand | >=10x | USD/Stk | USD/Geraet | Alternative |
|---|---|---|---|---|---|---|---|---|---|
| C146170 | RKJXV1224005 | Analog-Stick | SW1 | 1 | 2175 | PASS | 1.2005 | 1.201 | RKJXV122400R C918854 (4631 Stk, 1.1972) |
| C2890349 | TTP233H-BA6 | Touch-IC | U1 | 1 | 44791 | PASS | 0.116 | 0.116 | TTP223-Varianten aktuell 0 Lager -> nRF52840-COMP (Firmware) |
| C160407 | SM08B-SRSS-TB | JST-SH 8p | J1 | 1 | 180688 | PASS | 0.3235 | 0.324 | s. o. |
| C25076 | 0402 100R | 100 | R1-R4 | 4 | Basic | PASS (ANNAHME, Basic) | ~0.001 | 0.004 | Basic-Aequivalent |
| C11702 | 0402 1k | 1k | R5 | 1 | Basic | PASS (ANNAHME, Basic) | ~0.001 | 0.001 | Basic-Aequivalent |
| C1525 | CL05B104KO5NNNC | 100nF | C1 | 1 | 34320311 | PASS | 0.0031 | 0.003 | Basic-Aequivalent |

Summe UI-Teile ca. 1.65 USD/Geraet (BERECHNUNG, ohne PCB/Setup/Extended-Gebuehr). Hauptboard +0.32 USD (J5). C25076/C11702 nicht neu abgefragt (Basic, NOT RUN).
