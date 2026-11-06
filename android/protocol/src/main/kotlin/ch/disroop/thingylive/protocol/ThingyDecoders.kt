package ch.disroop.thingylive.protocol

/**
 * Decoders for the Thingy:52 notification payloads (docs/protocol.md §1).
 * Each decoder throws [IllegalArgumentException] for payloads that are too short.
 */
object ThingyDecoders {
    private const val ACCEL_PER_G = 1024.0
    private const val GYRO_PER_DPS = 32.0
    private const val COMPASS_PER_UT = 16.0
    private const val Q16 = 65536.0
    private const val Q30 = 1073741824.0

    fun temperature(b: ByteArray): Double = LeReader(b, 2).run { i8(0) + u8(1) / 100.0 }

    fun pressure(b: ByteArray): Double = LeReader(b, 5).run { i32(0) + u8(4) / 100.0 }

    fun humidity(b: ByteArray): Int = LeReader(b, 1).u8(0)

    fun gas(b: ByteArray): GasReading = LeReader(b, 4).run { GasReading(u16(0), u16(2)) }

    fun color(b: ByteArray): Rgbc = LeReader(b, 8).run { Rgbc(u16(0), u16(2), u16(4), u16(6)) }

    fun button(b: ByteArray): Boolean = LeReader(b, 1).u8(0) != 0

    fun tap(b: ByteArray): Tap = LeReader(b, 2).run { Tap(TapDirection.of(u8(0)), u8(1)) }

    fun orientation(b: ByteArray): Orientation = Orientation.of(LeReader(b, 1).u8(0))

    fun quaternion(b: ByteArray): Quaternion =
        LeReader(b, 16).run { Quaternion(i32(0) / Q30, i32(4) / Q30, i32(8) / Q30, i32(12) / Q30) }

    fun steps(b: ByteArray): Steps = LeReader(b, 8).run { Steps(u32(0), u32(4)) }

    fun rawMotion(b: ByteArray): RawMotion = LeReader(b, 18).run {
        fun vec(offset: Int, scale: Double) = Vec3(i16(offset) / scale, i16(offset + 2) / scale, i16(offset + 4) / scale)
        RawMotion(vec(0, ACCEL_PER_G), vec(6, GYRO_PER_DPS), vec(12, COMPASS_PER_UT))
    }

    fun euler(b: ByteArray): EulerAngles = LeReader(b, 12).run { EulerAngles(i32(0) / Q16, i32(4) / Q16, i32(8) / Q16) }

    fun heading(b: ByteArray): Double = LeReader(b, 4).i32(0) / Q16

    fun gravity(b: ByteArray): Vec3 =
        LeReader(b, 12).run { Vec3(f32(0).toDouble(), f32(4).toDouble(), f32(8).toDouble()) }

    fun battery(b: ByteArray): Int = LeReader(b, 1).u8(0)

    fun speakerStatus(b: ByteArray): Int = LeReader(b, 1).u8(0)
}
