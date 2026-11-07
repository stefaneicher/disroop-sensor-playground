package ch.disroop.thingyarcade.connection

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.core.content.ContextCompat
import ch.disroop.thingyarcade.protocol.GattStep
import ch.disroop.thingyarcade.protocol.Snapshot
import ch.disroop.thingyarcade.protocol.StartSequence
import ch.disroop.thingyarcade.protocol.ThingyUuids
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/** Runtime permissions needed for scanning and connecting. */
object BlePermissions {
    fun required(): Array<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
    } else {
        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    fun granted(context: Context): Boolean = required().all {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }
}

class AndroidConnectionFactory(private val context: Context) : ConnectionFactory {
    override val bleAvailable: Boolean
        get() = context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE) &&
            context.getSystemService(BluetoothManager::class.java)?.adapter != null

    override fun ble(): ThingyConnection = BleThingyConnection(context)

    /** Connection for Thingy Tennis: 100 Hz quaternion + raw motion only. */
    fun game(): ThingyConnection = BleThingyConnection(context, StartSequence.game())
    override fun simulator(): ThingyConnection = SimulatedThingy()
}

/**
 * Direct GATT client for the Thingy:52: scans for the nearest Thingy, requests MTU 247, runs the
 * [StartSequence] through a serialized [GattQueue] and reconnects automatically.
 */
