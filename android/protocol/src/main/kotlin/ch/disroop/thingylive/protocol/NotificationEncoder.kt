package ch.disroop.thingylive.protocol

import kotlin.math.floor
import kotlin.math.roundToInt

/** Inverse of [ThingyDecoders]: builds raw notification payloads (used by the simulator). */
object NotificationEncoder {
    fun temperature(celsius: Double): ByteArray {
        val whole = floor(celsius).toInt()
        return LeWriter().u8(whole).u8(((celsius - whole) * 100).roundToInt()).bytes()
    }

    fun pressure(hpa: Double): ByteArray {
        val whole = floor(hpa).toInt()
        return LeWriter().i32(whole).u8(((hpa - whole) * 100).roundToInt()).bytes()
    }

    fun humidity(percent: Int): ByteArray = LeWriter().u8(percent).bytes()

    fun gas(reading: GasReading): ByteArray = LeWriter().u16(reading.eco2Ppm).u16(reading.tvocPpb).bytes()

    fun color(c: Rgbc): ByteArray = LeWriter().u16(c.r).u16(c.g).u16(c.b).u16(c.clear).bytes()

    fun button(pressed: Boolean): ByteArray = LeWriter().u8(if (pressed) 1 else 0).bytes()

    fun tap(tap: Tap): ByteArray = LeWriter().u8(tap.direction.code).u8(tap.count).bytes()

    fun orientation(o: Orientation): ByteArray = LeWriter().u8(o.code).bytes()

    fun steps(s: Steps): ByteArray = LeWriter().i32(s.count.toInt()).i32(s.timeMs.toInt()).bytes()

    fun rawMotion(m: RawMotion): ByteArray = LeWriter().apply {
        vec(m.accelG, 1024.0)
        vec(m.gyroDps, 32.0)
        vec(m.compassUt, 16.0)
    }.bytes()

    fun euler(e: EulerAngles): ByteArray = LeWriter().i32(q16(e.roll)).i32(q16(e.pitch)).i32(q16(e.yaw)).bytes()

    fun heading(degrees: Double): ByteArray = LeWriter().i32(q16(degrees)).bytes()

    fun quaternion(q: Quaternion): ByteArray =
        LeWriter().i32(q30(q.w)).i32(q30(q.x)).i32(q30(q.y)).i32(q30(q.z)).bytes()

    fun gravity(v: Vec3): ByteArray = LeWriter()
        .i32(v.x.toFloat().toRawBits()).i32(v.y.toFloat().toRawBits()).i32(v.z.toFloat().toRawBits()).bytes()

    fun battery(percent: Int): ByteArray = LeWriter().u8(percent).bytes()

    private fun q16(value: Double): Int = (value * 65536).roundToInt()

    private fun q30(value: Double): Int = (value * 1073741824.0).toLong().coerceIn(Int.MIN_VALUE.toLong(), Int.MAX_VALUE.toLong()).toInt()

    private fun LeWriter.vec(v: Vec3, scale: Double) {
        u16((v.x * scale).roundToInt())
        u16((v.y * scale).roundToInt())
        u16((v.z * scale).roundToInt())
    }
}
