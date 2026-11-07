package ch.disroop.sensorplayground.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ch.disroop.sensorplayground.R
import ch.disroop.sensorplayground.connection.LinkState
import ch.disroop.sensorplayground.protocol.BatteryTrend
import ch.disroop.sensorplayground.protocol.Rgb
import ch.disroop.sensorplayground.protocol.Rgbc
import ch.disroop.sensorplayground.protocol.Snapshot
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** Callbacks from the screen; implemented by the activity / ViewModel. */
interface ScreenActions {
    fun onSimulatorChange(enabled: Boolean)
    fun onPlaySong()
    fun onStopSong()
    fun onLed(color: Rgb)
    fun onSongVolume(volume: Int)
    fun onMicrophoneChange(enabled: Boolean)
    fun onFixLink(reason: LinkState.Reason)
    fun onOpenTennis() {}

    fun onOpenSki() {}
}

/** Same section order and naming as the web dashboard (bridge/web/static/index.html). */
@Composable
fun ThingyScreen(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    Scaffold(containerColor = Palette.background, topBar = { DisroopTopBar(s) }) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 14.dp, end = 14.dp, top = padding.calculateTopPadding() + 14.dp, bottom = padding.calculateBottomPadding() + 14.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item { StatusRow(state, actions) }
            if (state.simulator) item { SimulatorBanner() }
            item { EnvironmentTiles(s.environment) }
            item { MotionCard(state) }
            item { CompassCard(s.motion) }
            item { PoseCard(s.motion) }
            item { SoundCard(state, actions) }
            item { SongCard(state, actions) }
            item { UiCard(s, actions) }
            item { SimulatorCard(state, actions) }
            item { Footer() }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DisroopTopBar(s: Snapshot) = Column {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Image(painterResource(R.drawable.disroop_logo), contentDescription = "Disroop", Modifier.size(38.dp))
                Column {
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            buildAnnotatedString {
                                append("Sensor ")
                                withStyle(SpanStyle(color = Palette.accent)) { append("Playground") }
                            },
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        Text("by Disroop", Modifier.padding(bottom = 2.dp), color = Palette.muted, fontSize = 11.5.sp)
                    }
                    Text(
                        buildAnnotatedString {
                            append(s.device.name ?: "–")
                            append(" · ")
                            withStyle(SpanStyle(color = Palette.teal, fontFamily = FontFamily.Monospace)) { append(s.device.address ?: "–") }
                        },
                        color = Palette.muted,
                        fontSize = 13.sp,
                        maxLines = 1,
                    )
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Palette.background, titleContentColor = Palette.text),
    )
    HorizontalDivider(thickness = 2.dp, color = Palette.lime700)
}

private val clockFormat = ThreadLocal.withInitial { SimpleDateFormat("HH:mm:ss", Locale.US) }

