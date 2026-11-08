# SRS: Software Requirements Specification

Rückwärts aus dem Code abgeleitet (Reverse Engineering). „Soll“ heisst hier: **so verhält sich der Code heute**. Wo das ein Risiko
ist, steht der Befund in den [Lücken](08_Luecken.md). Die Systemanforderungen `REQ-nnn` stehen in `management/REQUIREMENTS.md`.

## 1. Zweckbestimmung (ANGENOMMEN, OPEN-01)

> Das Gerät ist ein handgehaltener Bewegungssensor. Es misst Lage und Drehrate der Hand, berechnet daraus eine Orientierung und
> überträgt sie per Bluetooth LE an eine Auswertesoftware (Bridge oder App). Das Gerät stellt keine Diagnose und trifft keine
> Therapieentscheidung. Einsatz: Bewegungsübungen (Reha, Training) unter Aufsicht einer Fachperson.

Sicherheitsklasse: **C** (gesetzt, siehe [Risiko](06_Risiko.md)). Alle Anforderungen gelten deshalb als Klasse C.

## 2. Legende

- **Kennz.:** `CODE` = aus dem Code abgeleitet · `ANNAHME` = der Code selbst nennt den Wert eine Annahme · `ADR` = Entscheid in `adr/firmware/`.
- **Verifikation:** Name des Host-Unit-Tests (Unity) oder `NOT RUN` (nur auf Hardware prüfbar, keine Unit-Tests für Zephyr-Adapter).
- Die Host-Tests habe ich in dieser Sitzung **nicht ausgeführt**. Das README der Firmware nennt 32/32 PASS; im Code stehen 69 `RUN_TEST`.
  Der Widerspruch ist offen ({GAP-20}).

## 3. Bluetooth-Profil und Verbindung

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-001"></a>**SRS-001** | Das Gerät bewirbt sich als „Thingy“ mit dem 128-Bit-Service `EF680100-…` (allgemein auffindbar, kein BR/EDR). | CODE | [[adv_start]], [[firmware/app/prj.conf]] | NOT RUN |
| <a id="SRS-002"></a>**SRS-002** | Es ist höchstens eine Verbindung aktiv. Nach dem Trennen beginnt das Advertising automatisch neu. | CODE | [[recycled]], [[disconnected]] | NOT RUN |
| <a id="SRS-003"></a>**SRS-003** | Es gibt keine Kopplung und keine Verschlüsselung (`BT_SMP=n`). Jeder Client darf lesen und schreiben. | CODE | [[firmware/app/prj.conf]] | NOT RUN, siehe {HAZ-04} |
| <a id="SRS-004"></a>**SRS-004** | Bevorzugte Verbindungsparameter 7,5–15 ms, Latenz 0, Timeout 4 s. MTU 247 wird akzeptiert. | ADR | [[firmware/app/prj.conf]], [[le_param_updated]] | NOT RUN |
| <a id="SRS-005"></a>**SRS-005** | Die Attributindizes des UI-, Motion- und Sound-Services sind fest (9, 18, 8) und werden beim Übersetzen geprüft. | CODE | [[ui_svc]], [[motion_svc]], [[sound_svc]] | Übersetzungszeit (BUILD_ASSERT) |

