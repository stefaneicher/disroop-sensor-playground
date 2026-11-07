/* Reine C-Kodierer fuer das Thingy:52-kompatible BLE-Profil (docs/protocol.md). Ohne Hardwareabhaengigkeit. */
#ifndef THINGY_CODEC_H
#define THINGY_CODEC_H

#include <stddef.h>
#include <stdint.h>

#define THINGY_RAW_MOTION_LEN 18u

typedef struct {
	float x, y, z;
} thingy_xyz_t;

/* EF680406 Raw Motion: accel in g, gyro in dps, compass in uT */
typedef struct {
	thingy_xyz_t accel;
	thingy_xyz_t gyro;
	thingy_xyz_t compass;
} thingy_raw_motion_t;

/* Kodiert 9x i16 LE (accel*1024, gyro*32, compass*16), gerundet und an i16-Grenzen gesaettigt.
 * Rueckgabe: geschriebene Bytes (18) oder 0, wenn out zu klein oder NULL. */
size_t thingy_encode_raw_motion(const thingy_raw_motion_t *in, uint8_t *out, size_t out_len);

#endif
