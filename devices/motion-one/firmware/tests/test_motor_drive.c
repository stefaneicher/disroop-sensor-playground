/* Host-Tests F-12: Motor-PWM U_eff <= 3.0 V (LCM0827A3038F, QUELLE Datenblatt) und Arbitrierung Motor/Summer
 * (ANALYSE_V1 §1a: VBUS-Spitze <= 500 mA nur wenn Motor nicht gleichzeitig mit Summer). */
#include "unity.h"
#include "motor_drive.h"

void setUp(void) {}
void tearDown(void) {}

static uint32_t ueff_mv(uint16_t supply_mv, uint16_t permille) { return (uint32_t)supply_mv * permille / 1000u; }

void test_duty_is_target_over_supply(void)
{
	TEST_ASSERT_EQUAL_UINT16(714, motor_duty_permille(4200)); /* 3.0/4.2 */
	TEST_ASSERT_EQUAL_UINT16(857, motor_duty_permille(3500));
	TEST_ASSERT_EQUAL_UINT16(616, motor_duty_permille(4870)); /* VSYS an USB, ANALYSE_V1: ~62 % */
}

void test_duty_full_when_supply_at_or_below_target(void)
{
	TEST_ASSERT_EQUAL_UINT16(1000, motor_duty_permille(3000));
	TEST_ASSERT_EQUAL_UINT16(1000, motor_duty_permille(2900));
}

void test_ueff_never_above_3v0_over_range(void)
{
	for (uint32_t mv = 2500; mv <= 5500; mv += 10) {
		const uint16_t d = motor_duty_permille((uint16_t)mv);
		TEST_ASSERT_TRUE(d <= 1000);
		TEST_ASSERT_TRUE_MESSAGE(ueff_mv((uint16_t)mv, d) <= MOTOR_TARGET_MV, "U_eff > 3.0 V");
	}
}

void test_duty_zero_supply_uses_conservative_default(void)
{
	TEST_ASSERT_EQUAL_UINT16(motor_duty_permille(MOTOR_SUPPLY_USB_MV), motor_duty_permille(0));
}

void test_supply_battery_measured(void)
{
	TEST_ASSERT_EQUAL_UINT16(3700, motor_supply_mv(3700, false));
}

void test_supply_no_or_implausible_measurement_uses_vbat_max(void)
{
	TEST_ASSERT_EQUAL_UINT16(MOTOR_SUPPLY_VBAT_MAX_MV, motor_supply_mv(0, false));
	TEST_ASSERT_EQUAL_UINT16(MOTOR_SUPPLY_VBAT_MAX_MV, motor_supply_mv(1200, false));
	TEST_ASSERT_EQUAL_UINT16(MOTOR_SUPPLY_VBAT_MAX_MV, motor_supply_mv(6000, false));
}

void test_supply_usb_uses_vsys_worst_case(void)
{
	/* An USB haengt VSW an VSYS (bis 4.87 V SIMULATION); VBAT-Messung waere zu tief */
	TEST_ASSERT_EQUAL_UINT16(MOTOR_SUPPLY_USB_MV, motor_supply_mv(3700, true));
	TEST_ASSERT_TRUE(MOTOR_SUPPLY_USB_MV >= 4870);
}

void test_arbitration_motor_alone(void)
{
	load_out_t o = load_arbitrate(false, true);
	TEST_ASSERT_TRUE(o.motor_on);
	TEST_ASSERT_FALSE(o.buzzer_on);
}

void test_arbitration_buzzer_alone(void)
{
	load_out_t o = load_arbitrate(true, false);
	TEST_ASSERT_TRUE(o.buzzer_on);
	TEST_ASSERT_FALSE(o.motor_on);
}

void test_arbitration_buzzer_pauses_motor(void)
{
	load_out_t o = load_arbitrate(true, true);
	TEST_ASSERT_TRUE(o.buzzer_on);
	TEST_ASSERT_FALSE_MESSAGE(o.motor_on, "Motor und Summer gleichzeitig");
}

void test_arbitration_none(void)
{
	load_out_t o = load_arbitrate(false, false);
	TEST_ASSERT_FALSE(o.buzzer_on || o.motor_on);
}

void test_vbus_peak_within_usb_limit(void)
{
	/* ANALYSE_V1 §1a: Lader 281 + CHRG-LED 3 + 3V3 138.6 (inkl. Summer 87) mA; Motor-Anlauf 120 mA (QUELLE DB) */
	TEST_ASSERT_TRUE(motor_vbus_peak_ma(true, false) <= 500u);
	TEST_ASSERT_TRUE(motor_vbus_peak_ma(false, true) <= 500u);
	TEST_ASSERT_TRUE(motor_vbus_peak_ma(true, true) > 500u); /* darum Arbitrierung */
	load_out_t o = load_arbitrate(true, true);
	TEST_ASSERT_TRUE(motor_vbus_peak_ma(o.buzzer_on, o.motor_on) <= 500u);
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_duty_is_target_over_supply);
	RUN_TEST(test_duty_full_when_supply_at_or_below_target);
	RUN_TEST(test_ueff_never_above_3v0_over_range);
	RUN_TEST(test_duty_zero_supply_uses_conservative_default);
	RUN_TEST(test_supply_battery_measured);
	RUN_TEST(test_supply_no_or_implausible_measurement_uses_vbat_max);
	RUN_TEST(test_supply_usb_uses_vsys_worst_case);
	RUN_TEST(test_arbitration_motor_alone);
	RUN_TEST(test_arbitration_buzzer_alone);
	RUN_TEST(test_arbitration_buzzer_pauses_motor);
	RUN_TEST(test_arbitration_none);
	RUN_TEST(test_vbus_peak_within_usb_limit);
	return UNITY_END();
}
