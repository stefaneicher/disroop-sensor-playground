/* F-12: Motor-PWM (MOT_EN P1.13) auf U_eff <= 3.0 V und Arbitrierung Motor/Summer. Reines C, Host-getestet. */
#ifndef MOTOR_DRIVE_H
#define MOTOR_DRIVE_H

#include <stdbool.h>
#include <stdint.h>

#define MOTOR_TARGET_MV 3000u          /* QUELLE LCM0827A3038F-DB: Nenn 3.0 V, max 3.3 V */
#define MOTOR_SUPPLY_VBAT_MIN_MV 2500u /* ANNAHME Plausibilitaet VBAT-Messung */
#define MOTOR_SUPPLY_VBAT_MAX_MV 4200u /* QUELLE Li-Po Ladeschluss 4.2 V (ANALYSE_V1) */
#define MOTOR_SUPPLY_USB_MV 5250u      /* ANNAHME VBUS max USB 2.0 (5.25 V) >= VSYS 4.87 V SIMULATION */

/* Versorgung des Motorzweigs (VSW): an USB -> VSYS-Worst-Case, sonst gemessene VBAT; 0/unplausibel -> 4.2 V. */
uint16_t motor_supply_mv(uint16_t vbat_mv, bool usb);
/* Tastgrad in Promille = 3.0 V / supply (floor, max 1000); supply 0 -> konservativ MOTOR_SUPPLY_USB_MV. */
uint16_t motor_duty_permille(uint16_t supply_mv);

typedef struct {
	bool buzzer_on;
	bool motor_on;
} load_out_t;
/* Prioritaet: Summer vor Motor; Motor pausiert solange Summer laeuft. */
load_out_t load_arbitrate(bool buzzer_req, bool motor_req);

/* VBUS-Spitzenstrom an USB (BERECHNUNG nach ANALYSE_V1 §1a), mA. */
uint32_t motor_vbus_peak_ma(bool buzzer_on, bool motor_on);

#endif
