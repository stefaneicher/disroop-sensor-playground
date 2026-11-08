# ADR-0002: Gehäuse in SLS PA12, Lichtleiter in SLA transparent

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** mechanics
- **Entscheider:** User (Vorschlag angenommen)
- **Betrifft:** Gehäuse r3 ff., Toleranzen in `scripts/mechanics/params.py`, Upload JLC3DP

## Kontext
JLC3DP führt kein PETG. Das bisherige Slicer-Profil ist auf PETG FDM ausgelegt.

## Optionen
Vergleich mit Preisen: [media/ADR-0002-sls-pa12.html](media/ADR-0002-sls-pa12.html)
1. SLS PA12: zäh, isotrop, ohne Support, ≈ 15 USD/Satz (ANNAHME) – **gewählt**
2. MJF PA12 – ähnlich, kein Vorteil
3. SLA-Harz – spröde, Schnapphaken brechen
4. FDM ABS/ASA – Schichtfugen, kein PETG
5. Swiss3D PETG oder Eigendruck P2S – bleiben Optionen

## Entscheid
Gehäuseteile in SLS PA12 schwarz. Den Lichtleiter in SLA transparent, weil PA12 opak ist.

## Konsequenzen
- Toleranz ±0.3 mm, Wand mindestens 1.0 mm, Spiel 0.2–0.4 mm. Das Nut-Spiel aus ADR-0001 wird geprüft.
- Der PETG-Slice für den P2S bleibt als Option für den Eigendruck bestehen.
