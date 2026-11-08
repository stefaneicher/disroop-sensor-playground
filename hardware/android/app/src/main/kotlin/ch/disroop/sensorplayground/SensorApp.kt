package ch.disroop.sensorplayground

import android.app.Application
import android.content.Context
import ch.disroop.sensorplayground.connection.AndroidConnectionFactory
import ch.disroop.sensorplayground.connection.ConnectionHub
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Application scope: owns the [ConnectionHub] shared by all screens. */
class SensorApp : Application() {
    val hub: ConnectionHub by lazy {
        val factory = AndroidConnectionFactory(this)
        ConnectionHub(CoroutineScope(SupervisorJob() + Dispatchers.Main)) { profile ->
            when {
                !factory.bleAvailable || profile == ConnectionHub.Profile.SIMULATOR -> factory.simulator()
                profile == ConnectionHub.Profile.GAME -> factory.game()
                else -> factory.ble()
            }
        }
    }

    companion object {
        fun hub(context: Context): ConnectionHub = (context.applicationContext as SensorApp).hub
    }
}
