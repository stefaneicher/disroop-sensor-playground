---
name: sourcing-availability
description: "Lager- und Preisabfrage bei Bestückern (JLCPCB/LCSC, PCBWay, Aisler, Eurocircuits) mit Datum, Mindestbestand, Alternativen und Kostenrechnung bis in die Schweiz."
---

# sourcing-availability (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- Nur öffentliche Seiten oder offizielle APIs (Playwright-MCP), keine Logins. Pro Teil: Teilenummer, Bestand, Stückpreis, Abfragezeit (ISO), URL.
- Mindestbestand ≥ 10 × Bedarf; JLCPCB: Basic vor Extended (Extended kostet Einrichtgebühr je Teil).
- 3D-Druck der Gehäuseteile immer mit abfragen, bevorzugt beim gleichen Hersteller wie die PCBA (JLCPCB/JLC3DP, PCBWay): Verfahren, Material, Toleranz, Preis, Lieferzeit; gemeinsamer Versand.
- Kosten: PCB + Bestückung + 3D-Druck + Teile + Setup + Versand + Zoll/MWST CH = Total und pro Gerät.
