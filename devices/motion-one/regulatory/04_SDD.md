# SDD: Detailentwurf je Software-Einheit

Für Klasse C verlangt IEC 62304 den Detailentwurf **jeder Einheit** (Abschnitt 5.4) mit Schnittstellen, Verhalten, Grenzwerten und
Fehlerverhalten. Hier rückwärts aus dem Code. Die Abkürzung „SCD“ aus dem Auftrag habe ich als *Software Component Design* (Detailentwurf) gelesen.
Falls ein anderes Dokument gemeint war (z. B. *Software Configuration Document*), bitte melden.

Spalte „Test“: `Host` = hardwarefreier Unit-Test vorhanden · `keiner` = nur auf Hardware prüfbar.

| ID | Einheit | Baustein | Test |
|---|---|---|---|
| <a id="UNIT-01"></a>UNIT-01 | Encoder (Raw, Quaternion, Euler, Heading, Button, Raw-HR) | {SAD-01} | Host |
| <a id="UNIT-02"></a>UNIT-02 | Parser (Motion-, Env-, Sound-Config, Ton, LED) und LED-Encoder | {SAD-01} | Host |
| <a id="UNIT-03"></a>UNIT-03 | Taster-Zustandsmaschine | {SAD-01} | Host |
| <a id="UNIT-04"></a>UNIT-04 | Ratenbegrenzer und Encoder `EF680380` | {SAD-01} | Host |
| <a id="UNIT-05"></a>UNIT-05 | Akkuprozent aus Spannung | {SAD-01} | Host |
| <a id="UNIT-06"></a>UNIT-06 | Madgwick-Filter, Euler, Heading | {SAD-02} | Host |
| <a id="UNIT-07"></a>UNIT-07 | Gyro-Bias-Kalibrierung | {SAD-02} | Host |
| <a id="UNIT-08"></a>UNIT-08 | ICM-45686-Treiber | {SAD-03} | Host (Fake-Bus) |
| <a id="UNIT-09"></a>UNIT-09 | VBAT-Messung | {SAD-04} | Host |
| <a id="UNIT-10"></a>UNIT-10 | Motor-Tastgrad und Arbitrierung | {SAD-04} | Host |
| <a id="UNIT-11"></a>UNIT-11 | Stick und Touch | {SAD-05} | Host |
| <a id="UNIT-12"></a>UNIT-12 | GATT, Advertising, Notifications | {SAD-06} | keiner |
| <a id="UNIT-13"></a>UNIT-13 | IMU-Thread | {SAD-07} | keiner |
| <a id="UNIT-14"></a>UNIT-14 | UI (LED, Summer, Motor, Taster) | {SAD-08} | keiner |
| <a id="UNIT-15"></a>UNIT-15 | J5-Adapter | {SAD-09} | keiner |
| <a id="UNIT-16"></a>UNIT-16 | Akku-Adapter | {SAD-10} | keiner |
| <a id="UNIT-17"></a>UNIT-17 | Main, Energieverwaltung | {SAD-11} | keiner |
| <a id="UNIT-18"></a>UNIT-18 | Frühe Pin-Initialisierung | {SAD-12} | keiner |

## UNIT-01 Encoder

- **Code:** [[thingy_encode_raw_motion]], [[thingy_encode_quaternion]], [[thingy_encode_euler]], [[thingy_encode_heading]], [[thingy_encode_button]], [[thingy_encode_raw_hr]]
- **Eingang/Ausgang:** physikalische Werte in `float` → little-endian Bytes. Rückgabe = Anzahl geschriebener Bytes oder 0.
- **Verhalten:** Skalieren, auf nächsten ganzzahligen Wert runden, an den Grenzen des Zieltyps sättigen. Quaternion auf [−2, 2). Heading auf [0, 360) normalisieren. Raw-HR setzt ein Flag, wenn der Wert beim Kodieren geklemmt wird.
- **Fehler:** Null-Zeiger oder Puffer zu klein → 0, Puffer unverändert ({SRS-036}).
- **Anforderungen:** {SRS-033}, {SRS-034}, {SRS-035}, {SRS-036}
- **Tests:** [[test_bridge_vector_encodes_to_same_bytes]], [[test_saturates_at_i16_limits]], [[test_rounds_to_nearest]], [[test_quaternion_saturates]], [[test_raw_hr_layout_and_flags]]

