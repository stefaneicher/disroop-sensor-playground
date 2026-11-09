# ADR-0007: Akkuschutz DW01A + FS8205A

- **Status:** Angenommen (nachträglich dokumentiert 2026-11-09; Entscheid fiel in V1/r1–r4)
- **Datum:** 2026-11-09
- **Disziplin:** electronics
- **Entscheider:** Team (systems-/pcb-engineer), Manager; keine separate User-Freigabe
- **Betrifft:** U4, Q3, REQ-046, REQ-058

## Kontext
Zellschutz gegen Über-/Tiefentladung und Kurzschluss auf der Platine, unabhängig vom Akku-Lieferanten.

## Optionen
Kein Bild: ADR nachträglich aus Belegen erstellt (Quellen unten).

| Option | Bewertung | Status |
|---|---|---|
| **DW01A (C351410) + Dual-FET FS8205A (C2830320)** | Standardpaar, 0,05 + 0,05 USD, Eigenstrom 3 µA (QUELLE) | **gewählt** |
| Nur Schutz im Akkupack | weniger Bauteile, aber abhängig vom Akku | verworfen (ANNAHME: Lieferantenunabhängigkeit) |
| Anderer DW01A-Hersteller | gleiche Funktion | Zweitquelle |

## Entscheid
DW01A mit FS8205A auf der Hauptplatine, zusätzlich Firmware-Abschaltung bei 3,3 V (REQ-046).

## Konsequenzen
- Doppelter Schutz, falls Akku mit eigener PCM verwendet wird (unkritisch).
- Auslöseschwellen nur aus Datenblatt, Test am Netzteil NOT RUN.

## Quellen
`sourcing/BOM_V1.md`, `management/REQUIREMENTS.md`, `electronics/analysis/ANALYSE_V1.md`
