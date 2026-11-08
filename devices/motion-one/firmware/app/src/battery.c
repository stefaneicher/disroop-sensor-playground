/* Akkuspannung: VBAT_EN an, >= 25 ms warten, SAADC lesen, VBAT_EN aus (Logik in power/vbat.c, Host-getestet). */
#include <zephyr/kernel.h>
#include <zephyr/drivers/adc.h>
#include <zephyr/drivers/gpio.h>
#include "app.h"
#include "vbat.h"

#define USER DT_PATH(zephyr_user)
static const struct adc_dt_spec ch = ADC_DT_SPEC_GET(USER);
static const struct gpio_dt_spec en = GPIO_DT_SPEC_GET(USER, vbat_en_gpios);

static int z_en(void *c, int on) { (void)c; return gpio_pin_set_dt(&en, on); }
static void z_sleep(void *c, uint32_t ms) { (void)c; k_msleep((int32_t)ms); }
static int z_adc(void *c, int32_t *mv)
{
	(void)c;
	int16_t raw;
	struct adc_sequence seq = {.buffer = &raw, .buffer_size = sizeof raw};
	int rc = adc_sequence_init_dt(&ch, &seq);
	if (rc == 0) {
		rc = adc_read_dt(&ch, &seq);
	}
	if (rc == 0) {
		*mv = raw;
		rc = adc_raw_to_millivolts_dt(&ch, mv);
	}
	return rc;
}

static const vbat_port_t port = {.ctx = NULL, .set_enable = z_en, .sleep_ms = z_sleep, .read_adc_mv = z_adc};

int battery_init(void)
{
	if (!adc_is_ready_dt(&ch) || !gpio_is_ready_dt(&en)) {
		return -ENODEV;
	}
	int rc = gpio_pin_configure_dt(&en, GPIO_OUTPUT_INACTIVE);
	return rc ? rc : adc_channel_setup_dt(&ch);
}

static atomic_t last_mv; /* 0 = noch keine gueltige Messung */

uint16_t battery_read_mv(void)
{
	uint16_t mv = 0;
	(void)vbat_measure(&port, DT_PROP(USER, vbat_divider_num), DT_PROP(USER, vbat_divider_den), &mv);
	atomic_set(&last_mv, mv);
	return mv;
}

uint16_t battery_last_mv(void)
{
	return (uint16_t)atomic_get(&last_mv);
}
