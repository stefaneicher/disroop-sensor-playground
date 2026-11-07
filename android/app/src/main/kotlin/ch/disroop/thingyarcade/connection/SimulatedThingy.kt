package ch.disroop.thingyarcade.connection

import ch.disroop.thingyarcade.protocol.EulerAngles
import ch.disroop.thingyarcade.protocol.GasReading
import ch.disroop.thingyarcade.protocol.ImaAdpcm
import ch.disroop.thingyarcade.protocol.NotificationEncoder
import ch.disroop.thingyarcade.protocol.Orientation
import ch.disroop.thingyarcade.protocol.Quaternion
import ch.disroop.thingyarcade.protocol.RawMotion
import ch.disroop.thingyarcade.protocol.Rgbc
import ch.disroop.thingyarcade.protocol.Snapshot
import ch.disroop.thingyarcade.protocol.Steps
import ch.disroop.thingyarcade.protocol.Tap
import ch.disroop.thingyarcade.protocol.TapDirection
import ch.disroop.thingyarcade.protocol.ThingyUuids
import ch.disroop.thingyarcade.protocol.Vec3
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Deterministic Thingy simulator. It emits the same raw byte payloads as the real device,
 * so the whole decode pipeline is exercised without hardware (emulator, tests, demos).
 */
class SimulatedThingy : ThingyConnection {
    override val source = Snapshot.Source.SIM
    private val _link = MutableStateFlow<LinkState>(LinkState.Idle)
    override val link = _link.asStateFlow()
    private val _events = MutableSharedFlow<ConnectionEvent>(extraBufferCapacity = 64, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    override val events = _events.asSharedFlow()

    @Volatile
    private var microphone = false

    override suspend fun run() {
        microphone = false
        _link.value = LinkState.Connecting(ADDRESS)
        delay(CONNECT_DELAY_MS)
        _link.value = LinkState.Connected(NAME, ADDRESS)
        try {
            coroutineScope {
                emit(ThingyUuids.BUTTON, NotificationEncoder.button(false))
                every(MOTION_PERIOD_MS) { tick -> emitMotion(tick * MOTION_PERIOD_MS / 1000.0) }
                every(ENV_PERIOD_MS) { tick -> emitEnvironment(tick) }
                every(MIC_PERIOD_MS) { tick -> if (microphone) emitMicrophone(tick * MIC_PERIOD_MS / 1000.0) }
                every(STATUS_PERIOD_MS) { tick ->
                    _events.emit(ConnectionEvent.Rssi(-45 - (tick % 7).toInt()))
                    emit(ThingyUuids.BATTERY_LEVEL, NotificationEncoder.battery(chargeCycle(tick * STATUS_PERIOD_MS)))
                }
                every(TAP_PERIOD_MS) { tick ->
                    emit(ThingyUuids.TAP, NotificationEncoder.tap(Tap(TapDirection.entries[(tick % 6).toInt()], 1)))
                    emit(ThingyUuids.ORIENTATION, NotificationEncoder.orientation(Orientation.entries[(tick % 4).toInt()]))
                }
            }
        } finally {
            _link.value = LinkState.Idle
        }
    }

    override suspend fun write(uuid: UUID, value: ByteArray, withResponse: Boolean): Boolean = true

    override suspend fun setMicrophone(enabled: Boolean): Boolean {
        microphone = enabled
        return true
    }

    private fun kotlinx.coroutines.CoroutineScope.every(periodMs: Long, block: suspend (Long) -> Unit) = launch {
        var tick = 0L
        while (true) {
            block(tick++)
            delay(periodMs)
        }
    }

    private suspend fun emit(uuid: UUID, value: ByteArray) = _events.emit(ConnectionEvent.Data(uuid, value))

    private suspend fun emitMotion(t: Double) {
        val roll = 15 * sin(2 * PI * t / 6)
        val pitch = 10 * cos(2 * PI * t / 8)
        val yaw = (t * 12) % 360
        val accel = Vec3(sin(roll.rad()) * 0.98, sin(pitch.rad()) * 0.98, cos(roll.rad()) * cos(pitch.rad()))
        val gyro = Vec3(15 * cos(2 * PI * t / 6), -10 * sin(2 * PI * t / 8), 12.0)
        val compass = Vec3(25 * cos(yaw.rad()), -25 * sin(yaw.rad()), 40.0)
        emit(ThingyUuids.RAW_MOTION, NotificationEncoder.rawMotion(RawMotion(accel, gyro, compass)))
        emit(ThingyUuids.EULER, NotificationEncoder.euler(EulerAngles(roll, pitch, yaw)))
        emit(ThingyUuids.HEADING, NotificationEncoder.heading(yaw))
        emit(ThingyUuids.QUATERNION, NotificationEncoder.quaternion(Quaternion(cos(yaw.rad() / 2), 0.0, 0.0, sin(yaw.rad() / 2))))
        emit(ThingyUuids.GRAVITY, NotificationEncoder.gravity(Vec3(accel.x * G, accel.y * G, accel.z * G)))
    }

    private suspend fun emitEnvironment(tick: Long) {
        val t = tick.toDouble()
        emit(ThingyUuids.TEMPERATURE, NotificationEncoder.temperature(23.4 + 0.5 * sin(t / 20)))
        emit(ThingyUuids.HUMIDITY, NotificationEncoder.humidity(41 + (tick / 10 % 3).toInt()))
        emit(ThingyUuids.PRESSURE, NotificationEncoder.pressure(963.2 + 0.1 * sin(t / 30)))
        emit(ThingyUuids.GAS, NotificationEncoder.gas(GasReading(eco2Ppm = 600 + (tick * 37 % 900).toInt(), tvocPpb = 14 + (tick * 11 % 300).toInt())))
        emit(ThingyUuids.COLOR, NotificationEncoder.color(Rgbc(180, 160 + (tick % 20).toInt(), 120, 400)))
        emit(ThingyUuids.PEDOMETER, NotificationEncoder.steps(Steps(count = tick / 2, timeMs = tick * ENV_PERIOD_MS)))
    }

    private suspend fun emitMicrophone(t: Double) {
        val amplitude = 2000 + 1500 * sin(2 * PI * t / 4)
        val pcm = ShortArray(MIC_SAMPLES) { (amplitude * sin(2 * PI * 440 * it / 16_000.0)).toInt().toShort() }
        emit(ThingyUuids.MICROPHONE, ImaAdpcm.encode(pcm))
    }

    private fun Double.rad() = this * PI / 180

    companion object {
        /** Simulated battery: charges 60 → 70 % (1 % per minute), then runs on battery back to 60 %. */
        fun chargeCycle(elapsedMs: Long): Int {
            val minute = (elapsedMs / 60_000 % 20).toInt()
            return if (minute <= 10) 60 + minute else 80 - minute
        }

        private const val NAME = "Thingy (Simulator)"
        private const val ADDRESS = "SIM"
        private const val G = 9.81
        private const val CONNECT_DELAY_MS = 300L
        private const val MOTION_PERIOD_MS = 100L
        private const val ENV_PERIOD_MS = 1_000L
        private const val MIC_PERIOD_MS = 100L
        private const val STATUS_PERIOD_MS = 2_000L
        private const val TAP_PERIOD_MS = 7_000L
        private const val MIC_SAMPLES = 256
    }
}
