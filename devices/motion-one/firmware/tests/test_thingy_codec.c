/* Testvektoren aus bridge/internal/thingy/decode_test.go (TestDecodeRawMotion) und docs/protocol.md (EF680406). */
#include <string.h>
#include "unity.h"
#include "thingy_codec.h"

void setUp(void) {}
void tearDown(void) {}

static void test_bridge_vector_encodes_to_same_bytes(void)
{
	/* gleiche Bytes wie die Bridge dekodiert: accel {1,-0.5,0} gyro {2,-1,0.5} compass {21,-8,0} */
	const uint8_t want[THINGY_RAW_MOTION_LEN] = {
		0x00, 0x04, 0x00, 0xFE, 0x00, 0x00,
		0x40, 0x00, 0xE0, 0xFF, 0x10, 0x00,
		0x50, 0x01, 0x80, 0xFF, 0x00, 0x00,
	};
	const thingy_raw_motion_t in = {{1.0f, -0.5f, 0.0f}, {2.0f, -1.0f, 0.5f}, {21.0f, -8.0f, 0.0f}};
	uint8_t out[THINGY_RAW_MOTION_LEN];
	memset(out, 0xAA, sizeof out);
	TEST_ASSERT_EQUAL_UINT(18, thingy_encode_raw_motion(&in, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, sizeof want);
}

static void test_saturates_at_i16_limits(void)
{
	/* 40 g * 1024 > 32767; -2000 dps * 32 < -32768; 3000 uT * 16 > 32767 */
	const thingy_raw_motion_t in = {{40.0f, -40.0f, 31.999f}, {-2000.0f, 2000.0f, 0.0f}, {3000.0f, -3000.0f, 0.0f}};
	const uint8_t want[THINGY_RAW_MOTION_LEN] = {
		0xFF, 0x7F, 0x00, 0x80, 0xFF, 0x7F, /* 32767, -32768, 32767 (31.999*1024=32766.98 -> 32767) */
		0x00, 0x80, 0xFF, 0x7F, 0x00, 0x00,
		0xFF, 0x7F, 0x00, 0x80, 0x00, 0x00,
	};
	uint8_t out[THINGY_RAW_MOTION_LEN];
	TEST_ASSERT_EQUAL_UINT(18, thingy_encode_raw_motion(&in, out, sizeof out));
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, sizeof want);
}

static void test_rounds_to_nearest(void)
{
	/* 0.0004 g * 1024 = 0.41 -> 0; -0.0006 g * 1024 = -0.61 -> -1 (0xFFFF); 1 dps/64 * 32 = 0.5 -> 1 (weg von 0) */
	const thingy_raw_motion_t in = {{0.0004f, -0.0006f, 0.0f}, {0.015625f, -0.015625f, 0.0f}, {0.0f, 0.0f, 0.0f}};
	uint8_t out[THINGY_RAW_MOTION_LEN];
	TEST_ASSERT_EQUAL_UINT(18, thingy_encode_raw_motion(&in, out, sizeof out));
	const uint8_t want[12] = {0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x01, 0x00, 0xFF, 0xFF, 0x00, 0x00};
	TEST_ASSERT_EQUAL_HEX8_ARRAY(want, out, sizeof want);
}

static void test_rejects_short_buffer_and_null(void)
{
	const thingy_raw_motion_t in = {{0, 0, 0}, {0, 0, 0}, {0, 0, 0}};
	uint8_t out[THINGY_RAW_MOTION_LEN] = {0};
	TEST_ASSERT_EQUAL_UINT(0, thingy_encode_raw_motion(&in, out, 17));
	TEST_ASSERT_EQUAL_UINT(0, thingy_encode_raw_motion(NULL, out, sizeof out));
	TEST_ASSERT_EQUAL_UINT(0, thingy_encode_raw_motion(&in, NULL, sizeof out));
}

int main(void)
{
	UNITY_BEGIN();
	RUN_TEST(test_bridge_vector_encodes_to_same_bytes);
	RUN_TEST(test_saturates_at_i16_limits);
	RUN_TEST(test_rounds_to_nearest);
	RUN_TEST(test_rejects_short_buffer_and_null);
	return UNITY_END();
}
