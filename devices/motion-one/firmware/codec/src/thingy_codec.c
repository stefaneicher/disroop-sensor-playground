#include "thingy_codec.h"

#include <math.h>
#include <string.h>

static int16_t to_i16_saturated(float value, float scale)
{
	const float scaled = roundf(value * scale);
	if (!(scaled > (float)INT16_MIN)) {
		return INT16_MIN; /* auch NaN */
	}
	if (scaled >= (float)INT16_MAX) {
		return INT16_MAX;
	}
	return (int16_t)scaled;
}

static uint8_t *put_i16_le(uint8_t *out, int16_t value)
{
	const uint16_t u = (uint16_t)value;
	out[0] = (uint8_t)(u & 0xFFu);
	out[1] = (uint8_t)(u >> 8);
	return out + 2;
}

static uint8_t *put_xyz(uint8_t *out, const thingy_xyz_t *v, float scale)
{
	out = put_i16_le(out, to_i16_saturated(v->x, scale));
	out = put_i16_le(out, to_i16_saturated(v->y, scale));
	return put_i16_le(out, to_i16_saturated(v->z, scale));
}

size_t thingy_encode_raw_motion(const thingy_raw_motion_t *in, uint8_t *out, size_t out_len)
{
	if (in == NULL || out == NULL || out_len < THINGY_RAW_MOTION_LEN) {
		return 0;
	}
	uint8_t *p = put_xyz(out, &in->accel, 1024.0f);
	p = put_xyz(p, &in->gyro, 32.0f);
	(void)put_xyz(p, &in->compass, 16.0f);
	return THINGY_RAW_MOTION_LEN;
}

static uint8_t *put_i32_le(uint8_t *out, int32_t value)
{
	const uint32_t u = (uint32_t)value;
	for (int i = 0; i < 4; i++) {
		out[i] = (uint8_t)(u >> (8 * i));
	}
	return out + 4;
}

static uint8_t *put_u16_le(uint8_t *out, uint16_t v)
{
	out[0] = (uint8_t)(v & 0xFFu);
	out[1] = (uint8_t)(v >> 8);
	return out + 2;
}

static uint16_t get_u16_le(const uint8_t *in)
{
	return (uint16_t)(in[0] | (in[1] << 8));
}

static int32_t to_i32_saturated(double value, double scale)
{
	const double scaled = round(value * scale);
	if (!(scaled > (double)INT32_MIN)) {
		return INT32_MIN;
	}
	if (scaled >= (double)INT32_MAX) {
		return INT32_MAX;
	}
	return (int32_t)scaled;
}

size_t thingy_encode_quaternion(const float q[4], uint8_t *out, size_t out_len)
{
	if (q == NULL || out == NULL || out_len < THINGY_QUATERNION_LEN) {
		return 0;
	}
	uint8_t *p = out;
	for (int i = 0; i < 4; i++) {
		p = put_i32_le(p, to_i32_saturated(q[i], 1073741824.0));
	}
	return THINGY_QUATERNION_LEN;
}

size_t thingy_encode_euler(float roll_deg, float pitch_deg, float yaw_deg, uint8_t *out, size_t out_len)
{
	if (out == NULL || out_len < THINGY_EULER_LEN) {
		return 0;
	}
	uint8_t *p = put_i32_le(out, to_i32_saturated(roll_deg, 65536.0));
	p = put_i32_le(p, to_i32_saturated(pitch_deg, 65536.0));
	(void)put_i32_le(p, to_i32_saturated(yaw_deg, 65536.0));
	return THINGY_EULER_LEN;
}

size_t thingy_encode_heading(float heading_deg, uint8_t *out, size_t out_len)
{
	if (out == NULL || out_len < THINGY_HEADING_LEN) {
		return 0;
	}
	double h = fmod((double)heading_deg, 360.0);
	if (h < 0.0) {
		h += 360.0;
	}
	(void)put_i32_le(out, to_i32_saturated(h, 65536.0));
	return THINGY_HEADING_LEN;
}

size_t thingy_encode_button(bool pressed, uint8_t *out, size_t out_len)
{
	if (out == NULL || out_len < THINGY_BUTTON_LEN) {
		return 0;
	}
	out[0] = pressed ? 1u : 0u;
	return THINGY_BUTTON_LEN;
}

void thingy_motion_config_default(thingy_motion_config_t *cfg)
{
	/* Thingy-Firmware-Defaults (docs/protocol.md); motion 100 Hz ANNAHME fuer Kompatibilitaet */
	cfg->step_interval_ms = 1000;
	cfg->temp_comp_interval_ms = 500;
	cfg->mag_comp_interval_ms = 100;
	cfg->motion_freq_hz = 100;
	cfg->wake_on_motion = 1;
}

