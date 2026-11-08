# ADR-0001: Fertigung bei JLCPCB + JLC3DP

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** systems
- **Entscheider:** User („JLCPCB material nach Entscheid an deinem Vorschlag“)
- **Betrifft:** Sourcing V1, `sourcing/ANGEBOTE_V1.md`, `manufacturing/upload/`

## Kontext
PCBA und Gehäuse sollen nach Möglichkeit beim gleichen Hersteller gefertigt werden. Verglichen wurden 7 Anbieter, darunter 3 aus der Schweiz.

## Optionen
1. JLCPCB + JLC3DP: alle Teile ab Lager, ≈ 48 CHF/Gerät bei 5 Stk (BERECHNUNG mit ANNAHMEN) – **gewählt**
2. Schaffner (PCBA) + Swiss3D (PETG): CH, schnell, Preis auf Anfrage, E73/IMU beistellen – Rückfalloption
3. PCBWay, Aisler, Eurocircuits – teurer bzw. ohne 3D-Druck oder Teilelager

## Entscheid
JLCPCB für PCBA, JLC3DP für das Gehäuse. Den Upload macht der User selbst.

## Konsequenzen
- Der Lagerbestand des E73 (zuletzt 319 Stk) wird vor der Bestellung erneut geprüft.
- Das Material folgt aus mechanics/ADR-0002.
