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
