package ch.disroop.sensorplayground.connection

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Process-wide holder of the single Thingy connection, shared by all screens. A screen calls [acquire] in
 * onStart and [release] in onStop. The link survives view changes; it is only dropped explicitly
 * ([disconnect]) or when no screen is visible for [backgroundTimeoutMs] (frees the Thingy for the PC bridge).
 */
class ConnectionHub(
    private val scope: CoroutineScope,
    private val backgroundTimeoutMs: Long = BACKGROUND_TIMEOUT_MS,
    private val create: (Profile) -> ThingyConnection,
) {
    enum class Profile { FULL, GAME, SIMULATOR }

    private var current: ThingyConnection? = null
    private var profile: Profile? = null
    private var runJob: Job? = null
    private var timeoutJob: Job? = null
    private var holders = 0

    val connection: ThingyConnection? get() = current

    /** Returns the shared connection, (re)creating it only when none runs or another [Profile] is needed. */
    fun acquire(wanted: Profile): ThingyConnection {
        holders++
        timeoutJob?.cancel()
        timeoutJob = null
        val existing = current
        if (existing != null && profile == wanted && runJob?.isActive == true) return existing
        return start(wanted)
    }

    fun release() {
        holders = (holders - 1).coerceAtLeast(0)
        if (holders > 0 || current == null) return
        timeoutJob?.cancel()
        timeoutJob = scope.launch {
            delay(backgroundTimeoutMs)
            disconnect()
        }
    }

    /** Explicit disconnect (also used to switch to the simulator). */
    fun disconnect() {
        timeoutJob?.cancel()
        timeoutJob = null
        runJob?.cancel()
        runJob = null
        current = null
        profile = null
    }

    private fun start(wanted: Profile): ThingyConnection {
        runJob?.cancel()
        val next = create(wanted)
        current = next
        profile = wanted
        runJob = scope.launch { next.run() }
        return next
    }

    companion object {
        const val BACKGROUND_TIMEOUT_MS = 60_000L
    }
}
