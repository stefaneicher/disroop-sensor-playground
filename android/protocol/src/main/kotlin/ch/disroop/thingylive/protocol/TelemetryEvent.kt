package ch.disroop.thingylive.protocol

import java.util.UUID

/** A decoded value from the Thingy (or the connection, e.g. RSSI). */
sealed interface TelemetryEvent {
    data class Temperature(val celsius: Double) : TelemetryEvent
    data class Pressure(val hpa: Double) : TelemetryEvent
    data class Humidity(val percent: Int) : TelemetryEvent
    data class Gas(val reading: GasReading) : TelemetryEvent
    data class ColorSample(val color: Rgbc) : TelemetryEvent
    data class Button(val pressed: Boolean) : TelemetryEvent
    data class TapDetected(val tap: Tap) : TelemetryEvent
    data class OrientationChanged(val orientation: Orientation) : TelemetryEvent
    data class Rotation(val quaternion: Quaternion) : TelemetryEvent
    data class StepCount(val steps: Steps) : TelemetryEvent
    data class Motion(val raw: RawMotion) : TelemetryEvent
    data class Euler(val angles: EulerAngles) : TelemetryEvent
    data class Heading(val degrees: Double) : TelemetryEvent
    data class GravityVector(val gravity: Vec3) : TelemetryEvent
    data class Battery(val percent: Int) : TelemetryEvent
    data class MicLevel(val dbfs: Double) : TelemetryEvent
    data class SpeakerStatus(val code: Int) : TelemetryEvent
    data class Rssi(val dbm: Int) : TelemetryEvent
}

/** Maps a characteristic notification to a [TelemetryEvent]; unknown or malformed data yields `null`. */
object NotificationDecoder {
    private val decoders: Map<UUID, (ByteArray) -> TelemetryEvent> = mapOf(
        ThingyUuids.TEMPERATURE to { b -> TelemetryEvent.Temperature(ThingyDecoders.temperature(b)) },
        ThingyUuids.PRESSURE to { b -> TelemetryEvent.Pressure(ThingyDecoders.pressure(b)) },
        ThingyUuids.HUMIDITY to { b -> TelemetryEvent.Humidity(ThingyDecoders.humidity(b)) },
        ThingyUuids.GAS to { b -> TelemetryEvent.Gas(ThingyDecoders.gas(b)) },
        ThingyUuids.COLOR to { b -> TelemetryEvent.ColorSample(ThingyDecoders.color(b)) },
        ThingyUuids.BUTTON to { b -> TelemetryEvent.Button(ThingyDecoders.button(b)) },
        ThingyUuids.TAP to { b -> TelemetryEvent.TapDetected(ThingyDecoders.tap(b)) },
        ThingyUuids.ORIENTATION to { b -> TelemetryEvent.OrientationChanged(ThingyDecoders.orientation(b)) },
        ThingyUuids.QUATERNION to { b -> TelemetryEvent.Rotation(ThingyDecoders.quaternion(b)) },
        ThingyUuids.PEDOMETER to { b -> TelemetryEvent.StepCount(ThingyDecoders.steps(b)) },
        ThingyUuids.RAW_MOTION to { b -> TelemetryEvent.Motion(ThingyDecoders.rawMotion(b)) },
        ThingyUuids.EULER to { b -> TelemetryEvent.Euler(ThingyDecoders.euler(b)) },
        ThingyUuids.HEADING to { b -> TelemetryEvent.Heading(ThingyDecoders.heading(b)) },
        ThingyUuids.GRAVITY to { b -> TelemetryEvent.GravityVector(ThingyDecoders.gravity(b)) },
        ThingyUuids.BATTERY_LEVEL to { b -> TelemetryEvent.Battery(ThingyDecoders.battery(b)) },
        ThingyUuids.SPEAKER_STATUS to { b -> TelemetryEvent.SpeakerStatus(ThingyDecoders.speakerStatus(b)) },
        ThingyUuids.MICROPHONE to { b -> TelemetryEvent.MicLevel(AudioLevel.dbfs(ImaAdpcm.decode(b))) },
    )

    fun decode(uuid: UUID, value: ByteArray): TelemetryEvent? {
        val decoder = decoders[uuid] ?: return null
        return try {
            decoder(value)
        } catch (_: IllegalArgumentException) {
            null
        }
    }
}
