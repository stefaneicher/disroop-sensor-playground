# ADR-0003: Motor-PWM ≤ 3.0 V und Arbitrierung Motor/Summer

- **Status:** Angenommen (Umsetzung F-12 läuft)
- **Datum:** 2026-11-08
- **Disziplin:** firmware
- **Entscheider:** Projektleitung, abgeleitet aus Analyse/Datenblatt
- **Betrifft:** Motor-/Summer-Treiber

## Kontext
Laut Datenblatt LCM0827A3038F ist der Motor bis max. 3.3 V zugelassen, nominal 3.0 V. Im Worst Case beim Laden über USB zieht das Gerät 614 mA und damit mehr als 500 mA (ANALYSE_V1.md, BERECHNUNG).

## Entscheid
Der Motor läuft mit duty = 3.0 V / Vbat. Motor und Summer laufen nie gleichzeitig mit voller Leistung. Damit liegt der VBUS-Strom bei ≤ 456 mA (BERECHNUNG).
