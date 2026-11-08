package ch.disroop.sensorplayground.protocol

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

/** The simulator produces raw payloads with [NotificationEncoder]; they must survive the real decoders. */
class NotificationEncoderTest {
    @Test fun `temperature and pressure match protocol bytes`() {
        assertArrayEquals(bytes(0x17, 0x28), NotificationEncoder.temperature(23.4))
        assertArrayEquals(bytes(0xC3, 0x03, 0x00, 0x00, 0x14), NotificationEncoder.pressure(963.2))
    }

    @Test fun `raw motion matches protocol bytes`() {
        val raw = RawMotion(Vec3(1.0, -0.5, 0.0), Vec3(1.0, -2.0, 0.5), Vec3(1.0, -10.0, 0.0))
        assertArrayEquals(
            bytes(0x00, 0x04, 0x00, 0xFE, 0, 0, 0x20, 0, 0xC0, 0xFF, 0x10, 0, 0x10, 0, 0x60, 0xFF, 0, 0),
            NotificationEncoder.rawMotion(raw),
        )
    }

    @Test fun `every payload round trips through the decoders`() {
        val cases: List<Pair<java.util.UUID, ByteArray>> = listOf(
            ThingyUuids.TEMPERATURE to NotificationEncoder.temperature(21.5),
            ThingyUuids.PRESSURE to NotificationEncoder.pressure(1013.25),
            ThingyUuids.HUMIDITY to NotificationEncoder.humidity(55),
            ThingyUuids.GAS to NotificationEncoder.gas(GasReading(450, 12)),
            ThingyUuids.COLOR to NotificationEncoder.color(Rgbc(1, 2, 3, 4)),
            ThingyUuids.BUTTON to NotificationEncoder.button(true),
            ThingyUuids.TAP to NotificationEncoder.tap(Tap(TapDirection.Y_NEG, 2)),
            ThingyUuids.ORIENTATION to NotificationEncoder.orientation(Orientation.REVERSE_LANDSCAPE),
            ThingyUuids.PEDOMETER to NotificationEncoder.steps(Steps(42, 9000)),
            ThingyUuids.EULER to NotificationEncoder.euler(EulerAngles(10.5, -20.25, 180.0)),
            ThingyUuids.HEADING to NotificationEncoder.heading(271.5),
            ThingyUuids.BATTERY_LEVEL to NotificationEncoder.battery(77),
            ThingyUuids.QUATERNION to NotificationEncoder.quaternion(Quaternion(0.5, -0.5, 0.25, 0.0)),
            ThingyUuids.GRAVITY to NotificationEncoder.gravity(Vec3(0.5, -1.0, 9.75)),
        )
        val expected = listOf(
            TelemetryEvent.Temperature(21.5),
            TelemetryEvent.Pressure(1013.25),
            TelemetryEvent.Humidity(55),
            TelemetryEvent.Gas(GasReading(450, 12)),
            TelemetryEvent.ColorSample(Rgbc(1, 2, 3, 4)),
            TelemetryEvent.Button(true),
            TelemetryEvent.TapDetected(Tap(TapDirection.Y_NEG, 2)),
            TelemetryEvent.OrientationChanged(Orientation.REVERSE_LANDSCAPE),
            TelemetryEvent.StepCount(Steps(42, 9000)),
            TelemetryEvent.Euler(EulerAngles(10.5, -20.25, 180.0)),
            TelemetryEvent.Heading(271.5),
            TelemetryEvent.Battery(77),
            TelemetryEvent.Rotation(Quaternion(0.5, -0.5, 0.25, 0.0)),
            TelemetryEvent.GravityVector(Vec3(0.5, -1.0, 9.75)),
        )
        assertEquals(expected, cases.map { (uuid, payload) -> NotificationDecoder.decode(uuid, payload) })
    }
}
