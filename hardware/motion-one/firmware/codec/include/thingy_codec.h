/* Reine C-Codecs fuer das Thingy:52-kompatible BLE-Profil (docs/protocol.md) und den
 * erweiterten Kanal EF680480 (firmware/docs/EXTENDED_CHANNEL.md). Ohne Hardwareabhaengigkeit.
 * Alle Mehrbyte-Werte little-endian. Rueckgabe der Encoder: geschriebene Bytes oder 0 bei Fehler. */
#ifndef THINGY_CODEC_H
#define THINGY_CODEC_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define THINGY_RAW_MOTION_LEN 18u
#define THINGY_QUATERNION_LEN 16u
#define THINGY_EULER_LEN 12u
#define THINGY_HEADING_LEN 4u
#define THINGY_BUTTON_LEN 1u
#define THINGY_MOTION_CONFIG_LEN 9u
#define THINGY_ENV_CONFIG_LEN 12u
#define THINGY_SOUND_CONFIG_LEN 2u
#define THINGY_SPEAKER_TONE_LEN 5u
#define THINGY_RAW_HR_LEN 16u

#define THINGY_MOTION_HZ_MIN 5u
#define THINGY_MOTION_HZ_MAX 200u

typedef enum {
	THINGY_OK = 0,
	THINGY_ERR_LEN = -1,   /* falsche Laenge -> ATT "Invalid Attribute Value Length" */
	THINGY_ERR_RANGE = -2, /* Wert ausserhalb des Bereichs -> ATT "Value not allowed" */
	THINGY_ERR_ARG = -3,
} thingy_status_t;

typedef struct {
	float x, y, z;
} thingy_xyz_t;

/* EF680406 Raw Motion: accel in g, gyro in dps, compass in uT */
typedef struct {
	thingy_xyz_t accel;
	thingy_xyz_t gyro;
	thingy_xyz_t compass;
} thingy_raw_motion_t;

/* Kodiert 9x i16 (accel*1024, gyro*32, compass*16), gerundet und an i16-Grenzen gesaettigt. */
size_t thingy_encode_raw_motion(const thingy_raw_motion_t *in, uint8_t *out, size_t out_len);

/* EF680404: 4x i32 Q2.30 (w, x, y, z), gesaettigt auf [-2, 2). */
size_t thingy_encode_quaternion(const float q[4], uint8_t *out, size_t out_len);

/* EF680407: roll, pitch, yaw in Grad als 3x i32 *65536. */
size_t thingy_encode_euler(float roll_deg, float pitch_deg, float yaw_deg, uint8_t *out, size_t out_len);

/* EF680409: Heading in Grad, auf [0, 360) normalisiert, i32 *65536. */
size_t thingy_encode_heading(float heading_deg, uint8_t *out, size_t out_len);

/* EF680302: 0 = losgelassen, 1 = gedrueckt. */
size_t thingy_encode_button(bool pressed, uint8_t *out, size_t out_len);


/* EF680380 Bedienplatine (systems/ADR-0002): u8 version=1, u8 flags, i8 x, i8 y (-100..100), u16 seq LE, u16 reserved=0 */
#define THINGY_UI_EXT_LEN 8u
#define UI_EXT_VERSION 1u
#define UI_EXT_PRESENT 0x01u
#define UI_EXT_BTN 0x02u
#define UI_EXT_TOUCH 0x04u
#define UI_EXT_TOUCH_LOCKED 0x08u
#define UI_EXT_CENTER_OK 0x10u
typedef struct {
	uint8_t flags;
	int8_t x, y;
	uint16_t seq;
} ui_ext_state_t;
size_t thingy_encode_ui_ext(const ui_ext_state_t *s, uint8_t *out, size_t out_len);
void ui_ext_next_seq(ui_ext_state_t *s);

/* Ratenbegrenzer: <= 20/s, bei motion_freq_hz > 50 <= 10/s; ausstehende Aenderung spaetestens nach 100 ms. */
typedef struct {
	bool pending, sent_any;
	uint32_t last_tx_ms;
} ui_ext_rate_t;
void ui_ext_rate_init(ui_ext_rate_t *r);
void ui_ext_rate_mark(ui_ext_rate_t *r, bool changed);
/* true = jetzt senden; sonst *retry_ms (falls != NULL) = Wartezeit bis zur naechsten Pruefung, 0 = nichts offen. */
bool ui_ext_rate_poll(ui_ext_rate_t *r, uint16_t motion_freq_hz, uint32_t now_ms, uint32_t *retry_ms);

/* EF680401 Motion-Config */
typedef struct {
	uint16_t step_interval_ms;
	uint16_t temp_comp_interval_ms;
	uint16_t mag_comp_interval_ms;
	uint16_t motion_freq_hz; /* 5..200 */
	uint8_t wake_on_motion;
} thingy_motion_config_t;

