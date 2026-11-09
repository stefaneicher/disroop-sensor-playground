# ADR-0008: USB-C TYPE-C-31-M-12 mit ESD USBLC6-2SC6

- **Status:** Angenommen (nachträglich dokumentiert 2026-11-09; Entscheid fiel in V1/r1–r4)
- **Datum:** 2026-11-09
- **Disziplin:** electronics
- **Entscheider:** Team (systems-/pcb-engineer), Manager; keine separate User-Freigabe
- **Betrifft:** J1, U2, R1/R2 (CC 5,1 kΩ), REQ-058

## Kontext
Laden und Firmware-Update über USB-C (nur USB 2.0, 5 V), ESD-Schutz an Datenleitungen gefordert.

## Optionen
Kein Bild: ADR nachträglich aus Belegen erstellt (Quellen unten).

| Option | Bewertung | Status |
|---|---|---|
| **HRO TYPE-C-31-M-12 (C165948)** | 0,19 USD, verbreitet, Footprint in KiCad | **gewählt** |
| andere Listings desselben Steckers | gleich | Zweitquelle (ANNAHME) |
| **USBLC6-2SC6 (C7519)** | ESD für D+/D−, 0,16 USD | **gewählt** |
| USBLC6-2P6 / SRV05-4 | gleichwertig | Alternative (ANNAHME) |

## Entscheid
USB-C-Buchse TYPE-C-31-M-12 mit 5,1 kΩ an CC1/CC2 (Sink), USBLC6-2SC6 als ESD-Schutz.

## Konsequenzen
- Steckermaße im Gehäuse sind ANNAHME, am Muster messen.
- Zugentlastung fehlt noch (Mechanik).

## Quellen
`sourcing/BOM_V1.md`, `management/REQUIREMENTS.md`
