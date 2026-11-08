# ADR-0002: Erweiterungsstecker und Bedienplatine (Daumenstick, Touch) – PCB r4 (Q-04)

- **Status:** Angenommen (Umsetzung F-11 läuft)
- **Datum:** 2026-11-08
- **Disziplin:** electronics
- **Entscheider:** User (Lavish-Feedback: Daumenstick „ja nimm noch so einen“, Touch „ja nimm das auch auf“, „Erweiterungsstecker ja“)
- **Betrifft:** PCB r4, `PINOUT_V1.json`, `INTERFACES.json`, neues Projekt `kicad/motion-one-ui/`

## Kontext
Die Elektronik soll auch in selbst gedruckten Gehäusen weiterverwendbar sein. Auf der Platine ist nur ein ADC-Pin frei (P0.03).

## Optionen
Vorschlag mit Bewertung: [media/ADR-0002-erweiterung.html](media/ADR-0002-erweiterung.html). Weitere Taster, 5-Wege-Navi, Daumenstick, Drehgeber, Widerstandsleiter und Touch wurden verglichen.

## Entscheid
- Ein 8-poliger JST-SH-Stecker (3V3, GND, EXT1–EXT5, Reserve), davon mindestens 2 Pins analog. Dafür wird die LED auf Nicht-ADC-Pins umgelegt.
- 2 Befestigungslöcher M2.
- Eine Bedienplatine mit Analog-Daumenstick und kapazitiver Touch-Fläche, per Kabel angeschlossen.
- Ein Massblatt als Grundlage für eigene Gehäuse.

## Konsequenzen
- Durch r4 verschiebt sich die Bestellung.
- In der Firmware ändern sich die Pinmap (Bootloader und App) und die Treiber für Stick und Touch.
- Die Mechanik plant den Platz für die Bedienplatine.

## Umsetzung r4 (Handoff `management/handoffs/pcb-engineer/2026-11-08-r4.md`)
- J5 JST-SH 8-pol. (C160407) bei (58.5; 3.35). Belegung: 3V3, EXT1–3 = AIN5/6/7, EXT4 = P0.03/AIN1, EXT5 = P1.11, RSV, GND. 3V3 max. 10 mA.
- LEDs neu: R = P0.15, G = P0.17, B = P1.10. P0.13, P0.20 und P0.22 liessen sich nicht routen.
- M2: H1 (42.4; 12.7), H2 (58.5; 22.8). Beide ausserhalb der Antennen-Freizone.
- Bedienplatine `motion-one-ui` 41 × 27 mm: Alps-Stick C146170, Touch TTP233H C2890349 (1.5 µA, weckt die CPU nicht), 100 Ω je Leitung. ERC/DRC 0.
- Offen: TVS-ESD-Schutz für Kabel, Pin 1 von J5 prüfen, Rotationen in der JLC-Vorschau.
