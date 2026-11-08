/* r4 J5-Erweiterung (Zephyr-Adapter; Logik in input/src/ext_input.c, Host-getestet).
 * Stick X/Y (AIN5/AIN6) nur bei Verbindung und vorhandener Bedienplatine abtasten, 20 Hz bei Bewegung,
 * sonst 2 Hz. Touch EXT5 per Flanken-Interrupt, entprellt, Flankenflut sperrt. */
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/drivers/adc.h>
#include <zephyr/drivers/gpio.h>
#include "app.h"
#include "ext_input.h"

LOG_MODULE_REGISTER(ext, LOG_LEVEL_INF);

#define USER DT_PATH(zephyr_user)
static const struct adc_dt_spec ax = ADC_DT_SPEC_GET_BY_IDX(USER, 1);
static const struct adc_dt_spec ay = ADC_DT_SPEC_GET_BY_IDX(USER, 2);
static const struct gpio_dt_spec ext4 = GPIO_DT_SPEC_GET(USER, ext4_gpios);
static const struct gpio_dt_spec ext5 = GPIO_DT_SPEC_GET(USER, ext5_gpios);
static const struct device *const gpio0 = DEVICE_DT_GET(DT_NODELABEL(gpio0));
#define PIN_EXT1 29 /* P0.29/AIN5, nur fuer Praesenzpruefung (Pull kurzzeitig) */

static stick_axis_cal_t cx, cy;
static stick_poll_t poll;
static touch_t touch;
static bool present, center_ok;
static struct gpio_callback touch_cb;
static ui_ext_state_t ui; /* EF680380-Zustand */
static ui_ext_rate_t rate;
void ext_publish_touch(bool down);

static int read_mv(const struct adc_dt_spec *ch, uint16_t *mv)
{
	int16_t raw;
	struct adc_sequence seq = {.buffer = &raw, .buffer_size = sizeof raw};
	int rc = adc_sequence_init_dt(ch, &seq);
	rc = rc ? rc : adc_read_dt(ch, &seq);
	int32_t v = raw;
	rc = rc ? rc : adc_raw_to_millivolts_dt(ch, &v);
	*mv = rc || v < 0 ? 0 : (uint16_t)MIN(v, UINT16_MAX);
	return rc;
}

/* EXT1 mit internem Pull-up bzw. Pull-down (13 kOhm) messen: offen folgt dem Pull, Stick nicht. */
static bool probe_board(void)
{
	uint16_t up = 0, dn = 0;
	(void)gpio_pin_configure(gpio0, PIN_EXT1, GPIO_INPUT | GPIO_PULL_UP);
	k_msleep(1);
	(void)read_mv(&ax, &up);
	(void)gpio_pin_configure(gpio0, PIN_EXT1, GPIO_INPUT | GPIO_PULL_DOWN);
	k_msleep(1);
	(void)read_mv(&ax, &dn);
	(void)gpio_pin_configure(gpio0, PIN_EXT1, GPIO_DISCONNECTED);
	LOG_INF("J5-Probe EXT1 up %u mV, down %u mV", up, dn);
	return ext_board_present(up, dn);
}

static void stick_poll(struct k_work *w);
static K_WORK_DELAYABLE_DEFINE(stick_work, stick_poll);

static void stick_poll(struct k_work *w)
{
	ARG_UNUSED(w);
	if (!ble_is_connected()) {
		k_work_schedule(&stick_work, K_SECONDS(1)); /* keine ADC-Abtastung ohne Abnehmer */
		return;
	}
	uint16_t mx = 0, my = 0;
	(void)read_mv(&ax, &mx);
	(void)read_mv(&ay, &my);
	const int8_t x = stick_axis_scale(&cx, mx, EXT_DEADZONE_PCT);
	const int8_t y = stick_axis_scale(&cy, my, EXT_DEADZONE_PCT);
	const bool btn = gpio_pin_get_dt(&ext4) > 0;
	static int8_t lx, ly;
	static bool lb;
	if (x != lx || y != ly || btn != lb) {
		lx = x; ly = y; lb = btn;
		ext_publish_stick(x, y, btn);
	}
	k_work_schedule(&stick_work, K_MSEC(stick_next_poll_ms(&poll, x, y, btn || touch.stable, k_uptime_get_32())));
}

static void touch_eval(struct k_work *w);
static K_WORK_DELAYABLE_DEFINE(touch_work, touch_eval);

static void touch_eval(struct k_work *w)
{
	ARG_UNUSED(w);
	const touch_evt_t e = touch_update(&touch, gpio_pin_get_dt(&ext5) > 0, k_uptime_get_32());
	if (e != TOUCH_EVT_NONE) {
		ext_publish_touch(e == TOUCH_EVT_DOWN);
	} else if (!!(ui.flags & UI_EXT_TOUCH_LOCKED) != touch.locked) {
		ext_publish_touch(touch.stable); /* Sperrstatus melden */
	}
	if (touch.locked || touch.raw != touch.stable) {
		k_work_reschedule(&touch_work, K_MSEC(touch.locked ? 1000 : TOUCH_DEBOUNCE_MS));
	}
}

