# Rückverfolgbarkeitsmatrix

Anforderung → Architekturbaustein → Detailentwurf-Einheit → Test. Erzeugt aus dem [SRS](02_SRS.md) (Tests) und einer festen Zuordnung
zu den Bausteinen. Die Spalte „Status“ sagt nur, ob ein Test **existiert**. Ausgeführt habe ich keinen.

Zusammenfassung: 52 Anforderungen, davon **31** mit mindestens einem Host-Test, **16** nur auf Hardware prüfbar (`NOT RUN`),
**5** im Code nicht umgesetzt (SRS-09x).

| Anforderung | Architektur | Einheit | Tests | Status |
|---|---|---|---|---|
| {SRS-001} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-002} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-003} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-004} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-005} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-010} | {SAD-01}, {SAD-06} | {UNIT-02}, {UNIT-12} | [[test_motion_config_rejects_freq_and_len]], [[test_motion_config_bridge_vector]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-011} | {SAD-01}, {SAD-06} | {UNIT-02}, {UNIT-12} | [[test_motion_config_bridge_vector]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-012} | {SAD-01}, {SAD-06} | {UNIT-02}, {UNIT-12} | [[test_env_config_read_default_then_echo_written]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-013} | {SAD-01}, {SAD-06} | {UNIT-02}, {UNIT-12} | [[test_sound_config]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-014} | {SAD-01}, {SAD-06}, {SAD-08} | {UNIT-02}, {UNIT-12}, {UNIT-14} | [[test_speaker_tone_bridge_vector_and_volume_clamp]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-015} | {SAD-01}, {SAD-06}, {SAD-08} | {UNIT-02}, {UNIT-12}, {UNIT-14} | [[test_led_modes]], [[test_led_rejects_bad_input]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-016} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-020} | {SAD-03}, {SAD-07} | {UNIT-08}, {UNIT-13} | [[test_init_sequence]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-021} | {SAD-03} | {UNIT-08} | [[test_init_wrong_whoami_and_bus_error]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-022} | {SAD-03} | {UNIT-08} | [[test_parse_frame_scales_and_timestamp]], [[test_parse_frame_rejects_invalid]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-023} | {SAD-03} | {UNIT-08} | [[test_parse_frame_flags_saturation]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-024} | {SAD-02}, {SAD-07} | {UNIT-06}, {UNIT-13} | [[test_static_tilt_converges]], [[test_rotation_about_z_integrates]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-025} | {SAD-02} | {UNIT-07} | [[test_rest_detection_estimates_and_removes_bias]], [[test_motion_resets_window]], [[test_bias_corrected_static_has_no_yaw_drift]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-026} | {SAD-02}, {SAD-08} | {UNIT-07}, {UNIT-14} | [[test_button_request_ignores_accel_criterion]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-027} | {SAD-02} | {UNIT-06} | [[test_heading_bridge_vector_and_normalised]], [[test_euler_bridge_vector]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-030} | {SAD-06}, {SAD-07} | {UNIT-12}, {UNIT-13} | – | NOT RUN |
| {SRS-031} | {SAD-07} | {UNIT-13} | – | NOT RUN |
| {SRS-032} | {SAD-06} | {UNIT-12} | – | NOT RUN |
| {SRS-033} | {SAD-01} | {UNIT-01} | [[test_bridge_vector_encodes_to_same_bytes]], [[test_saturates_at_i16_limits]], [[test_rounds_to_nearest]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-034} | {SAD-01} | {UNIT-01} | [[test_quaternion_bridge_vector]], [[test_quaternion_saturates]], [[test_euler_bridge_vector]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-035} | {SAD-01} | {UNIT-01} | [[test_raw_hr_layout_and_flags]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-036} | {SAD-01} | {UNIT-01} | [[test_rejects_short_buffer_and_null]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-040} | {SAD-08}, {SAD-06} | {UNIT-14}, {UNIT-12} | [[test_button]], [[test_regression_ef680302_one_byte]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-041} | {SAD-01}, {SAD-08} | {UNIT-03}, {UNIT-14} | [[test_button_short_and_long]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-042} | {SAD-08} | {UNIT-14} | – | NOT RUN |
| {SRS-043} | {SAD-04}, {SAD-08} | {UNIT-10}, {UNIT-14} | [[test_ueff_never_above_3v0_over_range]], [[test_supply_usb_uses_vsys_worst_case]], [[test_duty_zero_supply_uses_conservative_default]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-044} | {SAD-04}, {SAD-08} | {UNIT-10}, {UNIT-14} | [[test_arbitration_buzzer_pauses_motor]], [[test_vbus_peak_within_usb_limit]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-050} | {SAD-04}, {SAD-10}, {SAD-11} | {UNIT-09}, {UNIT-16}, {UNIT-17} | [[test_sequence_enable_wait_read_disable]], [[test_adc_error_still_disables]], [[test_settle_constant_at_least_25ms]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-051} | {SAD-01}, {SAD-11} | {UNIT-05}, {UNIT-17} | [[test_battery_curve]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-052} | {SAD-11} | {UNIT-17} | – | NOT RUN |
| {SRS-053} | {SAD-11}, {SAD-07}, {SAD-03} | {UNIT-17}, {UNIT-13}, {UNIT-08} | [[test_ireg_write_and_wom]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-054} | {SAD-12} | {UNIT-18} | – | NOT RUN |
| {SRS-060} | {SAD-05}, {SAD-09} | {UNIT-11}, {UNIT-15} | [[test_presence]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-061} | {SAD-05}, {SAD-09} | {UNIT-11}, {UNIT-15} | [[test_center_calibration_shifts_zero]], [[test_center_calibration_rejects_implausible]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-062} | {SAD-05} | {UNIT-11} | [[test_scale_default_center_and_ends]], [[test_deadzone]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-063} | {SAD-05} | {UNIT-11} | [[test_poll_on_demand]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-064} | {SAD-05}, {SAD-09} | {UNIT-11}, {UNIT-15} | [[test_touch_debounced_events]], [[test_touch_glitch_no_event]], [[test_touch_floating_input_no_spam]], [[test_touch_recovers_after_lockout]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-065} | {SAD-01}, {SAD-09} | {UNIT-04}, {UNIT-15} | [[test_layout_vector]], [[test_rate_20_per_s]], [[test_rate_10_per_s_game_mode]], [[test_edge_never_lost_and_within_100ms]], [[test_absent_exactly_one_notify_after_subscribe]] | Host-Test vorhanden, nicht ausgeführt |
| {SRS-070} | {SAD-11} | {UNIT-17} | – | NOT RUN |
| {SRS-071} | {SAD-13} | – | – | NOT RUN |
| {SRS-072} | {SAD-13}, {SAD-14} | – | – | NOT RUN |
| {SRS-073} | {SAD-13} | – | – | NOT RUN |
| {SRS-090} | – | – | – | nicht umgesetzt |
| {SRS-091} | – | – | – | nicht umgesetzt |
| {SRS-092} | – | – | – | nicht umgesetzt |
| {SRS-093} | – | – | – | nicht umgesetzt |
| {SRS-094} | – | – | – | nicht umgesetzt |

## Umgekehrt: Tests ohne Anforderung

Die Prüfung `build_site.py --check` erkennt nur fehlende SRS-Einträge in dieser Matrix. Tests, die auf keine Anforderung zeigen, sind nicht automatisch
erkannt. Bei den 69 `RUN_TEST` in `firmware/tests/` habe ich das nicht vollständig abgeglichen ({GAP-20}).
