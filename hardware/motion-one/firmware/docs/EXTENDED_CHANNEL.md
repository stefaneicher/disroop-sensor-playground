# Erweiterter Kanal Raw-HR `EF680480` (REQ-025)

Service Motion `EF680400`, Characteristic `EF680480-9B35-4933-9B10-52FFA9740042`, nur Notify.
Wird nur gesendet, wenn der Client die CCC abonniert hat. Die Rate entspricht `motion_freq_hz` aus `EF680401` (5..200 Hz).
Alle abonnierten Motion-Notifications zusammen werden auf ≤ 200/s dezimiert (BUDGETS, `ble_publish_motion`).

| Byte | Typ | Inhalt | Skalierung |
|---|---|---|---|
| 0–5 | 3× i16 LE | accel x, y, z | /1024 → g (±32 g) |
| 6–11 | 3× i16 LE | gyro x, y, z (Bias korrigiert) | /8 → dps (±4096 dps) |
| 12–13 | u16 LE | sample_counter (IMU-Samples bei 400 Hz, läuft über) | – |
| 14–15 | u16 LE | flags | siehe unten |

Flags: Bit 0..2 accel gesättigt x/y/z, Bit 3..5 gyro gesättigt x/y/z, Bit 6 fusion_ok (Gyro-Bias gültig). Die übrigen Bits sind 0.
Ein Sättigungs-Flag wird gesetzt, wenn der Sensor ±32767 liefert oder der Wert bei der Kodierung geklemmt wird.

Länge 16 B ≤ 20 B, passt also ohne MTU-Erhöhung (BUDGETS).
Status: ANNAHME (Format von firmware-engineer festgelegt, mit INTERFACES.json abgleichen).
Kodierer: `thingy_encode_raw_hr()` in `codec/src/thingy_codec.c`, Test `test_raw_hr_layout_and_flags`.
