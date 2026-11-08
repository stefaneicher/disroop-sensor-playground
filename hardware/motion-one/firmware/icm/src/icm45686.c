/* ICM-45686 Registerlogik. QUELLE: TDK hal_tdk (siehe icm45686.h). */
#include "icm45686.h"

static int16_t get_i16(const uint8_t *p)
{
	return (int16_t)(uint16_t)(p[0] | (p[1] << 8));
}

icm_frame_status_t icm45686_parse_frame(const uint8_t *in, size_t len, icm_sample_t *out)
{
	if (in == NULL || out == NULL || len < ICM_FIFO_FRAME_LEN) {
		return ICM_FRAME_SHORT;
	}
	const uint8_t hdr = in[0];
	if ((hdr & (ICM_FIFO_HDR_EXT | ICM_FIFO_HDR_20BIT)) ||
	    (hdr & (ICM_FIFO_HDR_ACCEL | ICM_FIFO_HDR_GYRO)) != (ICM_FIFO_HDR_ACCEL | ICM_FIFO_HDR_GYRO)) {
		return ICM_FRAME_INVALID;
	}
	for (int i = 0; i < 3; i++) {
		const int16_t a = get_i16(&in[1 + 2 * i]);
		const int16_t g = get_i16(&in[7 + 2 * i]);
		if (a == ICM_INVALID_SAMPLE || g == ICM_INVALID_SAMPLE) {
			return ICM_FRAME_INVALID;
		}
		out->accel_g[i] = (float)a / ICM_ACCEL_LSB_PER_G;
		out->gyro_dps[i] = (float)g / ICM_GYRO_LSB_PER_DPS;
		/* 0x8000 ist "ungueltig", daher Saettigung bei +-32767 */
		out->accel_sat[i] = (a == INT16_MAX || a == -INT16_MAX);
		out->gyro_sat[i] = (g == INT16_MAX || g == -INT16_MAX);
	}
	out->timestamp = (uint16_t)(in[14] | (in[15] << 8));
	return ICM_FRAME_OK;
}

static int wr(const icm_bus_t *bus, uint8_t reg, uint8_t v)
{
	return bus->write(bus->ctx, reg, &v, 1);
}

icm_status_t icm45686_ireg_write(const icm_bus_t *bus, uint16_t addr, uint8_t value)
{
	/* hal_tdk write_sreg: Adresse High/Low + Daten in einem Burst, danach >= 4 us warten */
	const uint8_t buf[3] = {(uint8_t)(addr >> 8), (uint8_t)addr, value};
	if (bus->write(bus->ctx, ICM_REG_IREG_ADDR_15_8, buf, sizeof buf) != 0) {
		return ICM_ERR_BUS;
	}
	bus->delay_us(bus->ctx, 4);
	return ICM_OK;
}

static icm_status_t configure_measurement(const icm_bus_t *bus, uint8_t odr)
{
	int e = 0;
	e |= wr(bus, ICM_REG_TMST_WOM_CONFIG, 0);
	e |= wr(bus, ICM_REG_INT1_CONFIG1, 0);
	e |= wr(bus, ICM_REG_ACCEL_CONFIG0, ICM_ACCEL_FS_32G | odr);
	e |= wr(bus, ICM_REG_GYRO_CONFIG0, ICM_GYRO_FS_4000DPS | odr);
	e |= wr(bus, ICM_REG_INT1_CONFIG0, ICM_INT1_FIFO_THS);
	e |= wr(bus, ICM_REG_PWR_MGMT0, ICM_PWR_ACCEL_LN | ICM_PWR_GYRO_LN);
	if (e) {
		return ICM_ERR_BUS;
	}
	bus->delay_us(bus->ctx, 70000); /* Gyro-Startzeit 70 ms laut hal_tdk */
	return ICM_OK;
}