## 4. Konfiguration und Ausgabe über BLE

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-010"></a>**SRS-010** | `EF680401` Motion-Config (9 B) wird gelesen und geschrieben. `motion_freq_hz` muss 5…200 sein, sonst Fehler „Wert nicht erlaubt“. Falsche Länge ergibt „ungültige Länge“. | CODE | [[thingy_parse_motion_config]], [[wr_motion_cfg]] | [[test_motion_config_rejects_freq_and_len]], [[test_motion_config_bridge_vector]] |
| <a id="SRS-011"></a>**SRS-011** | Beim Start gelten Standardwerte für Motion-, Env- und Sound-Config. | CODE | [[thingy_motion_config_default]], [[ble_thingy_init]] | [[test_motion_config_bridge_vector]] |
| <a id="SRS-012"></a>**SRS-012** | `EF680206` Env-Config (12 B) wird gespeichert und unverändert zurückgegeben. Es gibt keinen Umweltsensor (Dummy). | CODE | [[thingy_parse_env_config]], [[wr_env_cfg]] | [[test_env_config_read_default_then_echo_written]] |
| <a id="SRS-013"></a>**SRS-013** | `EF680501` Sound-Config: Lautsprechermodus 1…3, Mikrofonmodus 1…2, sonst Fehler. | CODE | [[thingy_parse_sound_config]] | [[test_sound_config]] |
| <a id="SRS-014"></a>**SRS-014** | `EF680502` Ton: nur im Frequenzmodus (Modus 1), sonst „nicht erlaubt“. Lautstärke wird auf 0…100 begrenzt, der Tastgrad auf höchstens 50 %. Nach Ablauf meldet das Gerät das Ende. | CODE / ANNAHME | [[thingy_parse_speaker_tone]], [[wr_speaker]], [[ui_speaker_tone]], [[buzzer_off]] | [[test_speaker_tone_bridge_vector_and_volume_clamp]] |
| <a id="SRS-015"></a>**SRS-015** | `EF680301` LED: Modi 0 (aus), 1 (konstant RGB), 2 (atmen), 3 (einmal). Mischung 1…7, Intensität 1…100 %, Verzögerung 50…10000 ms, sonst Fehler. Der Befehl ist lesbar. | CODE | [[thingy_parse_led]], [[wr_led]], [[ui_led_apply]] | [[test_led_modes]], [[test_led_rejects_bad_input]] |
| <a id="SRS-016"></a>**SRS-016** | Ein Schreibzugriff mit Offset ≠ 0 wird abgelehnt. | CODE | [[wr_motion_cfg]], [[wr_led]] | NOT RUN |

## 5. Bewegungsmessung und Sensorfusion

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-020"></a>**SRS-020** | Die IMU läuft mit 400 Hz, ±32 g und ±4000 °/s. Das FIFO arbeitet im Stream-Modus mit Watermark 2 Frames; INT1 meldet das Watermark. | CODE | [[icm45686_init]], [[IMU_ODR_HZ]], [[WATERMARK_FRAMES]] | [[test_init_sequence]] (Registerwerte nicht gegen Datenblatt geprüft, {GAP-12}) |
| <a id="SRS-021"></a>**SRS-021** | Beim Init wird die Chip-Kennung (`WHO_AM_I` = 0xE9) geprüft. Bei falscher Kennung oder Busfehler liefert der Treiber einen Fehlercode. | CODE | [[icm45686_init]] | [[test_init_wrong_whoami_and_bus_error]] |
| <a id="SRS-022"></a>**SRS-022** | Ein FIFO-Paket hat 16 B. Skalierung 1024 LSB/g und 8,192 LSB/°/s. Leere oder ungültige Pakete (Wert 0x8000) werden verworfen. | CODE | [[icm45686_parse_frame]] | [[test_parse_frame_scales_and_timestamp]], [[test_parse_frame_rejects_invalid]] |
| <a id="SRS-023"></a>**SRS-023** | Erreicht ein Sensorwert ±32767, wird die Achse als gesättigt markiert. | CODE | [[icm45686_parse_frame]] | [[test_parse_frame_flags_saturation]] |
| <a id="SRS-024"></a>**SRS-024** | Die Orientierung wird mit einem 6-Achsen-Madgwick-Filter (β = 0,1, ANNAHME) berechnet, Zeitschritt 1/400 s. | CODE / ANNAHME | [[madgwick_update]], [[process]] | [[test_static_tilt_converges]], [[test_rotation_about_z_integrates]] |
| <a id="SRS-025"></a>**SRS-025** | Der Gyro-Bias wird automatisch geschätzt, wenn |ω| < 3 °/s und ||a|−1 g| < 0,05 g (beide ANNAHME) für 1 s gelten. Danach wird er von jedem Sample abgezogen. | CODE / ANNAHME | [[bias_cal_feed]], [[bias_cal_apply]] | [[test_rest_detection_estimates_and_removes_bias]], [[test_motion_resets_window]], [[test_bias_corrected_static_has_no_yaw_drift]] |
| <a id="SRS-026"></a>**SRS-026** | Ein langer Tastendruck erzwingt die Bias-Kalibrierung. Dann gilt nur das Gyro-Kriterium. | CODE | [[bias_cal_request]], [[imu_request_calibration]] | [[test_button_request_ignores_accel_criterion]] |
| <a id="SRS-027"></a>**SRS-027** | Euler-Winkel (ZYX) und Heading werden aus dem Quaternion berechnet. Heading liegt in [0, 360). | CODE | [[quat_to_euler_deg]], [[heading_from_yaw_deg]] | [[test_heading_bridge_vector_and_normalised]], [[test_euler_bridge_vector]] |

