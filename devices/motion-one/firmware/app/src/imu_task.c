/* IMU-Thread: INT1 (FIFO-Watermark) -> FIFO lesen -> Bias -> Madgwick -> BLE. Adapter: Zephyr-SPI. */
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/drivers/spi.h>
#include <zephyr/drivers/gpio.h>
#include "app.h"
#include "icm45686.h"
#include "motion_fusion.h"

LOG_MODULE_REGISTER(imu, LOG_LEVEL_INF);

#define IMU_NODE DT_NODELABEL(imu)
#define WATERMARK_FRAMES 2u /* 2 / 400 Hz = 5 ms Puffer (Latenzbudget < 10 ms), BERECHNUNG */
#define MAX_FRAMES 16u

static const struct spi_dt_spec spi = SPI_DT_SPEC_GET(IMU_NODE, SPI_WORD_SET(8) | SPI_TRANSFER_MSB | SPI_OP_MODE_CONTROLLER);
static const struct gpio_dt_spec int1 = GPIO_DT_SPEC_GET(IMU_NODE, int1_gpios);
static struct gpio_callback int1_cb;
static K_SEM_DEFINE(data_sem, 0, 1);
static volatile uint32_t rest_samples;
static bias_cal_t cal;
static madgwick_t fus;
static uint16_t sample_counter;

static int bus_write(void *ctx, uint8_t reg, const uint8_t *d, size_t len)
{
	ARG_UNUSED(ctx);
	const struct spi_buf b[2] = {{.buf = &reg, .len = 1}, {.buf = (void *)d, .len = len}};
	const struct spi_buf_set tx = {b, 2};
	return spi_write_dt(&spi, &tx);
}

static int bus_read(void *ctx, uint8_t reg, uint8_t *d, size_t len)
{
	ARG_UNUSED(ctx);
	uint8_t cmd = reg | ICM_SPI_READ_BIT;
	const struct spi_buf tb = {.buf = &cmd, .len = 1};
	const struct spi_buf rb[2] = {{.buf = NULL, .len = 1}, {.buf = d, .len = len}};
	const struct spi_buf_set tx = {&tb, 1}, rx = {rb, 2};
	return spi_transceive_dt(&spi, &tx, &rx);
}

static void bus_delay(void *ctx, uint32_t us)
{
	ARG_UNUSED(ctx);
	k_usleep(us);
}

static const icm_bus_t bus = {bus_write, bus_read, bus_delay, NULL};

static void int1_isr(const struct device *d, struct gpio_callback *cb, uint32_t pins)
{
	k_sem_give(&data_sem);
}

void imu_request_calibration(void)
{
	bias_cal_request(&cal);
	LOG_INF("Bias-Kalibrierung angefordert (Taster lang)");
}

bool imu_at_rest_for_s(uint32_t seconds)
{
	return rest_samples >= seconds * IMU_ODR_HZ;
}

int imu_enter_wake_on_motion(void)
{
	if (icm45686_enter_wom(&bus, WOM_THRESHOLD_MG) != ICM_OK) {
		return -EIO;
	}
	/* nRF52 System OFF: GPIO-SENSE weckt bei aktivem Pegel */
	return gpio_pin_interrupt_configure_dt(&int1, GPIO_INT_LEVEL_ACTIVE);
}

static void process(const icm_sample_t *s, uint32_t decim)
{
	float g[3];
	const bool fresh = bias_cal_feed(&cal, s->gyro_dps, s->accel_g);
	if (fresh) {
		LOG_INF("Gyro-Bias neu (%d)", (int)cal.calibrations);
	}
	rest_samples = bias_cal_is_at_rest(&cal, s->gyro_dps, s->accel_g) ? rest_samples + 1 : 0;
	bias_cal_apply(&cal, s->gyro_dps, g);
	madgwick_update(&fus, g, s->accel_g, 1.0f / (float)IMU_ODR_HZ);
	sample_counter++;
	if (sample_counter % decim != 0 || !ble_motion_wanted()) {
		return;
	}
	float r, p, y;
	quat_to_euler_deg(fus.q, &r, &p, &y);
	const thingy_raw_motion_t raw = {{s->accel_g[0], s->accel_g[1], s->accel_g[2]},
					 {g[0], g[1], g[2]}, {0, 0, 0}};
	thingy_raw_hr_t hr = {raw.accel, raw.gyro, sample_counter, cal.valid ? THINGY_HR_FLAG_FUSION_OK : 0};
	for (int i = 0; i < 3; i++) {
		hr.flags |= (uint16_t)((s->accel_sat[i] ? THINGY_HR_FLAG_ACC_SAT_X << i : 0) |
				       (s->gyro_sat[i] ? THINGY_HR_FLAG_GYR_SAT_X << i : 0));
	}
	ble_publish_motion(fus.q, r, p, y, &raw, &hr);
}

static void imu_thread(void *a, void *b, void *c)
{
	static uint8_t buf[MAX_FRAMES * ICM_FIFO_FRAME_LEN];
	for (;;) {
		(void)k_sem_take(&data_sem, K_MSEC(100)); /* Timeout als Rueckfallebene, falls INT verpasst */
		thingy_motion_config_t cfg;
		ble_get_motion_config(&cfg);
		const uint32_t decim = IMU_ODR_HZ / cfg.motion_freq_hz ? IMU_ODR_HZ / cfg.motion_freq_hz : 1;
		uint16_t n = 0;
		if (icm45686_fifo_count(&bus, &n) != ICM_OK || n == 0) {
			continue;
		}
		n = MIN(n, MAX_FRAMES);
		if (bus.read(NULL, ICM_REG_FIFO_DATA, buf, n * ICM_FIFO_FRAME_LEN)) {
			continue;
		}
		for (uint16_t i = 0; i < n; i++) {
			icm_sample_t s;
			if (icm45686_parse_frame(&buf[i * ICM_FIFO_FRAME_LEN], ICM_FIFO_FRAME_LEN, &s) == ICM_FRAME_OK) {
				process(&s, decim);
			}
		}
	}
}

K_THREAD_STACK_DEFINE(imu_stack, 2048);
static struct k_thread imu_thr;

int imu_task_start(void)
{
	bias_cal_init(&cal, IMU_ODR_HZ); /* 1 s Ruhe */
	madgwick_init(&fus, 0.1f);
	if (!spi_is_ready_dt(&spi) || !gpio_is_ready_dt(&int1)) {
		return -ENODEV;
	}
	const icm_status_t st = icm45686_init(&bus, ICM_ODR_400HZ, WATERMARK_FRAMES);
	if (st != ICM_OK) {
		LOG_ERR("ICM-45686 init %d", st);
		return -EIO;
	}
	gpio_pin_configure_dt(&int1, GPIO_INPUT);
	gpio_init_callback(&int1_cb, int1_isr, BIT(int1.pin));
	gpio_add_callback(int1.port, &int1_cb);
	gpio_pin_interrupt_configure_dt(&int1, GPIO_INT_EDGE_TO_ACTIVE);
	k_thread_create(&imu_thr, imu_stack, K_THREAD_STACK_SIZEOF(imu_stack), imu_thread, NULL, NULL, NULL,
			K_PRIO_PREEMPT(2), 0, K_NO_WAIT);
	k_thread_name_set(&imu_thr, "imu");
	return 0;
}
