/* Madgwick-IMU-Filter nach S. Madgwick, "An efficient orientation filter for inertial and
 * inertial/magnetic sensor arrays" (2010), Gradientenabstieg 6-Achsen-Variante. */
#include "motion_fusion.h"

#include <math.h>
#include <string.h>

#define DEG2RAD 0.017453292519943295f
#define RAD2DEG 57.29577951308232f

void madgwick_init(madgwick_t *f, float beta)
{
	f->q[0] = 1.0f;
	f->q[1] = f->q[2] = f->q[3] = 0.0f;
	f->beta = beta;
}

void madgwick_update(madgwick_t *f, const float gyro_dps[3], const float accel_g[3], float dt_s)
{
	float q0 = f->q[0], q1 = f->q[1], q2 = f->q[2], q3 = f->q[3];
	const float gx = gyro_dps[0] * DEG2RAD, gy = gyro_dps[1] * DEG2RAD, gz = gyro_dps[2] * DEG2RAD;
	float ax = accel_g[0], ay = accel_g[1], az = accel_g[2];

	float qd0 = 0.5f * (-q1 * gx - q2 * gy - q3 * gz);
	float qd1 = 0.5f * (q0 * gx + q2 * gz - q3 * gy);
	float qd2 = 0.5f * (q0 * gy - q1 * gz + q3 * gx);
	float qd3 = 0.5f * (q0 * gz + q1 * gy - q2 * gx);

	const float an = sqrtf(ax * ax + ay * ay + az * az);
	if (an > 1e-6f) {
		ax /= an;
		ay /= an;
		az /= an;
		const float _2q0 = 2.0f * q0, _2q1 = 2.0f * q1, _2q2 = 2.0f * q2, _2q3 = 2.0f * q3;
		const float _4q0 = 4.0f * q0, _4q1 = 4.0f * q1, _4q2 = 4.0f * q2;
		const float _8q1 = 8.0f * q1, _8q2 = 8.0f * q2;
		const float q0q0 = q0 * q0, q1q1 = q1 * q1, q2q2 = q2 * q2, q3q3 = q3 * q3;
		float s0 = _4q0 * q2q2 + _2q2 * ax + _4q0 * q1q1 - _2q1 * ay;
		float s1 = _4q1 * q3q3 - _2q3 * ax + 4.0f * q0q0 * q1 - _2q0 * ay - _4q1 + _8q1 * q1q1 +
			   _8q1 * q2q2 + _4q1 * az;
		float s2 = 4.0f * q0q0 * q2 + _2q0 * ax + _4q2 * q3q3 - _2q3 * ay - _4q2 + _8q2 * q1q1 +
			   _8q2 * q2q2 + _4q2 * az;
		float s3 = 4.0f * q1q1 * q3 - _2q1 * ax + 4.0f * q2q2 * q3 - _2q2 * ay;
		const float sn = sqrtf(s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3);
		if (sn > 1e-9f) {
			qd0 -= f->beta * s0 / sn;
			qd1 -= f->beta * s1 / sn;
			qd2 -= f->beta * s2 / sn;
			qd3 -= f->beta * s3 / sn;
		}
	}
	q0 += qd0 * dt_s;
	q1 += qd1 * dt_s;
	q2 += qd2 * dt_s;
	q3 += qd3 * dt_s;
	const float n = sqrtf(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
	f->q[0] = q0 / n;
	f->q[1] = q1 / n;
	f->q[2] = q2 / n;
	f->q[3] = q3 / n;
}

void quat_to_euler_deg(const float q[4], float *roll, float *pitch, float *yaw)
{
	const float w = q[0], x = q[1], y = q[2], z = q[3];
	*roll = atan2f(2.0f * (w * x + y * z), 1.0f - 2.0f * (x * x + y * y)) * RAD2DEG;
	float sp = 2.0f * (w * y - z * x);
	sp = sp > 1.0f ? 1.0f : (sp < -1.0f ? -1.0f : sp);
	*pitch = asinf(sp) * RAD2DEG;
	*yaw = atan2f(2.0f * (w * z + x * y), 1.0f - 2.0f * (y * y + z * z)) * RAD2DEG;
}

float heading_from_yaw_deg(float yaw_deg)
{
	float h = fmodf(yaw_deg, 360.0f);
	return h < 0.0f ? h + 360.0f : h;
}

void bias_cal_init(bias_cal_t *c, uint32_t window_samples)
{
	memset(c, 0, sizeof *c);
	c->gyro_thr_dps = 3.0f;
	c->accel_thr_g = 0.05f;
	c->window = window_samples ? window_samples : 1u;
}

void bias_cal_request(bias_cal_t *c)
{
	c->requested = true;
	c->count = 0;
	c->sum[0] = c->sum[1] = c->sum[2] = 0.0f;
}

static bool gyro_quiet(const bias_cal_t *c, const float g[3])
{
	return fabsf(g[0]) < c->gyro_thr_dps && fabsf(g[1]) < c->gyro_thr_dps && fabsf(g[2]) < c->gyro_thr_dps;
}

bool bias_cal_is_at_rest(const bias_cal_t *c, const float gyro_dps[3], const float accel_g[3])
{
	const float an = sqrtf(accel_g[0] * accel_g[0] + accel_g[1] * accel_g[1] + accel_g[2] * accel_g[2]);
	return gyro_quiet(c, gyro_dps) && fabsf(an - 1.0f) < c->accel_thr_g;
}

bool bias_cal_feed(bias_cal_t *c, const float gyro_dps[3], const float accel_g[3])
{
	const bool ok = c->requested ? gyro_quiet(c, gyro_dps) : bias_cal_is_at_rest(c, gyro_dps, accel_g);
	if (!ok) {
		c->count = 0;
		c->sum[0] = c->sum[1] = c->sum[2] = 0.0f;
		return false;
	}
	for (int i = 0; i < 3; i++) {
		c->sum[i] += gyro_dps[i];
	}
	if (++c->count < c->window) {
		return false;
	}
	for (int i = 0; i < 3; i++) {
		c->bias[i] = c->sum[i] / (float)c->count;
		c->sum[i] = 0.0f;
	}
	c->count = 0;
	c->valid = true;
	c->requested = false;
	c->calibrations++;
	return true;
}

void bias_cal_apply(const bias_cal_t *c, const float gyro_in[3], float gyro_out[3])
{
	for (int i = 0; i < 3; i++) {
		gyro_out[i] = gyro_in[i] - (c->valid ? c->bias[i] : 0.0f);
	}
}