## 6. Datenausgabe

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-030"></a>**SRS-030** | Nur abonnierte Kanäle werden gesendet: Quaternion (16 B), Raw Motion (18 B), Euler (12 B), Heading (4 B), Raw-HR (16 B). Ohne Abonnent wird nichts gesendet. | CODE | [[ble_publish_motion]], [[ble_motion_wanted]] | NOT RUN |
| <a id="SRS-031"></a>**SRS-031** | Die Senderate entspricht `motion_freq_hz` durch Dezimierung der 400-Hz-Samples. | CODE | [[imu_thread]], [[process]] | NOT RUN |
| <a id="SRS-032"></a>**SRS-032** | Die Summe aller Notifications bleibt ≤ 200/s. Der Dezimierungsfaktor ist ceil(Rate × Kanäle / 200). | CODE | [[ble_publish_motion]], [[NOTIFY_BUDGET_PER_S]] | NOT RUN |
| <a id="SRS-033"></a>**SRS-033** | Raw Motion kodiert Beschleunigung ×1024, Gyro ×32 (auf ±1023,97 °/s begrenzt), Kompass ×16 als 9× i16 little-endian, mit Sättigung und Rundung. Der Kompass ist 0 (kein Magnetometer). | CODE | [[thingy_encode_raw_motion]], [[process]] | [[test_bridge_vector_encodes_to_same_bytes]], [[test_saturates_at_i16_limits]], [[test_rounds_to_nearest]] |
| <a id="SRS-034"></a>**SRS-034** | Quaternion als 4× i32 Q2.30, auf [−2, 2) gesättigt. Euler und Heading als i32 × 65536. | CODE | [[thingy_encode_quaternion]], [[thingy_encode_euler]], [[thingy_encode_heading]] | [[test_quaternion_bridge_vector]], [[test_quaternion_saturates]], [[test_euler_bridge_vector]] |
| <a id="SRS-035"></a>**SRS-035** | Raw-HR (16 B): Beschleunigung ×1024, Gyro ×8, 16-Bit-Zählerstand, Flags für Sättigung je Achse (Bit 0–5) und `fusion_ok` (Bit 6, Bias gültig). | CODE | [[thingy_encode_raw_hr]], [[process]] | [[test_raw_hr_layout_and_flags]] |
| <a id="SRS-036"></a>**SRS-036** | Alle Encoder liefern 0 bei Null-Zeiger oder zu kleinem Puffer und schreiben nichts. | CODE | [[thingy_encode_raw_motion]] | [[test_rejects_short_buffer_and_null]] |

