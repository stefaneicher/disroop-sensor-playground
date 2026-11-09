# ADR-0003: Funkmodul E73-2G4M08S1C (nRF52840)

- **Status:** Angenommen (nachträglich dokumentiert 2026-11-09; Entscheid fiel in V1/r1–r4)
- **Datum:** 2026-11-09
- **Disziplin:** electronics
- **Entscheider:** Team (systems-/pcb-engineer), Manager; keine separate User-Freigabe
- **Betrifft:** U1, `requirements/ARCHITECTURE.md` §1, REQ BLE/USB

## Kontext
Thingy:52-kompatibles BLE-Profil, Laden und Update über USB-C, keine SWD-Probe beim User, Bestückung bei JLCPCB.

## Optionen
Kein Bild: ADR nachträglich aus Belegen erstellt (Quellen unten).

| Option | Bewertung | Status |
|---|---|---|
| **(b) Ebyte E73-2G4M08S1C, nRF52840 (C356849)** | 7,69 USD (QUELLE JLC); Quarze+Antenne im Modul; Funkzulassung laut Hersteller (Sekundärquelle, Zertifikat NOT RUN); natives USB → UF2-Bootloader | **gewählt** |
| (a) nRF52840-SoC direkt (C190794) | 7,65 USD + HF-Teile ≈ +1–2 USD (ANNAHME); eigenes HF-Design/Matching, aQFN73 0,5 mm, 4–6 Lagen/Via-in-Pad, keine Zulassung | verworfen |
| (c) Seeed XIAO nRF52840 als Unterbaugruppe | 10,75 USD, 21 Stk, Handlöten, +~3 mm Bauhöhe | verworfen |
| nRF52832 (C77540) | 5,09 USD, aber kein natives USB → kein USB-Bootloader | verworfen |

## Entscheid
E73-2G4M08S1C: lieferbar und bestückbar bei JLC, kein eigenes HF-Design, natives USB.

## Konsequenzen
- Bestand knapp (319–322 Stk, QUELLE JLC); Ausweichlisting C2764963 (-CX). Vor Bestellung neu prüfen.
- Bootloader einmalig per SWD (J4 Tag-Connect) – firmware/ADR-0001.
- Zulassungszertifikat NOT RUN.

## Quellen
`requirements/ARCHITECTURE.md` §1, `sourcing/BOM_V1.md`, `electronics/datasheets/E73-2G4M08S1C_C356849.pdf`
