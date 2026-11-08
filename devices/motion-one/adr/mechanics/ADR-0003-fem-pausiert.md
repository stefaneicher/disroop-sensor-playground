# ADR-0003: FEM pausiert

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** mechanics
- **Entscheider:** User („pausiere mal FEM, ist für das Gerät nicht so wichtig“)
- **Betrifft:** `scripts/mechanics/fem_shell.py`, Abnahme Gehäuse r3

## Kontext
Die FEM-Netzstudie kostet viel Rechenzeit. Das Gerät ist mechanisch gering belastet.

## Entscheid
FEM wird nicht ausgeführt. Der letzte Stand `fem/fem_results.json` (alte Geometrie) bleibt als Referenz und ist als PAUSED gekennzeichnet.

## Konsequenzen
FEM ist kein Abnahmekriterium für r3. Bei einer Änderung der Lastannahmen (z. B. Sturztest) wird die Entscheidung neu bewertet.
