# ADR-0004: Treiber für Erweiterungsstecker J5 (r4)

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** firmware
- **Entscheider:** Projektleitung (Umsetzung zu electronics/ADR-0002)
- **Betrifft:** Pinmap r4, J5-Treiber, Bootloader `board.h`

## Entscheid
- **LED-Pins r4:** P0.15, P0.17, P1.10. Gilt für App und Bootloader.
- **Daumenstick** an EXT1–3 über SAADC. Abgetastet wird nur bei bestehender BLE-Verbindung: alle 50 ms bei Bewegung, sonst alle 500 ms. Totzone 8 %, die Mitte wird beim Start kalibriert.
- **Stick-Taste** an EXT4 mit Pull-up.
- **Touch** an EXT5 als Interrupt mit Pull-down: 30 ms entprellt; bei mehr als 10 Flanken pro Sekunde 10 s gesperrt.
- **Erkennung der Bedienplatine:** einmal beim Start. Ohne Bedienplatine sind die Eingänge passiv, damit keine Ereignis-Flut entsteht. Einstecken im Betrieb gilt nicht und braucht einen Neustart.
- **TTP233H-Ausgang:** gilt als CMOS-Push-Pull (ANNAHME nach Datenblatt-Option). Wird mit dem ersten Muster geprüft.

## Konsequenzen
- Stick und Touch erscheinen vorerst nur im Log.
- Das BLE-Format im erweiterten Kanal legt der systems-engineer fest (offen, F-12).
