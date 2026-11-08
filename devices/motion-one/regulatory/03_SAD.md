# SAD: Software Architecture Document

Rückwärts aus dem Code. Bezug: [SRS](02_SRS.md), [SDD](04_SDD.md), [SOUP](05_SOUP.md). Systemarchitektur (Hardware, Funkmodul-Wahl):
`requirements/ARCHITECTURE.md`.

## 1. Überblick

Ziel: Thingy:52-kompatibles BLE-Profil auf einem nRF52840 mit ICM-45686-IMU (Zephyr RTOS). Die Software trennt zwei Schichten:

- **Reine C-Module** (Kern): ohne Zephyr, ohne Hardware, auf dem Entwicklungsrechner mit gcc und Unity getestet.
- **Zephyr-Adapter** (Rand): verbinden den Kern mit BLE, SPI, GPIO, PWM, ADC. Sie haben **keine Unit-Tests**.

```
                  ┌──────────────────────── Zephyr-Adapter (firmware/app/src) ───────────────────────┐
 Thingy-App       │  ble_thingy ◄───────── Notifications ─────────── imu_task ◄── INT1/SPI ── ICM-45686│
 (Bridge, Android)│     │ GATT-Schreibzugriffe                          │ Samples                    │
   ◄──── BLE ────►│     ▼                                               ▼                            │
                  │  ui  (LED, Summer, Motor, Taster)    main (Akku, Ruhe, System OFF)   ext (J5)     │
                  │  battery   board_early                                                           │
                  └──────┬───────────┬───────────────┬──────────────┬─────────────┬──────────────────┘
                         ▼           ▼               ▼              ▼             ▼
                    ┌────────┐  ┌─────────┐   ┌──────────┐   ┌───────────┐  ┌───────────┐
                    │ codec  │  │ fusion  │   │ icm      │   │ power     │  │ input     │   reine C-Module,
                    │ Thingy │  │ Madgwick│   │ ICM-45686│   │ vbat,     │  │ ext_input │   Host-getestet
                    │ Profil │  │ + Bias  │   │ Treiber  │   │ motor_drv │  │ Stick,    │
                    └────────┘  └─────────┘   └──────────┘   └───────────┘  │ Touch     │
                                                                            └───────────┘
 Zephyr RTOS (SOUP): Kernel, Bluetooth-Host/-Controller, GPIO/SPI/PWM/ADC-Treiber, Logging (RTT), hal_nordic
```

## 2. Bausteine

| ID | Baustein | Aufgabe | Typ | Dateien |
|---|---|---|---|---|
| <a id="SAD-01"></a>**SAD-01** | codec | Kodieren und Prüfen aller Profil-Nutzdaten, Tasten-Zustandsmaschine, Ratenbegrenzer für `EF680380` | rein | [[firmware/codec/src/thingy_codec.c]], [[firmware/codec/include/thingy_codec.h]] |
| <a id="SAD-02"></a>**SAD-02** | fusion | Madgwick-Filter, Euler/Heading, Gyro-Bias-Kalibrierung | rein | [[firmware/fusion/src/motion_fusion.c]] |
| <a id="SAD-03"></a>**SAD-03** | icm | Register, FIFO-Parser und Init des ICM-45686 über einen Bus-Port | rein (Bus als Funktionszeiger) | [[firmware/icm/src/icm45686.c]] |
| <a id="SAD-04"></a>**SAD-04** | power | Akkumessung (`vbat`), Motor-PWM und Last-Arbitrierung (`motor_drive`) | rein | [[firmware/power/src/vbat.c]], [[firmware/power/src/motor_drive.c]] |
| <a id="SAD-05"></a>**SAD-05** | input | Stick-Skalierung, Platinenerkennung, Touch-Entprellung | rein | [[firmware/input/src/ext_input.c]] |
| <a id="SAD-06"></a>**SAD-06** | ble_thingy | GATT-Tabelle, Advertising, Lese-/Schreib-Handler, Notifications | Adapter | [[firmware/app/src/ble_thingy.c]] |
| <a id="SAD-07"></a>**SAD-07** | imu_task | IMU-Thread: FIFO lesen, Fusion, Dezimierung, Wake-on-Motion | Adapter | [[firmware/app/src/imu_task.c]] |
| <a id="SAD-08"></a>**SAD-08** | ui | LED (PWM), Summer, Motor, Taster | Adapter | [[firmware/app/src/ui.c]] |
| <a id="SAD-09"></a>**SAD-09** | ext | Bedienplatine J5 (ADC, Touch), Meldung `EF680380` | Adapter | [[firmware/app/src/ext.c]] |
| <a id="SAD-10"></a>**SAD-10** | battery | ADC-Zugriff für die Akkumessung | Adapter | [[firmware/app/src/battery.c]] |
| <a id="SAD-11"></a>**SAD-11** | main | Start, Akku-Überwachung (60 s), Ruheabschaltung, System OFF | Adapter | [[firmware/app/src/main.c]] |
| <a id="SAD-12"></a>**SAD-12** | board_early | Frühe Pin-Initialisierung (IMU-CS) | Adapter | [[firmware/app/src/board_early.c]] |
| <a id="SAD-13"></a>**SAD-13** | Board-Definition | Devicetree, Pinmux, Defconfig | Konfiguration | [[firmware/boards/disroop/motion_one/motion_one.dts]], [[firmware/boards/disroop/motion_one/motion_one-pins.dtsi]] |
| <a id="SAD-14"></a>**SAD-14** | Bootloader | Adafruit nRF52 UF2 mit eigener Board-Definition | SOUP + Konfiguration | [[firmware/bootloader/motion_one/board.h]] |

