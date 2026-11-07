/* Akkuspannung per SAADC ueber Spannungsteiler (Faktor aus zephyr,user, PLATZHALTER). */
#include <zephyr/kernel.h>
#include <zephyr/drivers/adc.h>
#include "app.h"

#define USER DT_PATH(zephyr_user)
static const struct adc_dt_spec ch = ADC_DT_SPEC_GET(USER);

int battery_init(void)
{
	if (!adc_is_ready_dt(&ch)) {
		return -ENODEV;
	}
	return adc_channel_setup_dt(&ch);
}

uint16_t battery_read_mv(void)
{
	int16_t raw;
	struct adc_sequence seq = {.buffer = &raw, .buffer_size = sizeof raw};
	if (adc_sequence_init_dt(&ch, &seq) || adc_read_dt(&ch, &seq)) {
		return 0;
	}
	int32_t mv = raw;
	if (adc_raw_to_millivolts_dt(&ch, &mv) || mv < 0) {
		return 0;
	}
	mv = mv * DT_PROP(USER, vbat_divider_num) / DT_PROP(USER, vbat_divider_den);
	return (uint16_t)MIN(mv, UINT16_MAX);
}