## UNIT-02 Parser

- **Code:** [[thingy_parse_motion_config]], [[thingy_parse_env_config]], [[thingy_parse_sound_config]], [[thingy_parse_speaker_tone]], [[thingy_parse_led]], [[thingy_encode_led]]
- **Eingang:** Rohbytes vom Client. **Ausgang:** `thingy_status_t` (`OK`, `ERR_LEN`, `ERR_RANGE`, `ERR_ARG`).
- **Verhalten:** Länge prüfen, dann Bereiche (Motion 5…200 Hz; Sound 1…3/1…2; LED-Mix 1…7, Intensität 1…100, Verzögerung 50…10000 ms). Lautstärke wird geklemmt statt abgelehnt. Bei Fehler bleibt der Ausgang unverändert.
- **Abbildung auf ATT:** Länge → „Invalid Attribute Value Length“, sonst „Value not allowed“ ([[att_status]]).
- **Anforderungen:** {SRS-010}, {SRS-012}, {SRS-013}, {SRS-014}, {SRS-015}
- **Tests:** [[test_motion_config_rejects_freq_and_len]], [[test_sound_config]], [[test_led_rejects_bad_input]], [[test_speaker_tone_bridge_vector_and_volume_clamp]]

## UNIT-03 Taster-Zustandsmaschine

- **Code:** [[thingy_button_init]], [[thingy_button_update]]
- **Zustand:** gedrückt, Langdruck gemeldet, Zeitpunkt des Drückens (ms, `uint32_t`).
- **Verhalten:** Beim Drücken Zeit merken. Erreicht die Haltezeit 800 ms, genau einmal `LONG`. Beim Loslassen vor 800 ms `SHORT`, nach gemeldetem Langdruck nichts mehr.
- **Grenzfall:** Die Zeit ist 32-Bit-Millisekunden und läuft nach rund 49,7 Tagen über. Differenzbildung ohne Vorzeichen ist umlaufsicher, ein Test dafür fehlt ({GAP-10}).
- **Anforderung:** {SRS-041}. **Tests:** [[test_button_short_and_long]]

## UNIT-04 Ratenbegrenzer `EF680380`

- **Code:** [[thingy_encode_ui_ext]], [[ui_ext_next_seq]], [[ui_ext_rate_init]], [[ui_ext_rate_mark]], [[ui_ext_rate_poll]]
- **Verhalten:** Layout 8 B (Version, Flags, x, y, Zähler, 0). x,y auf −100…100 geklemmt. ≤ 20/s, bei Spielmodus (> 50 Hz) ≤ 10/s. Eine ausstehende Änderung wird nach höchstens 100 ms gesendet, keine Flanke geht verloren.
- **Anforderung:** {SRS-065}. **Tests:** [[test_layout_vector]], [[test_seq_wraps]], [[test_no_notify_without_change]], [[test_clamp_and_short_buffer]]

## UNIT-05 Akkuprozent

- **Code:** [[thingy_battery_percent_from_mv]]. Stückweise lineare Kurve, Stützpunkte sind ANNAHME (keine Messung am Akku).
- **Anforderung:** {SRS-051}. **Test:** [[test_battery_curve]]

## UNIT-06 Madgwick-Filter

- **Code:** [[madgwick_init]], [[madgwick_update]], [[quat_to_euler_deg]], [[heading_from_yaw_deg]]
- **Zustand:** Einheitsquaternion, β = 0,1 (ANNAHME).
- **Verhalten:** Gyro (°/s → rad/s) integrieren, Gradientenkorrektur mit normalisierter Beschleunigung, Quaternion normalisieren. Ist die Beschleunigung null, wird nur der Gyro integriert. Die abschliessende Normalisierung hat keinen Schutz gegen die Norm 0 ({GAP-11}).
- **Anforderungen:** {SRS-024}, {SRS-027}. **Tests:** [[test_static_tilt_converges]], [[test_rotation_about_z_integrates]]
- **Gleitkomma:** `float` (FPU des nRF52840). Reproduzierbarkeit zwischen Compilern: siehe IDEEN.md, Compiler-Matrix.

