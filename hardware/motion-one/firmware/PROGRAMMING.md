# Programmierweg Motion One V1 (nRF52840 / Ebyte E73-2G4M08S1C)

Der Weg hat zwei Stufen:
1. **Einmalig per SWD**: den Adafruit nRF52 Bootloader aufspielen (inkl. SoftDevice-Bereich).
2. **Danach per USB**: Die Firmware kommt als `zephyr.uf2` per Drag & Drop aufs Laufwerk.

Hardware-Ablauf: NOT RUN (kein Board vorhanden, nichts geflasht).

## SWD-Proben (Bezug Schweiz)
Preise wurden am 2026-11-08 per Abruf auf bastelgarage.ch ermittelt (QUELLE: Suchseite, Preis inkl. MWST).

| Probe | Preis | Bezug | Bemerkung |
|---|---|---|---|
| Raspberry Pi Debug Probe | CHF 15.90 | https://www.bastelgarage.ch/raspberry-pi-debug-probe | CMSIS-DAP, mit Kabeln, OpenOCD/pyOCD; Empfehlung |
| Raspberry Pi Pico als `debugprobe` | CHF 4.90 | https://www.bastelgarage.ch (Suche „Raspberry Pi Pico“) | Firmware `debugprobe_on_pico.uf2` (github.com/raspberrypi/debugprobe), GP2 = SWCLK, GP3 = SWDIO, GND |
| Alternative: J-Link EDU Mini, nRF52840-DK (eingebauter J-Link) | nicht abgerufen | – | teurer, nicht nötig |

Die Debug Probe ist auch bei pi-shop.ch gelistet; dort wurde kein Preis ausgelesen.

## Anschluss
Benötigt werden SWDIO, SWCLK, GND und VTref/3V3 am E73 (TC2030 laut PINOUT_V1.json). Logs der App über Segger RTT (`CONFIG_LOG_BACKEND_RTT`), kein UART.
Das Board wird über den eigenen Akku/USB versorgt. Die Probe speist das Board nicht.

## 1. Bootloader einmalig (SWD)
Verwendet wird Adafruit nRF52 Bootloader **0.11.0** (Tag-SHA c67f0bcf) mit **eigener Board-Definition** `bootloader/motion_one/` (Q-01).
Die Pins stammen aus `../electronics/PINOUT_V1.json`: Status-LED RGB D4 (R P0.30, G P0.31, B P0.29, aktiv low) und Update-Taster SW2 an P0.28 mit internem Pull-up. `make pincheck` prüft die Pins (`scripts/check_bootloader_board.py`).
Bauen im Container: `./project hw fw "bash hardware/motion-one/firmware/build-bootloader.sh"`. Ergebnis `motion_one_bootloader-0.11.0_s140_6.1.1.hex` (S140 6.1.1 + Bootloader ab 0xF4000).
Debug ausschliesslich über SWD/Segger RTT (Q-02, kein UART). Die Variante `build-bootloader.sh DEBUG=1` loggt über RTT und liegt ab 0xEA000, überlappt also App/Storage. Sie ist nur für Bootloader-Diagnose gedacht.
USB-VID/PID vorläufig 0x239A/0x00DA wie pca10056, nur für Prototypen (offener Punkt). Das Laufwerk heisst `MOTION1BOOT`.

```
# Raspberry Pi Debug Probe / Pico-debugprobe (CMSIS-DAP)
openocd -f interface/cmsis-dap.cfg -c "transport select swd" -f target/nrf52.cfg \
  -c "init; nrf5 mass_erase; program motion_one_bootloader-0.11.0_s140_6.1.1.hex verify; reset; exit"
# alternativ pyOCD
pyocd erase -t nrf52840 --chip && pyocd flash -t nrf52840 motion_one_bootloader-0.11.0_s140_6.1.1.hex
```
`mass_erase` löscht auch UICR/APPROTECT. Neue nRF52840-Revisionen (ab Build Code F) haben APPROTECT ab Werk aktiv; ein Mass-Erase per CTRL-AP ist dann nötig (ANNAHME).

## 2. Firmware per UF2
1. Bauen: `./project hw fw "bash hardware/motion-one/firmware/build-app.sh"`. Das ergibt `build/app/zephyr/zephyr.uf2`, Startadresse 0x26000, Familie nRF52840.
2. Bootloader starten: Reset zweimal kurz drücken, oder Taster SW2 (P0.28) beim Reset halten. Es erscheint ein USB-Laufwerk `MOTION1BOOT`, die RGB-LED zeigt den Bootloader-Zustand.
3. `zephyr.uf2` auf das Laufwerk kopieren. Das Gerät startet danach neu.

Alternativ ohne Bootloader per SWD: `zephyr.hex` mit `openocd ... program zephyr.hex` flashen.
Die App liegt dann ab 0x26000 und braucht den Bootloader/MBR nicht zwingend. Für SWD-only müsste aber `CONFIG_USE_DT_CODE_PARTITION` aus sein (ANNAHME, nicht geprüft).

Referenz-Images aus dem letzten Build: `hardware/motion-one/logs/fw-v1/zephyr.{uf2,hex,elf}`. Prüfsummen stehen in `zephyr.sha256`.
