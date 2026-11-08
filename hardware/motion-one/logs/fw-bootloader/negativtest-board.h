/* Adafruit nRF52 Bootloader 0.11.0 – Board-Definition Disroop Motion One V1.
 * QUELLE Pins: devices/motion-one/electronics/PINOUT_V1.json (r1); gleiche Pins wie
 * firmware/boards/disroop/motion_one/motion_one-pins.dtsi. Geprueft durch
 * firmware/scripts/check_bootloader_board.py (make pincheck / make test).
 * Q-02: kein UART, Debug nur SWD/RTT (DEBUG=1 -> SEGGER RTT im Bootloader). */
#ifndef MOTION_ONE_H
#define MOTION_ONE_H

/* LED: RGB D4, Common-Anode an 3V3, aktiv low */
#define LEDS_NUMBER          1
#define LED_PRIMARY_PIN      PINNUM(0, 30) /* LED_R */
#define LED_STATE_ON         1
#define LED_RGB_RED_PIN      PINNUM(0, 30) /* LED_R */
#define LED_RGB_GREEN_PIN    PINNUM(0, 31) /* LED_G */
#define LED_RGB_BLUE_PIN     PINNUM(0, 29) /* LED_B */
#define BOARD_RGB_BRIGHTNESS 0x202020

/* BUTTON: SW2 an P0.28, aktiv low, interner Pull-up. Kein OTA-Taster (nur ein Taster). */
#define BUTTON_DFU           PINNUM(0, 11) /* BTN */
#define BUTTON_PULL          NRF_GPIO_PIN_PULLUP

/* DC/DC: Bestueckung im E73 unbekannt -> LDO (wie App) */
#define ENABLE_DCDC_0        0
#define ENABLE_DCDC_1        0

/* BLE OTA (Device Information) */
#define BLEDIS_MANUFACTURER  "Disroop"
#define BLEDIS_MODEL         "Motion One V1"

/* USB: ANNAHME eigene VID/PID fehlt noch -> wie pca10056 (Adafruit-VID, PID 0x00DA).
 * Offener Punkt: eigene PID (z. B. pid.codes) vor Serie. */
#define USB_DESC_VID          0x239A
#define USB_DESC_UF2_PID      0x00DA
#define USB_DESC_CDC_ONLY_PID 0x00DA

/* UF2 */
#define UF2_PRODUCT_NAME     "Disroop Motion One V1"
#define UF2_VOLUME_LABEL     "MOTION1BOOT"
#define UF2_BOARD_ID         "nRF52840-MotionOne-v1"
#define UF2_INDEX_URL        "https://github.com/stefaneicher/disroop-sensor-playground"

#endif /* MOTION_ONE_H */
