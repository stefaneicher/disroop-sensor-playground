# Firmware

Die Firmware bildet die für Bridge und Spiele nötigen Thingy:52-BLE-Characteristics nach und liest IMU, Taster,
LED, Summer und Akku. Sie basiert auf Zephyr und wird im separaten Firmware-Docker-Image gebaut.

## Stand

Standabgleich 2026-11-13: Der gespeicherte r4-Lauf dokumentiert **69 Host-Tests ohne
Fehler**, Pincheck und Bootloader-Pincheck [QUELLE/BERECHNUNG:
`../logs/fw-pinmap/unit-tests.log`]. Die r4-Pinmap ist integriert; Zephyr-App und
UF2/HEX-Images liegen vor. Dies ist kein neuer Testlauf. Gesamtstatus **PARTIAL**:
BLE, IMU, Laden, Akkulaufzeit und Wake-on-motion sind nicht auf echter Hardware
getestet (NOT RUN). Verbindlicher Gesamtstand: [PROJECT_STATE](../management/PROJECT_STATE.md).

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
./project hw fw "bash devices/motion-one/firmware/smoke.sh"
./project hw fw "bash devices/motion-one/firmware/build-bootloader.sh"
```

Kein Flashen und kein Betrieb an einer Stromquelle ohne ausdrückliche Freigabe. Datenblattwerte und Registerkonfiguration
des ICM-45686 müssen vor Hardwarefreigabe gegen das vollständige Herstellerdatenblatt verifiziert werden.
