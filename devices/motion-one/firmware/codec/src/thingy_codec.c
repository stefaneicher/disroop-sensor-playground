#include "thingy_codec.h"

#include <math.h>

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