icm_status_t icm45686_init(const icm_bus_t *bus, uint8_t odr, uint16_t watermark_frames)
{
	if (wr(bus, ICM_REG_MISC2, ICM_MISC2_SOFT_RST)) {
		return ICM_ERR_BUS;
	}
	bus->delay_us(bus->ctx, 1000);
	uint8_t who = 0;
	if (bus->read(bus->ctx, ICM_REG_WHO_AM_I, &who, 1)) {
		return ICM_ERR_BUS;
	}
	if (who != ICM_WHO_AM_I_VALUE) {
		return ICM_ERR_WHOAMI;
	}
	int e = 0;
	e |= wr(bus, ICM_REG_INT1_CONFIG2, ICM_INT1_PUSH_PULL_PULSED_HIGH);
	e |= wr(bus, ICM_REG_INT2_CONFIG2, ICM_INT1_PUSH_PULL_PULSED_HIGH); /* INT2 push-pull (PINOUT), ungenutzt */
	e |= wr(bus, ICM_REG_FIFO_CONFIG3, 0);
	e |= wr(bus, ICM_REG_FIFO_CONFIG0, ICM_FIFO_MODE_STREAM | ICM_FIFO_DEPTH_MAX);
	e |= wr(bus, ICM_REG_FIFO_CONFIG1_0, (uint8_t)watermark_frames);
	e |= wr(bus, ICM_REG_FIFO_CONFIG1_1, (uint8_t)(watermark_frames >> 8));
	e |= wr(bus, ICM_REG_FIFO_CONFIG2, ICM_FIFO_FLUSH | ICM_FIFO_WM_GT_TH);
	e |= wr(bus, ICM_REG_FIFO_CONFIG3, ICM_FIFO_IF_EN | ICM_FIFO_ACCEL_EN | ICM_FIFO_GYRO_EN);
	if (e) {
		return ICM_ERR_BUS;
	}
	return configure_measurement(bus, odr);
}

icm_status_t icm45686_fifo_count(const icm_bus_t *bus, uint16_t *frames)
{
	uint8_t b[2];
	if (bus->read(bus->ctx, ICM_REG_FIFO_COUNT_0, b, 2)) {
		return ICM_ERR_BUS;
	}
	*frames = (uint16_t)(b[0] | (b[1] << 8));
	return ICM_OK;
}

icm_status_t icm45686_enter_wom(const icm_bus_t *bus, uint16_t threshold_mg)
{
	uint32_t lsb = ((uint32_t)threshold_mg * 256u + 500u) / 1000u;
	if (lsb > 255u) {
		lsb = 255u;
	}
	int e = 0;
	e |= wr(bus, ICM_REG_INT1_CONFIG0, 0);
	e |= wr(bus, ICM_REG_PWR_MGMT0, 0);
	e |= wr(bus, ICM_REG_ACCEL_CONFIG0, ICM_ACCEL_FS_32G | ICM_ODR_25HZ);
	if (e) {
		return ICM_ERR_BUS;
	}
	for (uint16_t i = 0; i < 3; i++) {
		if (icm45686_ireg_write(bus, (uint16_t)(ICM_IREG_ACCEL_WOM_X_THR + i), (uint8_t)lsb) != ICM_OK) {
			return ICM_ERR_BUS;
		}
	}
	e |= wr(bus, ICM_REG_TMST_WOM_CONFIG, ICM_WOM_MODE_PREV);
	e |= wr(bus, ICM_REG_PWR_MGMT0, ICM_PWR_ACCEL_LP);
	if (e) {
		return ICM_ERR_BUS;
	}
	bus->delay_us(bus->ctx, 10000); /* Accel-Startzeit 10 ms */
	e |= wr(bus, ICM_REG_TMST_WOM_CONFIG, ICM_WOM_EN | ICM_WOM_MODE_PREV);
	e |= wr(bus, ICM_REG_INT1_CONFIG1, ICM_INT1_WOM_XYZ);
	return e ? ICM_ERR_BUS : ICM_OK;
}

icm_status_t icm45686_exit_wom(const icm_bus_t *bus, uint8_t odr)
{
	if (wr(bus, ICM_REG_FIFO_CONFIG2, ICM_FIFO_FLUSH | ICM_FIFO_WM_GT_TH)) {
		return ICM_ERR_BUS;
	}
	return configure_measurement(bus, odr);
}