/** Status pills as in the web header, followed by the game buttons (web: 🎾 Tennis, ⛷ Ski). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StatusRow(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            StatusPill(state)
            Pill {
                Text(
                    if (s.ts > 0) clockFormat.get()!!.format(Date(s.ts)) else "–",
                    fontSize = 13.sp, fontFamily = FontFamily.Monospace,
                )
            }
            Pill {
                RssiBars(s.device.rssi)
                Text(s.device.rssi.format(" dBm"), fontSize = 13.sp, fontFamily = FontFamily.Monospace)
                InfoButton(Glossary.rssi, size = 15.dp)
            }
            BatteryPill(s.device)
            Pill(onClick = actions::onOpenTennis) { Text("🎾 Tennis", fontSize = 13.sp) }
            Pill(onClick = actions::onOpenSki) { Text("⛷ Ski", fontSize = 13.sp) }
        }
        val link = state.link
        if (link is LinkState.Unavailable && link.reason != LinkState.Reason.SCAN_FAILED) {
            DisroopButton(onClick = { actions.onFixLink(link.reason) }) {
                Text(if (link.reason == LinkState.Reason.NO_PERMISSION) "Berechtigung erteilen" else "Bluetooth einschalten")
            }
        }
    }
}

@Composable
private fun StatusPill(state: UiState) {
    val link = state.link
    val sim = state.simulator && state.snapshot.connected
    val (text, color, background, dot) = when {
        sim -> StatusLook("SIMULATOR – keine echten Daten", Color(0xFFC4B5FD), Color(0x2E7C3AED), Color(0xFFA78BFA))
        link is LinkState.Connected -> StatusLook("Verbunden", Color(0xFF86EFAC), Color(0x24169A4A), Palette.green)
        link is LinkState.Unavailable || link == LinkState.Idle -> StatusLook(link.label(), Color(0xFFFCA5A5), Color(0x29DC2626), Palette.red)
        else -> StatusLook(link.label(), Color(0xFFFDBA74), Color(0x24EA580C), Color(0xFFF97316))
    }
    val border = color.copy(alpha = 0.55f)
    Pill(background = background, border = border) {
        Dot(dot, 9)
        Text(text, color = color, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { contentDescription = text })
    }
}

private data class StatusLook(val text: String, val color: Color, val background: Color, val dot: Color)

@Composable
private fun RssiBars(rssi: Int?) {
    val bars = if (rssi == null) 0 else listOf(-55, -70, -80, -90).indexOfFirst { rssi >= it }.let { if (it == -1) 0 else 4 - it }
    Row(Modifier.height(14.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
        for (i in 1..4) {
            Box(
                Modifier
                    .width(4.dp)
                    .fillMaxHeight(i / 4f)
                    .clip(RoundedCornerShape(1.dp))
                    .background(if (i <= bars) Palette.accent else Palette.track),
            )
        }
    }
}

@Composable
private fun BatteryPill(device: Snapshot.Device) {
    val pct = device.batteryPct
    val fill = when {
        pct == null -> Palette.muted
        pct > 40 -> Palette.green
        pct > 15 -> Palette.yellow
        else -> Palette.red
    }
    val charging = device.batteryTrend == BatteryTrend.CHARGING
    Pill {
        Canvas(Modifier.size(width = 29.dp, height = 12.dp)) {
            val body = Size(24.dp.toPx(), 12.dp.toPx())
            val stroke = 2.dp.toPx()
            val edge = Color(0xFF64748B)
            drawRoundRect(edge, size = body, cornerRadius = androidx.compose.ui.geometry.CornerRadius(3.dp.toPx()), style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
            drawRect(edge, Offset(body.width + 1.dp.toPx(), 4.dp.toPx()), Size(3.dp.toPx(), 4.dp.toPx()))
            val inner = body.width - 2 * (stroke + 1.dp.toPx())
            drawRect(fill, Offset(stroke + 1.dp.toPx(), stroke + 1.dp.toPx()), Size(inner * ((pct ?: 0) / 100f), body.height - 2 * (stroke + 1.dp.toPx())))
        }
        Text(pct.format(" %"), fontSize = 13.sp, fontFamily = FontFamily.Monospace)
        Text(
            when (device.batteryTrend) {
                BatteryTrend.CHARGING -> "⚡ lädt"
                BatteryTrend.DISCHARGING -> "Akkubetrieb"
                BatteryTrend.UNKNOWN -> "?"
            },
            color = if (charging) Palette.accent else Palette.muted,
            fontSize = 12.sp,
            fontWeight = if (charging) FontWeight.Bold else FontWeight.Normal,
        )
        InfoButton(Glossary.battery, size = 15.dp)
    }
}

@Composable
private fun SimulatorBanner() = Text(
    "Simulator-Modus: Werte sind simuliert.",
    Modifier
        .fillMaxWidth()
        .background(Brush.horizontalGradient(listOf(Color(0x477C3AED), Color(0x2E7C3AED), Color(0x477C3AED))))
        .border(1.dp, Color(0x73A78BFA))
        .padding(horizontal = 14.dp, vertical = 6.dp),
    color = Color(0xFFDDD6FE),
    fontSize = 13.sp,
    fontWeight = FontWeight.SemiBold,
    textAlign = TextAlign.Center,
)

private fun co2Level(ppm: Int?): Triple<String, Color, Color>? = when {
    ppm == null -> null
    ppm < 800 -> Triple("gut", Palette.green, Color(0xFF86EFAC))
    ppm < 1500 -> Triple("mässig", Palette.yellow, Color(0xFFFDE047))
    else -> Triple("schlecht", Palette.red, Color(0xFFFCA5A5))
}

@Composable
private fun EnvironmentTiles(env: Snapshot.Environment) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TileRow {
            MetricTile("Temperatur", env.temperatureC.format(1), "°C", Modifier.weight(1f).fillMaxHeight(), Glossary.temperature)
            MetricTile("Feuchte", env.humidityPct.format(), "% rel.", Modifier.weight(1f).fillMaxHeight(), Glossary.humidity)
        }
        val co2 = co2Level(env.eco2Ppm)
        TileRow {
            MetricTile("Luftdruck", env.pressureHpa.format(1), "hPa", Modifier.weight(1f).fillMaxHeight(), Glossary.pressure)
            MetricTile(
                "eCO₂", env.eco2Ppm.format(), "ppm · ${co2?.first ?: "–"}", Modifier.weight(1f).fillMaxHeight(), Glossary.eco2,
                valueColor = co2?.third ?: Palette.text,
                lamp = co2?.second ?: Palette.track,
                border = if (co2?.first == "schlecht") Palette.red.copy(alpha = 0.5f) else Palette.line,
            ) { Co2Scale(env.eco2Ppm) }
        }
        TileRow {
            MetricTile("TVOC", env.tvocPpb.format(), "ppb", Modifier.weight(1f).fillMaxHeight(), Glossary.tvoc)
            ColorTile(env.color, Modifier.weight(1f).fillMaxHeight())
        }
    }
}

@Composable
private fun Co2Scale(ppm: Int?) {
    val fraction = if (ppm == null) 0f else ((ppm - 400) / 1600f).coerceIn(0f, 1f)
    Canvas(Modifier.padding(top = 10.dp).fillMaxWidth().height(13.dp)) {
        val bar = 5.dp.toPx()
        val top = 4.dp.toPx()
        val w = size.width
        drawRect(Palette.green.copy(alpha = 0.85f), Offset(0f, top), Size(w * 0.25f, bar))
        drawRect(Palette.yellow.copy(alpha = 0.85f), Offset(w * 0.25f, top), Size(w * 0.4375f, bar))
        drawRect(Palette.red.copy(alpha = 0.85f), Offset(w * 0.6875f, top), Size(w * 0.3125f, bar))
        val x = (w * fraction).coerceIn(1.5.dp.toPx(), w - 1.5.dp.toPx())
        drawRoundRect(Color.White, Offset(x - 1.5.dp.toPx(), 0f), Size(3.dp.toPx(), 13.dp.toPx()), androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()))
    }
}

@Composable
private fun ColorTile(color: Rgbc?, modifier: Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier
            .clip(shape)
            .background(Brush.verticalGradient(listOf(Palette.panel2, Palette.card)))
            .border(1.dp, Palette.line, shape)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("FARBE", color = Palette.muted, fontSize = 12.5.sp, letterSpacing = 1.sp, fontWeight = FontWeight.Medium)
            InfoButton(Glossary.color)
        }
        Box(
            Modifier
                .padding(top = 8.dp)
                .fillMaxWidth()
                .height(37.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(color?.toDisplayColor() ?: Color(0xFF1E293B))
                .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(10.dp)),
        )
        Text(
            "R${color?.r.format()} G${color?.g.format()} B${color?.b.format()} C${color?.clear.format()}",
            Modifier.padding(top = 2.dp), color = Palette.muted, fontSize = 11.5.sp, fontFamily = FontFamily.Monospace, maxLines = 1,
        )
    }
}

@Composable
private fun MotionCard(state: UiState) {
    val m = state.snapshot.motion
    SectionCard("Bewegung") {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ChartHead("Beschleunigung", "g", Glossary.accel) {
                AxisLegend("x ${m.accelG?.x.signed(2)}", "y ${m.accelG?.y.signed(2)}", "z ${m.accelG?.z.signed(2)}")
            }
            XyzChart(state.accelHistory, minRange = 1.2, capacity = ThingyViewModel.HISTORY_SIZE)
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ChartHead("Gyroskop", "°/s", Glossary.gyro) {
                AxisLegend("x ${m.gyroDps?.x.signed(1)}", "y ${m.gyroDps?.y.signed(1)}", "z ${m.gyroDps?.z.signed(1)}")
            }
            XyzChart(state.gyroHistory, minRange = 30.0, capacity = ThingyViewModel.HISTORY_SIZE)
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ChartHead("Magnetfeld", "µT", Glossary.magnet) {
                AxisLegend("x ${m.compassUt?.x.signed(1)}", "y ${m.compassUt?.y.signed(1)}", "z ${m.compassUt?.z.signed(1)}")
            }
        }
    }
}

@Composable
private fun CompassCard(m: Snapshot.Motion) {
    var headingUp by rememberSaveable { mutableStateOf(true) }
    val field = m.compassUt?.let { sqrt(it.x * it.x + it.y * it.y + it.z * it.z) }
    val quality = when {
        field == null -> Triple("–", Palette.track, Palette.muted)
        field < 25 -> Triple("Feld zu schwach", Palette.yellow, Color(0xFFFDE047))
        field > 65 -> Triple("Feld gestört", Palette.yellow, Color(0xFFFDE047))
        else -> Triple("Feld plausibel", Palette.accent, Color(0xFFBEF264))
    }
    SectionCard(
        "Kompass", info = Glossary.heading,
        headExtra = { Segmented(listOf("Norden oben", "Kurs oben"), if (headingUp) 1 else 0, { headingUp = it == 1 }) },
    ) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            CompassDial(m.headingDeg, headingUp)
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(m.headingDeg?.let { "${Math.round(((it % 360) + 360) % 360) % 360}°" } ?: "–", fontSize = 40.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                Text(m.headingDeg.cardinal(), Modifier.padding(bottom = 4.dp), color = Palette.accent, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            }
            InsetRow("Magnetfeld", field.format(1, " µT"), Glossary.magnet)
            InsetRow("Kursquelle", if (m.headingDeg != null) "Thingy" else "–")
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Dot(quality.second, 10)
                Text(quality.first, color = quality.third, fontSize = 13.sp)
            }
            if (field != null && (field < 25 || field > 65)) {
                Text(
                    "Kompass kalibrieren: Thingy in 8er-Bewegung drehen",
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0x1FFACC15))
                        .border(1.dp, Color(0x73FACC15), RoundedCornerShape(10.dp))
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    color = Color(0xFFFEF9C3),
                    fontSize = 13.sp,
                )
            }
        }
    }
}

/** Web `.kv div`: label left, monospace value right. */
@Composable
private fun InsetRow(label: String, value: String, info: InfoEntry? = null) {
    val shape = RoundedCornerShape(10.dp)
    Row(
        Modifier.fillMaxWidth().clip(shape).background(Palette.inset).border(1.dp, Palette.line, shape).padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(label.uppercase(), color = Palette.muted, fontSize = 11.5.sp, letterSpacing = 0.8.sp)
        if (info != null) InfoButton(info)
        Text(value, Modifier.weight(1f), fontSize = 14.sp, fontFamily = FontFamily.Monospace, textAlign = TextAlign.End, maxLines = 1)
    }
}