## UNIT-07 Gyro-Bias-Kalibrierung

- **Code:** [[bias_cal_init]], [[bias_cal_request]], [[bias_cal_feed]], [[bias_cal_is_at_rest]], [[bias_cal_apply]]
- **Verhalten:** Summiert Gyro-Samples, solange Ruhe herrscht (|ω| < 3 °/s, ||a|−1 g| < 0,05 g). Nach `window` (400) Samples gilt der Mittelwert als Bias. Bewegung setzt das Fenster zurück. `requested` ignoriert das Beschleunigungskriterium.
- **Anforderungen:** {SRS-025}, {SRS-026}.
- **Tests:** [[test_rest_detection_estimates_and_removes_bias]], [[test_motion_resets_window]], [[test_button_request_ignores_accel_criterion]], [[test_bias_corrected_static_has_no_yaw_drift]]
- **Risiko:** Die Ruheschwelle von 3 °/s ist gross: Dreht das Gerät ein Sekunde lang gleichmässig mit knapp 3 °/s, wird dieser Wert als Bias übernommen und `fusion_ok` gesetzt. Das ergäbe rechnerisch bis zu 180° Yaw-Drift pro Minute (BERECHNUNG 3 °/s × 60 s). Beim erzwungenen Ablauf (Taster) entfällt zusätzlich das Beschleunigungskriterium. Siehe {HAZ-01}.

## UNIT-08 ICM-45686-Treiber

- **Code:** [[icm45686_init]], [[icm45686_fifo_count]], [[icm45686_parse_frame]], [[icm45686_enter_wom]], [[icm45686_exit_wom]], [[icm45686_ireg_write]]
- **Port:** `icm_bus_t` mit `write`, `read`, `delay_us`. Auf dem Gerät SPI ([[bus_write]], [[bus_read]]), im Test ein Fake.
- **Init-Ablauf:** Soft-Reset, `WHO_AM_I` prüfen (0xE9), ODR 400 Hz, ±32 g / ±4000 °/s, FIFO-Stream mit Watermark, INT1 auf FIFO-Schwelle, Low-Noise-Modus.
- **Fehler:** `ICM_ERR_BUS`, `ICM_ERR_WHOAMI`. Der Aufrufer ([[imu_task_start]]) loggt und gibt `-EIO` zurück.
- **Offen:** Registerwerte stammen aus den TDK-Referenzquellen, **nicht** aus dem Datenblatt ({GAP-12}).
- **Anforderungen:** {SRS-020}, {SRS-021}, {SRS-022}, {SRS-023}, {SRS-053}.
- **Tests:** [[test_init_sequence]], [[test_init_wrong_whoami_and_bus_error]], [[test_fifo_count]], [[test_parse_frame_rejects_invalid]]

## UNIT-09 VBAT-Messung

- **Code:** [[vbat_scale_mv]], [[vbat_measure]]
- **Ablauf:** Teiler an → ≥ 25 ms warten → ADC → Teiler **immer** aus → skalieren (num/den, auf 0…65535 begrenzt). Bei ADC-Fehler ist der Ausgabewert 0.
- **Anforderung:** {SRS-050}. **Tests:** siehe SRS-050.

## UNIT-10 Motor und Arbitrierung

- **Code:** [[motor_supply_mv]], [[motor_duty_permille]], [[load_arbitrate]], [[motor_vbus_peak_ma]]
- **Verhalten:** Tastgrad = 3000 mV / Versorgung (abgerundet, höchstens 1000 ‰). Versorgung 0 → USB-Worst-Case. Summer vor Motor.
- **Anforderungen:** {SRS-043}, {SRS-044}. **Tests:** [[test_duty_is_target_over_supply]], [[test_arbitration_none]], [[test_supply_no_or_implausible_measurement_uses_vbat_max]]

## UNIT-11 Stick und Touch

