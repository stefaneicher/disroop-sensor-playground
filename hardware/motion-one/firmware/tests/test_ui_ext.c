/* Host-Tests EF680380 (systems/ADR-0002): Layout 8 B LE, Klemmung, seq, Ratenbegrenzer, Abwesenheit, Regression 0302. */
#include <string.h>
#include "unity.h"
#include "thingy_codec.h"

void setUp(void) {}
void tearDown(void) {}

void test_layout_vector(void)
{
	ui_ext_state_t s = {.flags = UI_EXT_PRESENT | UI_EXT_BTN | UI_EXT_CENTER_OK, .x = -100, .y = 100, .seq = 0xFFFF};
	uint8_t o[8];
	const uint8_t want[8] = {0x01, 0x13, 0x9c, 0x64, 0xff, 0xff, 0x00, 0x00};
	TEST_ASSERT_EQUAL(8, thingy_encode_ui_ext(&s, o, sizeof o));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, o, 8);
}

void test_le_seq_and_reserved(void)
{
	ui_ext_state_t s = {.flags = UI_EXT_PRESENT, .seq = 0x1234};
	uint8_t o[8];
	memset(o, 0xAA, sizeof o);
	thingy_encode_ui_ext(&s, o, 8);
	TEST_ASSERT_EQUAL_HEX8(0x34, o[4]);
	TEST_ASSERT_EQUAL_HEX8(0x12, o[5]);
	TEST_ASSERT_EQUAL_HEX8(0, o[6]);
	TEST_ASSERT_EQUAL_HEX8(0, o[7]);
}

void test_clamp_and_short_buffer(void)
{
	ui_ext_state_t s = {.x = -128, .y = 127};
	uint8_t o[8];
	thingy_encode_ui_ext(&s, o, 8);
	TEST_ASSERT_EQUAL_INT8(-100, (int8_t)o[2]);
	TEST_ASSERT_EQUAL_INT8(100, (int8_t)o[3]);
	TEST_ASSERT_EQUAL(0, thingy_encode_ui_ext(&s, o, 7));
	TEST_ASSERT_EQUAL(0, thingy_encode_ui_ext(NULL, o, 8));
}

void test_seq_wraps(void)
{
	ui_ext_state_t s = {.seq = 0xFFFF};
	ui_ext_next_seq(&s);
	TEST_ASSERT_EQUAL_UINT16(0, s.seq);
}

/* Simulation: Aenderung jede ms, zaehlt Sendungen in 1 s */
static int run_rate(uint16_t motion_hz)
{
	ui_ext_rate_t r;
	ui_ext_rate_init(&r);
	int n = 0;
	for (uint32_t t = 0; t < 1000; t++) {
		ui_ext_rate_mark(&r, true);
		n += ui_ext_rate_poll(&r, motion_hz, t, NULL);
	}
	return n;
}

void test_rate_20_per_s(void) { TEST_ASSERT_EQUAL(20, run_rate(50)); }
void test_rate_10_per_s_game_mode(void) { TEST_ASSERT_EQUAL(10, run_rate(100)); }

void test_no_notify_without_change(void)
{
	ui_ext_rate_t r;
	ui_ext_rate_init(&r);
	int n = 0;
	for (uint32_t t = 0; t < 2000; t++) {
		n += ui_ext_rate_poll(&r, 50, t, NULL);
	}
	TEST_ASSERT_EQUAL(0, n);
}

void test_edge_never_lost_and_within_100ms(void)
{
	ui_ext_rate_t r;
	ui_ext_rate_init(&r);
	ui_ext_rate_mark(&r, true);
	TEST_ASSERT_TRUE(ui_ext_rate_poll(&r, 200, 0, NULL));
	ui_ext_rate_mark(&r, true); /* Flanke 1 ms spaeter, im Sperrintervall */
	uint32_t retry = 0;
	TEST_ASSERT_FALSE(ui_ext_rate_poll(&r, 200, 1, &retry));
	TEST_ASSERT_TRUE(retry > 0 && 1 + retry <= 101);
	TEST_ASSERT_TRUE(ui_ext_rate_poll(&r, 200, 1 + retry, NULL));
}

void test_absent_exactly_one_notify_after_subscribe(void)
{
	ui_ext_rate_t r;
	ui_ext_rate_init(&r);
	ui_ext_rate_mark(&r, true); /* Abo -> Zustand present=0 einmal senden */
	int n = 0;
	for (uint32_t t = 0; t < 5000; t++) {
		n += ui_ext_rate_poll(&r, 50, t, NULL);
	}
	TEST_ASSERT_EQUAL(1, n);
}

void test_regression_ef680302_one_byte(void)
{
	uint8_t o[4] = {0};
	TEST_ASSERT_EQUAL(1, THINGY_BUTTON_LEN);
	TEST_ASSERT_EQUAL(1, thingy_encode_button(true, o, sizeof o));
	TEST_ASSERT_EQUAL_HEX8(1, o[0]);
	TEST_ASSERT_EQUAL_HEX8(0, o[1]);
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_layout_vector);
	RUN_TEST(test_le_seq_and_reserved);
	RUN_TEST(test_clamp_and_short_buffer);
	RUN_TEST(test_seq_wraps);
	RUN_TEST(test_rate_20_per_s);
	RUN_TEST(test_rate_10_per_s_game_mode);
	RUN_TEST(test_no_notify_without_change);
	RUN_TEST(test_edge_never_lost_and_within_100ms);
	RUN_TEST(test_absent_exactly_one_notify_after_subscribe);
	RUN_TEST(test_regression_ef680302_one_byte);
	return UNITY_END();
}
