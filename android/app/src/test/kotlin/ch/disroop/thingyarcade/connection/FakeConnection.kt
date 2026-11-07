package ch.disroop.thingyarcade.connection

import ch.disroop.thingyarcade.protocol.Snapshot
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import java.util.UUID

/** Test double for the [ThingyConnection] port that records all writes. */
class FakeConnection(override val source: Snapshot.Source = Snapshot.Source.BLE) : ThingyConnection {
    data class Write(val uuid: UUID, val value: List<Byte>, val withResponse: Boolean, val atMs: Long)

    override val link = MutableStateFlow<LinkState>(LinkState.Idle)
    override val events = MutableSharedFlow<ConnectionEvent>(extraBufferCapacity = 64)
    val writes = mutableListOf<Write>()
    var runs = 0
        private set
    var now: () -> Long = { 0 }
    val microphoneCalls = mutableListOf<Boolean>()
    var microphoneResult = true

    override suspend fun run() {
        runs++
        link.value = LinkState.Connected(name = "Thingy", address = "E3:58:08:1B:53:5F")
        try {
            awaitCancellation()
        } finally {
            link.value = LinkState.Idle
        }
    }

    override suspend fun write(uuid: UUID, value: ByteArray, withResponse: Boolean): Boolean {
        writes += Write(uuid, value.toList(), withResponse, now())
        return true
    }

    override suspend fun setMicrophone(enabled: Boolean): Boolean {
        microphoneCalls += enabled
        return microphoneResult
    }

    fun emit(uuid: UUID, value: ByteArray) {
        check(events.tryEmit(ConnectionEvent.Data(uuid, value)))
    }
}