thingy_status_t thingy_parse_motion_config(const uint8_t *in, size_t len, thingy_motion_config_t *out)
{
	if (in == NULL || out == NULL) {
		return THINGY_ERR_ARG;
	}
	if (len != THINGY_MOTION_CONFIG_LEN) {
		return THINGY_ERR_LEN;
	}
	const uint16_t hz = get_u16_le(&in[6]);
	if (hz < THINGY_MOTION_HZ_MIN || hz > THINGY_MOTION_HZ_MAX) {
		return THINGY_ERR_RANGE;
	}
	out->step_interval_ms = get_u16_le(&in[0]);
	out->temp_comp_interval_ms = get_u16_le(&in[2]);
	out->mag_comp_interval_ms = get_u16_le(&in[4]);
	out->motion_freq_hz = hz;
	out->wake_on_motion = in[8];
	return THINGY_OK;
}

size_t thingy_encode_motion_config(const thingy_motion_config_t *cfg, uint8_t *out, size_t out_len)
{
	if (cfg == NULL || out == NULL || out_len < THINGY_MOTION_CONFIG_LEN) {
		return 0;
	}
	uint8_t *p = put_u16_le(out, cfg->step_interval_ms);
	p = put_u16_le(p, cfg->temp_comp_interval_ms);
	p = put_u16_le(p, cfg->mag_comp_interval_ms);
	p = put_u16_le(p, cfg->motion_freq_hz);
	*p = cfg->wake_on_motion;
	return THINGY_MOTION_CONFIG_LEN;
}

void thingy_env_config_default(thingy_env_config_t *cfg)
{
	/* temp/press/humid 2000 ms, color 1000 ms, gas mode 2, LED 0x11 0x22 0x33 (Bridge-Testvektor) */
	static const uint8_t def[THINGY_ENV_CONFIG_LEN] = {0xD0, 0x07, 0xD0, 0x07, 0xD0, 0x07,
							   0xE8, 0x03, 0x02, 0x11, 0x22, 0x33};
	memcpy(cfg->raw, def, sizeof def);
}

thingy_status_t thingy_parse_env_config(const uint8_t *in, size_t len, thingy_env_config_t *out)
{
	if (in == NULL || out == NULL) {
		return THINGY_ERR_ARG;
	}
	if (len != THINGY_ENV_CONFIG_LEN) {
		return THINGY_ERR_LEN;
	}
	memcpy(out->raw, in, THINGY_ENV_CONFIG_LEN);
	return THINGY_OK;
}

void thingy_sound_config_default(thingy_sound_config_t *cfg)
{
	cfg->speaker_mode = 1;
	cfg->mic_mode = 1;
}

thingy_status_t thingy_parse_sound_config(const uint8_t *in, size_t len, thingy_sound_config_t *out)
{
	if (in == NULL || out == NULL) {
		return THINGY_ERR_ARG;
	}
	if (len != THINGY_SOUND_CONFIG_LEN) {
		return THINGY_ERR_LEN;
	}
	if (in[0] < 1 || in[0] > 3 || in[1] < 1 || in[1] > 2) {
		return THINGY_ERR_RANGE;
	}
	out->speaker_mode = in[0];
	out->mic_mode = in[1];
	return THINGY_OK;
}

thingy_status_t thingy_parse_speaker_tone(const uint8_t *in, size_t len, thingy_speaker_tone_t *out)
{
	if (in == NULL || out == NULL) {
		return THINGY_ERR_ARG;
	}
	if (len != THINGY_SPEAKER_TONE_LEN) {
		return THINGY_ERR_LEN;
	}
	out->freq_hz = get_u16_le(&in[0]);
	out->duration_ms = get_u16_le(&in[2]);
	out->volume_pct = in[4] > 100 ? 100 : in[4];
	return THINGY_OK;
}

static thingy_status_t check_mix_intensity(uint8_t mix, uint8_t intensity)
{
	return (mix < 1 || mix > 7 || intensity < 1 || intensity > 100) ? THINGY_ERR_RANGE : THINGY_OK;
}

thingy_status_t thingy_parse_led(const uint8_t *in, size_t len, thingy_led_cmd_t *out)
{
	if (in == NULL || out == NULL) {
		return THINGY_ERR_ARG;
	}
	if (len < 1) {
		return THINGY_ERR_LEN;
	}
	thingy_led_cmd_t c;
	memset(&c, 0, sizeof c);
	c.mode = (thingy_led_mode_t)in[0];
	switch (in[0]) {
	case THINGY_LED_OFF:
		if (len != 1) {
			return THINGY_ERR_LEN;
		}
		break;
	case THINGY_LED_CONSTANT:
		if (len != 4) {
			return THINGY_ERR_LEN;
		}
		c.r = in[1];
		c.g = in[2];
		c.b = in[3];
		break;
	case THINGY_LED_BREATHE:
		if (len != 5) {
			return THINGY_ERR_LEN;
		}
		c.color_mix = in[1];
		c.intensity_pct = in[2];
		c.delay_ms = get_u16_le(&in[3]);
		if (check_mix_intensity(c.color_mix, c.intensity_pct) != THINGY_OK || c.delay_ms < 50 ||
		    c.delay_ms > 10000) {
			return THINGY_ERR_RANGE;
		}
		break;
	case THINGY_LED_ONE_SHOT:
		if (len != 3) {
			return THINGY_ERR_LEN;
		}
		c.color_mix = in[1];
		c.intensity_pct = in[2];
		if (check_mix_intensity(c.color_mix, c.intensity_pct) != THINGY_OK) {
			return THINGY_ERR_RANGE;
		}
		break;
	default:
		return THINGY_ERR_RANGE;
	}
	*out = c;
	return THINGY_OK;
}