Die Abhängigkeiten zeigen nur nach innen: Adapter rufen Kern-Module, nie umgekehrt. Der Kern kennt die Adapter nur über Funktionszeiger
(`icm_bus_t`, `vbat_port_t`). Das ist die Grundlage für die Host-Tests.

## 3. Ausführungskontexte (Threads)

| Kontext | Priorität / Stack | Aufgabe | Gemeinsame Daten |
|---|---|---|---|
| `main` | Standard, 2048 B | Schleife im Sekundentakt: Akku (60 s), Ruheprüfung | `ble_is_connected`, `imu_at_rest_for_s` |
| `imu` ([[imu_thread]]) | preemptiv, Priorität 2, 2048 B | wartet auf INT1 (Timeout 100 ms), liest bis 16 Frames, Fusion, Senden | `cal`, `fus` (nur dieser Thread), `rest_samples` (auch `main` liest) |
| System-Workqueue | 2048 B | Taster-Polling, LED-Animation, Summer-/Motor-Timer, J5-Abfrage, `EF680380` | `load_lock` (Mutex), Zustände in `ui.c` und `ext.c` |
| Bluetooth-Threads (SOUP) | Zephyr | GATT-Handler (`rd_*`, `wr_*`), Verbindungsereignisse | `cfg_lock` (Mutex) für `motion_cfg`; `led_cmd`, `env_cfg`, `sound_cfg` **ohne** Sperre |
| ISR | – | INT1 gibt Semaphor; Tasterflanke plant Arbeit ein; Touch-Flanke plant Arbeit ein | Semaphor, Workqueue |

Befunde zur Nebenläufigkeit: {GAP-09}.

## 4. Datenfluss Bewegung

1. ICM-45686 füllt das FIFO mit 400 Hz und löst INT1 bei 2 Frames aus.
2. [[imu_thread]] liest [[icm45686_fifo_count]], dann die Frames, parst jedes mit [[icm45686_parse_frame]].
3. [[process]]: Bias-Schätzung ([[bias_cal_feed]]), Ruheerkennung, Bias abziehen, [[madgwick_update]].
4. Dezimierung auf `motion_freq_hz`, nur wenn [[ble_motion_wanted]]. Euler/Heading/Raw/Raw-HR kodieren.
5. [[ble_publish_motion]] begrenzt auf 200 Notifications/s und ruft `bt_gatt_notify` je abonniertem Kanal.

Latenzbudget Gerät: < 10 ms (REQ-032, rechnerisch 2,8 ms typisch, NOT RUN).

