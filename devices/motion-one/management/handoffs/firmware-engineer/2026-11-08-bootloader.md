# Handoff firmware-engineer – Bootloader mit eigener Board-Definition (Q-01), Debug nur RTT (Q-02) (2026-11-08)

## Status
**PARTIAL**: Alles, was ohne Hardware geht, ist PASS. Hardware-Tests sind **NOT RUN**: nichts geflasht, kein Board vorhanden.
- Bootloader-Board-Definition `motion_one`: Build PASS (Release und DEBUG=1/RTT).
- Bootloader-Pincheck: PASS, Negativtest erkennt Abweichungen.
- `pincheck` App: PASS.
- Host-Tests: 36/36 PASS.
- App-Build mit RTT-Log: PASS, 0 Warnungen.

## Bearbeitete Anforderungen
- **Q-01** (User 2026-11-08): eigene Bootloader-Board-Definition in V1. Status-LED D4 (RGB) und Update-Taster SW2 nach PINOUT_V1 statt pca10056.
- **Q-02** (User 2026-11-08): kein UART, Debug nur SWD/Segger RTT. Gilt für Bootloader und App.
- Offener Punkt 1 und 2 aus `2026-11-08-pinout.md` erledigt.

## Eingangsrevisionen
- `electronics/PINOUT_V1.json` r1, SHA-256 `d7a0aa60579c1be62daae7849d40fafb72273c56a2dbda6a3d136e81524374ae`. Unverändert gegenüber dem Pinout-Handoff.
- Adafruit_nRF52_Bootloader Tag 0.11.0, Commit `c67f0bcf0fa8e841426335b1bbde91cda6ca1f50`. Wird im Build-Skript geprüft.
- Submodule nicht rekursiv: tinyusb, nrfx, uf2, tinycrypt.
- Vorheriger Handoff: `2026-11-08-pinout.md`.

## Umsetzung
| Funktion | Pin | Bootloader `board.h` | Hinweis |
|---|---|---|---|
| Status-LED R | P0.30 | `LED_RGB_RED_PIN`, auch `LED_PRIMARY_PIN` | aktiv low → `LED_STATE_ON 0` |
| Status-LED G | P0.31 | `LED_RGB_GREEN_PIN` | |
| Status-LED B | P0.29 | `LED_RGB_BLUE_PIN` | Helligkeitsmaske 0x202020 |
| Update-Taster SW2 | P0.28 | `BUTTON_DFU`, `NRF_GPIO_PIN_PULLUP` | kein `BUTTON_DFU_OTA`, nur ein Taster |
| UART | – | keiner | Q-02 |

Weitere Einstellungen:
- DC/DC aus (wie App).
- UF2: Laufwerk `MOTION1BOOT`, Board-ID `nRF52840-MotionOne-v1`.
- Abgleich: `scripts/check_bootloader_board.py` gleicht `board.h` gegen PINOUT_V1 ab. Läuft in `make test` und `make pincheck`.
- App: `CONFIG_USE_SEGGER_RTT=y`, `CONFIG_LOG_BACKEND_RTT=y`, `CONFIG_LOG_BACKEND_UART=n`. `CONFIG_SERIAL` bleibt aus, uart0 bleibt disabled.
- Wiederverwendung der Zephyr-Board-Definition: nicht direkt möglich. Der Adafruit-Bootloader nutzt das nRF5-SDK mit `board.h` statt Devicetree. Dieselben Pins sind deshalb in einer zweiten Datei abgelegt. Der Pincheck verhindert, dass sie auseinanderlaufen.
- Image `disroop-motion-one-fw`, zwei neue Schichten:
  - Zephyr-Modul `segger`
  - Debian `gcc-arm-none-eabi` + `libnewlib-arm-none-eabi`. Grund: Das Zephyr-SDK hat nur picolibc, der Bootloader braucht `nosys/nano.specs`.

## Ausgabedateien (Pfad + SHA-256)
Alle Pfade relativ zu `devices/motion-one/`.

