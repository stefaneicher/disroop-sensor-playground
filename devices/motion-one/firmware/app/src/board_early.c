/* Frueheste Pin-Initialisierung (PCB-Hinweis 2026-11-07): IMU-CS sofort high (kein Pull-up auf V1),
 * VBAT_EN low (Teiler aus). Laeuft in PRE_KERNEL_1 Prioritaet 0, vor GPIO- und SPI-Treiber. */
#include <zephyr/init.h>
#include <zephyr/devicetree.h>
#include <hal/nrf_gpio.h>

#define CS_SPEC DT_GPIO_PIN_BY_IDX(DT_NODELABEL(spi3), cs_gpios, 0)
#define CS_PORT DT_PROP(DT_GPIO_CTLR_BY_IDX(DT_NODELABEL(spi3), cs_gpios, 0), port)
#define EN_PIN DT_GPIO_PIN(DT_PATH(zephyr_user), vbat_en_gpios)
#define EN_PORT DT_PROP(DT_GPIO_CTLR(DT_PATH(zephyr_user), vbat_en_gpios), port)

static int board_early_init(void)
{
	const uint32_t cs = NRF_GPIO_PIN_MAP(CS_PORT, CS_SPEC);
	const uint32_t en = NRF_GPIO_PIN_MAP(EN_PORT, EN_PIN);
	nrf_gpio_pin_set(cs);
	nrf_gpio_cfg_output(cs);
	nrf_gpio_pin_clear(en);
	nrf_gpio_cfg_output(en);
	return 0;
}

SYS_INIT(board_early_init, PRE_KERNEL_1, 0);
