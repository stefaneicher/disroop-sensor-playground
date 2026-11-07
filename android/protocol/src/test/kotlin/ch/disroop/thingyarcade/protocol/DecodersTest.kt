package ch.disroop.thingyarcade.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DecodersTest {
    private val eps = 1e-9

    @Test fun `temperature is int8 plus hundredths`() {
        assertEquals(23.40, ThingyDecoders.temperature(bytes(0x17, 0x28)), eps)
    }

    @Test fun `negative temperature integer part is signed`() {
        assertEquals(-4.75, ThingyDecoders.temperature(bytes(0xFB, 0x19)), eps)
    }

    @Test fun `pressure is int32 plus hundredths`() {
        assertEquals(963.20, ThingyDecoders.pressure(bytes(0xC3, 0x03, 0x00, 0x00, 0x14)), eps)
    }

    @Test fun `humidity is unsigned byte`() {
        assertEquals(41, ThingyDecoders.humidity(bytes(41)))
        assertEquals(200, ThingyDecoders.humidity(bytes(0xC8)))
    }

    @Test fun `gas is eco2 and tvoc u16`() {
        assertEquals(GasReading(eco2Ppm = 612, tvocPpb = 14), ThingyDecoders.gas(bytes(0x64, 0x02, 0x0E, 0x00)))
    }

    @Test fun `color is four u16`() {
        assertEquals(
            Rgbc(r = 180, g = 160, b = 120, clear = 400),
            ThingyDecoders.color(bytes(0xB4, 0x00, 0xA0, 0x00, 0x78, 0x00, 0x90, 0x01)),
        )
    }

    @Test fun `color handles values above 32767`() {
        assertEquals(65535, ThingyDecoders.color(bytes(0xFF, 0xFF, 0, 0, 0, 0, 0, 0)).r)
    }

    @Test fun `button pressed and released`() {
        assertTrue(ThingyDecoders.button(bytes(1)))
        assertFalse(ThingyDecoders.button(bytes(0)))
    }

    @Test fun `tap direction and count`() {
        assertEquals(Tap(TapDirection.Z_POS, 1), ThingyDecoders.tap(bytes(5, 1)))
        assertEquals(Tap(TapDirection.X_NEG, 2), ThingyDecoders.tap(bytes(2, 2)))
    }

    @Test fun `orientation codes`() {
        assertEquals(Orientation.PORTRAIT, ThingyDecoders.orientation(bytes(0)))
        assertEquals(Orientation.LANDSCAPE, ThingyDecoders.orientation(bytes(1)))
        assertEquals(Orientation.REVERSE_PORTRAIT, ThingyDecoders.orientation(bytes(2)))
        assertEquals(Orientation.REVERSE_LANDSCAPE, ThingyDecoders.orientation(bytes(3)))
    }

    @Test fun `quaternion is q2_30`() {
        val q = ThingyDecoders.quaternion(
            bytes(0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0),
        )
        assertEquals(Quaternion(w = 1.0, x = -0.5, y = 0.0, z = 0.0), q)
    }

    @Test fun `pedometer steps and time`() {
        assertEquals(Steps(count = 12, timeMs = 1000), ThingyDecoders.steps(bytes(12, 0, 0, 0, 0xE8, 0x03, 0, 0)))
    }

    @Test fun `raw motion scales accel gyro compass`() {
        val raw = ThingyDecoders.rawMotion(
            bytes(
                0x00, 0x04, 0x00, 0xFE, 0x00, 0x00, // accel 1024, -512, 0
                0x20, 0x00, 0xC0, 0xFF, 0x10, 0x00, // gyro 32, -64, 16
                0x10, 0x00, 0x60, 0xFF, 0x00, 0x00, // compass 16, -160, 0
            ),
        )
        assertEquals(Vec3(1.0, -0.5, 0.0), raw.accelG)
        assertEquals(Vec3(1.0, -2.0, 0.5), raw.gyroDps)
        assertEquals(Vec3(1.0, -10.0, 0.0), raw.compassUt)
    }

    @Test fun `euler angles are i32 over 65536`() {
        val e = ThingyDecoders.euler(bytes(0, 0, 1, 0, 0, 0, 0xFE, 0xFF, 0x00, 0x80, 0x2F, 0x00))
        assertEquals(EulerAngles(roll = 1.0, pitch = -2.0, yaw = 47.5), e)
    }

    @Test fun `heading is i32 over 65536`() {
        assertEquals(47.0, ThingyDecoders.heading(bytes(0, 0, 0x2F, 0)), eps)
    }

    @Test fun `gravity is three float32`() {
        val g = ThingyDecoders.gravity(bytes(0x00, 0x00, 0x80, 0x3F, 0x00, 0x00, 0x00, 0xC0, 0, 0, 0, 0))
        assertEquals(Vec3(1.0, -2.0, 0.0), g)
    }

    @Test fun `battery percent`() {
        assertEquals(87, ThingyDecoders.battery(bytes(87)))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `too short payload is rejected`() {
        ThingyDecoders.pressure(bytes(1, 2))
    }
}
