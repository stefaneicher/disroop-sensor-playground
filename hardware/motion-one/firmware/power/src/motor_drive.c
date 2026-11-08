#include "motor_drive.h"

uint16_t motor_supply_mv(uint16_t vbat_mv, bool usb)
{
	if (usb) {
		return MOTOR_SUPPLY_USB_MV;
	}
	if (vbat_mv < MOTOR_SUPPLY_VBAT_MIN_MV || vbat_mv > MOTOR_SUPPLY_VBAT_MAX_MV + 300u) {
		return MOTOR_SUPPLY_VBAT_MAX_MV;
	}
	return vbat_mv;
}

uint16_t motor_duty_permille(uint16_t supply_mv)
{
	if (supply_mv == 0) {
		supply_mv = MOTOR_SUPPLY_USB_MV;
	}
	if (supply_mv <= MOTOR_TARGET_MV) {
		return 1000u;
	}
	return (uint16_t)(MOTOR_TARGET_MV * 1000u / supply_mv);
}

load_out_t load_arbitrate(bool buzzer_req, bool motor_req)
{
	load_out_t o = {.buzzer_on = buzzer_req, .motor_on = motor_req && !buzzer_req};
	return o;
}

/* ANALYSE_V1 §1a (BERECHNUNG/SIMULATION): Lader 281 + CHRG-LED 3 + 3V3-Last ohne Summer 51.6 mA,
 * Summer-Spitze 87 mA, Motor-Anlauf mit PWM 3.0 V <= 120 mA (QUELLE DB). */
uint32_t motor_vbus_peak_ma(bool buzzer_on, bool motor_on)
{
	uint32_t ma = 281u + 3u + 52u;
	if (buzzer_on) {
		ma += 87u;
	}
	if (motor_on) {
		ma += 120u;
	}
	return ma;
}
