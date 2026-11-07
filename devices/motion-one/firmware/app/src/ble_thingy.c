/* GATT-Profil wie Thingy:52 (docs/protocol.md, INTERFACES.json ble_profile). Adapter: Zephyr BT. */
#include <string.h>
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/uuid.h>
#include "app.h"

LOG_MODULE_REGISTER(ble, LOG_LEVEL_INF);

#define TUUID(n) BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xEF680000u + (n), 0x9B35, 0x4933, 0x9B10, 0x52FFA9740042))
#define RD BT_GATT_PERM_READ
#define WR BT_GATT_PERM_WRITE

static struct bt_conn *conn_cur;
static K_MUTEX_DEFINE(cfg_lock);
static thingy_motion_config_t motion_cfg;
static thingy_env_config_t env_cfg;
static thingy_sound_config_t sound_cfg;
static thingy_led_cmd_t led_cmd = {.mode = THINGY_LED_OFF};
static uint8_t button_state;
static const char dev_name[] = "Thingy";

static ssize_t att_status(thingy_status_t s)
{
	return s == THINGY_ERR_LEN ? BT_GATT_ERR(BT_ATT_ERR_INVALID_ATTRIBUTE_LEN)
				   : BT_GATT_ERR(BT_ATT_ERR_VALUE_NOT_ALLOWED);
}

static ssize_t rd_name(struct bt_conn *c, const struct bt_gatt_attr *a, void *buf, uint16_t len, uint16_t off)
{
	return bt_gatt_attr_read(c, a, buf, len, off, dev_name, sizeof dev_name - 1);
}

static ssize_t rd_motion_cfg(struct bt_conn *c, const struct bt_gatt_attr *a, void *buf, uint16_t len, uint16_t off)
{
	uint8_t v[THINGY_MOTION_CONFIG_LEN];
	k_mutex_lock(&cfg_lock, K_FOREVER);
	(void)thingy_encode_motion_config(&motion_cfg, v, sizeof v);
	k_mutex_unlock(&cfg_lock);
	return bt_gatt_attr_read(c, a, buf, len, off, v, sizeof v);
}

static ssize_t wr_motion_cfg(struct bt_conn *c, const struct bt_gatt_attr *a, const void *buf, uint16_t len,
			     uint16_t off, uint8_t flags)
{
	thingy_motion_config_t n;
	const thingy_status_t s = off ? THINGY_ERR_LEN : thingy_parse_motion_config(buf, len, &n);
	if (s != THINGY_OK) {
		return att_status(s);
	}
	k_mutex_lock(&cfg_lock, K_FOREVER);
	motion_cfg = n;
	k_mutex_unlock(&cfg_lock);
	LOG_INF("motion_freq_hz=%u", n.motion_freq_hz);
	return len;
}

static ssize_t rd_env_cfg(struct bt_conn *c, const struct bt_gatt_attr *a, void *buf, uint16_t len, uint16_t off)
{
	return bt_gatt_attr_read(c, a, buf, len, off, env_cfg.raw, sizeof env_cfg.raw);
}

static ssize_t wr_env_cfg(struct bt_conn *c, const struct bt_gatt_attr *a, const void *buf, uint16_t len,
			  uint16_t off, uint8_t flags)
{
	const thingy_status_t s = off ? THINGY_ERR_LEN : thingy_parse_env_config(buf, len, &env_cfg);
	return s == THINGY_OK ? (ssize_t)len : att_status(s);
}

static ssize_t rd_sound_cfg(struct bt_conn *c, const struct bt_gatt_attr *a, void *buf, uint16_t len, uint16_t off)
{
	const uint8_t v[2] = {sound_cfg.speaker_mode, sound_cfg.mic_mode};
	return bt_gatt_attr_read(c, a, buf, len, off, v, sizeof v);
}

static ssize_t wr_sound_cfg(struct bt_conn *c, const struct bt_gatt_attr *a, const void *buf, uint16_t len,
			    uint16_t off, uint8_t flags)
{
	const thingy_status_t s = off ? THINGY_ERR_LEN : thingy_parse_sound_config(buf, len, &sound_cfg);
	return s == THINGY_OK ? (ssize_t)len : att_status(s);
}

static ssize_t wr_speaker(struct bt_conn *c, const struct bt_gatt_attr *a, const void *buf, uint16_t len,
			  uint16_t off, uint8_t flags)
{
	thingy_speaker_tone_t t;
	const thingy_status_t s = off ? THINGY_ERR_LEN : thingy_parse_speaker_tone(buf, len, &t);
	if (s != THINGY_OK) {
		return att_status(s);
	}
	if (sound_cfg.speaker_mode != 1) {
		return BT_GATT_ERR(BT_ATT_ERR_VALUE_NOT_ALLOWED); /* nur Frequenzmodus implementiert */
	}
	ui_speaker_tone(&t);
	return len;
}

