package ch.disroop.thingylive.protocol

/** Immutable telemetry snapshot; mirrors `docs/telemetry.schema.json`. `null` = not received yet. */
data class Snapshot(
    val ts: Long = 0,
    val connected: Boolean = false,
    val device: Device = Device(),
    val motion: Motion = Motion(),
    val environment: Environment = Environment(),
    val sound: Sound = Sound(),
    val ui: Ui = Ui(),
) {
    enum class Source(val jsonName: String) { BLE("ble"), SIM("sim") }

    data class Device(
        val name: String? = null,
        val address: String? = null,
        val rssi: Int? = null,
        val batteryPct: Int? = null,
        val source: Source = Source.BLE,
    )

    data class Motion(
        val accelG: Vec3? = null,
        val gyroDps: Vec3? = null,
        val compassUt: Vec3? = null,
        val euler: EulerAngles? = null,
        val quaternion: Quaternion? = null,
        val gravity: Vec3? = null,
        val headingDeg: Double? = null,
        val orientation: Orientation? = null,
        val steps: Long? = null,
        val tap: TapEvent? = null,
    )

    data class Environment(
        val temperatureC: Double? = null,
        val humidityPct: Int? = null,
        val pressureHpa: Double? = null,
        val eco2Ppm: Int? = null,
        val tvocPpb: Int? = null,
        val color: Rgbc? = null,
    )

    data class Sound(val levelDbfs: Double? = null, val song: SongState = SongState())

    data class SongState(val playing: Boolean = false, val noteIndex: Int = -1)

    data class Ui(val buttonPressed: Boolean? = null, val led: Rgb? = null)

    /** Pure reducer: applies one decoded [event] received at [nowMs]. */
    fun reduce(event: TelemetryEvent, nowMs: Long): Snapshot = applyEvent(event, nowMs).copy(ts = nowMs)

    private fun applyEvent(e: TelemetryEvent, nowMs: Long): Snapshot = when (e) {
        is TelemetryEvent.Temperature -> env { copy(temperatureC = e.celsius) }
        is TelemetryEvent.Pressure -> env { copy(pressureHpa = e.hpa) }
        is TelemetryEvent.Humidity -> env { copy(humidityPct = e.percent) }
        is TelemetryEvent.Gas -> env { copy(eco2Ppm = e.reading.eco2Ppm, tvocPpb = e.reading.tvocPpb) }
        is TelemetryEvent.ColorSample -> env { copy(color = e.color) }
        is TelemetryEvent.Button -> copy(ui = ui.copy(buttonPressed = e.pressed))
        is TelemetryEvent.TapDetected -> motion { copy(tap = TapEvent(e.tap.direction, e.tap.count, nowMs)) }
        is TelemetryEvent.OrientationChanged -> motion { copy(orientation = e.orientation) }
        is TelemetryEvent.Rotation -> motion { copy(quaternion = e.quaternion) }
        is TelemetryEvent.StepCount -> motion { copy(steps = e.steps.count) }
        is TelemetryEvent.Motion -> motion { copy(accelG = e.raw.accelG, gyroDps = e.raw.gyroDps, compassUt = e.raw.compassUt) }
        is TelemetryEvent.Euler -> motion { copy(euler = e.angles) }
        is TelemetryEvent.Heading -> motion { copy(headingDeg = e.degrees) }
        is TelemetryEvent.GravityVector -> motion { copy(gravity = e.gravity) }
        is TelemetryEvent.Battery -> copy(device = device.copy(batteryPct = e.percent))
        is TelemetryEvent.Rssi -> copy(device = device.copy(rssi = e.dbm))
        is TelemetryEvent.MicLevel -> copy(sound = sound.copy(levelDbfs = smooth(sound.levelDbfs, e.dbfs)))
        is TelemetryEvent.SpeakerStatus -> this
    }

    private inline fun env(f: Environment.() -> Environment) = copy(environment = environment.f())
    private inline fun motion(f: Motion.() -> Motion) = copy(motion = motion.f())

    companion object {
        const val LEVEL_EMA_ALPHA = 0.3

        private fun smooth(previous: Double?, current: Double): Double =
            if (previous == null) current else previous + LEVEL_EMA_ALPHA * (current - previous)
    }
}

data class TapEvent(val direction: TapDirection, val count: Int, val ts: Long)

/** Traffic light for eCO₂/TVOC (green < 1000 ppm / 220 ppb, red ≥ 1500 ppm / 660 ppb). */
enum class AirQuality {
    GOOD, MODERATE, POOR, UNKNOWN;

    companion object {
        fun rate(eco2Ppm: Int?, tvocPpb: Int?): AirQuality {
            if (eco2Ppm == null && tvocPpb == null) return UNKNOWN
            val eco2 = eco2Ppm ?: 0
            val tvoc = tvocPpb ?: 0
            return when {
                eco2 >= 1500 || tvoc >= 660 -> POOR
                eco2 >= 1000 || tvoc >= 220 -> MODERATE
                else -> GOOD
            }
        }
    }
}
