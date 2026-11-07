/* Host-Tests Sensorfusion (Madgwick 6-Achsen) und Gyro-Bias-Kalibrierung. */
#include <math.h>
#include "unity.h"
#include "motion_fusion.h"

void setUp(void) {}
void tearDown(void) {}

static const float zero[3] = {0, 0, 0};

static void test_static_tilt_converges(void)
{
	/* Sensor um 30 Grad um x gerollt: g im Sensorsystem = (0, sin30, cos30) */
	madgwick_t f;
	madgwick_init(&f, 0.1f);
	const float a[3] = {0.0f, 0.5f, 0.8660254f};
	for (int i = 0; i < 400 * 20; i++) {
		madgwick_update(&f, zero, a, 1.0f / 400.0f);
	}
	float r, p, y;
	quat_to_euler_deg(f.q, &r, &p, &y);
	TEST_ASSERT_FLOAT_WITHIN(1.0f, 30.0f, r);
	TEST_ASSERT_FLOAT_WITHIN(1.0f, 0.0f, p);
}

static void test_rotation_about_z_integrates(void)
{
	madgwick_t f;
	madgwick_init(&f, 0.1f);
	const float a[3] = {0, 0, 1};
	const float g[3] = {0, 0, 90.0f};
	for (int i = 0; i < 400; i++) {
		madgwick_update(&f, g, a, 1.0f / 400.0f);
	}
	float r, p, y;
	quat_to_euler_deg(f.q, &r, &p, &y);
	TEST_ASSERT_FLOAT_WITHIN(0.5f, 90.0f, y);
	TEST_ASSERT_FLOAT_WITHIN(0.5f, 0.0f, r);
	const float n = sqrtf(f.q[0] * f.q[0] + f.q[1] * f.q[1] + f.q[2] * f.q[2] + f.q[3] * f.q[3]);
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, 1.0f, n);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 90.0f, heading_from_yaw_deg(y));
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 270.0f, heading_from_yaw_deg(-90.0f));
}

static void test_rest_detection_estimates_and_removes_bias(void)
{
	bias_cal_t c;
	bias_cal_init(&c, 400);
	const float g[3] = {0.8f, -1.2f, 0.4f};
	const float a[3] = {0.01f, 0.0f, 1.0f};
	bool got = false;
	for (int i = 0; i < 400 && !got; i++) {
		got = bias_cal_feed(&c, g, a);
	}
	TEST_ASSERT_TRUE(got);
	TEST_ASSERT_TRUE(c.valid);
	float out[3];
	bias_cal_apply(&c, g, out);
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, 0.0f, out[0]);
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, 0.0f, out[1]);
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, 0.0f, out[2]);
}

static void test_motion_resets_window(void)
{
	bias_cal_t c;
	bias_cal_init(&c, 100);
	const float g[3] = {0.5f, 0, 0};
	const float moving[3] = {50.0f, 0, 0};
	const float a[3] = {0, 0, 1};
	for (int i = 0; i < 99; i++) {
		TEST_ASSERT_FALSE(bias_cal_feed(&c, g, a));
	}
	TEST_ASSERT_FALSE(bias_cal_feed(&c, moving, a));
	for (int i = 0; i < 99; i++) {
		TEST_ASSERT_FALSE(bias_cal_feed(&c, g, a));
	}
	TEST_ASSERT_TRUE(bias_cal_feed(&c, g, a));
	TEST_ASSERT_FALSE(bias_cal_is_at_rest(&c, moving, a));
	TEST_ASSERT_TRUE(bias_cal_is_at_rest(&c, g, a));
}

static void test_button_request_ignores_accel_criterion(void)
{
	bias_cal_t c;
	bias_cal_init(&c, 50);
	const float g[3] = {1.0f, 1.0f, 1.0f};
	const float tilted_shaky[3] = {0.3f, 0.0f, 1.2f}; /* |a| != 1 g */
	for (int i = 0; i < 60; i++) {
		TEST_ASSERT_FALSE(bias_cal_feed(&c, g, tilted_shaky));
	}
	bias_cal_request(&c);
	bool got = false;
	for (int i = 0; i < 50 && !got; i++) {
		got = bias_cal_feed(&c, g, tilted_shaky);
	}
	TEST_ASSERT_TRUE(got);
	TEST_ASSERT_FALSE(c.requested);
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, 1.0f, c.bias[2]);
}

static void test_bias_corrected_static_has_no_yaw_drift(void)
{
	madgwick_t f;
	bias_cal_t c;
	madgwick_init(&f, 0.1f);
	bias_cal_init(&c, 400);
	const float g[3] = {0.0f, 0.0f, 2.0f}; /* Bias 2 dps um z */
	const float a[3] = {0, 0, 1};
	float corr[3];
	for (int i = 0; i < 400 * 10; i++) {
		(void)bias_cal_feed(&c, g, a);
		bias_cal_apply(&c, g, corr);
		madgwick_update(&f, corr, a, 1.0f / 400.0f);
	}
	float r, p, y;
	quat_to_euler_deg(f.q, &r, &p, &y);
	/* nur waehrend der ersten Sekunde Drift (2 Grad), danach 0 */
	TEST_ASSERT_FLOAT_WITHIN(0.2f, 2.0f, y);
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_static_tilt_converges);
	RUN_TEST(test_rotation_about_z_integrates);
	RUN_TEST(test_rest_detection_estimates_and_removes_bias);
	RUN_TEST(test_motion_resets_window);
	RUN_TEST(test_button_request_ignores_accel_criterion);
	RUN_TEST(test_bias_corrected_static_has_no_yaw_drift);
	return UNITY_END();
}
