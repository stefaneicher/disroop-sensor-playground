/* Ports zwischen den App-Modulen (Zephyr-Adapter). */
#ifndef APP_H
#define APP_H

#include <stdbool.h>
#include <stdint.h>
#include "thingy_codec.h"

#define IMU_ODR_HZ 400u
#define REST_SLEEP_S 60u          /* ANNAHME: Ruhe ohne Verbindung bis System-OFF */
#define WOM_THRESHOLD_MG 100u     /* ANNAHME */
#define NOTIFY_BUDGET_PER_S 200u  /* REQ/BUDGETS: Summe Notifications <= 200/s */

/* ble_thingy.c */
int ble_thingy_init(void);
bool ble_is_connected(void);
void ble_get_motion_config(thingy_motion_config_t *cfg);
bool ble_motion_wanted(void);
void ble_publish_motion(const float q[4], float roll, float pitch, float yaw, const thingy_raw_motion_t *raw,
			const thingy_raw_hr_t *hr);
void ble_publish_button(bool pressed);
void ble_publish_speaker_done(void);

/* imu_task.c */
int imu_task_start(void);
void imu_request_calibration(void);
bool imu_at_rest_for_s(uint32_t seconds);
int imu_enter_wake_on_motion(void);

/* ui.c */
int ui_init(void);
void ui_led_apply(const thingy_led_cmd_t *cmd);
void ui_speaker_tone(const thingy_speaker_tone_t *tone);
void ui_vibrate_ms(uint32_t ms);
int ui_arm_button_wakeup(void);

/* battery.c */
int battery_init(void);
uint16_t battery_read_mv(void);
uint16_t battery_last_mv(void); /* letzte Messung, ohne ADC-Zugriff; 0 = keine */

#endif
