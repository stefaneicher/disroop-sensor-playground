/* Testvektoren aus bridge/internal/thingy/{decode,encode}_test.go und docs/protocol.md. */
#include <string.h>
#include "unity.h"
#include "thingy_codec.h"

void setUp(void) {}
void tearDown(void) {}

static void test_quaternion_bridge_vector(void)
{
	const float q[4] = {1.0f, -0.5f, 0.0f, 0.25f};
	const uint8_t want[16] = {0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0xE0,
				  0, 0, 0, 0, 0x00, 0x00, 0x00, 0x10};
	uint8_t out[16];
	TEST_ASSERT_EQUAL_UINT(16, thingy_encode_quaternion(q, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, 16);
}

static void test_quaternion_saturates(void)
{
	const float q[4] = {3.0f, -3.0f, 0.0f, 0.0f};
	const uint8_t want[8] = {0xFF, 0xFF, 0xFF, 0x7F, 0x00, 0x00, 0x00, 0x80};
	uint8_t out[16];
	TEST_ASSERT_EQUAL_UINT(16, thingy_encode_quaternion(q, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, 8);
	TEST_ASSERT_EQUAL_UINT(0, thingy_encode_quaternion(q, out, 15));
}

static void test_euler_bridge_vector(void)
{
	const uint8_t want[12] = {0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x80, 0x2F, 0x00};
	uint8_t out[12];
	TEST_ASSERT_EQUAL_UINT(12, thingy_encode_euler(1.0f, -2.0f, 47.5f, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, 12);
}

static void test_heading_bridge_vector_and_normalised(void)
{
	const uint8_t want[4] = {0x00, 0x00, 0x2F, 0x00};
	uint8_t out[4];
	TEST_ASSERT_EQUAL_UINT(4, thingy_encode_heading(47.0f, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, 4);
	TEST_ASSERT_EQUAL_UINT(4, thingy_encode_heading(-313.0f, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, 4);
}

static void test_button(void)
{
	uint8_t out[1];
	TEST_ASSERT_EQUAL_UINT(1, thingy_encode_button(true, out, 1));
	TEST_ASSERT_EQUAL_HEX8(1, out[0]);
	TEST_ASSERT_EQUAL_UINT(1, thingy_encode_button(false, out, 1));
	TEST_ASSERT_EQUAL_HEX8(0, out[0]);
}

static void test_motion_config_bridge_vector(void)
{
	const uint8_t in[9] = {0xE8, 0x03, 0xF4, 0x01, 0x64, 0x00, 0x0A, 0x00, 0x01};
	thingy_motion_config_t c;
	uint8_t out[9];
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_motion_config(in, sizeof in, &c));
	TEST_ASSERT_EQUAL_UINT16(1000, c.step_interval_ms);
	TEST_ASSERT_EQUAL_UINT16(500, c.temp_comp_interval_ms);
	TEST_ASSERT_EQUAL_UINT16(100, c.mag_comp_interval_ms);
	TEST_ASSERT_EQUAL_UINT16(10, c.motion_freq_hz);
	TEST_ASSERT_EQUAL_UINT8(1, c.wake_on_motion);
	TEST_ASSERT_EQUAL_UINT(9, thingy_encode_motion_config(&c, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(in, out, 9);
}

static void test_motion_config_rejects_freq_and_len(void)
{
	thingy_motion_config_t c;
	thingy_motion_config_default(&c);
	uint8_t in[9] = {0xE8, 0x03, 0xF4, 0x01, 0x64, 0x00, 4, 0x00, 0x01};
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_RANGE, thingy_parse_motion_config(in, 9, &c));
	in[6] = 201;
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_RANGE, thingy_parse_motion_config(in, 9, &c));
	in[6] = 200;
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_LEN, thingy_parse_motion_config(in, 8, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_motion_config(in, 9, &c));
	TEST_ASSERT_EQUAL_UINT16(200, c.motion_freq_hz);
	in[6] = 5;
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_motion_config(in, 9, &c));
}

static void test_env_config_read_default_then_echo_written(void)
{
	thingy_env_config_t c;
	const uint8_t def[12] = {0xD0, 0x07, 0xD0, 0x07, 0xD0, 0x07, 0xE8, 0x03, 0x02, 0x11, 0x22, 0x33};
	const uint8_t demo[12] = {0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0x01, 0x11, 0x22, 0x33};
	thingy_env_config_default(&c);
	TEST_ASSERT_EQUAL_HEX8_ARRAY(def, c.raw, 12);
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_env_config(demo, 12, &c));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(demo, c.raw, 12);
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_LEN, thingy_parse_env_config(demo, 11, &c));
}

static void test_sound_config(void)
{
	thingy_sound_config_t c;
	const uint8_t ok[2] = {1, 1};
	const uint8_t bad[2] = {4, 1};
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_sound_config(ok, 2, &c));
	TEST_ASSERT_EQUAL_UINT8(1, c.speaker_mode);
	TEST_ASSERT_EQUAL_UINT8(1, c.mic_mode);
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_RANGE, thingy_parse_sound_config(bad, 2, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_LEN, thingy_parse_sound_config(ok, 1, &c));
}

static void test_speaker_tone_bridge_vector_and_volume_clamp(void)
{
	const uint8_t in[5] = {0xB8, 0x01, 0xB4, 0x00, 0x64};
	const uint8_t loud[5] = {0xB8, 0x01, 0xB4, 0x00, 0xC8};
	thingy_speaker_tone_t t;
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_speaker_tone(in, 5, &t));
	TEST_ASSERT_EQUAL_UINT16(440, t.freq_hz);
	TEST_ASSERT_EQUAL_UINT16(180, t.duration_ms);
	TEST_ASSERT_EQUAL_UINT8(100, t.volume_pct);
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_speaker_tone(loud, 5, &t));
	TEST_ASSERT_EQUAL_UINT8(100, t.volume_pct);
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_LEN, thingy_parse_speaker_tone(in, 4, &t));
}

