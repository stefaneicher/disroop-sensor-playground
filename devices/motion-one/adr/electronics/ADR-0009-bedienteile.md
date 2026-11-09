# ADR-0009: Bedien- und Ausgabeteile: SW1, SW2, RGB-LED, Summer, NTC, Akkustecker

- **Status:** Angenommen (nachträglich dokumentiert 2026-11-09; Entscheid fiel in V1/r1–r4)
- **Datum:** 2026-11-09
- **Disziplin:** electronics
- **Entscheider:** Team (systems-/pcb-engineer), Manager; keine separate User-Freigabe
- **Betrifft:** SW1, SW2, D4, D5, BZ1, TH1, J2

## Kontext
Ein/Aus, Taster für das Thingy-Button-Signal, RGB-Status (EF680301), akustisches Feedback, Akku-Temperatur, steckbarer Akku.

## Optionen
Kein Bild: ADR nachträglich aus Belegen erstellt (Quellen unten).

| Option | Bewertung | Status |
|---|---|---|
| **SW1 MSK12C02 (C431540)** Schiebeschalter | 0,05 USD, flach | gewählt; Alternative SK12D07 (ANNAHME) |
| **SW2 TS-1187A (C318884)** Taster | Basic-Teil | gewählt |
| **D4 XL-1615RGBC (C965840)** | 1 Bauteil statt 3, 0,02 USD | gewählt; Alternative 3 Einzel-LEDs 0603 Basic (mehr Fläche) |
| **BZ1 MLT-5020 (C94598)** Summer | 5×5 mm, mit Treiber Q | gewählt; Variante C94599 |
| **TH1 NCP15XH103F03RC (C77131)** NTC 10k B3380 | passend zum TP4056-Fenster | gewählt; 10k B3950 Basic (ANNAHME, verschiebt Fenster) |
| **J2 JST-SH SM02B-SRSS-TB (C160402)** | kleiner, verriegelnder Akkustecker | gewählt; ZX-SH1.0-2PWT C7430444 (Footprint-Kompatibilität ANNAHME) |

## Entscheid
Bauteile nach Funktion, Bauhöhe und JLC-Verfügbarkeit (Basic bevorzugt).

## Konsequenzen
- Hebelmaße SW1 gegen Datenblatt NICHT geprüft (Mechanik).
- Passive Bauteile (R, C, Dioden, FETs) als JLC-Basic-Teile ohne eigenes ADR – siehe BOM.
- Vibrationsmotor: ADR-0001; Erweiterungsstecker: ADR-0002.

## Quellen
`sourcing/BOM_V1.md`, `electronics/analysis/ANALYSE_V1.md`
