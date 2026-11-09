# Flash-Anleitung Motion One V1 (Firmware aus Release 1)

Status: **NOT RUN**. Kein Board vorhanden, nichts geflasht. Die Anleitung stammt aus `firmware/PROGRAMMING.md` (Quelle, im Quellen-Zip `firmware_quellen.zip`); keine neuen Werte.

## Dateien
| Datei | Zweck | SHA-256 (Arbeitskopie) |
|---|---|---|
| zephyr.uf2 | App per USB-Laufwerk (Startadresse 0x26000, nRF52840) | 230e3ff2bc168e9ffb45a442202fbd26f9b90eb1fbd516d1b29e09f04ca3ad34 |
| zephyr.hex | App per SWD (CRLF-Arbeitskopie, siehe BEKANNTE_WIDERSPRUECHE #3) | cee6809b8ed353724a8a964e27ca476cf06b1ff7ef630021baa9cdc74804deb8 |
| zephyr.bin | Rohimage | b2dcb5e5769c29cebd494bbad7f051ffc0f7ed9def75606b33234f3eea20a944 |

Quelle der Hashes: `logs/fw-pinmap/zephyr.sha256`.

## Stufe 1: Bootloader einmalig per SWD
1. SWD-Probe (z. B. Raspberry Pi Debug Probe, CMSIS-DAP) an SWDIO, SWCLK, GND, VTref/3V3 (TC2030 laut PINOUT_V1.json). Die Probe speist das Board nicht.
2. Bootloader bauen (Adafruit nRF52 Bootloader 0.11.0, Board-Definition `bootloader/motion_one/`):
   `./project hw fw "bash devices/motion-one/firmware/build-bootloader.sh"`
   Ergebnis `motion_one_bootloader-0.11.0_s140_6.1.1.hex`. **Dieses HEX liegt nicht im Release** (Lücke: Build-Artefakt nicht archiviert).
3. Flashen:
   `openocd -f interface/cmsis-dap.cfg -c "transport select swd" -f target/nrf52.cfg -c "init; nrf5 mass_erase; program motion_one_bootloader-0.11.0_s140_6.1.1.hex verify; reset; exit"`
   oder `pyocd erase -t nrf52840 --chip && pyocd flash -t nrf52840 motion_one_bootloader-0.11.0_s140_6.1.1.hex`
4. Hinweis: `mass_erase` löscht UICR/APPROTECT; bei neuen nRF52840 (Build Code F) ist APPROTECT ab Werk aktiv (ANNAHME).
5. USB-VID/PID vorläufig 0x239A/0x00DA, nur Prototypen (offen).

## Stufe 2: App per UF2
1. Bootloader starten: Reset zweimal kurz drücken oder Taster BTN (P0.28) beim Reset halten. Laufwerk `MOTION1BOOT` erscheint.
2. `zephyr.uf2` auf das Laufwerk kopieren; das Gerät startet neu.
3. Alternativ per SWD: `zephyr.hex` mit `openocd ... program zephyr.hex` (ANNAHME: `CONFIG_USE_DT_CODE_PARTITION` muss dazu aus sein, nicht geprüft).

Debug nur über SWD/Segger RTT, kein UART. Alle Schritte: NOT RUN (keine Hardware).
