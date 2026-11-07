package ch.disroop.thingyarcade.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SnapshotTest {
    private val empty = Snapshot()

    @Test fun `new snapshot has no values`() {
        assertNull(empty.environment.temperatureC)
        assertNull(empty.motion.accelG)
        assertEquals(-1, empty.sound.song.noteIndex)
    }

    @Test fun `reduces environment events`() {
        val s = empty
            .reduce(TelemetryEvent.Temperature(23.4), nowMs = 1)
            .reduce(TelemetryEvent.Pressure(963.2), nowMs = 2)
            .reduce(TelemetryEvent.Gas(GasReading(612, 14)), nowMs = 3)
        assertEquals(23.4, s.environment.temperatureC!!, 1e-9)
        assertEquals(963.2, s.environment.pressureHpa!!, 1e-9)
        assertEquals(612, s.environment.eco2Ppm)
        assertEquals(14, s.environment.tvocPpb)
        assertEquals(3L, s.ts)
    }

    @Test fun `raw motion fills accel gyro and compass`() {
        val raw = RawMotion(Vec3(0.0, 0.0, 1.0), Vec3(1.0, 2.0, 3.0), Vec3(4.0, 5.0, 6.0))
        val s = empty.reduce(TelemetryEvent.Motion(raw), nowMs = 1)
        assertEquals(raw.accelG, s.motion.accelG)
        assertEquals(raw.gyroDps, s.motion.gyroDps)
        assertEquals(raw.compassUt, s.motion.compassUt)
    }

    @Test fun `tap remembers when it happened`() {
        val s = empty.reduce(TelemetryEvent.TapDetected(Tap(TapDirection.Z_POS, 1)), nowMs = 42)
        assertEquals(TapEvent(TapDirection.Z_POS, 1, 42), s.motion.tap)
    }

    @Test fun `microphone level is smoothed with ema 0_3`() {
        val s1 = empty.reduce(TelemetryEvent.MicLevel(-20.0), nowMs = 1)
        val s2 = s1.reduce(TelemetryEvent.MicLevel(-40.0), nowMs = 2)
        assertEquals(-20.0, s1.sound.levelDbfs!!, 1e-9)
        assertEquals(-26.0, s2.sound.levelDbfs!!, 1e-9)
    }

    @Test fun `rssi and battery update device info`() {
        val s = empty.reduce(TelemetryEvent.Rssi(-43), 1).reduce(TelemetryEvent.Battery(87), 2)
        assertEquals(-43, s.device.rssi)
        assertEquals(87, s.device.batteryPct)
    }

    @Test fun `steps orientation euler quaternion heading button`() {
        val s = empty
            .reduce(TelemetryEvent.StepCount(Steps(12, 1000)), 1)
            .reduce(TelemetryEvent.OrientationChanged(Orientation.LANDSCAPE), 1)
            .reduce(TelemetryEvent.Euler(EulerAngles(1.0, 2.0, 3.0)), 1)
            .reduce(TelemetryEvent.Rotation(Quaternion(1.0, 0.0, 0.0, 0.0)), 1)
            .reduce(TelemetryEvent.Heading(47.0), 1)
            .reduce(TelemetryEvent.Button(true), 1)
            .reduce(TelemetryEvent.ColorSample(Rgbc(1, 2, 3, 4)), 1)
            .reduce(TelemetryEvent.Humidity(41), 1)
            .reduce(TelemetryEvent.GravityVector(Vec3(0.0, 0.0, 9.81)), 1)
        assertEquals(12L, s.motion.steps)
        assertEquals(Orientation.LANDSCAPE, s.motion.orientation)
        assertEquals(EulerAngles(1.0, 2.0, 3.0), s.motion.euler)
        assertEquals(Quaternion(1.0, 0.0, 0.0, 0.0), s.motion.quaternion)
        assertEquals(47.0, s.motion.headingDeg!!, 1e-9)
        assertEquals(true, s.ui.buttonPressed)
        assertEquals(Rgbc(1, 2, 3, 4), s.environment.color)
        assertEquals(41, s.environment.humidityPct)
        assertEquals(Vec3(0.0, 0.0, 9.81), s.motion.gravity)
    }

    @Test fun `air quality traffic light`() {
        assertEquals(AirQuality.GOOD, AirQuality.rate(eco2Ppm = 612, tvocPpb = 14))
        assertEquals(AirQuality.MODERATE, AirQuality.rate(eco2Ppm = 1200, tvocPpb = 14))
        assertEquals(AirQuality.MODERATE, AirQuality.rate(eco2Ppm = 400, tvocPpb = 300))
        assertEquals(AirQuality.POOR, AirQuality.rate(eco2Ppm = 2000, tvocPpb = 14))
        assertEquals(AirQuality.POOR, AirQuality.rate(eco2Ppm = 400, tvocPpb = 700))
        assertEquals(AirQuality.UNKNOWN, AirQuality.rate(eco2Ppm = null, tvocPpb = null))
    }
}
