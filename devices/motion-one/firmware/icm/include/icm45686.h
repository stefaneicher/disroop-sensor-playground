/* ICM-45686: Registerkonstanten, FIFO-Parser und Initialisierung ueber einen Bus-Port.
 * QUELLE Registerwerte: TDK hal_tdk icm456xx/imu/inv_imu_regmap_le.h, inv_imu_defs.h,
 * inv_imu_driver.c (BSD-3, Kopie in firmware/docs/ref/). Datenblatt DS-000577 war nicht abrufbar:
 * Werte NICHT gegen das Datenblatt verifiziert (offener Punkt). */
#ifndef ICM45686_H
#define ICM45686_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define ICM_REG_ACCEL_DATA_X1 0x00u
#define ICM_REG_PWR_MGMT0 0x10u
#define ICM_REG_FIFO_COUNT_0 0x12u
#define ICM_REG_FIFO_DATA 0x14u
#define ICM_REG_INT1_CONFIG0 0x16u
#define ICM_REG_INT1_CONFIG1 0x17u
#define ICM_REG_INT1_CONFIG2 0x18u
#define ICM_REG_INT1_STATUS0 0x19u
#define ICM_REG_INT1_STATUS1 0x1Au
#define ICM_REG_ACCEL_CONFIG0 0x1Bu
#define ICM_REG_GYRO_CONFIG0 0x1Cu
#define ICM_REG_FIFO_CONFIG0 0x1Du
#define ICM_REG_FIFO_CONFIG1_0 0x1Eu
#define ICM_REG_FIFO_CONFIG1_1 0x1Fu
#define ICM_REG_FIFO_CONFIG2 0x20u
#define ICM_REG_FIFO_CONFIG3 0x21u
#define ICM_REG_TMST_WOM_CONFIG 0x23u
#define ICM_REG_WHO_AM_I 0x72u
#define ICM_REG_IREG_ADDR_15_8 0x7Cu
#define ICM_REG_IREG_ADDR_7_0 0x7Du
#define ICM_REG_IREG_DATA 0x7Eu
#define ICM_REG_MISC2 0x7Fu

#define ICM_WHO_AM_I_VALUE 0xE9u
#define ICM_SPI_READ_BIT 0x80u
#define ICM_MISC2_SOFT_RST 0x02u

#define ICM_PWR_ACCEL_LN 0x03u
#define ICM_PWR_ACCEL_LP 0x02u
#define ICM_PWR_GYRO_LN (0x03u << 2)

#define ICM_ODR_400HZ 0x7u
#define ICM_ODR_200HZ 0x8u
#define ICM_ODR_100HZ 0x9u
#define ICM_ODR_25HZ 0xBu
#define ICM_ACCEL_FS_32G (0x0u << 4)
#define ICM_GYRO_FS_4000DPS (0x0u << 4)

#define ICM_FIFO_DEPTH_MAX 0x1Eu /* Errata AN-000364 laut hal_tdk */
#define ICM_FIFO_MODE_STREAM (0x1u << 6)
#define ICM_FIFO_FLUSH 0x80u
#define ICM_FIFO_WM_GT_TH 0x08u
#define ICM_FIFO_IF_EN 0x01u
#define ICM_FIFO_ACCEL_EN 0x02u
#define ICM_FIFO_GYRO_EN 0x04u

#define ICM_INT1_FIFO_THS 0x02u
#define ICM_INT1_WOM_XYZ 0x0Eu
#define ICM_INT1_PUSH_PULL_PULSED_HIGH 0x01u

#define ICM_WOM_EN 0x10u
#define ICM_WOM_MODE_PREV 0x08u
#define ICM_IREG_ACCEL_WOM_X_THR 0xA27Eu

#define ICM_FIFO_FRAME_LEN 16u
#define ICM_FIFO_HDR_ACCEL 0x40u
#define ICM_FIFO_HDR_GYRO 0x20u
#define ICM_FIFO_HDR_20BIT 0x10u
#define ICM_FIFO_HDR_EXT 0x80u
#define ICM_INVALID_SAMPLE ((int16_t)-32768)

/* Skalierung bei FS 32 g / 4000 dps (16 bit): 1024 LSB/g, 8.192 LSB/dps (BERECHNUNG 32768/FS) */
#define ICM_ACCEL_LSB_PER_G 1024.0f
#define ICM_GYRO_LSB_PER_DPS 8.192f

typedef struct {
	float accel_g[3];
	float gyro_dps[3];
	uint16_t timestamp;
	bool accel_sat[3];
	bool gyro_sat[3];
} icm_sample_t;

typedef enum {
	ICM_FRAME_OK = 0,
	ICM_FRAME_SHORT = -1,   /* weniger als 16 B */
	ICM_FRAME_INVALID = -2, /* leerer/unbekannter Header oder ungueltiger Wert (0x8000) */
} icm_frame_status_t;

/* Parst ein 16-B-Paket (Header, accel, gyro, temp, timestamp). Bei INVALID wurden 16 B konsumiert. */
icm_frame_status_t icm45686_parse_frame(const uint8_t *in, size_t len, icm_sample_t *out);

/* Bus-Port (Adapter: Zephyr-SPI auf dem Geraet, Fake in den Host-Tests). */
typedef struct {
	int (*write)(void *ctx, uint8_t reg, const uint8_t *data, size_t len);
	int (*read)(void *ctx, uint8_t reg, uint8_t *data, size_t len);
	void (*delay_us)(void *ctx, uint32_t us);
	void *ctx;
} icm_bus_t;

typedef enum {
	ICM_OK = 0,
	ICM_ERR_BUS = -1,
	ICM_ERR_WHOAMI = -2,
} icm_status_t;

/* Reset, WHO_AM_I, ODR/FS, FIFO-Stream mit Watermark (Frames), INT1 FIFO-THS, LN-Modus. */
icm_status_t icm45686_init(const icm_bus_t *bus, uint8_t odr, uint16_t watermark_frames);
/* Liest FIFO_COUNT (Anzahl Frames). */
icm_status_t icm45686_fifo_count(const icm_bus_t *bus, uint16_t *frames);
/* Wake-on-Motion: accel LP 25 Hz, Gyro aus, Schwelle in mg (1 LSB = 1/256 g laut hal_tdk), INT1 WoM. */
icm_status_t icm45686_enter_wom(const icm_bus_t *bus, uint16_t threshold_mg);
/* Zurueck in den Messbetrieb nach WoM. */
icm_status_t icm45686_exit_wom(const icm_bus_t *bus, uint8_t odr);
/* Schreibt ein internes Register (IREG). */
icm_status_t icm45686_ireg_write(const icm_bus_t *bus, uint16_t addr, uint8_t value);

#endif