@Composable
private fun PoseCard(m: Snapshot.Motion) {
    val q = m.quaternion
    SectionCard("Lage", hint = m.orientation.label(), info = Glossary.attitude) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            ArtificialHorizon(m.euler?.roll, m.euler?.pitch)
            Text("KÜNSTLICHER HORIZONT", color = Palette.muted, fontSize = 11.5.sp, letterSpacing = 0.8.sp)
        }
        TileRow {
            InsetTile("Roll", m.euler?.roll.signed(1, "°"), Modifier.weight(1f))
            InsetTile("Pitch", m.euler?.pitch.signed(1, "°"), Modifier.weight(1f))
            InsetTile("Yaw", m.euler?.yaw.signed(1, "°"), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)) {
            Text(
                if (q == null) "q –" else "q  w ${q.w.format(3)}  x ${q.x.format(3)}  y ${q.y.format(3)}  z ${q.z.format(3)}",
                color = Palette.muted, fontSize = 12.sp, fontFamily = FontFamily.Monospace, maxLines = 1,
            )
            InfoButton(Glossary.quaternion)
        }
        TileRow {
            InsetTile("Schritte", m.steps.format(), Modifier.weight(1f), Glossary.steps, mono = false, valueSize = 20f, valueBold = true)
            InsetTile(
                "Tap", m.tap?.let { "${it.direction.arrow()} ${it.direction.label} ×${it.count}" } ?: "–",
                Modifier.weight(1f), Glossary.tap, mono = false, valueSize = 20f, valueBold = true,
            )
        }
    }
}

