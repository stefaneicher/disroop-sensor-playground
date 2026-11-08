/* Host-Tests VBAT-Messsequenz (PCB-Hinweis: VBAT_EN >= 25 ms vor ADC, Teiler 100k/100k -> Faktor 2). */
#include "unity.h"
#include "vbat.h"

typedef struct {
	char log[16];
	int n;
	uint32_t slept_ms;
	int adc_mv;
	int adc_rc;
	int en_level;
} fake_t;

static fake_t fk;

static int f_en(void *c, int on) { fake_t *f = c; f->log[f->n++] = on ? 'E' : 'D'; f->en_level = on; return 0; }
static void f_sleep(void *c, uint32_t ms) { fake_t *f = c; f->log[f->n++] = 'S'; f->slept_ms += ms; }
static int f_adc(void *c, int32_t *mv)
{
	fake_t *f = c;
	f->log[f->n++] = 'A';
	TEST_ASSERT_EQUAL_INT_MESSAGE(1, f->en_level, "ADC ohne VBAT_EN");
	TEST_ASSERT_TRUE_MESSAGE(f->slept_ms >= VBAT_SETTLE_MS, "Einschwingzeit < 25 ms");
	*mv = f->adc_mv;
	return f->adc_rc;
}

static const vbat_port_t port = {.ctx = &fk, .set_enable = f_en, .sleep_ms = f_sleep, .read_adc_mv = f_adc};

void setUp(void) { fk = (fake_t){.adc_mv = 1900}; }
void tearDown(void) {}

static void test_settle_constant_at_least_25ms(void) { TEST_ASSERT_TRUE(VBAT_SETTLE_MS >= 25u); }

static void test_sequence_enable_wait_read_disable(void)
{
	uint16_t mv = 0;
	TEST_ASSERT_EQUAL_INT(0, vbat_measure(&port, 2, 1, &mv));
	TEST_ASSERT_EQUAL_STRING("ESAD", fk.log);
	TEST_ASSERT_EQUAL_INT(0, fk.en_level);
}

static void test_divider_factor_two(void)
{
	uint16_t mv = 0;
	fk.adc_mv = 1850; /* 3.70 V Akku */
	TEST_ASSERT_EQUAL_INT(0, vbat_measure(&port, 2, 1, &mv));
	TEST_ASSERT_EQUAL_UINT16(3700, mv);
	TEST_ASSERT_EQUAL_UINT16(4200, vbat_scale_mv(2100, 2, 1));
	TEST_ASSERT_EQUAL_UINT16(0, vbat_scale_mv(-5, 2, 1));
	TEST_ASSERT_EQUAL_UINT16(UINT16_MAX, vbat_scale_mv(40000, 2, 1));
	TEST_ASSERT_EQUAL_UINT16(0, vbat_scale_mv(1000, 2, 0));
}

static void test_adc_error_still_disables(void)
{
	uint16_t mv = 123;
	fk.adc_rc = -5;
	TEST_ASSERT_NOT_EQUAL(0, vbat_measure(&port, 2, 1, &mv));
	TEST_ASSERT_EQUAL_UINT16(0, mv);
	TEST_ASSERT_EQUAL_INT(0, fk.en_level);
	TEST_ASSERT_EQUAL_CHAR('D', fk.log[fk.n - 1]);
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_settle_constant_at_least_25ms);
	RUN_TEST(test_sequence_enable_wait_read_disable);
	RUN_TEST(test_divider_factor_two);
	RUN_TEST(test_adc_error_still_disables);
	return UNITY_END();
}
