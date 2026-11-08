#include "vbat.h"

uint16_t vbat_scale_mv(int32_t adc_mv, uint32_t num, uint32_t den)
{
	if (den == 0u || adc_mv <= 0) {
		return 0;
	}
	const uint64_t v = (uint64_t)(uint32_t)adc_mv * num / den;
	return (uint16_t)(v > UINT16_MAX ? UINT16_MAX : v);
}

int vbat_measure(const vbat_port_t *p, uint32_t num, uint32_t den, uint16_t *mv_out)
{
	*mv_out = 0;
	int rc = p->set_enable(p->ctx, 1);
	if (rc == 0) {
		p->sleep_ms(p->ctx, VBAT_SETTLE_MS);
		int32_t mv = 0;
		rc = p->read_adc_mv(p->ctx, &mv);
		if (rc == 0) {
			*mv_out = vbat_scale_mv(mv, num, den);
		}
	}
	(void)p->set_enable(p->ctx, 0); /* Teiler immer abschalten (Ruhestrom) */
	return rc;
}
