/* Host-Tests ICM-45686: FIFO-Frame-Parser und Initialisierungssequenz ueber Fake-Bus. */
#include <string.h>
#include "unity.h"
#include "icm45686.h"

typedef struct {
	uint8_t regs[256];
	uint8_t log_reg[128];
	uint8_t log_val[128];
	int n;
	int fail_after;
} fake_t;

static fake_t fk;

static int fwrite_(void *ctx, uint8_t reg, const uint8_t *d, size_t len)
{
	fake_t *f = ctx;
	if (f->fail_after >= 0 && f->n >= f->fail_after) {
		return -5;
	}
	for (size_t i = 0; i < len; i++) {
		f->regs[(uint8_t)(reg + i)] = d[i];
		f->log_reg[f->n] = (uint8_t)(reg + i);
		f->log_val[f->n++] = d[i];
	}
	if (reg == ICM_REG_MISC2 && (d[0] & ICM_MISC2_SOFT_RST)) {
		f->regs[ICM_REG_MISC2] = 0; /* Reset erledigt */
	}
	return 0;
}

static int fread_(void *ctx, uint8_t reg, uint8_t *d, size_t len)
{
	fake_t *f = ctx;
	memcpy(d, &f->regs[reg], len);
	return 0;
}

static void fdelay(void *ctx, uint32_t us) { (void)ctx; (void)us; }

static const icm_bus_t bus = {fwrite_, fread_, fdelay, &fk};

void setUp(void)
{
	memset(&fk, 0, sizeof fk);
	fk.fail_after = -1;
	fk.regs[ICM_REG_WHO_AM_I] = ICM_WHO_AM_I_VALUE;
}
void tearDown(void) {}

static int last_write(uint8_t reg)
{
	for (int i = fk.n - 1; i >= 0; i--) {
		if (fk.log_reg[i] == reg) {
			return fk.log_val[i];
		}
	}
	return -1;
}

static int first_index(uint8_t reg, uint8_t val)
{
	for (int i = 0; i < fk.n; i++) {
		if (fk.log_reg[i] == reg && fk.log_val[i] == val) {
			return i;
		}
	}
	return -1;
}

static void test_parse_frame_scales_and_timestamp(void)
{
	/* accel (1024, -512, 0) = (1, -0.5, 0) g; gyro (8192, 0, -4096) /8.192 = (1000, 0, -500) dps */
	const uint8_t fr[16] = {0x68, 0x00, 0x04, 0x00, 0xFE, 0x00, 0x00,
				0x00, 0x20, 0x00, 0x00, 0x00, 0xF0, 0x19, 0x34, 0x12};
	icm_sample_t s;
	TEST_ASSERT_EQUAL_INT(ICM_FRAME_OK, icm45686_parse_frame(fr, 16, &s));
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, 1.0f, s.accel_g[0]);
	TEST_ASSERT_FLOAT_WITHIN(1e-4f, -0.5f, s.accel_g[1]);
	TEST_ASSERT_FLOAT_WITHIN(1e-3f, 1000.0f, s.gyro_dps[0]);
	TEST_ASSERT_FLOAT_WITHIN(1e-3f, -500.0f, s.gyro_dps[2]);
	TEST_ASSERT_EQUAL_HEX16(0x1234, s.timestamp);
	TEST_ASSERT_FALSE(s.accel_sat[0]);
}

static void test_parse_frame_flags_saturation(void)
{
	const uint8_t fr[16] = {0x60, 0xFF, 0x7F, 0x01, 0x80, 0, 0, 0xFF, 0x7F, 0, 0, 0x01, 0x80, 0, 0, 0};
	icm_sample_t s;
	TEST_ASSERT_EQUAL_INT(ICM_FRAME_OK, icm45686_parse_frame(fr, 16, &s));
	TEST_ASSERT_TRUE(s.accel_sat[0]);
	TEST_ASSERT_TRUE(s.accel_sat[1]);
	TEST_ASSERT_FALSE(s.accel_sat[2]);
	TEST_ASSERT_TRUE(s.gyro_sat[0]);
	TEST_ASSERT_TRUE(s.gyro_sat[2]);
}

