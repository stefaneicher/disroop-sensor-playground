package ch.disroop.thingylive.connection

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull

class GattResult(val status: Int, val value: ByteArray = ByteArray(0)) {
    val success: Boolean get() = status == SUCCESS

    companion object {
        const val SUCCESS = 0
        const val NOT_STARTED = -1
        const val TIMEOUT = -2
    }
}

/**
 * Android allows only one outstanding GATT operation. Every operation is started inside [execute]
 * and finished by the matching callback calling [complete].
 */
class GattQueue(private val timeoutMs: Long = 5_000) {
    private val mutex = Mutex()

    @Volatile
    private var pending: CompletableDeferred<GattResult>? = null

    suspend fun execute(start: () -> Boolean): GattResult = mutex.withLock {
        val result = CompletableDeferred<GattResult>()
        pending = result
        try {
            if (!start()) return GattResult(GattResult.NOT_STARTED)
            withTimeoutOrNull(timeoutMs) { result.await() } ?: GattResult(GattResult.TIMEOUT)
        } finally {
            pending = null
        }
    }

    fun complete(result: GattResult) {
        pending?.complete(result)
    }
}