| Pfad | SHA-256 |
|---|---|
| firmware/bootloader/motion_one/board.h (neu) | 7e659f0d65405001e1b3c08c4ef69b6241d09926de8d525cfe70932458925a02 |
| firmware/bootloader/motion_one/board.mk (neu) | 94c8593214dd86b7b86fe62334530229c9cd74a556b73a00740fbdab996eab03 |
| firmware/bootloader/motion_one/board.cmake (neu) | 8d5f2fd5016b74ba46b80b775d4068e49dcaa338b6da2c1c1a94b17338cc0cd9 |
| firmware/bootloader/motion_one/pinconfig.c (neu, Kopie pca10056, MIT) | a75e0a42114b24cc6fb6ff4edbfad15ab646a925430b03712d659dd35d39997f |
| firmware/scripts/check_bootloader_board.py (neu) | 3cb076d64f664f2ec29b9e55f731e4e87560ccffe9e18ac8faa9fe30e7548582 |
| firmware/build-bootloader.sh (neu) | f0f66ee8631450bf94108ac22bcd7d8ea168fdd7f44e84d57f5e7e1028b27d53 |
| firmware/Makefile | ecee21e9eae9cedfdc32eaeb95b2f1adc0b0b8e83ae72bc2a280d1c8a37930ba |
| firmware/app/prj.conf | 2779e63ab8db4f6eb363795404bd07d71acabd39be656f1295176292eedb5aa9 |
| firmware/PROGRAMMING.md | 69bb06da97fd5b2fe19c4ae438cdf2c352b91b50ad542fb7c9ad860b999ae56e |
| firmware/README.md | 39b9dcefd8f820ff75a8923289b6d077cefc7751f73ef90b3977d282cd9557e7 |
| docker/firmware/Dockerfile | a00fc4ab79b223586490bcde21db65507283e9712b69723697945f61509247eb |
| logs/fw-bootloader/release/motion_one_bootloader-0.11.0_s140_6.1.1.hex (517 584 B) | debd2b0311abe304f2de9cf5de1da7233a609f23cc1fab8724643e20006053e7 |
| logs/fw-bootloader/release/motion_one_bootloader-0.11.0_nosd.hex (102 252 B) | b0d55a08b1d0f5919df36fd0fda2f2dea0734ba46f836ee3979d2679ccd3354c |
| logs/fw-bootloader/release/motion_one_bootloader-0.11.0.hex (96 686 B) | 16a37f2ee620bb8da9df1633a50e9d264ddecfe7fd0c92c25d848ffb4c381453 |
| logs/fw-bootloader/release/update-motion_one_bootloader-0.11.0_nosd.uf2 (75 264 B) | 800062a0fde061c78a9192ea99d14e51afcb659c9825fe40b1cacb66e549edc3 |
| logs/fw-bootloader/release/motion_one_bootloader-0.11.0.out (643 284 B) | 9817ddd308d0e3f685915fd12167f1d6041f15744979e3f3d09a35f0713fdfbf |
| logs/fw-bootloader/debug/motion_one_bootloader-0.11.0_s140_6.1.1.hex (537 340 B) | fd845d7d4e39e95d6051617ec7eb68d5ba5d775ccea0a6fd895261807b99daf0 |
| logs/fw-bootloader/debug/motion_one_bootloader-0.11.0_nosd.hex (122 008 B) | 403e34c7ea28ce995416cb9065482d1a5a6d52901e853e115ea5ef625da0bfb8 |
| logs/fw-bootloader/debug/motion_one_bootloader-0.11.0.hex (116 892 B) | 73ca99aca42745c534ded559bb7e116fa2c8564faab9015e1331f03d9a8d0890 |
| logs/fw-bootloader/debug/update-motion_one_bootloader-0.11.0_nosd.uf2 (89 600 B) | b9a9d366b9d039dfeb40985d8e1a7b1e0822d9253e4950938001970bec6dc01e |
| logs/fw-bootloader/debug/motion_one_bootloader-0.11.0.out (772 652 B) | 751179dfecbb673a136e25dc876501eaaa2451e40c9241c924f6336d3bf5a71c |
| logs/fw-bootloader/app/zephyr.uf2 (315 392 B) | 68c87a5c613b97743000ec80b0f18e55fb328a8104722488e10134b9bde5fca7 |
| logs/fw-bootloader/app/zephyr.hex (443 494 B) | 6a0ba0cc52b2feb166e0884908b31dc23ecfbbd8682a206972a4f440e684e226 |
| logs/fw-bootloader/app/zephyr.bin (157 680 B) | 1de3f8328bba634d72b5cc0404db2f3e4a1d46d32baeb787df69b368e9469b5f |
| logs/fw-bootloader/app/zephyr.elf (4 509 908 B) | 3ef615b6aa02b4870432af969eb6bc27afc876cbb21ddb0dd05e90aaa03516a9 |
| logs/fw-bootloader/bootloader-build.log | 32285e49f72bcd10082e23f8f5193725d98bf2734ba31147835d68f02e37359d |
| logs/fw-bootloader/bootloader-build-debug.log | 84ae94d2a50bb883877ba965c607e881397b41869e500d32d2068fa8c8cd83fb |
| logs/fw-bootloader/tdd-red.log | 999a614cc555d31ec65fe891ac471c02db835aa259d464c766869688cd2522eb |
| logs/fw-bootloader/negativtest.log | bcfe9a114c868de575af0ea2c089bd18682131b8d21163ae071d2f8a06179b81 |
| logs/fw-bootloader/negativtest-board.h | 3864094ff114ab968123a2008222eb9589adf902317eae8e6c71ea6990374499 |