static void test_parse_frame_rejects_invalid(void)
{
	uint8_t fr[16] = {0x60, 0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
	icm_sample_t s;
	TEST_ASSERT_EQUAL_INT(ICM_FRAME_INVALID, icm45686_parse_frame(fr, 16, &s));
	fr[0] = 0x80; /* leeres/erweitertes Paket */
	fr[2] = 0;
	TEST_ASSERT_EQUAL_INT(ICM_FRAME_INVALID, icm45686_parse_frame(fr, 16, &s));
	fr[0] = 0x40; /* nur accel: nicht unterstuetzt */
	TEST_ASSERT_EQUAL_INT(ICM_FRAME_INVALID, icm45686_parse_frame(fr, 16, &s));
	TEST_ASSERT_EQUAL_INT(ICM_FRAME_SHORT, icm45686_parse_frame(fr, 15, &s));
}

static void test_init_sequence(void)
{
	TEST_ASSERT_EQUAL_INT(ICM_OK, icm45686_init(&bus, ICM_ODR_400HZ, 4));
	TEST_ASSERT_EQUAL_INT(ICM_MISC2_SOFT_RST, fk.log_val[0]);
	TEST_ASSERT_EQUAL_INT(ICM_REG_MISC2, fk.log_reg[0]);
	TEST_ASSERT_EQUAL_INT(ICM_ACCEL_FS_32G | ICM_ODR_400HZ, last_write(ICM_REG_ACCEL_CONFIG0));
	TEST_ASSERT_EQUAL_INT(ICM_GYRO_FS_4000DPS | ICM_ODR_400HZ, last_write(ICM_REG_GYRO_CONFIG0));
	TEST_ASSERT_EQUAL_INT(ICM_FIFO_MODE_STREAM | ICM_FIFO_DEPTH_MAX, last_write(ICM_REG_FIFO_CONFIG0));
	TEST_ASSERT_EQUAL_INT(4, last_write(ICM_REG_FIFO_CONFIG1_0));
	TEST_ASSERT_EQUAL_INT(0, last_write(ICM_REG_FIFO_CONFIG1_1));
	TEST_ASSERT_EQUAL_INT(ICM_FIFO_IF_EN | ICM_FIFO_ACCEL_EN | ICM_FIFO_GYRO_EN, last_write(ICM_REG_FIFO_CONFIG3));
	TEST_ASSERT_EQUAL_INT(ICM_INT1_FIFO_THS, last_write(ICM_REG_INT1_CONFIG0));
	TEST_ASSERT_EQUAL_INT(ICM_PWR_ACCEL_LN | ICM_PWR_GYRO_LN, last_write(ICM_REG_PWR_MGMT0));
	/* hal_tdk: FIFO-Modus vor if_en; Sensoren erst nach FIFO-Konfiguration einschalten */
	const int mode = first_index(ICM_REG_FIFO_CONFIG0, ICM_FIFO_MODE_STREAM | ICM_FIFO_DEPTH_MAX);
	const int ifen = first_index(ICM_REG_FIFO_CONFIG3, ICM_FIFO_IF_EN | ICM_FIFO_ACCEL_EN | ICM_FIFO_GYRO_EN);
	const int pwr = first_index(ICM_REG_PWR_MGMT0, ICM_PWR_ACCEL_LN | ICM_PWR_GYRO_LN);
	TEST_ASSERT_TRUE(mode >= 0 && ifen > mode && pwr > ifen);
}

static void test_init_wrong_whoami_and_bus_error(void)
{
	fk.regs[ICM_REG_WHO_AM_I] = 0x42;
	TEST_ASSERT_EQUAL_INT(ICM_ERR_WHOAMI, icm45686_init(&bus, ICM_ODR_400HZ, 4));
	setUp();
	fk.fail_after = 3;
	TEST_ASSERT_EQUAL_INT(ICM_ERR_BUS, icm45686_init(&bus, ICM_ODR_400HZ, 4));
}

static void test_fifo_count(void)
{
	fk.regs[ICM_REG_FIFO_COUNT_0] = 0x05;
	fk.regs[ICM_REG_FIFO_COUNT_0 + 1] = 0x01;
	uint16_t n = 0;
	TEST_ASSERT_EQUAL_INT(ICM_OK, icm45686_fifo_count(&bus, &n));
	TEST_ASSERT_EQUAL_UINT16(0x0105, n);
}

static void test_ireg_write_and_wom(void)
{
	TEST_ASSERT_EQUAL_INT(ICM_OK, icm45686_ireg_write(&bus, 0xA27E, 0x33));
	TEST_ASSERT_EQUAL_INT(0xA2, fk.log_val[0]);
	TEST_ASSERT_EQUAL_INT(ICM_REG_IREG_ADDR_15_8, fk.log_reg[0]);
	TEST_ASSERT_EQUAL_INT(0x7E, fk.log_val[1]);
	TEST_ASSERT_EQUAL_INT(0x33, fk.log_val[2]);
	TEST_ASSERT_EQUAL_INT(ICM_REG_IREG_DATA, fk.log_reg[2]);
	setUp();
	TEST_ASSERT_EQUAL_INT(ICM_OK, icm45686_enter_wom(&bus, 100));
	/* 100 mg * 256/1000 = 25.6 -> 26 LSB (BERECHNUNG) */
	TEST_ASSERT_EQUAL_INT(26, last_write(ICM_REG_IREG_DATA));
	TEST_ASSERT_EQUAL_INT(ICM_PWR_ACCEL_LP, last_write(ICM_REG_PWR_MGMT0));
	TEST_ASSERT_EQUAL_INT(ICM_ACCEL_FS_32G | ICM_ODR_25HZ, last_write(ICM_REG_ACCEL_CONFIG0));
	TEST_ASSERT_EQUAL_INT(ICM_WOM_EN | ICM_WOM_MODE_PREV, last_write(ICM_REG_TMST_WOM_CONFIG));
	TEST_ASSERT_EQUAL_INT(ICM_INT1_WOM_XYZ, last_write(ICM_REG_INT1_CONFIG1));
	TEST_ASSERT_EQUAL_INT(0, last_write(ICM_REG_INT1_CONFIG0));
	TEST_ASSERT_EQUAL_INT(ICM_OK, icm45686_exit_wom(&bus, ICM_ODR_400HZ));
	TEST_ASSERT_EQUAL_INT(0, last_write(ICM_REG_TMST_WOM_CONFIG));
	TEST_ASSERT_EQUAL_INT(0, last_write(ICM_REG_INT1_CONFIG1));
	TEST_ASSERT_EQUAL_INT(ICM_INT1_FIFO_THS, last_write(ICM_REG_INT1_CONFIG0));
	TEST_ASSERT_EQUAL_INT(ICM_PWR_ACCEL_LN | ICM_PWR_GYRO_LN, last_write(ICM_REG_PWR_MGMT0));
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_parse_frame_scales_and_timestamp);
	RUN_TEST(test_parse_frame_flags_saturation);
	RUN_TEST(test_parse_frame_rejects_invalid);
	RUN_TEST(test_init_sequence);
	RUN_TEST(test_init_wrong_whoami_and_bus_error);
	RUN_TEST(test_fifo_count);
	RUN_TEST(test_ireg_write_and_wom);
	return UNITY_END();
}
