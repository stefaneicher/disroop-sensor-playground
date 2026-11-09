# ADR-0006: 3V3-Regler XC6206P332MR (LDO)

- **Status:** Angenommen (nachträglich dokumentiert 2026-11-09; Entscheid fiel in V1/r1–r4)
- **Datum:** 2026-11-09
- **Disziplin:** electronics
- **Entscheider:** Team (systems-/pcb-engineer), Manager; keine separate User-Freigabe
- **Betrifft:** U5, Ruhestrom REQ-047 (≤ 10 µA)

## Kontext
3,3 V für nRF52840 und IMU aus 1S-LiPo (3,0–4,2 V), sehr kleiner Ruhestrom für lange Standby-Zeit, kleine Bauform.

## Optionen
Kein Bild: ADR nachträglich aus Belegen erstellt (Quellen unten).

| Option | Bewertung | Status |
|---|---|---|
| **Torex XC6206P332MR (C5446)** | Basic-Teil, 0,15 USD, Eigenstrom 1 µA, Dropout 250 mV@100 mA, stabil mit ≥ 1 µF | **gewählt** |
| ME6211C33 (C82942) | pinkompatibel SOT-23, höherer Strom | Alternative |
| AP2112K-3.3 (C51118) | SOT-23-5, nicht pinkompatibel | verworfen |
| Buck-Wandler | höherer Wirkungsgrad, aber Spule, Fläche, Rauschen, Ruhestrom | verworfen (ANNAHME, nicht verglichen) |

## Entscheid
XC6206: Ruhestrom 1 µA, Basic-Teil, kleinste Lösung. Bei Vbat 3,0 V und 20 mA ≈ 2,95 V – im Bereich von nRF52840/IMU (1,7–3,6 V).

## Konsequenzen
- Unter ≈ 3,35 V Vbat nicht mehr geregelt (BERECHNUNG).
- LDO-Verlust max 90 mW (BERECHNUNG) – unkritisch.
- Ruhestrom gesamt ≤ 6 µA (BERECHNUNG), Messung NOT RUN.

## Quellen
`electronics/analysis/ANALYSE_V1.md` §1, §3, `sourcing/BOM_V1.md`