Weitere Logs: `logs/fw-bootloader/app/unit-tests.log`, `app-build.log`, `versions.txt`.

## Tatsächlich durchgeführte Prüfungen
Container: Image `disroop-motion-one-fw` über `./project hw fw`.
- Zephyr 4.5.0, SDK 1.0.1
- arm-none-eabi-gcc 14.2.1 (Debian 15:14.2.rel1-1), newlib 4.5.0

1. **TDD rot**: `check_bootloader_board.py` ohne `board.h` → FAIL, rc 1 (`tdd-red.log`). Lief auf dem Host-Python, nicht im Container.
2. **Bootloader-Pincheck grün**: 4 Pins geprüft, PASS. Läuft auch in `make test` im Container (`app/unit-tests.log`).
3. **Negativtest**: BTN auf P0.11 und `LED_STATE_ON 1` → 3× FAIL, rc 1 (`negativtest.log`). Ergebnis: PASS.
4. **Bootloader-Build Release** `build-bootloader.sh`, rc 0:
   - Bootloader-Segment 0xF4000–0xFC5BC; MBR 0x0–0xB00; Settings 0xFD800; UICR 0x10001014.
   - Strings „Motion One V1“, `MOTION1BOOT` und Board-ID im ELF geprüft.
   - Keine UART-Treibersymbole, nur die schwachen Default-IRQ-Handler.
   - 4 Linker-Warnungen „_close/_lseek/_read … not implemented“ aus newlib-nosys. Sie gehören zum Upstream-Build mit `nosys.specs` und stammen nicht aus Projektcode.
   - Ergebnis: **PASS**.
5. **Bootloader-Build DEBUG=1 (RTT)**, rc 0:
   - `SEGGER_RTT.c` kompiliert, Symbol `_SEGGER_RTT` vorhanden. Im Release ist es nicht vorhanden.
   - Bootloader ab 0xEA000.
   - 5 Linker-Warnungen derselben newlib-Art.
   - Ergebnis: **PASS**.
6. **`smoke.sh logs/fw-bootloader/app`**, rc 0, **PASS**:
   - pincheck: PASS, 14/14
   - bootloader-pincheck: PASS
   - Host-Tests: 36 Tests, 0 Failures
   - App-Build: 0 Warnungen
   - `.config`: `CONFIG_USE_SEGGER_RTT=y`, `CONFIG_LOG_BACKEND_RTT=y`, `CONFIG_SERIAL` not set
   - `zephyr.map`: 110 RTT-Referenzen
   - HEX beginnt bei 0x26000