static ssize_t rd_led(struct bt_conn *c, const struct bt_gatt_attr *a, void *buf, uint16_t len, uint16_t off)
{
	uint8_t v[5];
	const size_t n = thingy_encode_led(&led_cmd, v, sizeof v);
	return bt_gatt_attr_read(c, a, buf, len, off, v, n);
}

static ssize_t wr_led(struct bt_conn *c, const struct bt_gatt_attr *a, const void *buf, uint16_t len,
		      uint16_t off, uint8_t flags)
{
	thingy_led_cmd_t n;
	const thingy_status_t s = off ? THINGY_ERR_LEN : thingy_parse_led(buf, len, &n);
	if (s != THINGY_OK) {
		return att_status(s);
	}
	led_cmd = n;
	ui_led_apply(&n);
	return len;
}

static ssize_t rd_button(struct bt_conn *c, const struct bt_gatt_attr *a, void *buf, uint16_t len, uint16_t off)
{
	return bt_gatt_attr_read(c, a, buf, len, off, &button_state, 1);
}

static void ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	LOG_DBG("CCC %u", value);
}

#define NOTIFY_CHR(uuid) \
	BT_GATT_CHARACTERISTIC(uuid, BT_GATT_CHRC_NOTIFY, BT_GATT_PERM_NONE, NULL, NULL, NULL), \
	BT_GATT_CCC(ccc_changed, RD | WR)

/* Konfiguration: advertised, Geraetename */
BT_GATT_SERVICE_DEFINE(cfg_svc, BT_GATT_PRIMARY_SERVICE(TUUID(0x0100)),
	BT_GATT_CHARACTERISTIC(TUUID(0x0101), BT_GATT_CHRC_READ, RD, rd_name, NULL, NULL));

/* Environment minimal: nur EF680206 (Bridge liest/schreibt sie beim Konfigurieren) */
BT_GATT_SERVICE_DEFINE(env_svc, BT_GATT_PRIMARY_SERVICE(TUUID(0x0200)),
	BT_GATT_CHARACTERISTIC(TUUID(0x0206), BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE, RD | WR, rd_env_cfg,
			       wr_env_cfg, NULL));

/* UI: [1] decl 0301, [2] LED, [3] decl 0302, [4] Button, [5] CCC */
BT_GATT_SERVICE_DEFINE(ui_svc, BT_GATT_PRIMARY_SERVICE(TUUID(0x0300)),
	BT_GATT_CHARACTERISTIC(TUUID(0x0301), BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE, RD | WR, rd_led, wr_led,
			       NULL),
	BT_GATT_CHARACTERISTIC(TUUID(0x0302), BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY, RD, rd_button, NULL,
			       NULL),
	BT_GATT_CCC(ccc_changed, RD | WR));

/* Motion: [2] 0401, [4] 0404, [7] 0406, [10] 0407, [13] 0409, [16] 0480 */
BT_GATT_SERVICE_DEFINE(motion_svc, BT_GATT_PRIMARY_SERVICE(TUUID(0x0400)),
	BT_GATT_CHARACTERISTIC(TUUID(0x0401), BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE, RD | WR, rd_motion_cfg,
			       wr_motion_cfg, NULL),
	NOTIFY_CHR(TUUID(0x0404)), NOTIFY_CHR(TUUID(0x0406)), NOTIFY_CHR(TUUID(0x0407)),
	NOTIFY_CHR(TUUID(0x0409)), NOTIFY_CHR(TUUID(0x0480)));

/* Sound: [2] 0501, [4] 0502, [6] 0503 */
BT_GATT_SERVICE_DEFINE(sound_svc, BT_GATT_PRIMARY_SERVICE(TUUID(0x0500)),
	BT_GATT_CHARACTERISTIC(TUUID(0x0501), BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE, RD | WR, rd_sound_cfg,
			       wr_sound_cfg, NULL),
	BT_GATT_CHARACTERISTIC(TUUID(0x0502), BT_GATT_CHRC_WRITE_WITHOUT_RESP | BT_GATT_CHRC_WRITE, WR, NULL,
			       wr_speaker, NULL),
	NOTIFY_CHR(TUUID(0x0503)));

enum { M_QUAT, M_RAW, M_EULER, M_HEADING, M_HR, M_COUNT };
static const struct bt_gatt_attr *const motion_attr[M_COUNT] = {
	&motion_svc.attrs[4], &motion_svc.attrs[7], &motion_svc.attrs[10], &motion_svc.attrs[13],
	&motion_svc.attrs[16]};

static const struct bt_data ad[] = {
	BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
	BT_DATA_BYTES(BT_DATA_UUID128_ALL,
		      BT_UUID_128_ENCODE(0xEF680100, 0x9B35, 0x4933, 0x9B10, 0x52FFA9740042)),
};
static const struct bt_data sd[] = {
	BT_DATA(BT_DATA_NAME_COMPLETE, dev_name, sizeof dev_name - 1),
};

static void adv_start(struct k_work *w)
{
	ARG_UNUSED(w);
	const int err = bt_le_adv_start(BT_LE_ADV_CONN_FAST_1, ad, ARRAY_SIZE(ad), sd, ARRAY_SIZE(sd));
	if (err && err != -EALREADY) {
		LOG_ERR("adv %d", err);
	}
}
static K_WORK_DEFINE(adv_work, adv_start);

