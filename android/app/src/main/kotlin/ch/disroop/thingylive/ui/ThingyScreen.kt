package ch.disroop.thingylive.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import ch.disroop.thingylive.R
import ch.disroop.thingylive.connection.LinkState
import ch.disroop.thingylive.protocol.AirQuality
import ch.disroop.thingylive.protocol.Rgb
import ch.disroop.thingylive.protocol.Rgbc
import ch.disroop.thingylive.protocol.Snapshot
import kotlin.math.roundToInt

/** Callbacks from the screen; implemented by the activity / ViewModel. */
interface ScreenActions {
    fun onSimulatorChange(enabled: Boolean)
    fun onPlaySong()
    fun onStopSong()
    fun onLed(color: Rgb)
    fun onSongVolume(volume: Int)
    fun onMicrophoneChange(enabled: Boolean)
    fun onFixLink(reason: LinkState.Reason)
}

@Composable
fun ThingyScreen(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    Scaffold(containerColor = Palette.background, topBar = { DisroopTopBar() }) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = padding) {
            item { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                StatusCard(state, actions)
                SongCard(state, actions)
                EnvironmentCard(s.environment)
                MotionCard(state)
                OrientationCard(s.motion)
                SoundCard(state, actions)
            } }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DisroopTopBar() = Column {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Image(painterResource(R.drawable.disroop_logo), contentDescription = "Disroop", Modifier.size(38.dp))
                Text(
                    buildAnnotatedString {
                        append("Thingy:52 ")
                        withStyle(SpanStyle(color = Palette.accent)) { append("Live") }
                    },
                    style = MaterialTheme.typography.titleLarge,
                )
                Text("by Disroop", style = MaterialTheme.typography.labelSmall, color = Palette.muted)
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Palette.background, titleContentColor = Palette.text),
    )
    HorizontalDivider(thickness = 2.dp, color = Palette.lime700)
}

@Composable
private fun StatusCard(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    SectionCard("Verbindung") {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Dot(if (s.connected) Palette.green else if (state.link is LinkState.Unavailable) Palette.red else Palette.yellow, 10)
            Text(state.link.label(), fontWeight = FontWeight.SemiBold)
            if (state.simulator) Text("· Simulator", color = Palette.teal, fontWeight = FontWeight.SemiBold)
        }
        Text(listOfNotNull(s.device.name, s.device.address).joinToString(" · ").ifEmpty { "Kein Gerät" }, color = Palette.muted)
        TileRow {
            ValueTile("Signal", s.device.rssi.format(" dBm"), Modifier.weight(1f))
            ValueTile("Akku", s.device.batteryPct.format(" %"), Modifier.weight(1f))
        }
        val link = state.link
        if (link is LinkState.Unavailable && link.reason != LinkState.Reason.SCAN_FAILED) {
            DisroopButton(onClick = { actions.onFixLink(link.reason) }) {
                Text(if (link.reason == LinkState.Reason.NO_PERMISSION) "Berechtigung erteilen" else "Bluetooth einschalten")
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Simulator", Modifier.weight(1f))
            Switch(
                checked = state.simulator,
                onCheckedChange = actions::onSimulatorChange,
                enabled = state.bleAvailable,
            )
        }
        if (!state.bleAvailable) Text("Kein Bluetooth LE auf diesem Gerät – Simulator aktiv.", color = Palette.muted)
    }
}

@Composable
private fun SongCard(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    val song = s.sound.song
    SectionCard("Lied & LED") {
        if (song.playing) {
            DisroopButton(onClick = actions::onStopSong, modifier = Modifier.fillMaxWidth(), pressed = true) { Text("■ Stopp") }
            Text("Note ${song.noteIndex + 1} / ${state.songLength} · Endlosschleife", color = Palette.muted)
        } else {
            DisroopButton(onClick = actions::onPlaySong, enabled = s.connected, modifier = Modifier.fillMaxWidth()) {
                Text("♪ Highway to Hell")
            }
            Text("Tipp: Taster am Thingy startet und stoppt das Lied.", color = Palette.muted)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Lautstärke Lied", Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = Palette.muted)
            Text("${state.songVolume} %", fontWeight = FontWeight.SemiBold)
        }
        Slider(
            value = state.songVolume.toFloat(),
            onValueChange = { actions.onSongVolume(it.roundToInt()) },
            valueRange = 0f..100f,
            modifier = Modifier.semantics { contentDescription = "Lautstärke Lied" },
        )
        Text("LED-Farbe", style = MaterialTheme.typography.labelMedium, color = Palette.muted)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            LED_PRESETS.forEach { (name, rgb) -> LedChip(name, rgb, selected = s.ui.led == rgb, enabled = s.connected, actions::onLed) }
        }
    }
}

