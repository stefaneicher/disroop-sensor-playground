# Architektur V1 – Disroop Motion One (systems-engineer, 2026-11-07)

Bestand/Preise: QUELLE `requirements/stock_jlcpcb_2026-11-07.csv` (erzeugt mit `scripts/systems/jlc_stock.py`, öffentliche JLCPCB-API,
Abfrage 2026-11-07 ~22:25 UTC; Momentaufnahme, vor Bestellung erneut prüfen). Alle Teile sind „Extended“ (Rüstgebühr je Teil, Höhe NOT RUN → pcb-engineer).

## 1. Architekturvarianten

| Kriterium | (a) nRF52840-SoC direkt (C190794) | (b) Vorzertifiziertes Modul Ebyte E73-2G4M08S1C, nRF52840 (C356849) | (c) Dev-Modul Seeed XIAO nRF52840 als Unterbaugruppe |
|---|---|---|---|
| Lieferbarkeit JLCPCB | 43 855 Stk (QUELLE JLC) | 322 Stk; Variante -CX C2764963: 1011 Stk (QUELLE JLC) | XIAO 102010448 C17209540: 21 Stk, keine SMT-Bestückung als Modul gesichert (QUELLE JLC); Handbestückung |
| Kosten 5 Stk (nur Funk-Kern) | 7,65 USD + 32 MHz-Quarz, 32 kHz-Quarz, Balun/Matching, Antenne, DC/DC-Induktivitäten ≈ +1–2 USD (ANNAHME) | 7,69 USD (QUELLE JLC), Quarze und Antenne im Modul | 10,75 USD (QUELLE JLC) + Handlöten |
| Funkzulassung | keine, eigene Messung nötig (für Prototypen ohne Inverkehrbringen tolerierbar, Serie: teuer) | Modul mit FCC/CE/IC laut Hersteller (Sekundärquelle Websuche, Zertifikat NOT RUN) | Seeed-Modul mit Zertifikaten (nicht geprüft, NOT RUN) |
| Antennenrisiko | hoch (aQFN73, HF-Layout, Matching ohne VNA) | niedrig (Keep-out am Board-Rand einhalten) | niedrig |
| Bestückbarkeit | aQFN73 0,5 mm Pitch, 4–6 Lagen/Via-in-Pad nötig (ANNAHME) | LGA-Pads unter Modul, Röntgenprüfung empfohlen | Castellated, Hand-/Reflow-Löten, Bauhöhe +~3 mm |
| Programmierweg (keine SWD-Probe!) | nativ USB → UF2/USB-DFU nach einmaligem Bootloader-Flash über SWD | identisch (a): nRF52840 hat natives USB; Bootloader einmalig über SWD-Pads (günstige Probe, z. B. Raspberry Pi Debug Probe, oder Dienstleister) – Modul kommt ab Werk ohne Bootloader (ANNAHME, NOT RUN) | Seeed-Bootloader (UF2) ab Werk vorhanden → kein SWD nötig |
| Firmware-Aufwand | Board-Definition + HF-Konfig neu | Board-Definition (Zephyr/nRF Connect SDK) mit Modul-Pinout | vorhandene Board-Definition, geringster Aufwand |
| Bauraum | kleinster | 18 × 13 × ~2 mm (Sekundärquelle) | 21 × 17,5 mm + Huckepack |

**Entscheid: Variante (b) E73-2G4M08S1C (nRF52840).** Begründung: bei JLCPCB bestückbar und lieferbar, kein eigenes HF-Design,
natives USB für UF2-Bootloader (REQ-060), ausreichend RAM/Flash für Fusion. Risiko: einmaliges Bootloader-Flashen braucht eine SWD-Probe
oder einen vorprogrammierten Bezug → offener Punkt an firmware-engineer/User. (c) bleibt Rückfallebene für einen Handmuster-Prototyp,
falls Modul-Bestand fällt. nRF52832 (C77540, 29 943 Stk, 5,09 USD) verworfen: kein natives USB → kein USB-Bootloader.