@Composable
private fun SoundCard(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    SectionCard("Mikrofon", hint = s.sound.levelDbfs.format(1, " dBFS").takeIf { state.micEnabled } ?: "–", hintMono = true, info = Glossary.level) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Switch(
                checked = state.micEnabled,
                onCheckedChange = actions::onMicrophoneChange,
                enabled = s.connected || state.micEnabled,
                colors = switchColors(),
            )
            Text("Lautstärke messen", fontSize = 14.sp)
        }
        Hint(
            when {
                state.micEnabled -> "Mikrofon ein"
                state.micAutoDisabled -> "Verbindung kurz nach dem Einschalten abgebrochen – Mikrofon automatisch aus."
                else -> "Mikrofon aus – der Audio-Stream kann die BLE-Verbindung überlasten."
            },
        )
        LevelMeter(if (state.micEnabled) s.sound.levelDbfs else null, enabled = state.micEnabled)
    }
}

@Composable
private fun SongCard(state: UiState, actions: ScreenActions) {
    val s = state.snapshot
    val song = s.sound.song
    SectionCard("♪ Highway to Hell", hint = if (song.playing) "spielt" else "bereit") {
        if (song.playing) {
            DisroopButton(onClick = actions::onStopSong, pressed = true) { Text("■ Stopp") }
        } else {
            DisroopButton(onClick = actions::onPlaySong, enabled = s.connected) { Text("▶ Abspielen") }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Lautstärke", color = Palette.muted, fontSize = 14.sp)
            Slider(
                value = state.songVolume.toFloat(),
                onValueChange = { actions.onSongVolume(it.roundToInt()) },
                valueRange = 0f..100f,
                colors = sliderColors(),
                modifier = Modifier.weight(1f).semantics { contentDescription = "Lautstärke Lied" },
            )
            Text("${state.songVolume}", Modifier.width(34.dp), fontFamily = FontFamily.Monospace, fontSize = 14.sp, textAlign = TextAlign.End)
        }
        NoteBars(state.songLength, song.noteIndex)
        Text(
            "Note ${if (song.playing) (song.noteIndex + 1).toString() else "–"} / ${state.songLength}",
            color = Palette.muted, fontSize = 13.sp, fontFamily = FontFamily.Monospace,
        )
    }
}

