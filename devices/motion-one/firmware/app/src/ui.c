/* LED (PWM RGB), Summer (PWM Frequenzmodus), Vibrationsmotor, Taster. Adapter: Zephyr. */
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/drivers/pwm.h>
#include <zephyr/drivers/gpio.h>
#include "app.h"

LOG_MODULE_REGISTER(ui, LOG_LEVEL_INF);

static const struct pwm_dt_spec led[3] = {PWM_DT_SPEC_GET(DT_ALIAS(led_red)), PWM_DT_SPEC_GET(DT_ALIAS(led_green)),
					  PWM_DT_SPEC_GET(DT_ALIAS(led_blue))};
static const struct pwm_dt_spec buzzer = PWM_DT_SPEC_GET(DT_ALIAS(buzzer));
static const struct gpio_dt_spec btn = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);
static const struct gpio_dt_spec vib = GPIO_DT_SPEC_GET(DT_ALIAS(vib0), gpios);
static struct gpio_callback btn_cb;
static thingy_button_t btn_sm;
static thingy_led_cmd_t led_cur;
static uint32_t breathe_step;

#define BTN_POLL_MS 20u
#define BREATHE_STEPS 50u

static void led_rgb(uint8_t r, uint8_t g, uint8_t b)
{
	const uint8_t v[3] = {r, g, b};
	for (int i = 0; i < 3; i++) {
		(void)pwm_set_pulse_dt(&led[i], (uint32_t)((uint64_t)led[i].period * v[i] / 255u));
	}
}

static void led_mix(uint8_t mix, uint32_t level255)
{
	led_rgb((mix & 1) ? level255 : 0, (mix & 2) ? level255 : 0, (mix & 4) ? level255 : 0);
}

static void led_anim(struct k_work *w);
static K_WORK_DELAYABLE_DEFINE(led_work, led_anim);

static void led_anim(struct k_work *w)
{
	ARG_UNUSED(w);
	const uint32_t max = led_cur.intensity_pct * 255u / 100u;
	if (led_cur.mode == THINGY_LED_ONE_SHOT) {
		led_mix(led_cur.color_mix, 0);
		return;
	}
	/* Dreieck auf/ab, Periode delay_ms */
	const uint32_t s = breathe_step++ % (2 * BREATHE_STEPS);
	const uint32_t lvl = (s < BREATHE_STEPS ? s : 2 * BREATHE_STEPS - s) * max / BREATHE_STEPS;
	led_mix(led_cur.color_mix, lvl);
	k_work_schedule(&led_work, K_MSEC(MAX(led_cur.delay_ms / (2 * BREATHE_STEPS), 1u)));
}

void ui_led_apply(const thingy_led_cmd_t *cmd)
{
	(void)k_work_cancel_delayable(&led_work);
	led_cur = *cmd;
	switch (cmd->mode) {
	case THINGY_LED_CONSTANT:
		led_rgb(cmd->r, cmd->g, cmd->b);
		break;
	case THINGY_LED_BREATHE:
		breathe_step = 0;
		k_work_schedule(&led_work, K_NO_WAIT);
		break;
	case THINGY_LED_ONE_SHOT:
		led_mix(cmd->color_mix, cmd->intensity_pct * 255u / 100u);
		k_work_schedule(&led_work, K_MSEC(1000)); /* ANNAHME 1 s Blitz */
		break;
	default:
		led_rgb(0, 0, 0);
		break;
	}
}

static void buzzer_off(struct k_work *w)
{
	ARG_UNUSED(w);
	(void)pwm_set_dt(&buzzer, buzzer.period, 0);
	ble_publish_speaker_done();
}
static K_WORK_DELAYABLE_DEFINE(buzzer_work, buzzer_off);

void ui_speaker_tone(const thingy_speaker_tone_t *t)
{
	if (t->freq_hz == 0 || t->volume_pct == 0 || t->duration_ms == 0) {
		k_work_reschedule(&buzzer_work, K_NO_WAIT);
		return;
	}
	const uint32_t period = PWM_HZ(t->freq_hz);
	/* Lautstaerke ueber Tastgrad, max. 50 % (ANNAHME, Summer-Kennlinie unbekannt) */
	const uint32_t pulse = (uint32_t)((uint64_t)period * t->volume_pct / 200u);
	(void)pwm_set_dt(&buzzer, period, pulse);
	k_work_reschedule(&buzzer_work, K_MSEC(t->duration_ms));
}

static void vib_off(struct k_work *w)
{
	ARG_UNUSED(w);
	(void)gpio_pin_set_dt(&vib, 0);
}
static K_WORK_DELAYABLE_DEFINE(vib_work, vib_off);

void ui_vibrate_ms(uint32_t ms)
{
	(void)gpio_pin_set_dt(&vib, 1);
	k_work_reschedule(&vib_work, K_MSEC(ms));
}

static void btn_poll(struct k_work *w);
static K_WORK_DELAYABLE_DEFINE(btn_work, btn_poll);

static void btn_poll(struct k_work *w)
{
	ARG_UNUSED(w);
	const bool pressed = gpio_pin_get_dt(&btn) > 0;
	static bool last;
	if (pressed != last) {
		last = pressed;
		ble_publish_button(pressed);
	}
	switch (thingy_button_update(&btn_sm, pressed, k_uptime_get_32())) {
	case THINGY_BTN_EVT_LONG:
		imu_request_calibration();
		ui_vibrate_ms(150);
		break;
	default:
		break;
	}
	if (pressed) {
		k_work_schedule(&btn_work, K_MSEC(BTN_POLL_MS));
	}
}

static void btn_isr(const struct device *d, struct gpio_callback *cb, uint32_t pins)
{
	k_work_reschedule(&btn_work, K_MSEC(5)); /* Entprellen */
}

int ui_arm_button_wakeup(void)
{
	return gpio_pin_interrupt_configure_dt(&btn, GPIO_INT_LEVEL_ACTIVE);
}

int ui_init(void)
{
	thingy_button_init(&btn_sm);
	for (int i = 0; i < 3; i++) {
		if (!pwm_is_ready_dt(&led[i])) {
			return -ENODEV;
		}
	}
	if (!pwm_is_ready_dt(&buzzer) || !gpio_is_ready_dt(&btn) || !gpio_is_ready_dt(&vib)) {
		return -ENODEV;
	}
	(void)gpio_pin_configure_dt(&vib, GPIO_OUTPUT_INACTIVE);
	(void)gpio_pin_configure_dt(&btn, GPIO_INPUT);
	gpio_init_callback(&btn_cb, btn_isr, BIT(btn.pin));
	(void)gpio_add_callback(btn.port, &btn_cb);
	(void)gpio_pin_interrupt_configure_dt(&btn, GPIO_INT_EDGE_BOTH);
	led_rgb(0, 0, 0);
	return 0;
}
