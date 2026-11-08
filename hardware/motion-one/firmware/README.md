# Firmware

Die Firmware bildet die für Bridge und Spiele nötigen Thingy:52-BLE-Characteristics nach und liest IMU, Taster,
LED, Summer und Akku. Sie basiert auf Zephyr und wird im separaten Firmware-Docker-Image gebaut.

## Stand

Codec-, Profil-, Sensorfusions- und IMU-Hosttests: **32/32 PASS** im dokumentierten Lauf. Zephyr-App und UF2/HEX-Images
sind gebaut. Die Pinbelegung war zunächst ein Platzhalter; die Übernahme aus `../electronics/PINOUT_V1.json` und der
anschliessende Build laufen. Darum ist Firmware V1 PARTIAL. BLE, IMU, Laden, Akkulaufzeit und Wake-on-motion wurden
nicht auf echter Hardware getestet (NOT RUN).

## Verzeichnisstruktur

- `codec/`, `fusion/`, `icm/`: hardwareunabhängige C-Logik und Treiber
- `app/`: Zephyr-GATT- und Board-Anwendung
- `boards/disroop/motion_one/`: Board-Definition; Pinmux-Overlay nach Abgleich mit PCB
- `tests/`: Host-Unit-Tests
- `bootloader/motion_one/`: Board-Definition für den Adafruit-UF2-Bootloader (Pins aus PINOUT_V1), Build `build-bootloader.sh`
- `PROGRAMMING.md`: vorgesehener SWD-Bootloader-/UF2-Weg; Debug nur SWD/RTT, kein UART
- `docs/EXTENDED_CHANNEL.md`: Raw-HR-Erweiterung `EF680480`

## Bauen und prüfen

```sh
./project hw fw-image
./project hw fw "bash hardware/motion-one/firmware/smoke.sh"
./project hw fw "bash hardware/motion-one/firmware/build-bootloader.sh"
```

Kein Flashen und kein Betrieb an einer Stromquelle ohne ausdrückliche Freigabe. Datenblattwerte und Registerkonfiguration
des ICM-45686 müssen vor Hardwarefreigabe gegen das vollständige Herstellerdatenblatt verifiziert werden.