@Composable
private fun NoteBars(count: Int, current: Int) {
    if (count <= 0) return
    Row(Modifier.fillMaxWidth().height(46.dp), horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.Bottom) {
        for (i in 0 until count) {
            val color = when {
                current < 0 -> Color(0xFF1E293B)
                i == current -> Color(0xFFF87171)
                i < current -> Color(0xFF7F1D1D)
                else -> Color(0xFF1E293B)
            }
            Box(Modifier.weight(1f).fillMaxHeight(0.5f).clip(RoundedCornerShape(3.dp)).background(color))
        }
    }
}

@Composable
private fun UiCard(s: Snapshot, actions: ScreenActions) {
    val pressed = s.ui.buttonPressed == true
    val shape = RoundedCornerShape(12.dp)
    SectionCard("Taster & LED") {
        Row(
            Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(Palette.inset)
                .border(1.dp, if (pressed) Palette.accent.copy(alpha = 0.6f) else Palette.line, shape)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(if (pressed) Palette.accent else Color(0xFF1E293B))
                    .border(2.dp, if (pressed) Color(0xFFD9F99D) else Palette.track, CircleShape),
            )
            Text(
                when (s.ui.buttonPressed) {
                    true -> "Taster gedrückt"
                    false -> "Taster losgelassen"
                    null -> "–"
                },
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(s.ui.led?.toColor() ?: Color.Black)
                    .border(2.dp, Palette.track, CircleShape)
                    .semantics { contentDescription = "aktuelle LED-Farbe" },
            )
            Text("LED-Farbe", color = Palette.muted, fontSize = 14.sp)
        }
        @OptIn(ExperimentalLayoutApi::class)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            LED_PRESETS.forEach { (name, rgb) ->
                LedChip(
                    name, if (rgb == Rgb.OFF) Palette.track else rgb.toColor(), selected = s.ui.led == rgb, enabled = s.connected,
                    onClick = { actions.onLed(rgb) }, modifier = Modifier.semantics { contentDescription = "LED $name" },
                )
            }
        }
    }
}

/** Not in the web dashboard (it has no on-device source switch); kept for the app's own simulator mode. */
@Composable
private fun SimulatorCard(state: UiState, actions: ScreenActions) {
    SectionCard("Simulator") {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Switch(
                checked = state.simulator,
                onCheckedChange = actions::onSimulatorChange,
                enabled = state.bleAvailable,
                colors = switchColors(),
            )
            Text("Simulator", fontSize = 14.sp)
        }
        if (!state.bleAvailable) Hint("Kein Bluetooth LE auf diesem Gerät – Simulator aktiv.")
    }
}

@Composable
private fun Footer() {
    Column(Modifier.fillMaxWidth()) {
        HorizontalDivider(thickness = 2.dp, color = Palette.lime700)
        Text(
            "Disroop · Disrupt and rebuild. · Nordic Thingy:52 · Werksfirmware über Bluetooth LE",
            Modifier.fillMaxWidth().padding(vertical = 18.dp),
            color = Palette.muted, fontSize = 12.5.sp, textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun TileRow(content: @Composable RowScope.() -> Unit) =
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Max), horizontalArrangement = Arrangement.spacedBy(12.dp), content = content)

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
