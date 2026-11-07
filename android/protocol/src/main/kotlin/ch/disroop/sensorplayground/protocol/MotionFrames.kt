package ch.disroop.sensorplayground.protocol

import java.util.Locale

/**
 * Folds quaternion, raw motion, button and tap notifications into the frames of the Thingy Tennis game
 * (same JSON as the bridge's `/api/motion`, see docs/protocol.md). A frame is produced per raw-motion
 * notification, and at once for a button change; quaternion-only updates are published while no raw data arrives.
 */
class MotionFrames(private val clock: () -> Long = System::currentTimeMillis) {
    private var q = Quaternion(1.0, 0.0, 0.0, 0.0)
    private var accel = Vec3(0.0, 0.0, 0.0)
    private var gyro = Vec3(0.0, 0.0, 0.0)
    private var button = false
    private var tap: Tap? = null
    private var lastRawMs: Long? = null

    /** Returns the frame JSON to send, or null if [event] does not produce one. */
    fun accept(event: TelemetryEvent): String? {
        val now = clock()
        return when (event) {
            is TelemetryEvent.Rotation -> {
                q = event.quaternion
                if (lastRawMs.let { it == null || now - it > RAW_GRACE_MS }) frame(now) else null
            }
            is TelemetryEvent.Motion -> {
                accel = event.raw.accelG
                gyro = event.raw.gyroDps
                lastRawMs = now
                frame(now)
            }
            is TelemetryEvent.Button -> {
                button = event.pressed
                frame(now)
            }
            is TelemetryEvent.TapDetected -> {
                tap = event.tap
                null
            }
            else -> null
        }
    }

    private fun frame(now: Long): String {
        val t = tap
        tap = null
        return buildString {
            append("{\"t\":").append(now)
            append(",\"q\":").append(list(q.w, q.x, q.y, q.z))
            append(",\"gyro\":").append(list(gyro.x, gyro.y, gyro.z))
            append(",\"accel\":").append(list(accel.x, accel.y, accel.z))
            append(",\"button\":").append(button)
            if (t != null) append(",\"tap\":{\"dir\":\"").append(t.direction.label).append("\",\"count\":").append(t.count).append('}')
            append('}')
        }
    }

    private fun list(vararg v: Double) = v.joinToString(",", "[", "]") { String.format(Locale.ROOT, "%.5f", it) }

    private companion object {
        const val RAW_GRACE_MS = 250L
    }
}