@SuppressLint("MissingPermission") // run() checks BlePermissions before any Bluetooth call.
class BleThingyConnection(
    private val context: Context,
    private val startSteps: List<GattStep> = StartSequence.steps(),
) : ThingyConnection {
    override val source = Snapshot.Source.BLE
    private val _link = MutableStateFlow<LinkState>(LinkState.Idle)
    override val link = _link.asStateFlow()
    private val _events = MutableSharedFlow<ConnectionEvent>(
        extraBufferCapacity = EVENT_BUFFER,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    override val events = _events.asSharedFlow()

    @Volatile
    private var session: GattSession? = null

    override suspend fun run() {
        try {
            while (true) {
                val adapter = context.getSystemService(BluetoothManager::class.java)?.adapter
                when {
                    !BlePermissions.granted(context) -> unavailable(LinkState.Reason.NO_PERMISSION)
                    adapter == null || !adapter.isEnabled -> unavailable(LinkState.Reason.BLUETOOTH_OFF)
                    else -> scanAndServe(adapter)
                }
            }
        } finally {
            _link.value = LinkState.Idle
        }
    }

    override suspend fun write(uuid: UUID, value: ByteArray, withResponse: Boolean): Boolean =
        session?.write(uuid, value, withResponse) ?: false

    override suspend fun setMicrophone(enabled: Boolean): Boolean =
        session?.execute(StartSequence.microphone(enabled)) ?: false

    private suspend fun unavailable(reason: LinkState.Reason) {
        _link.value = LinkState.Unavailable(reason)
        delay(RETRY_DELAY_MS)
    }

    private suspend fun scanAndServe(adapter: BluetoothAdapter) {
        _link.value = LinkState.Scanning
        val device = try {
            scanNearest(adapter)
        } catch (e: SecurityException) {
            Log.w(TAG, "scan not permitted", e)
            null
        }
        if (device == null) return unavailable(LinkState.Reason.SCAN_FAILED)
        try {
            connectAndServe(device)
        } catch (e: SecurityException) {
            Log.w(TAG, "connect not permitted", e)
        }
        _link.value = LinkState.Scanning
        delay(RECONNECT_DELAY_MS)
    }

    /** Scans until the first Thingy shows up, then a little longer, and returns the strongest one. */
    private suspend fun scanNearest(adapter: BluetoothAdapter): BluetoothDevice? {
        val scanner = adapter.bluetoothLeScanner ?: return null
        val found = ConcurrentHashMap<String, ScanResult>()
        val firstHit = CompletableDeferred<Boolean>()
        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                found[result.device.address] = result
                firstHit.complete(true)
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) =
                results.forEach { onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, it) }

            override fun onScanFailed(errorCode: Int) {
                Log.w(TAG, "scan failed: $errorCode")
                firstHit.complete(false)
            }
        }
        val filters = listOf(
            ScanFilter.Builder().setServiceUuid(ParcelUuid(ThingyUuids.CONFIG_SERVICE)).build(),
            ScanFilter.Builder().setDeviceName(ThingyUuids.ADVERTISED_NAME).build(),
        )
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        scanner.startScan(filters, settings, callback)
        try {
            if (!firstHit.await()) return null
            delay(NEAREST_WINDOW_MS)
        } finally {
            runCatching { scanner.stopScan(callback) }
        }
        return found.values.maxByOrNull { it.rssi }?.device
    }

    private suspend fun connectAndServe(device: BluetoothDevice) {
        _link.value = LinkState.Connecting(device.address)
        val gattSession = GattSession()
        val gatt = device.connectGatt(context, false, gattSession.callback, BluetoothDevice.TRANSPORT_LE) ?: return
        gattSession.gatt = gatt
        try {
            if (withTimeoutOrNull(CONNECT_TIMEOUT_MS) { gattSession.connected.await() } != true) return
            gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH)
            gattSession.queue.execute { gatt.requestMtu(MTU) }
            if (!gattSession.queue.execute { gatt.discoverServices() }.success) return
            session = gattSession
            gattSession.configure()
            _link.value = LinkState.Connected(device.name ?: ThingyUuids.ADVERTISED_NAME, device.address)
            coroutineScope {
                val rssi = launch { gattSession.pollRssi() }
                gattSession.disconnected.await()
                rssi.cancel()
            }
        } finally {
            session = null
            gatt.disconnect()
            gatt.close()
        }
    }

    private inner class GattSession {
        val queue = GattQueue(OPERATION_TIMEOUT_MS)
        val connected = CompletableDeferred<Boolean>()
        val disconnected = CompletableDeferred<Unit>()
        lateinit var gatt: BluetoothGatt

        suspend fun configure() = execute(startSteps)

        /** Runs [steps] in order; false if a non-optional step failed. */
        suspend fun execute(steps: List<GattStep>): Boolean {
            var ok = true
            for (step in steps) {
                val success = when (step) {
                    is GattStep.Write -> write(step.uuid, step.value, withResponse = true)
                    is GattStep.ReadModifyWrite -> write(step.uuid, step.transform(read(step.uuid) ?: ByteArray(0)), true)
                    is GattStep.Read -> read(step.uuid)?.also { _events.tryEmit(ConnectionEvent.Data(step.uuid, it)) } != null
                    is GattStep.Subscribe -> setNotify(step.uuid, enabled = true) || step.optional
                    is GattStep.Unsubscribe -> setNotify(step.uuid, enabled = false)
                }
                if (!success) {
                    Log.w(TAG, "GATT step failed: $step")
                    ok = false
                }
            }
            return ok
        }

        suspend fun pollRssi() {
            while (true) {
                val result = queue.execute { gatt.readRemoteRssi() }
                if (result.success && result.value.isNotEmpty()) _events.tryEmit(ConnectionEvent.Rssi(result.value[0].toInt()))
                delay(RSSI_PERIOD_MS)
            }
        }

        suspend fun write(uuid: UUID, value: ByteArray, withResponse: Boolean): Boolean {
            val characteristic = find(uuid) ?: return false
            val type = if (withResponse) {
                BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
            } else {
                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            }
            return queue.execute { startWrite(characteristic, value, type) }.success
        }

        suspend fun read(uuid: UUID): ByteArray? {
            val characteristic = find(uuid) ?: return null
            return queue.execute { gatt.readCharacteristic(characteristic) }.takeIf { it.success }?.value
        }

        private suspend fun setNotify(uuid: UUID, enabled: Boolean): Boolean {
            val characteristic = find(uuid) ?: return false
            val cccd = characteristic.getDescriptor(ThingyUuids.CCCD) ?: return false
            if (!gatt.setCharacteristicNotification(characteristic, enabled)) return false
            val value = if (enabled) BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE else BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
            return queue.execute { startDescriptorWrite(cccd, value) }.success
        }

        private fun find(uuid: UUID): BluetoothGattCharacteristic? =
            gatt.services.asSequence().flatMap { it.characteristics.asSequence() }.firstOrNull { it.uuid == uuid }

        private fun startWrite(c: BluetoothGattCharacteristic, value: ByteArray, type: Int): Boolean =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                gatt.writeCharacteristic(c, value, type) == BluetoothStatusCodes.SUCCESS
            } else {
                @Suppress("DEPRECATION")
                c.writeType = type
                @Suppress("DEPRECATION")
                c.value = value
                @Suppress("DEPRECATION")
                gatt.writeCharacteristic(c)
            }

        private fun startDescriptorWrite(d: BluetoothGattDescriptor, value: ByteArray): Boolean =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                gatt.writeDescriptor(d, value) == BluetoothStatusCodes.SUCCESS
            } else {
                @Suppress("DEPRECATION")
                d.value = value
                @Suppress("DEPRECATION")
                gatt.writeDescriptor(d)
            }

        val callback = object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                if (status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED) {
                    connected.complete(true)
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    connected.complete(false)
                    queue.complete(GattResult(GattResult.NOT_STARTED))
                    disconnected.complete(Unit)
                }
            }

            override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) = queue.complete(GattResult(status))

            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) = queue.complete(GattResult(status))

            override fun onCharacteristicWrite(gatt: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) =
                queue.complete(GattResult(status))

            override fun onDescriptorWrite(gatt: BluetoothGatt, d: BluetoothGattDescriptor, status: Int) =
                queue.complete(GattResult(status))

            override fun onReadRemoteRssi(gatt: BluetoothGatt, rssi: Int, status: Int) =
                queue.complete(GattResult(status, byteArrayOf(rssi.toByte())))

            override fun onCharacteristicRead(gatt: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray, status: Int) =
                queue.complete(GattResult(status, value))

            @Deprecated("Used below Android 13")
            override fun onCharacteristicRead(gatt: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
                @Suppress("DEPRECATION")
                queue.complete(GattResult(status, c.value?.copyOf() ?: ByteArray(0)))
            }

            override fun onCharacteristicChanged(gatt: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) {
                _events.tryEmit(ConnectionEvent.Data(c.uuid, value))
            }

            @Deprecated("Used below Android 13")
            override fun onCharacteristicChanged(gatt: BluetoothGatt, c: BluetoothGattCharacteristic) {
                @Suppress("DEPRECATION")
                _events.tryEmit(ConnectionEvent.Data(c.uuid, c.value?.copyOf() ?: return))
            }
        }
    }

    private companion object {
        const val TAG = "ThingyBle"
        const val MTU = 247
        const val EVENT_BUFFER = 512
        const val NEAREST_WINDOW_MS = 1_500L
        const val CONNECT_TIMEOUT_MS = 15_000L
        const val OPERATION_TIMEOUT_MS = 5_000L
        const val RECONNECT_DELAY_MS = 3_000L
        const val RETRY_DELAY_MS = 3_000L
        const val RSSI_PERIOD_MS = 2_000L
    }
}
