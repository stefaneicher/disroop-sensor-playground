/* 6-Achsen-Sensorfusion (Madgwick, IMU-Variante ohne Magnetometer) und Gyro-Bias-Kalibrierung.
 * Reines C, ohne Hardwareabhaengigkeit. Einheiten: accel in g, gyro in dps, dt in s. */
#ifndef MOTION_FUSION_H
#define MOTION_FUSION_H

#include <stdbool.h>
#include <stdint.h>

typedef struct {
	float q[4]; /* w, x, y, z; Einheitsquaternion, Sensor -> Welt */
	float beta; /* Gradientenschritt, ANNAHME 0.1 */
} madgwick_t;

void madgwick_init(madgwick_t *f, float beta);
void madgwick_update(madgwick_t *f, const float gyro_dps[3], const float accel_g[3], float dt_s);

/* Euler in Grad (ZYX: roll um x, pitch um y, yaw um z); yaw in (-180, 180]. */
void quat_to_euler_deg(const float q[4], float *roll, float *pitch, float *yaw);
/* Heading in Grad [0, 360) aus yaw. */
float heading_from_yaw_deg(float yaw_deg);

/* Bias-Kalibrierung: Ruheerkennung (|gyro| und ||a|-1g| unter Schwellen fuer window Samples)
 * oder erzwungen per Taster lang (dann nur das Gyro-Kriterium, kein Beschleunigungs-Kriterium). */
typedef struct {
	float gyro_thr_dps;  /* ANNAHME 3 dps */
	float accel_thr_g;   /* ANNAHME 0.05 g */
	uint32_t window;     /* Samples, z. B. 1 s bei ODR */
	uint32_t count;
	float sum[3];
	float bias[3];
	bool requested;
	bool valid;
	uint32_t calibrations;
} bias_cal_t;

void bias_cal_init(bias_cal_t *c, uint32_t window_samples);
void bias_cal_request(bias_cal_t *c);
/* Fuettert ein rohes Sample; gibt true zurueck, wenn gerade ein neuer Bias uebernommen wurde. */
bool bias_cal_feed(bias_cal_t *c, const float gyro_dps[3], const float accel_g[3]);
/* Ruhe im letzten Sample (fuer Energiesparen nutzbar). */
bool bias_cal_is_at_rest(const bias_cal_t *c, const float gyro_dps[3], const float accel_g[3]);
void bias_cal_apply(const bias_cal_t *c, const float gyro_in[3], float gyro_out[3]);

#endif
