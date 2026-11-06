package ch.disroop.thingylive.ui

import android.content.ComponentName
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeUp
import androidx.test.core.app.ApplicationProvider
import ch.disroop.thingylive.connection.ConnectionFactory
import ch.disroop.thingylive.connection.LinkState
import ch.disroop.thingylive.connection.SimulatedThingy
import ch.disroop.thingylive.connection.ThingyConnection
import ch.disroop.thingylive.protocol.Rgb
import ch.disroop.thingylive.protocol.Song
import com.github.takahirom.roborazzi.captureRoboImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource
import org.junit.rules.RuleChain
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Renders the app screen on the JVM (Robolectric, native graphics) for the documentation.
 * The telemetry comes from the real [SimulatedThingy] → decoders → [ThingyViewModel] pipeline
 * on virtual time, so the values are realistic and identical on every run.
 *
 * Runs only via `./project android screenshots`; PNGs land in app/build/screenshots.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [36], qualifiers = "w411dp-h914dp-normal-long-notround-port-night-420dpi")
class ScreenshotTest {
    private val composeRule = createAndroidComposeRule<ComponentActivity>()

    @get:Rule val rules: RuleChain = RuleChain.outerRule(RegisterHostActivity).around(composeRule)

    @Test fun `live screen with simulator`() {
        show(simulatedState())
        capture("live-top")
        scrollTo("Kompass & Lage")
        capture("live-motion")
        scrollToEnd()
        capture("live-sound")
    }

    @Test fun `scanning for a thingy`() {
        show(UiState(link = LinkState.Scanning))
        capture("scan")
    }

    private fun show(state: UiState) = composeRule.setContent { ThingyTheme { ThingyScreen(state, NoActions) } }

    private fun scrollTo(text: String) = composeRule.onNode(hasScrollAction()).performScrollToNode(hasText(text))

    private fun scrollToEnd() = composeRule.onNode(hasScrollAction()).performTouchInput { repeat(3) { swipeUp() } }

    private fun capture(name: String) = composeRule.onRoot().captureRoboImage("build/screenshots/android-$name.png")

    /** Simulator after 20 s with microphone on, song playing and the LED set by the current note. */
    @OptIn(ExperimentalCoroutinesApi::class)
    private fun simulatedState(): UiState {
        val dispatcher = StandardTestDispatcher()
        Dispatchers.setMain(dispatcher)
        try {
            var state = UiState()
            runTest(dispatcher) {
                val vm = ThingyViewModel(SimulatorOnly, clock = { testScheduler.currentTime }, song = { Song.highwayToHell() })
                vm.setSimulator(true)
                advanceTimeBy(1_000)
                vm.setMicrophone(true)
                vm.setSongVolume(60)
                advanceTimeBy(18_000)
                vm.playSong()
                advanceTimeBy(1_200)
                runCurrent()
                state = vm.state.value
                vm.stop()
            }
            assertTrue("simulator must be connected", state.snapshot.connected)
            assertTrue("song must be playing", state.snapshot.sound.song.playing)
            return state
        } finally {
            Dispatchers.resetMain()
        }
    }

    private object SimulatorOnly : ConnectionFactory {
        override val bleAvailable = true
        override fun ble(): ThingyConnection = error("no BLE in screenshots")
        override fun simulator(): ThingyConnection = SimulatedThingy()
    }

    private object NoActions : ScreenActions {
        override fun onSimulatorChange(enabled: Boolean) = Unit
        override fun onPlaySong() = Unit
        override fun onStopSong() = Unit
        override fun onLed(color: Rgb) = Unit
        override fun onSongVolume(volume: Int) = Unit
        override fun onMicrophoneChange(enabled: Boolean) = Unit
        override fun onFixLink(reason: LinkState.Reason) = Unit
    }

    /** The compose rule hosts its content in a plain [ComponentActivity] that the app manifest doesn't declare. */
    private object RegisterHostActivity : ExternalResource() {
        override fun before() {
            val app = ApplicationProvider.getApplicationContext<android.app.Application>()
            shadowOf(app.packageManager).addActivityIfNotPresent(ComponentName(app, ComponentActivity::class.java))
        }
    }
}
