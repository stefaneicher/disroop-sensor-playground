# SOUP: Software of Unknown Provenance

Fremdsoftware, die in der Firmware läuft oder sie baut. IEC 62304 verlangt für jede SOUP: Name, Hersteller, Version, Anforderungen an
die SOUP (Funktion und Leistung), Prüfung bekannter Fehlerlisten und die Dokumentation der Bewertung (Abschnitte 5.3.3, 5.3.4, 7.1.3, 8.1.2).
Die Versionen stammen aus `devices/motion-one/docker/firmware/Dockerfile` und den Quellen. Die Fehlerlisten (Anomalien) habe ich **nicht**
geprüft ({GAP-17}).

## 1. In der Firmware enthalten

| ID | SOUP | Version | Lizenz | Verwendung | Zugehörige Gefährdungen | Anomalieliste geprüft |
|---|---|---|---|---|---|---|
| <a id="SOUP-01"></a>SOUP-01 | Zephyr RTOS (Kernel, Treiber, Logging) | v4.5.0 | Apache-2.0 | Scheduler, SPI/GPIO/PWM/ADC, Arbeitswarteschlange, Mutex | {HAZ-03}, {HAZ-07} | NOT RUN |
| <a id="SOUP-02"></a>SOUP-02 | Zephyr Bluetooth (Host, Controller, GATT) | in v4.5.0 | Apache-2.0 | BLE-Verbindung, Notifications, Advertising | {HAZ-04}, {HAZ-09} | NOT RUN |
| <a id="SOUP-03"></a>SOUP-03 | hal_nordic (nrfx, MDK, Funk) | von Zephyr v4.5.0 vorgegeben | Apache-2.0 / BSD-3 | Hardwarezugriff nRF52840 | {HAZ-03} | NOT RUN |
| <a id="SOUP-04"></a>SOUP-04 | CMSIS / CMSIS_6 | von Zephyr vorgegeben | Apache-2.0 | Cortex-M-Kern | – | NOT RUN |
| <a id="SOUP-05"></a>SOUP-05 | mbedtls, tf-psa-crypto | von Zephyr vorgegeben | Apache-2.0 | Krypto der BLE-Schicht (mit `BT_SMP=n` kaum genutzt) | {HAZ-04} | NOT RUN |
| <a id="SOUP-06"></a>SOUP-06 | SEGGER RTT | von Zephyr vorgegeben | SEGGER-Lizenz (prüfen) | Log über SWD | – | NOT RUN |
| <a id="SOUP-07"></a>SOUP-07 | Picolibc (C-Bibliothek des Zephyr-SDK) | SDK 1.0.1 | je Bibliothek | `sqrtf`, `memcpy` u. a. | {HAZ-01} | NOT RUN |

## 2. Im Bootloader

| ID | SOUP | Version | Lizenz | Verwendung | Gefährdungen | Anomalieliste geprüft |
|---|---|---|---|---|---|---|
| <a id="SOUP-10"></a>SOUP-10 | Adafruit nRF52 Bootloader (UF2) | 0.11.0 | MIT | Update über USB-Laufwerk, **ohne Signaturprüfung** | {HAZ-04}, {HAZ-10} | NOT RUN |
| <a id="SOUP-11"></a>SOUP-11 | arm-none-eabi-gcc, newlib-nano (Debian) | Version der Distribution | GPL / BSD | Bootloader-Build | – | NOT RUN |

## 3. Referenzcode (nicht Teil der gebauten Firmware)

| ID | Quelle | Verwendung |
|---|---|---|
| <a id="SOUP-20"></a>SOUP-20 | TDK `hal_tdk` ICM-456xx (`firmware/docs/ref/`), BSD-3 | Vorlage für Registerwerte und FIFO-Format im Treiber [[firmware/icm/src/icm45686.c]]. Der Code wird nicht kompiliert, aber seine **Werte** sind übernommen und nicht gegen das Datenblatt geprüft ({GAP-12}). |

## 4. Entwicklungs- und Prüfwerkzeuge

Sie sind nicht Teil des Produkts, beeinflussen aber das Ergebnis (Werkzeugvalidierung, {GAP-21}).

| ID | Werkzeug | Version | Zweck |
|---|---|---|---|
| <a id="SOUP-30"></a>SOUP-30 | Zephyr SDK (arm-zephyr-eabi, GCC) | 1.0.1 | Übersetzen der Firmware |
| <a id="SOUP-31"></a>SOUP-31 | west, CMake, Ninja, Python | west aus PyPI (nicht gepinnt), CMake/Ninja der Distribution | Build |
| <a id="SOUP-32"></a>SOUP-32 | Unity | v2.6.1 | Host-Unit-Tests |
| <a id="SOUP-33"></a>SOUP-33 | gcc (Debian trixie) | Version der Distribution | Host-Unit-Tests mit `-Wall -Wextra -Werror` |
| <a id="SOUP-34"></a>SOUP-34 | Basis-Image `debian:trixie-slim` | Tag, nicht per Digest gepinnt | Reproduzierbarkeit |

## 5. Befunde

- Die Zephyr-Version ist gepinnt, die **Modulversionen** ergeben sich aus dem Zephyr-Manifest (indirekt gepinnt). Das ist für eine Einreichung
  zu prüfen und als Software-Stückliste (SBOM) festzuhalten.
- `west` und das Basis-Image sind nicht auf eine unveränderliche Version festgelegt: Ein späterer Build kann abweichen (siehe IDEEN.md,
  Compiler-Matrix und Conan).
- Eine Software-Stückliste (SBOM) im Format SPDX oder CycloneDX fehlt ({GAP-13}).