## 7. Bedienung und Ausgabe am Gerät

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-040"></a>**SRS-040** | Jeder Wechsel des Tasterzustands wird als `EF680302` (1 B) gemeldet. Der Taster wird nach 5 ms entprellt und alle 20 ms abgefragt, solange er gedrückt ist. | CODE | [[btn_poll]], [[btn_isr]], [[ble_publish_button]] | [[test_button]], [[test_regression_ef680302_one_byte]] |
| <a id="SRS-041"></a>**SRS-041** | Ein Druck ≥ 800 ms löst genau ein Langdruck-Ereignis aus, schon vor dem Loslassen. Folge: Bias-Kalibrierung und 150 ms Vibration. | CODE | [[thingy_button_update]], [[btn_poll]] | [[test_button_short_and_long]] |
| <a id="SRS-042"></a>**SRS-042** | Die LED zeigt die Modi aus SRS-015. „Atmen“ ist ein Dreieck mit 50 Schritten je Richtung. | CODE | [[led_anim]], [[led_mix]] | NOT RUN |
| <a id="SRS-043"></a>**SRS-043** | Der Vibrationsmotor wird so getaktet, dass die effektive Spannung ≤ 3,0 V bleibt. Versorgung = gemessene Akkuspannung, an USB der Worst-Case 5,25 V, bei fehlender oder unplausibler Messung konservativ. | CODE / ADR | [[motor_supply_mv]], [[motor_duty_permille]], [[motor_output]] | [[test_ueff_never_above_3v0_over_range]], [[test_supply_usb_uses_vsys_worst_case]], [[test_duty_zero_supply_uses_conservative_default]] |
| <a id="SRS-044"></a>**SRS-044** | Summer hat Vorrang vor Motor. Der Motor pausiert, solange ein Ton läuft. Die USB-Spitzenlast bleibt ≤ 500 mA. | CODE / ADR | [[load_arbitrate]], [[motor_vbus_peak_ma]], [[loads_apply]] | [[test_arbitration_buzzer_pauses_motor]], [[test_vbus_peak_within_usb_limit]] |

## 8. Energie

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-050"></a>**SRS-050** | Die Akkuspannung wird beim Start und danach alle 60 s gemessen: Teiler freigeben, ≥ 25 ms warten, ADC lesen, Teiler **immer** wieder sperren (auch bei ADC-Fehler). | CODE | [[vbat_measure]], [[battery_read_mv]], [[update_battery]] | [[test_sequence_enable_wait_read_disable]], [[test_adc_error_still_disables]], [[test_settle_constant_at_least_25ms]] |
| <a id="SRS-051"></a>**SRS-051** | Die Ladung in Prozent folgt einer stückweise linearen LiPo-Kurve (ANNAHME) und wird über den Battery-Service gemeldet, bei Änderung. | ANNAHME | [[thingy_battery_percent_from_mv]], [[update_battery]] | [[test_battery_curve]] |
| <a id="SRS-052"></a>**SRS-052** | Unter 3300 mV schaltet das Gerät LED, Bedienplatine und IMU ab und geht in System OFF. | CODE / ANNAHME | [[update_battery]], [[power_off]] | NOT RUN |
| <a id="SRS-053"></a>**SRS-053** | Ohne BLE-Verbindung und nach 60 s Ruhe geht das Gerät in System OFF. Aufwachen durch Taster oder Bewegung (Wake-on-Motion, 100 mg, ANNAHME). | CODE / ANNAHME | [[main]], [[imu_at_rest_for_s]], [[imu_enter_wake_on_motion]], [[icm45686_enter_wom]] | [[test_ireg_write_and_wom]] (nur Treiber) |
| <a id="SRS-054"></a>**SRS-054** | Der IMU-Chip-Select wird so früh wie möglich auf high gesetzt (kein Pull-up auf der Leiterplatte V1). | CODE | [[board_early_init]] | NOT RUN |

