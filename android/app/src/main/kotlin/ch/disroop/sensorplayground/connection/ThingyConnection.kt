package ch.disroop.sensorplayground.connection

import ch.disroop.sensorplayground.protocol.Snapshot
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import java.util.UUID

/** Port to a Thingy:52, implemented by [BleThingyConnection] and [SimulatedThingy]. */
interface ThingyConnection {
    val source: Snapshot.Source
    val link: StateFlow<LinkState>

    /** Raw characteristic values and RSSI readings; decoding happens in the protocol module. */
    val events: Flow<ConnectionEvent>

    /** Scans, connects, configures and reconnects until the calling coroutine is cancelled. */
    suspend fun run()

    suspend fun write(uuid: UUID, value: ByteArray, withResponse: Boolean = true): Boolean

    /** Starts/stops the microphone stream on the current link (off after every (re)connect). */
    suspend fun setMicrophone(enabled: Boolean): Boolean
}

sealed interface ConnectionEvent {
    class Data(val uuid: UUID, val value: ByteArray) : ConnectionEvent

    data class Rssi(val dbm: Int) : ConnectionEvent
}

sealed interface LinkState {
    data object Idle : LinkState
    data object Scanning : LinkState
    data class Connecting(val address: String) : LinkState
    data class Connected(val name: String, val address: String) : LinkState
    data class Unavailable(val reason: Reason) : LinkState

    enum class Reason { NO_PERMISSION, BLUETOOTH_OFF, SCAN_FAILED }
}

/** Creates connections; lets the ViewModel stay free of Android framework classes. */
interface ConnectionFactory {
    val bleAvailable: Boolean
    fun ble(): ThingyConnection
    fun simulator(): ThingyConnection
}
