# ADR-0001: Vibrationsmotor Leader LCM0827A3038F

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** electronics
- **Entscheider:** Projektleitung auf Wunsch des Users (Lücke „Motor separat“ geschlossen)
- **Betrifft:** J3, `sourcing/BOM_V1.md`, `management/INTERFACES.json` (motor), Mechanik F-10

## Kontext
Der Motor war bisher nur über Lötpads ohne konkretes Teil vorgesehen. Er stand weder in der BOM noch hatte er Platz im Gehäuse.

## Entscheid
Coin-Motor LCM0827A3038F (C2759981), Ø 8 × 2.7 mm, Litzen 27 mm, 3.0 V, 80/120 mA, 0.63 USD (QUELLE JLC-API 2026-11-08). Alternative: KOTL C2836604. Bestückung von Hand.

## Konsequenzen
- Mulde in der Unterschale beim Akku, Ø 8.6 × 3.2 mm (F-10).
- Laufzeit ≈ 35 h bei 5 % Vibration (BERECHNUNG).
- Begrenzung in der Firmware nach firmware/ADR-0003.
- Regel: Jedes Teil aus BOM oder INTERFACES braucht ein 3D-Modell und Platz in der Kollisionsprüfung.
