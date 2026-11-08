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

## Umsetzung (2026-11-08, Handoff `management/handoffs/firmware-engineer/2026-11-08-motor.md`)
- PWM `pwm2` 20 kHz auf MOT_EN P1.13; duty = 3.0/Vbat. Ohne gültige Messung gilt 4.2 V (USB: 5.25 V). Host-Tests 48/48 PASS.
- **Priorität: Summer vor Motor.** Während eines Tons pausiert der Motor und läuft danach weiter. Begründung: Der akustische Alarm hat Vorrang, der Motor kann ohne Informationsverlust kurz pausieren.
- 20 kHz direkt am Gate des AO3400 (Vgs 3.0 V, Qg ≈ 6 nC) gilt als ausreichend (ANNAHME). Der SPICE-Nachweis mit PWM wird mit PCB r4 nachgeholt.
