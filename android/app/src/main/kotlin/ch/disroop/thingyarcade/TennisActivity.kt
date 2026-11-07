package ch.disroop.thingyarcade

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.lifecycle.lifecycleScope
import ch.disroop.thingyarcade.connection.AndroidConnectionFactory
import ch.disroop.thingyarcade.connection.ConnectionEvent
import ch.disroop.thingyarcade.connection.LinkState
import ch.disroop.thingyarcade.connection.ThingyConnection
import ch.disroop.thingyarcade.protocol.MotionFrames
import ch.disroop.thingyarcade.protocol.NotificationDecoder
import ch.disroop.thingyarcade.protocol.Rgb
import ch.disroop.thingyarcade.protocol.TelemetryEvent
import ch.disroop.thingyarcade.protocol.ThingyCommands
import ch.disroop.thingyarcade.protocol.ThingyUuids
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.IOException

/**
 * Thingy Tennis: the browser game from `tennis/` (bundled as assets) in a WebView. The Thingy is read directly
 * over BLE (100 Hz game mode) and its frames are pushed into the page, which replaces the bridge's WebSocket.
 */
class TennisActivity : ComponentActivity() {
    private lateinit var web: WebView
    private val connections by lazy { AndroidConnectionFactory(applicationContext) }
    private var connection: ThingyConnection? = null
    private var job: Job? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemBars()
        web = WebView(this).apply {
            setBackgroundColor(0xFF111827.toInt())
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = AssetClient()
            addJavascriptInterface(Native(), "ThingyNative")
        }
        setContentView(web)
        val page = if (intent.getStringExtra(EXTRA_GAME) == GAME_SKI) "ski/index.html" else "index.html"
        web.loadUrl("https://$HOST/$page")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = finish()
        })
    }

    override fun onStart() {
        super.onStart()
        val next = if (connections.bleAvailable) connections.game() else connections.simulator()
        connection = next
        val frames = MotionFrames()
        job = lifecycleScope.launch {
            launch { next.link.collect { pushLink(it, simulator = !connections.bleAvailable) } }
            launch {
                next.events.collect { event ->
                    if (event !is ConnectionEvent.Data) return@collect
                    val telemetry: TelemetryEvent = NotificationDecoder.decode(event.uuid, event.value) ?: return@collect
                    frames.accept(telemetry)?.let { web.evaluateJavascript("window.__thingyFrame&&window.__thingyFrame($it)", null) }
                }
            }
            next.run()
        }
    }

    override fun onStop() {
        super.onStop()
        // Free the Thingy (single connection) for the other app screen and the PC bridge.
        job?.cancel()
        job = null
        connection = null
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    private fun pushLink(link: LinkState, simulator: Boolean) {
        val source = if (link is LinkState.Connected) (if (simulator) "sim" else "ble") else "null"
        val text = when (link) {
            is LinkState.Connected -> "verbunden"
            is LinkState.Unavailable -> if (link.reason == LinkState.Reason.NO_PERMISSION) "Bluetooth-Berechtigung fehlt" else "Bluetooth nicht verfügbar"
            else -> "suche Thingy …"
        }
        web.evaluateJavascript("window.__thingyLink&&window.__thingyLink(${if (source == "null") source else "'$source'"},'$text')", null)
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }

    private inner class Native {
        /** Hit feedback on the Thingy: short tone and LED colour. */
        @JavascriptInterface
        fun beep(kind: String) {
            val (hz, ms, color) = when (kind) {
                "point" -> Triple(1760, 90, Rgb(163, 230, 53))
                "miss" -> Triple(330, 140, Rgb(255, 0, 0))
                else -> Triple(1320, 40, Rgb(0, 255, 0))
            }
            val thingy = connection ?: return
            lifecycleScope.launch {
                thingy.write(ThingyUuids.SPEAKER, ThingyCommands.speakerTone(hz, ms, BEEP_VOLUME), withResponse = false)
                thingy.write(ThingyUuids.LED, ThingyCommands.led(color), withResponse = false)
            }
        }

        @JavascriptInterface
        fun close() {
            runOnUiThread { finish() }
        }
    }

    /** Serves the bundled game from `assets/` under a fake https origin so ES modules load. */
    private inner class AssetClient : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val url = request.url
            if (url.host != HOST) return null
            val path = url.path.orEmpty().trimStart('/').let { if (it.isEmpty() || it.endsWith("/")) it + "index.html" else it }
            return try {
                WebResourceResponse(mimeOf(path), "utf-8", assets.open(path))
            } catch (_: IOException) {
                WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), "".byteInputStream())
            }
        }
    }

    companion object {
        const val EXTRA_GAME = "game"
        const val GAME_SKI = "ski"
        const val GAME_TENNIS = "tennis"

        private const val HOST = "tennis.local"
        private const val BEEP_VOLUME = 60

        private fun mimeOf(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "js", "mjs" -> "text/javascript"
            "css" -> "text/css"
            "json" -> "application/json"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "svg" -> "image/svg+xml"
            "ico" -> "image/x-icon"
            else -> "application/octet-stream"
        }
    }
}