size_t thingy_encode_led(const thingy_led_cmd_t *cmd, uint8_t *out, size_t out_len)
{
	if (cmd == NULL || out == NULL) {
		return 0;
	}
	size_t n;
	switch (cmd->mode) {
	case THINGY_LED_OFF:
		n = 1;
		break;
	case THINGY_LED_CONSTANT:
		n = 4;
		break;
	case THINGY_LED_BREATHE:
		n = 5;
		break;
	case THINGY_LED_ONE_SHOT:
		n = 3;
		break;
	default:
		return 0;
	}
	if (out_len < n) {
		return 0;
	}
	out[0] = (uint8_t)cmd->mode;
	if (cmd->mode == THINGY_LED_CONSTANT) {
		out[1] = cmd->r;
		out[2] = cmd->g;
		out[3] = cmd->b;
	} else if (n >= 3) {
		out[1] = cmd->color_mix;
		out[2] = cmd->intensity_pct;
		if (n == 5) {
			(void)put_u16_le(&out[3], cmd->delay_ms);
		}
	}
	return n;
}

uint8_t thingy_battery_percent_from_mv(uint16_t mv)
{
	/* LiPo-Leerlaufkurve, ANNAHME (kein Akku-Datenblatt); 0 % = Abschaltschwelle 3.3 V (BUDGETS) */
	static const struct {
		uint16_t mv;
		uint8_t pct;
	} k[] = {{3300, 0}, {3600, 10}, {3700, 25}, {3800, 50}, {3900, 65}, {4000, 80}, {4100, 92}, {4200, 100}};
	const size_t n = sizeof k / sizeof k[0];
	if (mv <= k[0].mv) {
		return 0;
	}
	for (size_t i = 1; i < n; i++) {
		if (mv <= k[i].mv) {
			const uint32_t span = (uint32_t)(k[i].mv - k[i - 1].mv);
			const uint32_t pos = (uint32_t)(mv - k[i - 1].mv);
			return (uint8_t)(k[i - 1].pct + (pos * (uint32_t)(k[i].pct - k[i - 1].pct) + span / 2) / span);
		}
	}
	return 100;
}

static uint8_t *put_xyz_flags(uint8_t *out, const thingy_xyz_t *v, float scale, uint16_t *flags, unsigned shift)
{
	const float in[3] = {v->x, v->y, v->z};
	for (unsigned i = 0; i < 3; i++) {
		const int16_t s = to_i16_saturated(in[i], scale);
		if (s == INT16_MAX || s == INT16_MIN) {
			*flags |= (uint16_t)(1u << (shift + i));
		}
		out = put_i16_le(out, s);
	}
	return out;
}

size_t thingy_encode_raw_hr(const thingy_raw_hr_t *in, uint8_t *out, size_t out_len)
{
	if (in == NULL || out == NULL || out_len < THINGY_RAW_HR_LEN) {
		return 0;
	}
	uint16_t flags = in->flags;
	uint8_t *p = put_xyz_flags(out, &in->accel, 1024.0f, &flags, 0);
	p = put_xyz_flags(p, &in->gyro, 8.0f, &flags, 3);
	p = put_u16_le(p, in->sample_counter);
	(void)put_u16_le(p, flags);
	return THINGY_RAW_HR_LEN;
}

void thingy_button_init(thingy_button_t *b)
{
	memset(b, 0, sizeof *b);
}

thingy_button_evt_t thingy_button_update(thingy_button_t *b, bool pressed, uint32_t now_ms)
{
	if (pressed && !b->pressed) {
		b->pressed = true;
		b->long_reported = false;
		b->t_down_ms = now_ms;
		return THINGY_BTN_EVT_NONE;
	}
	if (pressed) {
		if (!b->long_reported && (uint32_t)(now_ms - b->t_down_ms) >= THINGY_BUTTON_LONG_MS) {
			b->long_reported = true;
			return THINGY_BTN_EVT_LONG;
		}
		return THINGY_BTN_EVT_NONE;
	}
	if (b->pressed) {
		b->pressed = false;
		return b->long_reported ? THINGY_BTN_EVT_NONE : THINGY_BTN_EVT_SHORT;
	}
	return THINGY_BTN_EVT_NONE;
}
