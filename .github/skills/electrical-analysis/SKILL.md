---
name: electrical-analysis
description: "Elektrische Analyse: Leistungsbudget, Ladeschaltung, Regler, Thermik, Toleranzen und SPICE mit ngspice."
---

# electrical-analysis (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- ngspice batch: `ngspice -b netz.cir` mit `.control … meas … .endc`; Ergebnis immer mit Handformel vergleichen (< 1 % bei linearen Schaltungen).
- Toleranzen: Worst-Case und Monte-Carlo als Python-Skript in `scripts/electronics/`.
- DC-Bias von MLCC berücksichtigen (Herstellerkurve als QUELLE).
