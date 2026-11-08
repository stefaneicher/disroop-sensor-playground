/* r4 Erweiterung J5: Daumenstick (EXT1 X/AIN5, EXT2 Y/AIN6), EXT3 AIN7 frei, EXT4 AIN1 Stick-Taste
 * (aktiv low, Pull-up), EXT5 P1.11 Touch TTP233H (aktiv high). Reines C, Host-getestet. */
#ifndef EXT_INPUT_H
#define EXT_INPUT_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define EXT_FULL_MV 3300u           /* QUELLE PINOUT r4: Stick 0..3V3 */
#define EXT_PROBE_FLOAT_MV 1500u    /* BERECHNUNG: Stick (<=2.6 kOhm Quelle) verschiebt sich mit 13k-Pull um <= 0.6 V, offen ~3.3 V */
#define EXT_BTN_PRESSED_MV 1000u    /* ANNAHME: Taste zieht AIN1 gegen GND */
#define EXT_DEADZONE_PCT 8u         /* ANNAHME */
#define EXT_POLL_IDLE_MS 500u       /* ANNAHME: Ruhe-Abtastung */
#define EXT_POLL_ACTIVE_MS 50u      /* 20 Hz bei Bewegung, ANNAHME */
#define EXT_ACTIVE_HOLD_MS 2000u
#define TOUCH_DEBOUNCE_MS 30u
#define TOUCH_SPAM_EDGES 10u        /* > 10 Flanken pro 1 s -> Eingang offen/gestoert */
#define TOUCH_LOCKOUT_MS 10000u

/* Bedienplatine vorhanden? Wiper-Spannung mit internem Pull-up bzw. Pull-down gemessen. */
bool ext_board_present(uint16_t mv_pullup, uint16_t mv_pulldown);

typedef struct {
	uint16_t center_mv, min_mv, max_mv;
} stick_axis_cal_t;
void stick_axis_cal_init(stick_axis_cal_t *c);
/* Mittelwert von n Ruhe-Samples als Mitte; nur 30..70 % des Bereichs gueltig, sonst unveraendert -> false. */
bool stick_axis_cal_center(stick_axis_cal_t *c, const uint16_t *s, size_t n);
/* -100..100 %, Totzone um die Mitte, ausserhalb linear auf 0..100 nachskaliert. */
int8_t stick_axis_scale(const stick_axis_cal_t *c, uint16_t mv, uint8_t deadzone_pct);
bool ext_btn_pressed(uint16_t mv);

typedef struct {
	uint32_t last_active_ms;
	bool ever_active;
} stick_poll_t;
/* Naechstes Abtastintervall: aktiv (Auslenkung/Taste/Touch) -> 50 ms, bis 2 s danach, sonst 500 ms. */
uint32_t stick_next_poll_ms(stick_poll_t *p, int8_t x, int8_t y, bool active_input, uint32_t now_ms);

typedef enum { TOUCH_EVT_NONE, TOUCH_EVT_DOWN, TOUCH_EVT_UP } touch_evt_t;
typedef struct {
	bool stable, raw, locked;
	uint32_t t_change, win_start, edges, lock_until;
} touch_t;
void touch_init(touch_t *t);
/* Bei jeder Flanke und nach TOUCH_DEBOUNCE_MS erneut aufrufen. Ereignis nur bei stabilem Wechsel;
 * Flankenflut (offener Eingang) sperrt TOUCH_LOCKOUT_MS. */
touch_evt_t touch_update(touch_t *t, bool level, uint32_t now_ms);

#endif
