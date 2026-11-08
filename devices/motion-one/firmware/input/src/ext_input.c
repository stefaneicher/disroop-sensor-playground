/* r4 Erweiterung J5: reine Logik (Stick, Taste, Touch), Host-getestet in tests/test_ext_input.c. */
#include "ext_input.h"

bool ext_board_present(uint16_t mv_pullup, uint16_t mv_pulldown)
{
	/* offener Eingang folgt dem Pull (~3.3 V / ~0 V); Stick-Wiper (Quelle <= 2.5 kOhm) bleibt nahe beisammen */
	const uint16_t d = mv_pullup > mv_pulldown ? mv_pullup - mv_pulldown : mv_pulldown - mv_pullup;
	return d < EXT_PROBE_FLOAT_MV;
}

void stick_axis_cal_init(stick_axis_cal_t *c)
{
	c->center_mv = EXT_FULL_MV / 2u;
	c->min_mv = 0;
	c->max_mv = EXT_FULL_MV;
}

bool stick_axis_cal_center(stick_axis_cal_t *c, const uint16_t *s, size_t n)
{
	if (n == 0) {
		return false;
	}
	uint32_t sum = 0;
	for (size_t i = 0; i < n; i++) {
		sum += s[i];
	}
	const uint32_t m = (sum + n / 2) / n;
	if (m < EXT_FULL_MV * 30u / 100u || m > EXT_FULL_MV * 70u / 100u) {
		return false;
	}
	c->center_mv = (uint16_t)m;
	return true;
}

int8_t stick_axis_scale(const stick_axis_cal_t *c, uint16_t mv, uint8_t deadzone_pct)
{
	if (mv > c->max_mv) {
		mv = c->max_mv;
	}
	if (mv < c->min_mv) {
		mv = c->min_mv;
	}
	int32_t pct;
	if (mv >= c->center_mv) {
		const int32_t span = (int32_t)c->max_mv - c->center_mv;
		pct = span > 0 ? ((int32_t)mv - c->center_mv) * 100 / span : 0;
	} else {
		const int32_t span = (int32_t)c->center_mv - c->min_mv;
		pct = span > 0 ? ((int32_t)mv - c->center_mv) * 100 / span : 0;
	}
	const int32_t a = pct < 0 ? -pct : pct;
	if (deadzone_pct >= 100u || a < deadzone_pct) {
		return 0;
	}
	const int32_t r = (a - deadzone_pct) * 100 / (100 - deadzone_pct);
	return (int8_t)(pct < 0 ? -r : r);
}

bool ext_btn_pressed(uint16_t mv) { return mv < EXT_BTN_PRESSED_MV; }

uint32_t stick_next_poll_ms(stick_poll_t *p, int8_t x, int8_t y, bool active_input, uint32_t now_ms)
{
	if (x != 0 || y != 0 || active_input) {
		p->last_active_ms = now_ms;
		p->ever_active = true;
		return EXT_POLL_ACTIVE_MS;
	}
	if (p->ever_active && now_ms - p->last_active_ms <= EXT_ACTIVE_HOLD_MS) {
		return EXT_POLL_ACTIVE_MS;
	}
	return EXT_POLL_IDLE_MS;
}

void touch_init(touch_t *t) { *t = (touch_t){0}; }

touch_evt_t touch_update(touch_t *t, bool level, uint32_t now_ms)
{
	if (level != t->raw) {
		t->raw = level;
		t->t_change = now_ms;
		if (t->locked) {
			t->lock_until = now_ms + TOUCH_LOCKOUT_MS; /* Sperre laeuft erst nach 10 s Ruhe ab */
			return TOUCH_EVT_NONE;
		}
		if (t->edges == 0 || now_ms - t->win_start >= 1000u) {
			t->win_start = now_ms;
			t->edges = 0;
		}
		if (++t->edges > TOUCH_SPAM_EDGES) {
			t->locked = true;
			t->lock_until = now_ms + TOUCH_LOCKOUT_MS;
			if (t->stable) {
				t->stable = false;
				return TOUCH_EVT_UP; /* kein haengendes "gedrueckt" */
			}
		}
		return TOUCH_EVT_NONE;
	}
	if (t->locked) {
		if ((int32_t)(now_ms - t->lock_until) < 0) {
			return TOUCH_EVT_NONE;
		}
		t->locked = false; /* still entsperren: aktueller Pegel gilt als Ruhezustand */
		t->stable = level;
		t->edges = 0;
		return TOUCH_EVT_NONE;
	}
	if (t->raw != t->stable && now_ms - t->t_change >= TOUCH_DEBOUNCE_MS) {
		t->stable = t->raw;
		return t->stable ? TOUCH_EVT_DOWN : TOUCH_EVT_UP;
	}
	return TOUCH_EVT_NONE;
}