static void connected(struct bt_conn *c, uint8_t err)
{
	if (err) {
		return;
	}
	conn_cur = bt_conn_ref(c);
	LOG_INF("verbunden");
}

static void disconnected(struct bt_conn *c, uint8_t reason)
{
	if (conn_cur == c) {
		bt_conn_unref(conn_cur);
		conn_cur = NULL;
	}
	LOG_INF("getrennt 0x%02x", reason);
}

static void recycled(void)
{
	k_work_submit(&adv_work);
}

static void le_param_updated(struct bt_conn *c, uint16_t interval, uint16_t latency, uint16_t timeout)
{
	LOG_INF("Intervall %u x 1.25 ms, Latenz %u, Timeout %u", interval, latency, timeout);
}

BT_CONN_CB_DEFINE(conn_cb) = {
	.connected = connected,
	.disconnected = disconnected,
	.recycled = recycled,
	.le_param_updated = le_param_updated,
};

int ble_thingy_init(void)
{
	thingy_motion_config_default(&motion_cfg);
	thingy_env_config_default(&env_cfg);
	thingy_sound_config_default(&sound_cfg);
	const int err = bt_enable(NULL);
	if (err) {
		return err;
	}
	k_work_submit(&adv_work);
	return 0;
}

bool ble_is_connected(void)
{
	return conn_cur != NULL;
}

void ble_get_motion_config(thingy_motion_config_t *cfg)
{
	k_mutex_lock(&cfg_lock, K_FOREVER);
	*cfg = motion_cfg;
	k_mutex_unlock(&cfg_lock);
}

static bool subscribed(const struct bt_gatt_attr *attr)
{
	struct bt_conn *c = conn_cur;
	return c != NULL && bt_gatt_is_subscribed(c, attr, BT_GATT_CCC_NOTIFY);
}

bool ble_motion_wanted(void)
{
	for (int i = 0; i < M_COUNT; i++) {
		if (subscribed(motion_attr[i])) {
			return true;
		}
	}
	return false;
}

/* Wird mit motion_freq_hz aufgerufen; Dezimierung so, dass Summe der Notifications <= 200/s bleibt. */
void ble_publish_motion(const float q[4], float roll, float pitch, float yaw, const thingy_raw_motion_t *raw,
			const thingy_raw_hr_t *hr)
{
	static uint32_t tick;
	bool sub[M_COUNT];
	uint32_t n = 0;
	for (int i = 0; i < M_COUNT; i++) {
		sub[i] = subscribed(motion_attr[i]);
		n += sub[i];
	}
	if (n == 0) {
		return;
	}
	thingy_motion_config_t cfg;
	ble_get_motion_config(&cfg);
	const uint32_t want = (uint32_t)cfg.motion_freq_hz * n;
	const uint32_t every = (want + NOTIFY_BUDGET_PER_S - 1) / NOTIFY_BUDGET_PER_S; /* BERECHNUNG ceil */
	if ((tick++ % (every ? every : 1)) != 0) {
		return;
	}
	uint8_t b[THINGY_RAW_MOTION_LEN];
	struct bt_conn *c = conn_cur;
	if (sub[M_QUAT] && thingy_encode_quaternion(q, b, sizeof b)) {
		(void)bt_gatt_notify(c, motion_attr[M_QUAT], b, THINGY_QUATERNION_LEN);
	}
	if (sub[M_RAW] && thingy_encode_raw_motion(raw, b, sizeof b)) {
		(void)bt_gatt_notify(c, motion_attr[M_RAW], b, THINGY_RAW_MOTION_LEN);
	}
	if (sub[M_EULER] && thingy_encode_euler(roll, pitch, yaw, b, sizeof b)) {
		(void)bt_gatt_notify(c, motion_attr[M_EULER], b, THINGY_EULER_LEN);
	}
	if (sub[M_HEADING] && thingy_encode_heading(yaw, b, sizeof b)) {
		(void)bt_gatt_notify(c, motion_attr[M_HEADING], b, THINGY_HEADING_LEN);
	}
	if (sub[M_HR] && thingy_encode_raw_hr(hr, b, sizeof b)) {
		(void)bt_gatt_notify(c, motion_attr[M_HR], b, THINGY_RAW_HR_LEN);
	}
}

void ble_publish_button(bool pressed)
{
	(void)thingy_encode_button(pressed, &button_state, 1);
	if (subscribed(&ui_svc.attrs[4])) {
		(void)bt_gatt_notify(conn_cur, &ui_svc.attrs[4], &button_state, 1);
	}
}

void ble_publish_speaker_done(void)
{
	const uint8_t finished = 0x00; /* ANNAHME Thingy-Status "finished" */
	if (subscribed(&sound_svc.attrs[6])) {
		(void)bt_gatt_notify(conn_cur, &sound_svc.attrs[6], &finished, 1);
	}
}
