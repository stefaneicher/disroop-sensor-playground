/* Disroop Motion One V1: Thingy:52-kompatible Firmware (nRF52840 + ICM-45686). */
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/sys/poweroff.h>
#include <zephyr/bluetooth/services/bas.h>
#include "app.h"

LOG_MODULE_REGISTER(main, LOG_LEVEL_INF);

#define BATTERY_PERIOD_S 60u
#define UNDERVOLTAGE_MV 3300u /* BUDGETS, ANNAHME */

static void power_off(const char *why)
{
	LOG_WRN("System OFF: %s", why);
	thingy_led_cmd_t off = {.mode = THINGY_LED_OFF};
	ui_led_apply(&off);
	(void)imu_enter_wake_on_motion();
	(void)ui_arm_button_wakeup();
	sys_poweroff();
}

static void update_battery(void)
{
	const uint16_t mv = battery_read_mv();
	if (mv == 0) {
		return;
	}
	(void)bt_bas_set_battery_level(thingy_battery_percent_from_mv(mv)); /* notify nur bei Aenderung */
	if (mv < UNDERVOLTAGE_MV) {
		power_off("Unterspannung");
	}
}

int main(void)
{
	LOG_INF("Motion One V1 start");
	if (ui_init() || battery_init()) {
		LOG_ERR("UI/Batterie-Init fehlgeschlagen");
	}
	update_battery();
	if (ble_thingy_init()) {
		LOG_ERR("BLE-Init fehlgeschlagen");
		return 0;
	}
	if (imu_task_start()) {
		LOG_ERR("IMU-Init fehlgeschlagen");
	}
	uint32_t t = 0;
	for (;;) {
		k_sleep(K_SECONDS(1));
		if (++t % BATTERY_PERIOD_S == 0) {
			update_battery();
		}
		if (!ble_is_connected() && imu_at_rest_for_s(REST_SLEEP_S)) {
			power_off("Ruhe ohne Verbindung");
		}
	}
}