7. **Hardware: NOT RUN**:
   - Bootloader per SWD aufspielen
   - LED-Farben im Bootloader
   - SW2 → DFU
   - Doppel-Reset
   - USB-MSC `MOTION1BOOT`
   - RTT-Ausgabe über die Probe

## Zahlen (mit Kennzeichnung)
- Bootloader Release: FLASH 33 572 B von 38 KB (86.28 %), RAM 24 716 B. MESSUNG, `bootloader-build.log`.
- Bootloader DEBUG: FLASH 40 656 B von 78 KB (50.90 %), RAM 26 032 B. MESSUNG, `bootloader-build-debug.log`.
- App mit RTT: FLASH 157 680 B (19.44 %), RAM 37 348 B (14.25 %). MESSUNG, `app/app-build.log`. Gegenüber dem Stand ohne RTT sind das +2 392 B FLASH und +1 408 B RAM (BERECHNUNG gegen `2026-11-08-pinout.md`).
- Host-Tests: 36, 0 Failures. MESSUNG.

## Annahmen
- Die LED-Zustände des Bootloaders folgen der Upstream-Logik (QUELLE `src/boards/boards.c`, Tag 0.11.0):
  - Rot blinkt: Bootloader gestartet bzw. USB nicht gemountet.
  - Grün: USB gemountet.
  - Blau: BLE verbunden.
  - Wegen aktiv low ist der Ruhepegel high (aus).
- DC/DC aus, weil die Bestückung im E73 unbekannt ist.
- Die DEBUG-Variante liegt ab 0xEA000 und überschneidet sich mit dem Ende der App-Partition bzw. dem Storage-Bereich. Sie ist nur zur Bootloader-Diagnose gedacht, nicht für den Betrieb (ANNAHME aus Upstream-Linkerskript `nrf52840_debug.ld`).
- BLE-OTA-DFU ist im Adafruit-Bootloader enthalten, wird aber ohne zweiten Taster nur über die App bzw. Doppel-Reset erreicht. Nicht geprüft.

## Fehler
1. Erster Build mit `--recurse-submodules`: Der Klon wuchs auf über 1.9 GB (tinyusb-Untermodule). Abgebrochen; jetzt werden nur 4 Submodule flach geholt.
2. `arm-zephyr-eabi-gcc` hat kein `nosys.specs`. Behoben mit Debian `gcc-arm-none-eabi` + newlib im Image.
3. Regex im Pincheck: `\s*` lief über Zeilenumbrüche, dadurch FAIL bei gültiger Datei. Behoben.

## Offene Entscheide / Fragen an andere Disziplinen
1. **USB-VID/PID** ist vorläufig 0x239A/0x00DA (Adafruit/pca10056). Für Prototypen genehmigt (User 2026-11-08). Vor einer Serie braucht das Gerät eine eigene PID (z. B. pid.codes) → Manager/PM.
2. **PCB:** IMU-CS (P0.12) floatet während des Bootloaders. Pull-up für V2 bleibt offen (aus dem Pinout-Handoff).
3. **Doku/Media:** `PROGRAMMING.md` ist auf den eigenen Bootloader und RTT umgestellt. Die Bedienungsanleitung sollte die Bootloader-LED-Farben und „SW2 beim Reset halten“ übernehmen.
4. **Manager:** Image-Änderung `docker/firmware/Dockerfile` (+segger, +gcc-arm-none-eabi/newlib). Nach dem Commit `./project hw fw-image` neu bauen.
5. Weiterhin offen: DS-000577-Registerverifikation ICM-45686, hal_tdk-Lizenz.

## Nächste Schritte
- Bei PINOUT r3/r4: `make pincheck` ausführen, prüft App-DTS und Bootloader-`board.h`.
- Am Muster (NOT RUN):
  1. `motion_one_bootloader-0.11.0_s140_6.1.1.hex` per SWD aufspielen.
  2. LED-Farbfolge prüfen.
  3. SW2 + Reset → `MOTION1BOOT`.
  4. `zephyr.uf2` kopieren.
  5. RTT-Log mit der Probe lesen (z. B. `pyocd rtt` / OpenOCD `rtt`).
