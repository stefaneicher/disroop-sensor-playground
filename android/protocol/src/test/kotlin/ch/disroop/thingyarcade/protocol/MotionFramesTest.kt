package ch.disroop.thingyarcade.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MotionFramesTest {
    private var now = 1_000L
    private val frames = MotionFrames { now }
    private val raw = TelemetryEvent.Motion(RawMotion(Vec3(0.0, 0.0, 1.0), Vec3(10.0, -20.0, 30.0), Vec3(1.0, 2.0, 3.0)))

    @Test fun `raw motion produces a frame with the latest quaternion`() {
        frames.accept(TelemetryEvent.Rotation(Quaternion(0.5, 0.5, 0.5, 0.5)))
        assertEquals(
            """{"t":1000,"q":[0.50000,0.50000,0.50000,0.50000],"gyro":[10.00000,-20.00000,30.00000],"accel":[0.00000,0.00000,1.00000],"button":false}""",
            frames.accept(raw),
        )
    }

    @Test fun `quaternion alone publishes only while raw motion is missing`() {
        assertEquals(true, frames.accept(TelemetryEvent.Rotation(Quaternion(1.0, 0.0, 0.0, 0.0)))?.startsWith("{\"t\":1000"))
        frames.accept(raw)
        now += 100
        assertNull(frames.accept(TelemetryEvent.Rotation(Quaternion(1.0, 0.0, 0.0, 0.0))))
        now += 500
        assertEquals(true, frames.accept(TelemetryEvent.Rotation(Quaternion(1.0, 0.0, 0.0, 0.0))) != null)
    }

    @Test fun `button change publishes at once and stays set`() {
        assertEquals(true, frames.accept(TelemetryEvent.Button(true))?.contains("\"button\":true"))
        assertEquals(true, frames.accept(raw)?.contains("\"button\":true"))
    }

    @Test fun `a tap is attached to the next frame once`() {
        assertNull(frames.accept(TelemetryEvent.TapDetected(Tap(TapDirection.Z_POS, 2))))
        assertEquals(true, frames.accept(raw)?.endsWith(",\"tap\":{\"dir\":\"Z+\",\"count\":2}}"))
        assertEquals(false, frames.accept(raw)?.contains("tap"))
    }

    @Test fun `other events produce no frame`() {
        assertNull(frames.accept(TelemetryEvent.Battery(80)))
    }
}