## 9. Bedienplatine J5 (Erweiterung r4)

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-060"></a>**SRS-060** | Die Bedienplatine wird erkannt, indem die Stickspannung mit Pull-up und Pull-down gemessen wird. Ohne Platine wird der Pull-up abgeschaltet. | CODE | [[ext_board_present]], [[probe_board]] | [[test_presence]] |
| <a id="SRS-061"></a>**SRS-061** | Die Stick-Mitte wird beim Start aus 8 Ruhe-Samples bestimmt. Nur Werte zwischen 30 und 70 % des Bereichs gelten. Sonst bleibt der Standard 1,65 V. | CODE / ANNAHME | [[stick_axis_cal_center]], [[ext_input_start]] | [[test_center_calibration_shifts_zero]], [[test_center_calibration_rejects_implausible]] |
| <a id="SRS-062"></a>**SRS-062** | Der Stick liefert −100…+100 %, mit 8 % Totzone (ANNAHME) und linearer Nachskalierung. | CODE / ANNAHME | [[stick_axis_scale]] | [[test_scale_default_center_and_ends]], [[test_deadzone]] |
| <a id="SRS-063"></a>**SRS-063** | Abtastintervall 500 ms in Ruhe, 50 ms bei Eingabe und 2 s danach. | CODE / ANNAHME | [[stick_next_poll_ms]] | [[test_poll_on_demand]] |
| <a id="SRS-064"></a>**SRS-064** | Der Touch-Eingang wird 30 ms entprellt. Mehr als 10 Flanken in 1 s sperren ihn 10 s lang (offener oder gestörter Eingang). | CODE / ANNAHME | [[touch_update]] | [[test_touch_debounced_events]], [[test_touch_glitch_no_event]], [[test_touch_floating_input_no_spam]], [[test_touch_recovers_after_lockout]] |
| <a id="SRS-065"></a>**SRS-065** | `EF680380` (8 B): Version 1, Flags, x, y, 16-Bit-Zähler. Senderate ≤ 20/s, bei `motion_freq_hz` > 50 höchstens 10/s. Eine Änderung geht spätestens nach 100 ms raus. Fehlt die Platine, wird genau einmal nach dem Abonnieren gemeldet. | CODE | [[thingy_encode_ui_ext]], [[ui_ext_rate_poll]], [[ui_tx]] | [[test_layout_vector]], [[test_rate_20_per_s]], [[test_rate_10_per_s_game_mode]], [[test_edge_never_lost_and_within_100ms]], [[test_absent_exactly_one_notify_after_subscribe]] |

## 10. Robustheit, Diagnose, Bereitstellung

| ID | Anforderung | Kennz. | Code | Verifikation |
|---|---|---|---|---|
| <a id="SRS-070"></a>**SRS-070** | Initialisierungsfehler (UI, Akku, IMU, J5) werden geloggt. Das Gerät läuft weiter. Nur bei einem BLE-Fehler endet `main` (Gerät bleibt untätig). | CODE | [[main]] | NOT RUN, siehe {HAZ-02}, {GAP-05} |
| <a id="SRS-071"></a>**SRS-071** | Das Log läuft nur über SEGGER RTT (SWD). Es gibt keine serielle Konsole. | ADR | [[firmware/app/prj.conf]], [[firmware/boards/disroop/motion_one/motion_one_defconfig]] | NOT RUN |
| <a id="SRS-072"></a>**SRS-072** | Die Firmware wird als UF2/HEX für den Adafruit-nRF52-Bootloader gebaut (App ab 0x26000). | ADR | [[firmware/boards/disroop/motion_one/motion_one_defconfig]], [[firmware/smoke.sh]] | Build in `smoke.sh` |
| <a id="SRS-073"></a>**SRS-073** | Der Pinout in `electronics/PINOUT_V1.json` und in der Board-Definition muss übereinstimmen. | CODE | [[firmware/scripts/check_pinout.py]], [[firmware/Makefile]] | `make pincheck` |

## 11. Nicht vorhanden (Anforderungen, die ein Audit erwartet)

Folgende Anforderungen **existieren im Code nicht**. Sie stehen hier, damit sie nicht vergessen werden. Details in den [Lücken](08_Luecken.md).

| ID | Fehlt | Bezug |
|---|---|---|
| <a id="SRS-090"></a>**SRS-090** | Watchdog und definierter sicherer Zustand bei Softwarefehlern | {GAP-05}, {HAZ-03} |
| <a id="SRS-091"></a>**SRS-091** | Sichtbare Fehleranzeige (LED/BLE-Status) bei IMU- oder Akkuausfall | {GAP-05}, {HAZ-02} |
| <a id="SRS-092"></a>**SRS-092** | Authentifizierte, verschlüsselte Verbindung und Schutz der Schreibzugriffe | {GAP-13}, {HAZ-04} |
| <a id="SRS-093"></a>**SRS-093** | Auslesbare Firmware-Version und Geräte-ID (UDI) | {GAP-14}, {HAZ-10} |
| <a id="SRS-094"></a>**SRS-094** | Erkennung verlorener Notifications (Rückgabewert von `bt_gatt_notify` wird ignoriert) | {HAZ-09} |
