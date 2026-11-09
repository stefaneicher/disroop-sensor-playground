# ADR-0005: Lader TP4056 mit diskretem Power-Path

- **Status:** Angenommen (nachträglich dokumentiert 2026-11-09; Entscheid fiel in V1/r1–r4)
- **Datum:** 2026-11-09
- **Disziplin:** electronics
- **Entscheider:** Team (systems-/pcb-engineer), Manager; keine separate User-Freigabe
- **Betrifft:** U3, D1, Q1, TH1, REQ-044 (Spielen beim Laden), REQ-041

## Kontext
1S-LiPo 500 mAh soll über USB-C geladen werden, Spielen während des Ladens muss möglich sein, mit Temperaturüberwachung (NTC).

## Optionen
Kein Bild: ADR nachträglich aus Belegen erstellt (Quellen unten).

| Option | Bewertung | Status |
|---|---|---|
| **TP4056 (C16581) + diskreter Power-Path (D1 B5819W, Q1 AO3401A)** | 0,19 USD; 255 mA = 0,51 C (BERECHNUNG); NTC-Fenster 0,5–40,8 °C; Power-Path SIMULATION PASS | **gewählt** |
| TI BQ24074 (C54313) | Power-Path integriert, weniger Bauteile | nicht gewählt; Grund im Repo nicht belegt (ANNAHME: Preis/Basic-Nähe, TP4056 Standardlösung) |

## Entscheid
TP4056 mit Schottky-Diode und P-FET als Power-Path. Unter USB versorgt VBUS die Last, der Akku wird nicht durch die Last gestört.

## Konsequenzen
- Mehr Bauteile und 53 mW Verlust an D1 (BERECHNUNG).
- SPICE-Worst-Case: 3V3 bricht auf 2,80 V ein, Inrush 6,75 A (BEKANNTE_WIDERSPRUECHE) – Messung am Muster NOT RUN.
- BQ24074 bleibt Kandidat für r5.

## Quellen
`electronics/analysis/ANALYSE_V1.md` §2, `sourcing/BOM_V1.md`
