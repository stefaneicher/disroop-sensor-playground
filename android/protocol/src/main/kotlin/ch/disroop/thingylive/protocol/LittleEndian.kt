package ch.disroop.thingylive.protocol

/** Bounds-checked little-endian reader over a notification payload. */
internal class LeReader(private val bytes: ByteArray, minSize: Int) {
    init {
        require(bytes.size >= minSize) { "payload has ${bytes.size} bytes, expected at least $minSize" }
    }

    fun u8(i: Int): Int = bytes[i].toInt() and 0xFF
    fun i8(i: Int): Int = bytes[i].toInt()
    fun u16(i: Int): Int = u8(i) or (u8(i + 1) shl 8)
    fun i16(i: Int): Int = u16(i).toShort().toInt()
    fun i32(i: Int): Int = u8(i) or (u8(i + 1) shl 8) or (u8(i + 2) shl 16) or (u8(i + 3) shl 24)
    fun u32(i: Int): Long = i32(i).toLong() and 0xFFFF_FFFFL
    fun f32(i: Int): Float = Float.fromBits(i32(i))
}

/** Little-endian builder for characteristic writes. */
internal class LeWriter {
    private val out = ArrayList<Byte>()

    fun u8(value: Int) = apply { out.add((value and 0xFF).toByte()) }
    fun u16(value: Int) = apply { u8(value).u8(value shr 8) }
    fun i32(value: Int) = apply { u16(value).u16(value shr 16) }
    fun bytes(): ByteArray = out.toByteArray()
}