## 5. Zustände des Geräts

```
          Reset / Wake
              │
              ▼
   ┌────────────────────┐ BLE-Init-Fehler  ┌──────────────┐
   │ Start (Init aller  ├─────────────────►│ main endet   │  (Gerät untätig, Befund GAP-05)
   │ Module)            │                  └──────────────┘
   └─────────┬──────────┘
             ▼
   ┌────────────────────┐ Verbindung  ┌───────────────┐ CCC abonniert ┌──────────────────┐
   │ Advertising        ├────────────►│ Verbunden     ├──────────────►│ Streaming        │
   └─────┬──────────────┘◄────────────┤               │◄──────────────┤ (Notifications)  │
         │      Trennen                └───────────────┘  abbestellt   └──────────────────┘
         │ Ruhe ≥ 60 s ohne Verbindung   oder   Akku < 3300 mV
         ▼
   ┌────────────────────┐   Taster oder Bewegung (WoM)
   │ System OFF         ├──────────────────────────────► Reset / Start
   └────────────────────┘
```

## 6. Schnittstellen

### 6.1 Extern (BLE/GATT), Basis-UUID `EF68xxxx-9B35-4933-9B10-52FFA9740042`

| Service | Characteristic | Richtung | Inhalt | SRS |
|---|---|---|---|---|
| 0100 Config | 0101 | lesen | Gerätename | {SRS-001} |
| 0200 Environment | 0206 | lesen, schreiben | Env-Config (Dummy) | {SRS-012} |
| 0300 UI | 0301 | lesen, schreiben | LED-Befehl | {SRS-015} |
| | 0302 | lesen, Notify | Taster | {SRS-040} |
| | 0380 | lesen, Notify | Bedienplatine J5 | {SRS-065} |
| 0400 Motion | 0401 | lesen, schreiben | Motion-Config | {SRS-010} |
| | 0404 / 0406 / 0407 / 0409 / 0480 | Notify | Quaternion / Raw / Euler / Heading / Raw-HR | {SRS-030} |
| 0500 Sound | 0501 | lesen, schreiben | Sound-Config | {SRS-013} |
| | 0502 | schreiben | Ton | {SRS-014} |
| | 0503 | Notify | Ton beendet | {SRS-014} |
| 180F Battery | 2A19 | lesen, Notify | Ladung in % | {SRS-051} |

Formate: `docs/protocol.md` im Repo und [[firmware/docs/EXTENDED_CHANNEL.md]].

### 6.2 Intern

Die Adapter-Schnittstellen stehen in [[firmware/app/src/app.h]] (z. B. [[ble_publish_motion]], [[ui_led_apply]], [[battery_read_mv]]).
Die Kern-Schnittstellen stehen in den Headern unter `codec/include`, `fusion/include`, `icm/include`, `power/include`, `input/include`.

## 7. Trennung nach Sicherheitsklasse (62304 Abschnitt 5.3.5)

Heute gibt es **keine Trennung**: Alle Bausteine laufen im selben Adressraum, Zephyr nutzt nur den MPU-Stackschutz (`CONFIG_ARM_MPU`,
`CONFIG_HW_STACK_PROTECTION`). Darum gilt die ganze Software als Klasse C. Eine Trennung wäre denkbar für `ext`/`ui` (Komfortfunktionen),
verlangt aber einen Nachweis der Unabhängigkeit. Siehe {GAP-06}.

## 8. Wichtige Entwurfsentscheide

- ADR-0001: USB-Bootloader schon in V1, damit ohne SWD-Probe aktualisiert werden kann (`adr/firmware/ADR-0001-bootloader-v1.md`).
- ADR-0002: kein UART, Log nur über RTT (`ADR-0002-nur-rtt.md`).
- ADR-0003: Motor-Tastgrad auf ≤ 3,0 V, Summer vor Motor (`ADR-0003-motor-leistungsbegrenzung.md`).
- ADR-0004: Erweiterungstreiber J5 (`ADR-0004-erweiterung-treiber.md`).
- Thingy:52-Kompatibilität ist Pflicht (REQ-020…027), damit Bridge und Android-App unverändert laufen.
