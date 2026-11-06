package ch.disroop.thingylive.protocol

/** Encoders for characteristic writes (docs/protocol.md §1). */
object ThingyCommands {
    private const val ENV_CONFIG_SIZE = 12
    private const val ENV_LED_OFFSET = 9
    private const val SPEAKER_MODE_FREQUENCY = 1
    private const val MIC_MODE_ADPCM = 1

    fun motionConfig(pedometerMs: Int, temperatureMs: Int, compassMs: Int, motionHz: Int, wakeOnMotion: Boolean): ByteArray =
        LeWriter().u16(pedometerMs).u16(temperatureMs).u16(compassMs).u16(motionHz).u8(if (wakeOnMotion) 1 else 0).bytes()

    /** New env config with all intervals set to [intervalMs]; the LED bytes of [current] are kept. */
    fun envConfig(current: ByteArray, intervalMs: Int, gasMode: Int): ByteArray {
        val led = if (current.size >= ENV_CONFIG_SIZE) current.copyOfRange(ENV_LED_OFFSET, ENV_CONFIG_SIZE) else ByteArray(3)
        val w = LeWriter().u16(intervalMs).u16(intervalMs).u16(intervalMs).u16(intervalMs).u8(gasMode)
        led.forEach { w.u8(it.toInt()) }
        return w.bytes()
    }

    fun soundConfig(): ByteArray = byteArrayOf(SPEAKER_MODE_FREQUENCY.toByte(), MIC_MODE_ADPCM.toByte())

    fun speakerTone(hz: Int, durationMs: Int, volume: Int): ByteArray =
        LeWriter().u16(hz).u16(durationMs).u8(volume.coerceIn(0, 100)).bytes()

    fun ledOff(): ByteArray = byteArrayOf(0)

    fun ledConstant(color: Rgb): ByteArray = LeWriter().u8(1).u8(color.r).u8(color.g).u8(color.b).bytes()

    fun led(color: Rgb): ByteArray = if (color == Rgb.OFF) ledOff() else ledConstant(color)
}
