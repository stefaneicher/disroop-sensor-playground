package ch.disroop.thingylive.protocol

import java.util.UUID

/** One GATT operation of the client start sequence; executed by the BLE adapter in order. */
sealed interface GattStep {
    val uuid: UUID

    class Write(override val uuid: UUID, val value: ByteArray) : GattStep {
        override fun toString() = "Write($uuid, ${value.size} B)"
    }

    class ReadModifyWrite(override val uuid: UUID, val transform: (ByteArray) -> ByteArray) : GattStep {
        override fun toString() = "ReadModifyWrite($uuid)"
    }

    /** Reads once; the value is handled like a notification. */
    data class Read(override val uuid: UUID) : GattStep

    data class Subscribe(override val uuid: UUID, val optional: Boolean = false) : GattStep

    data class Unsubscribe(override val uuid: UUID) : GattStep
}

/**
 * Start sequence from docs/protocol.md §1 "Startsequenz (Client)". The microphone stays off by default
 * because its ~32 kB/s stream on top of all other notifications can drop the link; see [microphone].
 */
object StartSequence {
    private const val ENV_INTERVAL_MS = 1000
    private const val GAS_MODE_1S = 1

    private val required = listOf(
        ThingyUuids.TEMPERATURE, ThingyUuids.PRESSURE, ThingyUuids.HUMIDITY, ThingyUuids.GAS, ThingyUuids.COLOR,
        ThingyUuids.BUTTON, ThingyUuids.TAP, ThingyUuids.ORIENTATION, ThingyUuids.PEDOMETER, ThingyUuids.RAW_MOTION,
        ThingyUuids.EULER, ThingyUuids.HEADING, ThingyUuids.SPEAKER_STATUS, ThingyUuids.BATTERY_LEVEL,
    )
    private val optional = listOf(ThingyUuids.QUATERNION, ThingyUuids.GRAVITY)

    fun steps(): List<GattStep> = listOf(
        GattStep.Write(
            ThingyUuids.MOTION_CONFIG,
            ThingyCommands.motionConfig(pedometerMs = 1000, temperatureMs = 500, compassMs = 100, motionHz = 10, wakeOnMotion = true),
        ),
        GattStep.ReadModifyWrite(ThingyUuids.ENV_CONFIG) { current ->
            ThingyCommands.envConfig(current, ENV_INTERVAL_MS, GAS_MODE_1S)
        },
        GattStep.Write(ThingyUuids.SOUND_CONFIG, ThingyCommands.soundConfig()),
        GattStep.Read(ThingyUuids.BATTERY_LEVEL),
    ) + required.map { GattStep.Subscribe(it) } + optional.map { GattStep.Subscribe(it, optional = true) }

    /**
     * "Lautstärke messen": the firmware streams ADPCM while the microphone CCCD is enabled. Enabling
     * re-writes the sound config first, so the microphone is in ADPCM mode.
     */
    fun microphone(enabled: Boolean): List<GattStep> = if (enabled) {
        listOf(GattStep.Write(ThingyUuids.SOUND_CONFIG, ThingyCommands.soundConfig()), GattStep.Subscribe(ThingyUuids.MICROPHONE))
    } else {
        listOf(GattStep.Unsubscribe(ThingyUuids.MICROPHONE))
    }
}
