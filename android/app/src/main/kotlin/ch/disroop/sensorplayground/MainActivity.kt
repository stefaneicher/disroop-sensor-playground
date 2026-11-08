package ch.disroop.sensorplayground

import android.bluetooth.BluetoothAdapter
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ch.disroop.sensorplayground.connection.AndroidConnectionFactory
import ch.disroop.sensorplayground.connection.BlePermissions
import ch.disroop.sensorplayground.connection.LinkState
import ch.disroop.sensorplayground.nfc.NfcLaunch
import ch.disroop.sensorplayground.protocol.Rgb
import ch.disroop.sensorplayground.ui.ScreenActions
import ch.disroop.sensorplayground.ui.ThingyScreen
import ch.disroop.sensorplayground.ui.ThingyTheme
import ch.disroop.sensorplayground.ui.ThingyViewModel

/**
 * Single screen. Launched normally or by the NFC Android Application Record on the Thingy;
 * in both cases it scans for and connects to the nearest Thingy while visible.
 */
class MainActivity : ComponentActivity(), ScreenActions {
    private val connections by lazy { AndroidConnectionFactory(applicationContext) }
    private val viewModel: ThingyViewModel by viewModels { ThingyViewModel.factory(connections, SensorApp.hub(applicationContext)) }
    private var permissionsRequested = false

    private val permissionRequest =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { viewModel.start() }
    private val bluetoothEnable =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { viewModel.start() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        permissionsRequested = savedInstanceState?.getBoolean(KEY_PERMISSIONS_REQUESTED) ?: false
        setContent {
            val state by viewModel.state.collectAsStateWithLifecycle()
            ThingyTheme { ThingyScreen(state, this) }
        }
    }

    override fun onStart() {
        super.onStart()
        val needsPermissions = connections.bleAvailable && !BlePermissions.granted(this)
        if (needsPermissions && !permissionsRequested) {
            permissionsRequested = true
            permissionRequest.launch(BlePermissions.required())
        } else {
            viewModel.start()
        }
    }

    override fun onStop() {
        super.onStop()
        // Free the Thingy (it accepts a single connection) for the PC bridge while we are in the background.
        if (!isChangingConfigurations) viewModel.stop()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (NfcLaunch.isNfcIntent(intent)) viewModel.onNfcTap()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_PERMISSIONS_REQUESTED, permissionsRequested)
    }

    override fun onSimulatorChange(enabled: Boolean) = viewModel.setSimulator(enabled)
    override fun onPlaySong() = viewModel.playSong()
    override fun onStopSong() = viewModel.stopSong()
    override fun onLed(color: Rgb) = viewModel.setLed(color)
    override fun onSongVolume(volume: Int) = viewModel.setSongVolume(volume)
    override fun onMicrophoneChange(enabled: Boolean) = viewModel.setMicrophone(enabled)

    override fun onOpenTennis() = startActivity(Intent(this, TennisActivity::class.java).putExtra(TennisActivity.EXTRA_GAME, TennisActivity.GAME_TENNIS))

    override fun onOpenSki() = startActivity(Intent(this, TennisActivity::class.java).putExtra(TennisActivity.EXTRA_GAME, TennisActivity.GAME_SKI))

    override fun onFixLink(reason: LinkState.Reason) {
        when (reason) {
            LinkState.Reason.NO_PERMISSION -> openAppSettings()
            LinkState.Reason.BLUETOOTH_OFF -> enableBluetooth()
            LinkState.Reason.SCAN_FAILED -> viewModel.start()
        }
    }

    private fun openAppSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null))
        startActivity(intent)
    }

    private fun enableBluetooth() {
        try {
            bluetoothEnable.launch(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE))
        } catch (_: SecurityException) {
            openAppSettings()
        } catch (_: ActivityNotFoundException) {
            startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
        }
    }

    private companion object {
        const val KEY_PERMISSIONS_REQUESTED = "permissionsRequested"
    }
}
