package ch.disroop.sensorplayground.ui

import ch.disroop.sensorplayground.connection.ConnectionFactory
import ch.disroop.sensorplayground.connection.ConnectionHub
import ch.disroop.sensorplayground.connection.SimulatedThingy
import ch.disroop.sensorplayground.connection.ThingyConnection
import ch.disroop.sensorplayground.protocol.BatteryTrend
import ch.disroop.sensorplayground.protocol.Snapshot
import ch.disroop.sensorplayground.protocol.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** End-to-end on the JVM: simulated raw BLE payloads → real decoders → reducer → ViewModel state. */
@OptIn(ExperimentalCoroutinesApi::class)
class SimulatorSmokeTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)

    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun `simulator fills every value of the snapshot`() = runTest(dispatcher) {
        val factory = object : ConnectionFactory {
            override val bleAvailable = false
            override fun ble(): ThingyConnection = error("no ble in this test")
            override fun simulator(): ThingyConnection = SimulatedThingy()
        }
        val vm = ThingyViewModel(factory, ConnectionHub(backgroundScope) { factory.simulator() }, clock = { testScheduler.currentTime }, song = { Song.highwayToHell() })
        vm.start()
        advanceTimeBy(1_000)
        vm.setMicrophone(true)
        advanceTimeBy(14_000)
        runCurrent()

        val s = vm.state.value.snapshot
        assertTrue(s.connected)
        assertEquals(Snapshot.Source.SIM, s.device.source)
        assertNotNull(s.device.rssi)
        assertNotNull(s.device.batteryPct)
        with(s.motion) {
            listOf(accelG, gyroDps, compassUt, euler, quaternion, gravity, headingDeg, orientation, steps, tap).forEach(::assertNotNull)
            assertEquals(1.0, accelG!!.z, 0.2)
        }
        with(s.environment) {
            listOf(temperatureC, humidityPct, pressureHpa, eco2Ppm, tvocPpb, color).forEach(::assertNotNull)
            assertTrue(temperatureC!! in 15.0..35.0)
        }
        val level = s.sound.levelDbfs!!
        assertTrue("level $level", level > -60 && level < 0)
        assertNotNull(s.ui.buttonPressed)
        assertTrue(vm.state.value.accelHistory.isNotEmpty())

        assertEquals(BatteryTrend.UNKNOWN, s.device.batteryTrend)
        advanceTimeBy(3 * 60_000L)
        runCurrent()
        assertEquals(BatteryTrend.CHARGING, vm.state.value.snapshot.device.batteryTrend)

        vm.playSong()
        advanceTimeBy(100)
        runCurrent()
        assertTrue(vm.state.value.snapshot.sound.song.playing)
        vm.stop()
    }
}