@Composable
private fun LedChip(name: String, rgb: Rgb, selected: Boolean, enabled: Boolean, onClick: (Rgb) -> Unit) {
    val color = if (rgb == Rgb.OFF) Palette.background else rgb.toColor()
    Box(
        Modifier
            .size(34.dp)
            .clip(CircleShape)
            .background(color)
            .border(if (selected) 3.dp else 1.dp, if (selected) Color.White else Palette.muted, CircleShape)
            .clickable(enabled = enabled) { onClick(rgb) }
            .semantics { contentDescription = "LED $name" },
        contentAlignment = Alignment.Center,
    ) {
        if (rgb == Rgb.OFF) Text("Aus", style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun EnvironmentCard(env: Snapshot.Environment) {
    SectionCard("Umgebung") {
        TileRow {
            ValueTile("Temperatur", env.temperatureC.format(1, " °C"), Modifier.weight(1f))
            ValueTile("Feuchte", env.humidityPct.format(" %"), Modifier.weight(1f))
        }
        TileRow {
            ValueTile("Luftdruck", env.pressureHpa.format(1, " hPa"), Modifier.weight(1f))
            ValueTile("Farbe", env.color?.let { "R${it.r} G${it.g} B${it.b}" } ?: "–", Modifier.weight(1f)) {
                env.color?.let { Dot(it.toDisplayColor(), 18) }
            }
        }
        val quality = AirQuality.rate(env.eco2Ppm, env.tvocPpb)
        TileRow {
            ValueTile("eCO₂", env.eco2Ppm.format(" ppm"), Modifier.weight(1f)) { Dot(quality.color()) }
            ValueTile("TVOC", env.tvocPpb.format(" ppb"), Modifier.weight(1f)) { Dot(quality.color()) }
        }
        Text("Luftqualität: ${quality.label()}", color = Palette.muted)
    }
}

@Composable
private fun MotionCard(state: UiState) {
    val m = state.snapshot.motion
    SectionCard("Bewegung") {
        Text("Beschleunigung (g)", color = Palette.muted)
        AxisLegend("x ${m.accelG?.x.format(2)}", "y ${m.accelG?.y.format(2)}", "z ${m.accelG?.z.format(2)}")
        XyzChart(state.accelHistory, minRange = 1.2, capacity = ThingyViewModel.HISTORY_SIZE)
        Text("Gyroskop (°/s)", color = Palette.muted)
        AxisLegend("x ${m.gyroDps?.x.format(1)}", "y ${m.gyroDps?.y.format(1)}", "z ${m.gyroDps?.z.format(1)}")
        XyzChart(state.gyroHistory, minRange = 30.0, capacity = ThingyViewModel.HISTORY_SIZE)
        Text("Magnetfeld (µT)", color = Palette.muted)
        AxisLegend("x ${m.compassUt?.x.format(1)}", "y ${m.compassUt?.y.format(1)}", "z ${m.compassUt?.z.format(1)}")
    }
}

@Composable
private fun OrientationCard(m: Snapshot.Motion) {
    SectionCard("Kompass & Lage") {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            CompassDial(m.headingDeg)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                ValueTile("Kurs", m.headingDeg.format(0, "°"))
                ValueTile("Lage", m.orientation.label())
            }
        }
        TileRow {
            ValueTile("Roll", m.euler?.roll.format(1, "°"), Modifier.weight(1f))
            ValueTile("Nick", m.euler?.pitch.format(1, "°"), Modifier.weight(1f))
            ValueTile("Gier", m.euler?.yaw.format(1, "°"), Modifier.weight(1f))
        }
        TileRow {
            ValueTile("Schritte", m.steps.format(), Modifier.weight(1f))
            ValueTile("Tippen", m.tap?.let { "${it.direction.label} ×${it.count}" } ?: "–", Modifier.weight(1f))
        }
    }
}

@Composable
private fun SoundCard(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    SectionCard("Mikrofon & Taster") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Lautstärke messen", Modifier.weight(1f))
            Switch(
                checked = state.micEnabled,
                onCheckedChange = actions::onMicrophoneChange,
                enabled = s.connected || state.micEnabled,
            )
        }
        if (state.micEnabled) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Lautstärke", Modifier.weight(1f), color = Palette.muted)
                Text(s.sound.levelDbfs.format(1, " dBFS"), fontWeight = FontWeight.SemiBold)
            }
            LevelMeter(s.sound.levelDbfs)
        } else {
            Text(
                if (state.micAutoDisabled) {
                    "Verbindung kurz nach dem Einschalten abgebrochen – Mikrofon automatisch aus."
                } else {
                    "Aus: Der Audio-Stream kann die BLE-Verbindung überlasten."
                },
                color = Palette.muted,
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Dot(if (s.ui.buttonPressed == true) Palette.green else Palette.muted.copy(alpha = 0.4f), 18)
            Text(
                when (s.ui.buttonPressed) {
                    true -> "Taster gedrückt"
                    false -> "Taster losgelassen"
                    null -> "Taster: –"
                },
            )
        }
    }
}

@Composable
private fun TileRow(content: @Composable RowScope.() -> Unit) =
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), content = content)

private val LED_PRESETS = listOf(
    "Rot" to Rgb(255, 0, 0),
    "Grün" to Rgb(0, 255, 0),
    "Blau" to Rgb(0, 0, 255),
    "Gelb" to Rgb(255, 180, 0),
    "Lila" to Rgb(180, 0, 255),
    "Weiss" to Rgb(255, 255, 255),
    "Aus" to Rgb.OFF,
)

private fun Rgb.toColor() = Color(r, g, b)

/** Normalises the raw RGBC sensor counts to a displayable colour. */
private fun Rgbc.toDisplayColor(): Color {
    val max = maxOf(r, g, b, 1).toFloat()
    return Color(r / max, g / max, b / max)
}

private fun AirQuality.color() = when (this) {
    AirQuality.GOOD -> Palette.green
    AirQuality.MODERATE -> Palette.yellow
    AirQuality.POOR -> Palette.red
    AirQuality.UNKNOWN -> Palette.muted
}

private fun AirQuality.label() = when (this) {
    AirQuality.GOOD -> "gut"
    AirQuality.MODERATE -> "mässig"
    AirQuality.POOR -> "schlecht – lüften"
    AirQuality.UNKNOWN -> "–"
}