static void touch_isr(const struct device *d, struct gpio_callback *cb, uint32_t pins)
{
	ARG_UNUSED(d); ARG_UNUSED(cb); ARG_UNUSED(pins);
	(void)touch_update(&touch, gpio_pin_get_dt(&ext5) > 0, k_uptime_get_32()); /* Flanke zaehlen */
	k_work_reschedule(&touch_work, K_MSEC(TOUCH_DEBOUNCE_MS));
}

int ext_input_start(void)
{
	stick_axis_cal_init(&cx);
	stick_axis_cal_init(&cy);
	touch_init(&touch);
	if (!adc_is_ready_dt(&ax) || !gpio_is_ready_dt(&ext4) || !gpio_is_ready_dt(&ext5)) {
		return -ENODEV;
	}
	int rc = adc_channel_setup_dt(&ax);
	rc = rc ? rc : adc_channel_setup_dt(&ay);
	rc = rc ? rc : gpio_pin_configure_dt(&ext4, GPIO_INPUT);
	rc = rc ? rc : gpio_pin_configure_dt(&ext5, GPIO_INPUT);
	if (rc) {
		return rc;
	}
	present = probe_board();
	if (present) {
		uint16_t sx[8], sy[8]; /* Mitte kalibrieren: Stick beim Start in Ruhe (ANNAHME) */
		for (int i = 0; i < 8; i++) {
			(void)read_mv(&ax, &sx[i]);
			(void)read_mv(&ay, &sy[i]);
		}
		center_ok = stick_axis_cal_center(&cx, sx, 8) & stick_axis_cal_center(&cy, sy, 8);
		if (!center_ok) {
			LOG_WRN("Stick-Mitte unplausibel, Default 1.65 V");
		}
		k_work_schedule(&stick_work, K_MSEC(EXT_POLL_IDLE_MS));
	} else {
		(void)gpio_pin_configure_dt(&ext4, GPIO_DISCONNECTED); /* kein Pull-up-Strom ohne Platine */
	}
	/* Touch auch ohne Stick: EXT5 hat Pull-down, offen -> low, keine Flanken */
	gpio_init_callback(&touch_cb, touch_isr, BIT(ext5.pin));
	(void)gpio_add_callback(ext5.port, &touch_cb);
	(void)gpio_pin_interrupt_configure_dt(&ext5, GPIO_INT_EDGE_BOTH);
	LOG_INF("J5 Bedienplatine %s", present ? "erkannt" : "nicht erkannt");
	return 0;
}

void ext_input_suspend(void)
{
	(void)gpio_pin_interrupt_configure_dt(&ext5, GPIO_INT_DISABLE);
	(void)k_work_cancel_delayable(&stick_work);
	(void)k_work_cancel_delayable(&touch_work);
}

/* EF680380: Zustand + Ratenbegrenzer (codec/thingy_codec.c, Host-getestet). Alle Zugriffe im System-Workqueue. */

static void ui_tx(struct k_work *w);
static K_WORK_DELAYABLE_DEFINE(ui_tx_work, ui_tx);

static void ui_tx(struct k_work *w)
{
	ARG_UNUSED(w);
	thingy_motion_config_t cfg;
	ble_get_motion_config(&cfg);
	uint32_t retry = 0;
	if (ui_ext_rate_poll(&rate, cfg.motion_freq_hz, k_uptime_get_32(), &retry)) {
		ui_ext_next_seq(&ui);
		ble_publish_ui_ext(&ui);
	} else if (retry) {
		k_work_reschedule(&ui_tx_work, K_MSEC(retry)); /* Flanke spaetestens nach <= 100 ms */
	}
}

static void ui_set(uint8_t flags, int8_t x, int8_t y)
{
	flags |= present ? UI_EXT_PRESENT : 0u;
	flags |= touch.locked ? UI_EXT_TOUCH_LOCKED : 0u;
	flags |= center_ok ? UI_EXT_CENTER_OK : 0u;
	const bool changed = flags != ui.flags || x != ui.x || y != ui.y;
	ui.flags = flags;
	ui.x = x;
	ui.y = y;
	ui_ext_rate_mark(&rate, changed);
	if (changed) {
		k_work_schedule(&ui_tx_work, K_NO_WAIT);
	}
}

static void ui_sub(struct k_work *w)
{
	ARG_UNUSED(w);
	ui_set(ui.flags & (UI_EXT_BTN | UI_EXT_TOUCH), ui.x, ui.y);
	ui_ext_rate_mark(&rate, true);
	k_work_reschedule(&ui_tx_work, K_NO_WAIT);
}
static K_WORK_DEFINE(ui_sub_work, ui_sub);

void ext_ui_subscribed(void) { k_work_submit(&ui_sub_work); }

void ext_publish_stick(int8_t x, int8_t y, bool btn)
{
	ui_set((uint8_t)((ui.flags & UI_EXT_TOUCH) | (btn ? UI_EXT_BTN : 0u)), x, y);
}

void ext_publish_touch(bool down)
{
	ui_set((uint8_t)((ui.flags & UI_EXT_BTN) | (down ? UI_EXT_TOUCH : 0u)), ui.x, ui.y);
}