## 2. IMU-Vergleich

| IMU | Gyro max | Accel max | Gyro-Rauschen | Accel-Rauschen | ODR | FIFO | Strom 6-Achsen | Gehäuse | JLC Bestand / USD | Beleg |
|---|---|---|---|---|---|---|---|---|---|---|
| **TDK ICM-45686** | ±4000 °/s | ±32 g | 3,8 mdps/√Hz | 70 µg/√Hz | bis 6,4 kHz (Datenblatt prüfen) | 8 KB (nur Websuche, Datenblatt prüfen) | 0,42 mA LN | LGA 2,5×3,0×0,81 mm | 3091 / 10,21 (C22459454) | QUELLE https://invensense.tdk.com/products/motion-tracking/6-axis/icm-45686/ (2026-11-07) |
| Bosch BMI270 | ±2000 °/s | ±16 g | 7 mdps/√Hz | 160 µg/√Hz | A 1,6 kHz / G 6,4 kHz | 2 kB (nur Websuche) | 0,685 mA | LGA 2,5×3,0×0,8 mm | 16 407 / 2,59 (C2836813) | QUELLE https://www.bosch-sensortec.com/en/products/motion-sensors/imus/bmi270 (2026-11-07) |
| Bosch BMI323 | ±2000 °/s | ±16 g | 7 mdps/√Hz | 180 µg/√Hz | 6,4 kHz | NOT RUN | 0,79 mA HP | LGA 2,5×3,0×0,83 mm | 2942 / 3,24 (C5368700) | QUELLE https://www.bosch-sensortec.com/en/products/motion-sensors/imus/bmi323 (2026-11-07) |
| ST LSM6DSV16X | ±4000 °/s | ±16 g | NOT RUN | NOT RUN | NOT RUN | 4,5 KB (Websuche) | 0,65 mA (Websuche) | LGA 2,5×3,0 | 11 292 / 3,35 (C5267406) | ST-Seite Timeout → Werte unbestätigt |
| ST LSM6DSO32 | ±2000 °/s | ±32 g | NOT RUN | NOT RUN | NOT RUN | 9 kB (Websuche) | 0,55 mA (Websuche) | LGA 2,5×3,0 | 0 (C1864162) | unbestätigt |
| ST LSM6DSV320X | ±4000 °/s | ±16 g + High-g bis ±320 g (Websuche) | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | LGA | 8 / 13,15 (C26633007) | unbestätigt |
| TDK ICM-42688-P | ±2000 °/s | ±16 g | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | LGA 2,5×3,0 | 442 / 19,98 (C1850418) | unbestätigt |

Ausschluss: ±2000 °/s (BMI270, BMI323, LSM6DSO32, ICM-42688-P) verletzt REQ-004; ±16 g (LSM6DSV16X) verletzt REQ-005;
LSM6DSV320X nicht lieferbar (8 Stk). **Entscheid: ICM-45686** (einziger Kandidat mit ±4000 °/s + ±32 g und Bestand > 5 Stk).
Zweitquelle: LSM6DSV16X mit Firmware-Fallback ±16 g (Accel-Saturierung wird geflaggt) – Footprint-Kompatibilität NOT RUN → pcb-engineer.
Anbindung: SPI (Latenz, budgets_output.md §5), INT1 an GPIO für FIFO-Watermark/Wake-on-Motion.

## 3. Blockschaltbild (Vorschlag)

USB-C (ESD, CC 5,1 kΩ) → Lader mit Power-Path + NTC → 1S-LiPo 500 mAh (Schutz) → LDO/Buck 3,0–3,3 V → E73-Modul
(SPI ↔ ICM-45686, GPIO ↔ Taster, RGB-LED, Summer-Treiber, Motor-Treiber + Freilaufdiode, ADC ← Akku-Teiler schaltbar), SWD-Pads, USB D+/D- direkt.
Bauteilauswahl Lader/Regler/Treiber: components-engineer/pcb-engineer.
