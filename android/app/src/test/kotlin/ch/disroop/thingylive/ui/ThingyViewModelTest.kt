package ch.disroop.thingylive.ui

import ch.disroop.thingylive.connection.ConnectionFactory
import ch.disroop.thingylive.connection.FakeConnection
import ch.disroop.thingylive.connection.LinkState
import ch.disroop.thingylive.connection.ThingyConnection
import ch.disroop.thingylive.protocol.AudioLevel
import ch.disroop.thingylive.protocol.ImaAdpcm
import ch.disroop.thingylive.protocol.Note
import ch.disroop.thingylive.protocol.NotificationEncoder
import ch.disroop.thingylive.protocol.Rgb
import ch.disroop.thingylive.protocol.Snapshot
import ch.disroop.thingylive.protocol.Song
import ch.disroop.thingylive.protocol.ThingyCommands
import ch.disroop.thingylive.protocol.ThingyUuids
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ThingyViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val ble = FakeConnection(Snapshot.Source.BLE)
    private val sim = FakeConnection(Snapshot.Source.SIM)
    private val song = Song("t", 1500, listOf(Note(440, 100, 50), Note(392, 100, 50)))

    private fun factory(bleAvailable: Boolean = true) = object : ConnectionFactory {
        override val bleAvailable = bleAvailable
        override fun ble(): ThingyConnection = ble
        override fun simulator(): ThingyConnection = sim
    }

    private fun TestScope.viewModel(bleAvailable: Boolean = true): ThingyViewModel {
        ble.now = { testScheduler.currentTime }
        return ThingyViewModel(factory(bleAvailable), clock = { testScheduler.currentTime }, song = { song })
    }

    @Before fun setUp() = Dispatchers.setMain(dispatcher)

    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun `start connects via ble and decodes notifications into the snapshot`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        ble.emit(ThingyUuids.TEMPERATURE, NotificationEncoder.temperature(23.4))
        runCurrent()

        val s = vm.state.value
        assertTrue(s.snapshot.connected)
        assertEquals("E3:58:08:1B:53:5F", s.snapshot.device.address)
        assertEquals(Snapshot.Source.BLE, s.snapshot.device.source)
        assertEquals(23.4, s.snapshot.environment.temperatureC!!, 1e-9)
        vm.stop()
    }

    @Test fun `falls back to the simulator without bluetooth`() = runTest(dispatcher) {
        val vm = viewModel(bleAvailable = false)
        vm.start()
        runCurrent()
        assertTrue(vm.state.value.simulator)
        assertEquals(1, sim.runs)
        assertEquals(0, ble.runs)
        assertEquals(Snapshot.Source.SIM, vm.state.value.snapshot.device.source)
        vm.stop()
    }

    @Test fun `toggling simulator switches the connection and resets values`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        ble.emit(ThingyUuids.HUMIDITY, NotificationEncoder.humidity(41))
        runCurrent()
        vm.setSimulator(true)
        runCurrent()
        assertEquals(LinkState.Idle, ble.link.value)
        assertEquals(1, sim.runs)
        assertEquals(null, vm.state.value.snapshot.environment.humidityPct)
        vm.stop()
    }

    @Test fun `motion history keeps the latest samples`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        repeat(ThingyViewModel.HISTORY_SIZE + 5) {
            ble.emit(ThingyUuids.RAW_MOTION, ByteArray(18))
            runCurrent()
        }
        assertEquals(ThingyViewModel.HISTORY_SIZE, vm.state.value.accelHistory.size)
        assertEquals(ThingyViewModel.HISTORY_SIZE, vm.state.value.gyroHistory.size)
        vm.stop()
    }

    @Test fun `play song reports progress and stop ends it`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.playSong()
        runCurrent()
        assertTrue(vm.state.value.snapshot.sound.song.playing)
        assertEquals(0, vm.state.value.snapshot.sound.song.noteIndex)

        advanceTimeBy(160)
        runCurrent()
        assertEquals(1, vm.state.value.snapshot.sound.song.noteIndex)

        vm.stopSong()
        runCurrent()
        assertFalse(vm.state.value.snapshot.sound.song.playing)
        assertEquals(-1, vm.state.value.snapshot.sound.song.noteIndex)
        vm.stop()
    }

    @Test fun `song loops after the pause until stopped`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.playSong()
        advanceTimeBy(song.durationMs + song.pauseMs + 1)
        runCurrent()
        assertTrue(vm.state.value.snapshot.sound.song.playing)
        assertEquals(0, vm.state.value.snapshot.sound.song.noteIndex)
        assertEquals(3, ble.writes.count { it.uuid == ThingyUuids.SPEAKER })
        vm.stopSong()
        runCurrent()
        assertFalse(vm.state.value.snapshot.sound.song.playing)
        vm.stop()
    }

    @Test fun `song volume is applied to the next tones`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        assertEquals(100, vm.state.value.songVolume)
        vm.setSongVolume(40)
        vm.playSong()
        runCurrent()
        assertEquals(40, vm.state.value.songVolume)
        assertEquals(ThingyCommands.speakerTone(440, 100, 40).toList(), ble.writes.first { it.uuid == ThingyUuids.SPEAKER }.value)
        vm.setSongVolume(150)
        assertEquals(100, vm.state.value.songVolume)
        vm.stop()
    }

    @Test fun `microphone is off by default and toggled on request`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        assertFalse(vm.state.value.micEnabled)
        val frame = ImaAdpcm.encode(ShortArray(256) { if (it % 2 == 0) 8000 else -8000 })
        ble.emit(ThingyUuids.MICROPHONE, frame)
        runCurrent()
        assertEquals("ignored while off", null, vm.state.value.snapshot.sound.levelDbfs)

        vm.setMicrophone(true)
        runCurrent()
        assertTrue(vm.state.value.micEnabled)
        assertEquals(listOf(true), ble.microphoneCalls)
        ble.emit(ThingyUuids.MICROPHONE, frame)
        runCurrent()
        assertEquals(AudioLevel.dbfs(ImaAdpcm.decode(frame)), vm.state.value.snapshot.sound.levelDbfs!!, 1e-9)

        vm.setMicrophone(false)
        runCurrent()
        assertFalse(vm.state.value.micEnabled)
        assertEquals(null, vm.state.value.snapshot.sound.levelDbfs)
        assertEquals(listOf(true, false), ble.microphoneCalls)
        vm.stop()
    }

    @Test fun `microphone stays off when enabling fails`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        ble.microphoneResult = false
        vm.setMicrophone(true)
        runCurrent()
        assertFalse(vm.state.value.micEnabled)
        vm.stop()
    }

    @Test fun `disconnect shortly after enabling the microphone switches it off for good`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.setMicrophone(true)
        runCurrent()
        advanceTimeBy(5_000)
        ble.link.value = LinkState.Scanning
        runCurrent()
        assertFalse(vm.state.value.micEnabled)
        assertTrue(vm.state.value.micAutoDisabled)

        ble.link.value = LinkState.Connected("Thingy", "E3:58:08:1B:53:5F")
        runCurrent()
        assertEquals("not re-enabled after the reconnect", listOf(true), ble.microphoneCalls)
        vm.setMicrophone(true)
        runCurrent()
        assertFalse("manual enable clears the notice", vm.state.value.micAutoDisabled)
        vm.stop()
    }

    @Test fun `microphone is restored after a reconnect when it ran stable before`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.setMicrophone(true)
        runCurrent()
        advanceTimeBy(ThingyViewModel.MIC_UNSTABLE_WINDOW_MS + 1)
        ble.link.value = LinkState.Scanning
        runCurrent()
        assertTrue(vm.state.value.micEnabled)
        assertEquals(null, vm.state.value.snapshot.sound.levelDbfs)

        ble.link.value = LinkState.Connected("Thingy", "E3:58:08:1B:53:5F")
        runCurrent()
        assertEquals(listOf(true, true), ble.microphoneCalls)
        assertFalse(vm.state.value.micAutoDisabled)
        vm.stop()
    }

    @Test fun `microphone can be disabled while reconnecting`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.setMicrophone(true)
        runCurrent()
        advanceTimeBy(ThingyViewModel.MIC_UNSTABLE_WINDOW_MS + 1)
        ble.link.value = LinkState.Scanning
        runCurrent()
        vm.setMicrophone(false)
        ble.link.value = LinkState.Connected("Thingy", "E3:58:08:1B:53:5F")
        runCurrent()
        assertFalse(vm.state.value.micEnabled)
        assertEquals(listOf(true), ble.microphoneCalls)
        vm.stop()
    }

    @Test fun `microphone cannot be enabled while not connected`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.setMicrophone(true)
        runCurrent()
        assertFalse(vm.state.value.micEnabled)
        assertTrue(ble.microphoneCalls.isEmpty())
    }

    @Test fun `button press on the thingy toggles the song`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        ble.emit(ThingyUuids.BUTTON, NotificationEncoder.button(true))
        runCurrent()
        assertTrue(vm.state.value.snapshot.sound.song.playing)
        ble.emit(ThingyUuids.BUTTON, NotificationEncoder.button(false))
        runCurrent()
        assertTrue("release does not toggle", vm.state.value.snapshot.sound.song.playing)
        ble.emit(ThingyUuids.BUTTON, NotificationEncoder.button(true))
        runCurrent()
        assertFalse(vm.state.value.snapshot.sound.song.playing)
        vm.stop()
    }

    @Test fun `set led writes the led characteristic and updates the snapshot`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.setLed(Rgb(255, 0, 0))
        runCurrent()
        assertEquals(ThingyCommands.ledConstant(Rgb(255, 0, 0)).toList(), ble.writes.last { it.uuid == ThingyUuids.LED }.value)
        assertEquals(Rgb(255, 0, 0), vm.state.value.snapshot.ui.led)
        vm.setLed(Rgb.OFF)
        runCurrent()
        assertEquals(ThingyCommands.ledOff().toList(), ble.writes.last().value)
        vm.stop()
    }

    @Test fun `nfc tap restarts a disconnected ble connection`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        ble.link.value = LinkState.Scanning
        vm.onNfcTap()
        runCurrent()
        assertEquals(2, ble.runs)
        vm.stop()
    }

    @Test fun `nfc tap keeps an active connection`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        vm.onNfcTap()
        runCurrent()
        assertEquals(1, ble.runs)
        vm.stop()
    }

    @Test fun `rssi events update the device`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.start()
        runCurrent()
        ble.events.tryEmit(ch.disroop.thingylive.connection.ConnectionEvent.Rssi(-43))
        runCurrent()
        assertEquals(-43, vm.state.value.snapshot.device.rssi)
        vm.stop()
    }
}
