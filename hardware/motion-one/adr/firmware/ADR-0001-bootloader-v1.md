# ADR-0001: USB-Bootloader bereits in V1 (Q-01)

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** firmware
- **Entscheider:** User („nimm V1“)
- **Betrifft:** `firmware/bootloader/motion_one/`, `firmware/build-bootloader.sh`, `PROGRAMMING.md`

## Entscheid
Adafruit nRF52 Bootloader 0.11.0 mit eigener Board-Definition: LED D4 RGB auf P0.30/31/29 (aktiv low), Update-Taster SW2 auf P0.28, USB-Laufwerk MOTION1BOOT. Der Pincheck `check_bootloader_board.py` läuft in `make test`.

## Konsequenzen
- USB-VID/PID ist vorläufig 0x239A/0x00DA (wie pca10056). Für eine Serie ist eine eigene PID nötig.
- Durch die Pin-Änderung in PCB r4 (LED-Pins, electronics/ADR-0002) muss `board.h` nachgeführt werden.
