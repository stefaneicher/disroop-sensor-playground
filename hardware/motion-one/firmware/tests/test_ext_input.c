/* Host-Tests r4 Erweiterung: Totzone, Kalibrierung Mitte, Skalierung, Praesenz, Touch-Entprellung/Spamschutz. */
#include "unity.h"
#include "ext_input.h"

static stick_axis_cal_t c;
void setUp(void) { stick_axis_cal_init(&c); }
void tearDown(void) {}

void test_scale_default_center_and_ends(void)
{
	TEST_ASSERT_EQUAL_INT8(0, stick_axis_scale(&c, 1650, 0));
	TEST_ASSERT_EQUAL_INT8(100, stick_axis_scale(&c, 3300, 0));
	TEST_ASSERT_EQUAL_INT8(-100, stick_axis_scale(&c, 0, 0));
	TEST_ASSERT_EQUAL_INT8(50, stick_axis_scale(&c, 2475, 0));
	TEST_ASSERT_EQUAL_INT8(100, stick_axis_scale(&c, 3600, 0)); /* geklemmt */
}

void test_deadzone(void)
{
	TEST_ASSERT_EQUAL_INT8(0, stick_axis_scale(&c, 1650 + 120, 8)); /* 7 % */
	TEST_ASSERT_EQUAL_INT8(0, stick_axis_scale(&c, 1650 - 120, 8));
	TEST_ASSERT_TRUE(stick_axis_scale(&c, 1650 + 200, 8) > 0);   /* 12 % */
	TEST_ASSERT_EQUAL_INT8(100, stick_axis_scale(&c, 3300, 8));  /* Endwert bleibt 100 */
	TEST_ASSERT_EQUAL_INT8(-100, stick_axis_scale(&c, 0, 8));
}

void test_center_calibration_shifts_zero(void)
{
	const uint16_t s[4] = {1790, 1810, 1800, 1800};
	TEST_ASSERT_TRUE(stick_axis_cal_center(&c, s, 4));
	TEST_ASSERT_EQUAL_UINT16(1800, c.center_mv);
	TEST_ASSERT_EQUAL_INT8(0, stick_axis_scale(&c, 1800, 0));
	TEST_ASSERT_EQUAL_INT8(100, stick_axis_scale(&c, 3300, 0));
	TEST_ASSERT_EQUAL_INT8(-100, stick_axis_scale(&c, 0, 0));
	TEST_ASSERT_EQUAL_INT8(-50, stick_axis_scale(&c, 900, 0)); /* asymmetrisch skaliert */
}

void test_center_calibration_rejects_implausible(void)
{
	const uint16_t s[2] = {3200, 3300}; /* ausgelenkt oder offen */
	TEST_ASSERT_FALSE(stick_axis_cal_center(&c, s, 2));
	TEST_ASSERT_EQUAL_UINT16(1650, c.center_mv);
	TEST_ASSERT_FALSE(stick_axis_cal_center(&c, s, 0));
}

void test_presence(void)
{
	TEST_ASSERT_TRUE(ext_board_present(1920, 1380));  /* Stick Mitte, BERECHNUNG */
	TEST_ASSERT_FALSE(ext_board_present(3300, 0));    /* offen */
	TEST_ASSERT_FALSE(ext_board_present(3000, 200));
}

void test_button_threshold(void)
{
	TEST_ASSERT_TRUE(ext_btn_pressed(50));
	TEST_ASSERT_FALSE(ext_btn_pressed(3300)); /* Pull-up, offen -> nicht gedrueckt */
}

void test_poll_on_demand(void)
{
	stick_poll_t p = {0};
	TEST_ASSERT_EQUAL_UINT32(EXT_POLL_IDLE_MS, stick_next_poll_ms(&p, 0, 0, false, 1000));
	TEST_ASSERT_EQUAL_UINT32(EXT_POLL_ACTIVE_MS, stick_next_poll_ms(&p, 40, 0, false, 2000));
	TEST_ASSERT_EQUAL_UINT32(EXT_POLL_ACTIVE_MS, stick_next_poll_ms(&p, 0, 0, false, 3500));
	TEST_ASSERT_EQUAL_UINT32(EXT_POLL_IDLE_MS, stick_next_poll_ms(&p, 0, 0, false, 4001));
	TEST_ASSERT_EQUAL_UINT32(EXT_POLL_ACTIVE_MS, stick_next_poll_ms(&p, 0, 0, true, 5000));
}

void test_touch_debounced_events(void)
{
	touch_t t;
	touch_init(&t);
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, true, 100));
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, true, 110)); /* < 30 ms */
	TEST_ASSERT_EQUAL(TOUCH_EVT_DOWN, touch_update(&t, true, 130));
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, true, 200));
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, false, 500));
	TEST_ASSERT_EQUAL(TOUCH_EVT_UP, touch_update(&t, false, 530));
}

void test_touch_glitch_no_event(void)
{
	touch_t t;
	touch_init(&t);
	touch_update(&t, true, 100);
	touch_update(&t, false, 105);
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, false, 200));
}

void test_touch_floating_input_no_spam(void)
{
	touch_t t;
	touch_init(&t);
	int events = 0;
	for (uint32_t ms = 0; ms < 30000; ms += 20) { /* 25 Hz Flattern ueber 30 s, je 20 ms stabil */
		events += touch_update(&t, (ms / 40) % 2, ms) != TOUCH_EVT_NONE;
		events += touch_update(&t, (ms / 40) % 2, ms + 19) != TOUCH_EVT_NONE;
	}
	TEST_ASSERT_TRUE_MESSAGE(t.locked, "Flattern nicht erkannt");
	TEST_ASSERT_TRUE_MESSAGE(events <= (int)TOUCH_SPAM_EDGES, "Ereignisspam bei offenem Eingang"); /* begrenzt statt 750 */
}

void test_touch_recovers_after_lockout(void)
{
	touch_t t;
	touch_init(&t);
	for (uint32_t ms = 0; ms < 1000; ms += 10) {
		touch_update(&t, (ms / 10) % 2, ms);
	}
	TEST_ASSERT_TRUE(t.locked);
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, true, 5000));  /* noch gesperrt */
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, true, 12000)); /* 10 s ohne Flanke: stilles Entsperren */
	TEST_ASSERT_FALSE(t.locked);
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, false, 12100));
	TEST_ASSERT_EQUAL(TOUCH_EVT_UP, touch_update(&t, false, 12130));
	TEST_ASSERT_EQUAL(TOUCH_EVT_NONE, touch_update(&t, true, 12200));
	TEST_ASSERT_EQUAL(TOUCH_EVT_DOWN, touch_update(&t, true, 12230));
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_scale_default_center_and_ends);
	RUN_TEST(test_deadzone);
	RUN_TEST(test_center_calibration_shifts_zero);
	RUN_TEST(test_center_calibration_rejects_implausible);
	RUN_TEST(test_presence);
	RUN_TEST(test_button_threshold);
	RUN_TEST(test_poll_on_demand);
	RUN_TEST(test_touch_debounced_events);
	RUN_TEST(test_touch_glitch_no_event);
	RUN_TEST(test_touch_floating_input_no_spam);
	RUN_TEST(test_touch_recovers_after_lockout);
	return UNITY_END();
}
