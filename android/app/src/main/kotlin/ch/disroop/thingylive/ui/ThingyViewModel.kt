package ch.disroop.thingylive.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import ch.disroop.thingylive.connection.ConnectionEvent
import ch.disroop.thingylive.connection.ConnectionFactory
import ch.disroop.thingylive.connection.LinkState
import ch.disroop.thingylive.connection.ThingyConnection
import ch.disroop.thingylive.protocol.NotificationDecoder
import ch.disroop.thingylive.protocol.Rgb
import ch.disroop.thingylive.protocol.Snapshot
import ch.disroop.thingylive.protocol.Song
import ch.disroop.thingylive.protocol.TelemetryEvent
import ch.disroop.thingylive.protocol.ThingyCommands
import ch.disroop.thingylive.protocol.ThingyUuids
import ch.disroop.thingylive.protocol.Vec3
import ch.disroop.thingylive.song.SongPlayer
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UiState(
    val snapshot: Snapshot = Snapshot(),
    val link: LinkState = LinkState.Idle,
    val simulator: Boolean = false,
    val bleAvailable: Boolean = true,
    val songLength: Int = 0,
    val accelHistory: List<Vec3> = emptyList(),
    val gyroHistory: List<Vec3> = emptyList(),
    val songVolume: Int = SongPlayer.DEFAULT_VOLUME,
    /** "Lautstärke messen": microphone stream requested (off by default, it can overload the link). */
    val micEnabled: Boolean = false,
    /** The link dropped shortly after enabling the microphone, so it was switched off automatically. */
    val micAutoDisabled: Boolean = false,
)