- **Code:** [[ext_board_present]], [[stick_axis_cal_init]], [[stick_axis_cal_center]], [[stick_axis_scale]], [[ext_btn_pressed]], [[stick_next_poll_ms]], [[touch_init]], [[touch_update]]
- **Anforderungen:** {SRS-060}…{SRS-064}. **Tests:** siehe SRS-060 bis 064.

## UNIT-12 GATT, Advertising, Notifications

- **Code:** [[ble_thingy_init]], [[ble_publish_motion]], [[ble_publish_button]], [[ble_publish_ui_ext]], [[ble_motion_wanted]], [[ble_get_motion_config]], [[subscribed]]
- **Verhalten:** Lese-/Schreib-Handler rufen die Parser aus UNIT-02. Notifications nur, wenn der Client abonniert hat. Rückgabewerte von `bt_gatt_notify` werden verworfen ({HAZ-09}).
- **Nebenläufigkeit:** `motion_cfg` ist durch `cfg_lock` geschützt, `led_cmd`, `env_cfg` und `sound_cfg` nicht ({GAP-09}).
- **Anforderungen:** {SRS-001}…{SRS-005}, {SRS-010}…{SRS-016}, {SRS-030}…{SRS-032}. **Tests:** keine.

## UNIT-13 IMU-Thread

- **Code:** [[imu_task_start]], [[imu_thread]], [[process]], [[imu_enter_wake_on_motion]], [[imu_at_rest_for_s]], [[imu_request_calibration]]
- **Ablauf je Schleife:** auf INT1 oder 100 ms warten → Konfiguration holen → Dezimierung = 400 / `motion_freq_hz` → FIFO-Anzahl lesen → höchstens 16 Frames lesen → je Frame parsen und [[process]] aufrufen.
- **Fehlerverhalten:** Lesefehler → Schleife fährt fort (`continue`), **kein Zähler, keine Meldung** ({HAZ-02}). Mehr als 16 Frames im FIFO → Rest bleibt für die nächste Runde, ein Überlauf wird nicht erkannt.
- **Anforderungen:** {SRS-020}, {SRS-024}…{SRS-026}, {SRS-031}, {SRS-053}. **Tests:** keine.

## UNIT-14 UI

- **Code:** [[ui_init]], [[ui_led_apply]], [[ui_speaker_tone]], [[ui_vibrate_ms]], [[ui_arm_button_wakeup]], [[btn_poll]]
- **Nebenläufigkeit:** `load_lock` schützt die Last-Zustände (Summer/Motor). Der Taster läuft über verzögerte Arbeit der System-Workqueue.
- **Anforderungen:** {SRS-014}, {SRS-015}, {SRS-040}…{SRS-044}. **Tests:** keine.

## UNIT-15 J5-Adapter

- **Code:** [[ext_input_start]], [[ext_input_suspend]], [[ext_publish_stick]], [[ext_publish_touch]], [[ext_ui_subscribed]], [[stick_poll]], [[touch_eval]]
- **Anforderungen:** {SRS-060}…{SRS-065}. **Tests:** keine (Logik in UNIT-11 und UNIT-04).

## UNIT-16 Akku-Adapter

- **Code:** [[battery_init]], [[battery_read_mv]], [[battery_last_mv]]. Hält die letzte Messung atomar für die Motor-Versorgung.
- **Anforderung:** {SRS-050}. **Tests:** keine.

## UNIT-17 Main

- **Code:** [[main]], [[update_battery]], [[power_off]]
- **Ablauf:** Init UI/Akku → Akku messen → BLE-Init (Fehler: `main` endet) → IMU-Start → J5-Start → Endlosschleife 1 s: alle 60 s Akku, bei Ruhe ohne Verbindung System OFF.
- **Fehlerverhalten:** Fehler aus `ui_init`, `battery_init`, `imu_task_start`, `ext_input_start` werden nur geloggt ({SRS-070}).
- **Anforderungen:** {SRS-050}…{SRS-053}, {SRS-070}. **Tests:** keine.

## UNIT-18 Frühe Pin-Initialisierung

- **Code:** [[board_early_init]]. Setzt den IMU-CS vor dem Treiberstart auf high. **Anforderung:** {SRS-054}. **Tests:** keine.