void thingy_motion_config_default(thingy_motion_config_t *cfg);
thingy_status_t thingy_parse_motion_config(const uint8_t *in, size_t len, thingy_motion_config_t *out);
size_t thingy_encode_motion_config(const thingy_motion_config_t *cfg, uint8_t *out, size_t out_len);

/* EF680206 Environment-Config: 12 B, nur gespeichert und zurueckgegeben (Dummy, kein Sensor). */
typedef struct {
	uint8_t raw[THINGY_ENV_CONFIG_LEN];
} thingy_env_config_t;

void thingy_env_config_default(thingy_env_config_t *cfg);
thingy_status_t thingy_parse_env_config(const uint8_t *in, size_t len, thingy_env_config_t *out);

/* EF680501 Sound-Config: speaker_mode 1..3 (1 = Frequenz), mic_mode 1..2. */
typedef struct {
	uint8_t speaker_mode;
	uint8_t mic_mode;
} thingy_sound_config_t;

void thingy_sound_config_default(thingy_sound_config_t *cfg);
thingy_status_t thingy_parse_sound_config(const uint8_t *in, size_t len, thingy_sound_config_t *out);

/* EF680502 Speaker-Ton im Frequenzmodus: u16 Hz, u16 ms, u8 Lautstaerke (auf 0..100 geklemmt). */
typedef struct {
	uint16_t freq_hz;
	uint16_t duration_ms;
	uint8_t volume_pct;
} thingy_speaker_tone_t;

thingy_status_t thingy_parse_speaker_tone(const uint8_t *in, size_t len, thingy_speaker_tone_t *out);

/* EF680301 LED */
typedef enum {
	THINGY_LED_OFF = 0,
	THINGY_LED_CONSTANT = 1,
	THINGY_LED_BREATHE = 2,
	THINGY_LED_ONE_SHOT = 3,
} thingy_led_mode_t;

typedef struct {
	thingy_led_mode_t mode;
	uint8_t r, g, b;        /* CONSTANT */
	uint8_t color_mix;      /* BREATHE/ONE_SHOT: 1..7 (Bit0 rot, Bit1 gruen, Bit2 blau) */
	uint8_t intensity_pct;  /* BREATHE/ONE_SHOT: 1..100 */
	uint16_t delay_ms;      /* BREATHE: 50..10000 */
} thingy_led_cmd_t;

thingy_status_t thingy_parse_led(const uint8_t *in, size_t len, thingy_led_cmd_t *out);
size_t thingy_encode_led(const thingy_led_cmd_t *cmd, uint8_t *out, size_t out_len);

/* Batterie 2A19: Spannung (mV) -> Prozent, stueckweise linear (LiPo-Kurve, ANNAHME). */
uint8_t thingy_battery_percent_from_mv(uint16_t mv);

/* EF680480 Raw-HR (erweiterter Kanal), siehe docs/EXTENDED_CHANNEL.md */
#define THINGY_HR_FLAG_ACC_SAT_X (1u << 0)
#define THINGY_HR_FLAG_ACC_SAT_Y (1u << 1)
#define THINGY_HR_FLAG_ACC_SAT_Z (1u << 2)
#define THINGY_HR_FLAG_GYR_SAT_X (1u << 3)
#define THINGY_HR_FLAG_GYR_SAT_Y (1u << 4)
#define THINGY_HR_FLAG_GYR_SAT_Z (1u << 5)
#define THINGY_HR_FLAG_FUSION_OK (1u << 6)

typedef struct {
	thingy_xyz_t accel; /* g */
	thingy_xyz_t gyro;  /* dps */
	uint16_t sample_counter;
	uint16_t flags;     /* Sensor-Saettigung wird zusaetzlich zu Kodier-Saettigung gesetzt */
} thingy_raw_hr_t;

/* accel*1024, gyro*8 als i16; Kodier-Saettigung setzt das passende Flag-Bit. */
size_t thingy_encode_raw_hr(const thingy_raw_hr_t *in, uint8_t *out, size_t out_len);

/* Taster: kurz/lang (lang >= 800 ms, BUDGETS). Reine Zustandsmaschine mit Zeitstempeln in ms. */
#define THINGY_BUTTON_LONG_MS 800u

typedef enum {
	THINGY_BTN_EVT_NONE = 0,
	THINGY_BTN_EVT_SHORT,
	THINGY_BTN_EVT_LONG, /* einmal pro Druck, sobald 800 ms erreicht (auch vor dem Loslassen) */
} thingy_button_evt_t;

typedef struct {
	bool pressed;
	bool long_reported;
	uint32_t t_down_ms;
} thingy_button_t;

void thingy_button_init(thingy_button_t *b);
thingy_button_evt_t thingy_button_update(thingy_button_t *b, bool pressed, uint32_t now_ms);

#endif
