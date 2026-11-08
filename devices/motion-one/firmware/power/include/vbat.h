/* VBAT-Messung ueber schaltbaren Teiler (PINOUT_V1: VBAT_EN P0.05, VBAT_ADC AIN2, 100k/100k).
 * Reines C ohne Zephyr; Hardware ueber Port. */
#ifndef VBAT_H
#define VBAT_H

#include <stdint.h>

/* QUELLE PINOUT_V1.json/PCB-Handoff 2026-11-07: Freigabe >= 25 ms vor Messung (tau 5 ms, 5 tau -> < 1 %). */
#define VBAT_SETTLE_MS 25u

typedef struct {
	void *ctx;
	int (*set_enable)(void *ctx, int on);
	void (*sleep_ms)(void *ctx, uint32_t ms);
	int (*read_adc_mv)(void *ctx, int32_t *mv);
} vbat_port_t;

/* adc_mv * num / den, geklemmt auf 0..UINT16_MAX; den == 0 -> 0. */
uint16_t vbat_scale_mv(int32_t adc_mv, uint32_t num, uint32_t den);

/* EN an, >= VBAT_SETTLE_MS warten, ADC lesen, EN immer aus. 0 = ok; Fehler -> *mv_out = 0. */
int vbat_measure(const vbat_port_t *p, uint32_t num, uint32_t den, uint16_t *mv_out);

#endif