/** Owns the active [ThingyConnection] and folds its raw events into a [UiState]. */
class ThingyViewModel(
    private val connections: ConnectionFactory,
    private val clock: () -> Long = System::currentTimeMillis,
    song: () -> Song = Song::highwayToHell,
) : ViewModel() {
    private val song: Song by lazy(song)
    private val _state = MutableStateFlow(UiState(bleAvailable = connections.bleAvailable))
    val state: StateFlow<UiState> = _state.asStateFlow()

    private var connection: ThingyConnection? = null
    private var connectionJob: Job? = null
    private var songJob: Job? = null
    private var micEnabledAtMs = 0L

    /** Connects (BLE, or the simulator when selected or Bluetooth is missing). No-op while running. */
    fun start() {
        if (connectionJob?.isActive == true) return
        connect(simulator = _state.value.simulator || !connections.bleAvailable)
    }

    fun stop() {
        songJob?.cancel()
        connectionJob?.cancel()
        connectionJob = null
    }

    fun setSimulator(enabled: Boolean) {
        if (!enabled && !connections.bleAvailable) return
        stop()
        connect(simulator = enabled)
    }

    /** The phone touched the Thingy tag: connect to it now unless we already are. */
    fun onNfcTap() {
        val active = connection
        val connected = active != null && connectionJob?.isActive == true && active.link.value is LinkState.Connected
        if (connected && !_state.value.simulator) return
        if (!connections.bleAvailable) return start()
        stop()
        connect(simulator = false)
    }

    fun playSong() {
        val thingy = connection ?: return
        if (songJob?.isActive == true) return
        updateSong(playing = true, noteIndex = -1)
        songJob = viewModelScope.launch {
            try {
                SongPlayer(thingy).play(song, volume = { _state.value.songVolume }, loop = true) { index, color ->
                    _state.update { it.withSnapshot { copy(ui = ui.copy(led = color)) } }
                    if (index >= 0) updateSong(playing = true, noteIndex = index)
                }
            } finally {
                updateSong(playing = false, noteIndex = -1)
            }
        }
    }

    fun stopSong() {
        songJob?.cancel()
    }

    fun toggleSong() = if (songJob?.isActive == true) stopSong() else playSong()

    /** 0..100; a playing song picks it up with the next note. */
    fun setSongVolume(volume: Int) = _state.update { it.copy(songVolume = volume.coerceIn(0, SongPlayer.MAX_VOLUME)) }

    /** Switches "Lautstärke messen" on or off. Enabling needs a connection; disabling always works. */
    fun setMicrophone(enabled: Boolean) {
        val thingy = connection
        val connected = thingy?.link?.value is LinkState.Connected
        if (enabled && !connected) return
        if (enabled) micEnabledAtMs = clock()
        _state.update { state ->
            val cleared = if (enabled) state else state.withSnapshot { copy(sound = sound.copy(levelDbfs = null)) }
            cleared.copy(micEnabled = enabled, micAutoDisabled = false)
        }
        if (thingy != null && connected) applyMicrophone(thingy, enabled)
    }

    fun setLed(color: Rgb) {
        val thingy = connection ?: return
        _state.update { it.withSnapshot { copy(ui = ui.copy(led = color)) } }
        viewModelScope.launch { thingy.write(ThingyUuids.LED, ThingyCommands.led(color)) }
    }

    override fun onCleared() = stop()

    private fun connect(simulator: Boolean) {
        val next = if (simulator) connections.simulator() else connections.ble()
        connection = next
        _state.value = UiState(
            snapshot = Snapshot(device = Snapshot.Device(source = next.source)),
            simulator = simulator,
            bleAvailable = connections.bleAvailable,
            songLength = song.notes.size,
            songVolume = _state.value.songVolume,
        )
        connectionJob = viewModelScope.launch {
            launch(start = CoroutineStart.UNDISPATCHED) { next.link.collect(::onLink) }
            launch(start = CoroutineStart.UNDISPATCHED) { next.events.collect(::onEvent) }
            next.run()
        }
    }

    private fun onLink(link: LinkState) {
        val wasConnected = _state.value.link is LinkState.Connected
        val isConnected = link is LinkState.Connected
        if (wasConnected && !isConnected) {
            stopSong()
            onMicrophoneLinkLost()
        }
        if (!wasConnected && isConnected && _state.value.micEnabled) {
            micEnabledAtMs = clock()
            connection?.let { applyMicrophone(it, enabled = true) }
        }
        _state.update { state ->
            val device = state.snapshot.device
            val connectedDevice = if (link is LinkState.Connected) device.copy(name = link.name, address = link.address) else device
            state.copy(link = link, snapshot = state.snapshot.copy(connected = link is LinkState.Connected, device = connectedDevice))
        }
    }

    /**
     * The link is always reconfigured without microphone. A drop shortly after enabling it is most likely
     * caused by the audio stream, so it stays off; otherwise it is re-enabled after the reconnect.
     */
    private fun onMicrophoneLinkLost() = _state.update { state ->
        if (!state.micEnabled) return@update state
        val unstable = clock() - micEnabledAtMs <= MIC_UNSTABLE_WINDOW_MS
        state.withSnapshot { copy(sound = sound.copy(levelDbfs = null)) }
            .copy(micEnabled = !unstable, micAutoDisabled = unstable)
    }

    private fun applyMicrophone(thingy: ThingyConnection, enabled: Boolean) {
        viewModelScope.launch {
            val ok = thingy.setMicrophone(enabled)
            if (!ok && enabled && connection === thingy) _state.update { it.copy(micEnabled = false) }
        }
    }

    private fun onEvent(event: ConnectionEvent) {
        val telemetry = when (event) {
            is ConnectionEvent.Data -> NotificationDecoder.decode(event.uuid, event.value)
            is ConnectionEvent.Rssi -> TelemetryEvent.Rssi(event.dbm)
        } ?: return
        if (telemetry is TelemetryEvent.MicLevel && !_state.value.micEnabled) return
        val wasPressed = _state.value.snapshot.ui.buttonPressed == true
        _state.update { state ->
            val next = state.copy(snapshot = state.snapshot.reduce(telemetry, clock()))
            if (telemetry is TelemetryEvent.Motion) {
                next.copy(
                    accelHistory = (state.accelHistory + telemetry.raw.accelG).takeLast(HISTORY_SIZE),
                    gyroHistory = (state.gyroHistory + telemetry.raw.gyroDps).takeLast(HISTORY_SIZE),
                )
            } else {
                next
            }
        }
        if (telemetry is TelemetryEvent.Button && telemetry.pressed && !wasPressed) toggleSong()
    }

    private fun updateSong(playing: Boolean, noteIndex: Int) = _state.update {
        it.withSnapshot { copy(sound = sound.copy(song = Snapshot.SongState(playing, noteIndex))) }
    }

    private inline fun UiState.withSnapshot(f: Snapshot.() -> Snapshot) = copy(snapshot = snapshot.f())

    companion object {
        /** 10 s of motion at 10 Hz. */
        const val HISTORY_SIZE = 100

        /** A disconnect within this time after enabling the microphone switches it off for good. */
        const val MIC_UNSTABLE_WINDOW_MS = 30_000L

        fun factory(connections: ConnectionFactory): ViewModelProvider.Factory = viewModelFactory {
            initializer { ThingyViewModel(connections) }
        }
    }
}