static void test_led_modes(void)
{
	thingy_led_cmd_t c;
	const uint8_t off[1] = {0};
	const uint8_t constant[4] = {0x01, 0xFF, 0x10, 0x00};
	const uint8_t breathe[5] = {0x02, 0x03, 50, 0xE8, 0x03};
	const uint8_t oneshot[3] = {0x03, 0x04, 100};
	uint8_t out[5];
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_led(off, 1, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_LED_OFF, c.mode);
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_led(constant, 4, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_LED_CONSTANT, c.mode);
	TEST_ASSERT_EQUAL_UINT8(255, c.r);
	TEST_ASSERT_EQUAL_UINT8(16, c.g);
	TEST_ASSERT_EQUAL_UINT8(0, c.b);
	TEST_ASSERT_EQUAL_UINT(4, thingy_encode_led(&c, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(constant, out, 4);
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_led(breathe, 5, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_LED_BREATHE, c.mode);
	TEST_ASSERT_EQUAL_UINT8(3, c.color_mix);
	TEST_ASSERT_EQUAL_UINT8(50, c.intensity_pct);
	TEST_ASSERT_EQUAL_UINT16(1000, c.delay_ms);
	TEST_ASSERT_EQUAL_UINT(5, thingy_encode_led(&c, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(breathe, out, 5);
	TEST_ASSERT_EQUAL_INT(THINGY_OK, thingy_parse_led(oneshot, 3, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_LED_ONE_SHOT, c.mode);
	TEST_ASSERT_EQUAL_UINT8(4, c.color_mix);
}

static void test_led_rejects_bad_input(void)
{
	thingy_led_cmd_t c;
	const uint8_t bad_mode[1] = {7};
	const uint8_t short_const[3] = {1, 2, 3};
	const uint8_t bad_mix[3] = {3, 0, 50};
	const uint8_t bad_int[3] = {3, 1, 101};
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_RANGE, thingy_parse_led(bad_mode, 1, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_LEN, thingy_parse_led(short_const, 3, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_RANGE, thingy_parse_led(bad_mix, 3, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_RANGE, thingy_parse_led(bad_int, 3, &c));
	TEST_ASSERT_EQUAL_INT(THINGY_ERR_LEN, thingy_parse_led(bad_mode, 0, &c));
}

static void test_battery_curve(void)
{
	TEST_ASSERT_EQUAL_UINT8(100, thingy_battery_percent_from_mv(4250));
	TEST_ASSERT_EQUAL_UINT8(100, thingy_battery_percent_from_mv(4200));
	TEST_ASSERT_EQUAL_UINT8(0, thingy_battery_percent_from_mv(3300));
	TEST_ASSERT_EQUAL_UINT8(0, thingy_battery_percent_from_mv(3000));
	const uint8_t mid = thingy_battery_percent_from_mv(3800);
	TEST_ASSERT_TRUE(mid > 30 && mid < 80);
	TEST_ASSERT_TRUE(thingy_battery_percent_from_mv(3900) > mid);
}

static void test_raw_hr_layout_and_flags(void)
{
	const thingy_raw_hr_t in = {{1.0f, -0.5f, 40.0f}, {100.0f, -4500.0f, 0.125f}, 0x1234, THINGY_HR_FLAG_FUSION_OK};
	const uint8_t want[16] = {0x00, 0x04, 0x00, 0xFE, 0xFF, 0x7F,
				  0x20, 0x03, 0x00, 0x80, 0x01, 0x00,
				  0x34, 0x12, 0x54, 0x00};
	uint8_t out[16];
	TEST_ASSERT_EQUAL_UINT(16, thingy_encode_raw_hr(&in, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, 16);
	TEST_ASSERT_EQUAL_UINT(0, thingy_encode_raw_hr(&in, out, 15));
}

static void test_button_short_and_long(void)
{
	thingy_button_t b;
	thingy_button_init(&b);
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_NONE, thingy_button_update(&b, true, 1000));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_SHORT, thingy_button_update(&b, false, 1200));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_NONE, thingy_button_update(&b, true, 2000));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_NONE, thingy_button_update(&b, true, 2799));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_LONG, thingy_button_update(&b, true, 2800));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_NONE, thingy_button_update(&b, true, 3500));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_NONE, thingy_button_update(&b, false, 3600));
	/* Ueberlauf von uint32 ms */
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_NONE, thingy_button_update(&b, true, 0xFFFFFF00u));
	TEST_ASSERT_EQUAL_INT(THINGY_BTN_EVT_LONG, thingy_button_update(&b, true, 0x00000300u));
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_quaternion_bridge_vector);
	RUN_TEST(test_quaternion_saturates);
	RUN_TEST(test_euler_bridge_vector);
	RUN_TEST(test_heading_bridge_vector_and_normalised);
	RUN_TEST(test_button);
	RUN_TEST(test_motion_config_bridge_vector);
	RUN_TEST(test_motion_config_rejects_freq_and_len);
	RUN_TEST(test_env_config_read_default_then_echo_written);
	RUN_TEST(test_sound_config);
	RUN_TEST(test_speaker_tone_bridge_vector_and_volume_clamp);
	RUN_TEST(test_led_modes);
	RUN_TEST(test_led_rejects_bad_input);
	RUN_TEST(test_battery_curve);
	RUN_TEST(test_raw_hr_layout_and_flags);
	RUN_TEST(test_button_short_and_long);
	return UNITY_END();
}
