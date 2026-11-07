package ch.disroop.thingyarcade.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.VerticalDivider
import androidx.compose.material3.SliderColors
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.SwitchColors
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ch.disroop.thingyarcade.protocol.Vec3
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

private val CARD_SHAPE = RoundedCornerShape(16.dp)
private val INSET_SHAPE = RoundedCornerShape(10.dp)
private val PANEL_BRUSH = Brush.verticalGradient(listOf(Palette.panel2, Palette.card))

/** Uppercase caption used on tiles and stats (web: .tile h2, .stat .label). */
@Composable
private fun Caption(text: String, modifier: Modifier = Modifier, size: Float = 12f) =
    Text(text.uppercase(), modifier, color = Palette.muted, fontSize = size.sp, letterSpacing = 0.08.em, fontWeight = FontWeight.Medium)

/** Web `.card`: panel gradient, 16 dp corners, a header strip with lime accent bar, title, ⓘ and a hint on the right. */
@Composable
fun SectionCard(
    title: String,
    modifier: Modifier = Modifier,
    hint: String? = null,
    hintMono: Boolean = false,
    info: InfoEntry? = null,
    headExtra: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(CARD_SHAPE)
            .background(PANEL_BRUSH)
            .border(1.dp, Palette.line, CARD_SHAPE),
    ) {
        Row(
            Modifier.fillMaxWidth().background(Palette.cardHead).padding(horizontal = 18.dp, vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(Modifier.width(4.dp).height(14.dp).clip(RoundedCornerShape(2.dp)).background(Palette.accent))
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            if (info != null) InfoButton(info)
            Spacer(Modifier.weight(1f))
            if (hint != null) {
                Text(
                    hint, color = Palette.muted, fontSize = 13.sp,
                    fontFamily = if (hintMono) FontFamily.Monospace else null,
                )
            }
            headExtra?.invoke(this)
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(Palette.line))
        Column(Modifier.padding(horizontal = 18.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            content()
        }
    }
}

/** Web `.tile`: caption with ⓘ, large value, unit line. */
@Composable
fun MetricTile(
    label: String,
    value: String,
    unit: String,
    modifier: Modifier = Modifier,
    info: InfoEntry? = null,
    valueColor: Color = Palette.text,
    lamp: Color? = null,
    border: Color = Palette.line,
    extra: (@Composable ColumnScope.() -> Unit)? = null,
) {
    Column(
        modifier
            .clip(CARD_SHAPE)
            .background(PANEL_BRUSH)
            .border(1.dp, border, CARD_SHAPE)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Caption(label, size = 12.5f)
            if (info != null) InfoButton(info)
            if (lamp != null) Dot(lamp, 10)
        }
        Text(
            value, Modifier.padding(top = 6.dp), color = valueColor, fontSize = 30.sp, fontWeight = FontWeight.SemiBold
        )
        Text(unit, Modifier.padding(top = 2.dp), color = Palette.muted, fontSize = 13.sp)
        extra?.invoke(this)
    }
}

/** Web `.kv div`, `.euler div`, `.stat`: dark inset box with a small caption and a value. */
@Composable
fun InsetTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    info: InfoEntry? = null,
    mono: Boolean = true,
    valueSize: Float = 15f,
    valueBold: Boolean = false,
) {
    Column(
        modifier
            .clip(INSET_SHAPE)
            .background(Palette.inset)
            .border(1.dp, Palette.line, INSET_SHAPE)
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Caption(label, size = 11.5f)
            if (info != null) InfoButton(info)
        }
        Text(
            value, Modifier.padding(top = 2.dp), fontSize = valueSize.sp,
            fontFamily = if (mono) FontFamily.Monospace else null,
            fontWeight = if (valueBold) FontWeight.Bold else FontWeight.Normal
        )
    }
}

/** Web `.pill`: rounded, panel-coloured status chip. */
@Composable
fun Pill(
    modifier: Modifier = Modifier,
    background: Color = Palette.card,
    border: Color = Palette.line,
    onClick: (() -> Unit)? = null,
    content: @Composable RowScope.() -> Unit,
) {
    val shape = RoundedCornerShape(50)
    Row(
        modifier
            .clip(shape)
            .background(background)
            .border(1.dp, border, shape)
            .let { if (onClick != null) it.clickable(onClick = onClick) else it }
            .padding(horizontal = 11.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        content = content,
    )
}

/** Disroop button: lime-800 with lime text and a lime-600 border; gray while [pressed] (e.g. "Stopp"). */
@Composable
fun DisroopButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    pressed: Boolean = false,
    content: @Composable RowScope.() -> Unit,
) = Button(
    onClick = onClick,
    modifier = modifier,
    enabled = enabled,
    shape = RoundedCornerShape(8.dp),
    border = BorderStroke(1.dp, if (!enabled) Palette.line else if (pressed) Color(0xFF4B5563) else Palette.lime600),
    colors = ButtonDefaults.buttonColors(
        containerColor = if (pressed) Palette.line else Palette.lime800,
        contentColor = if (pressed) Palette.text else Palette.accent,
        disabledContainerColor = Palette.card,
        disabledContentColor = Palette.muted,
    ),
    content = content,
)

/** Web `.seg`: segmented control, the selected segment is lime-800 with lime text. */
@Composable
fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(8.dp)
    Row(
        modifier.clip(shape).background(Palette.inset).border(1.dp, Palette.line, shape).height(IntrinsicSize.Min),
    ) {
        options.forEachIndexed { i, text ->
            if (i > 0) VerticalDivider(color = Palette.line)
            Text(
                text,
                Modifier
                    .background(if (i == selected) Palette.lime800 else Color.Transparent)
                    .clickable { onSelect(i) }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                color = if (i == selected) Palette.accent else Palette.muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
fun switchColors(): SwitchColors = SwitchDefaults.colors(
    checkedThumbColor = Color(0xFFE2E8F0),
    checkedTrackColor = Palette.accent,
    checkedBorderColor = Palette.accent,
    uncheckedThumbColor = Color(0xFFE2E8F0),
    uncheckedTrackColor = Palette.track,
    uncheckedBorderColor = Palette.track,
)

@Composable
fun sliderColors(): SliderColors = SliderDefaults.colors(
    thumbColor = Palette.accent,
    activeTrackColor = Palette.accent,
    inactiveTrackColor = Palette.track,
)

@Composable
fun Dot(color: Color, size: Int = 14) = Box(Modifier.size(size.dp).clip(CircleShape).background(color))

/** Web chart legend: a short line in the series colour, the axis letter and the live value (monospace). */
@Composable
fun AxisLegend(x: String, y: String, z: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf(x to Palette.axisX, y to Palette.axisY, z to Palette.axisZ).forEach { (text, color) ->
            Row(Modifier.padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Box(Modifier.width(9.dp).height(3.dp).clip(RoundedCornerShape(2.dp)).background(color))
                Text(text, color = color, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
            }
        }
    }
}

/** Chart heading like the web (`h3` with a small unit and ⓘ) and the legend on the right. */
@Composable
fun ChartHead(title: String, unit: String, info: InfoEntry, legend: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, color = Color(0xFFCBD5E1), fontSize = 13.5.sp, fontWeight = FontWeight.Bold)
            Text(unit, color = Palette.muted, fontSize = 12.sp)
            InfoButton(info)
        }
    }
    legend()
}

/** Live xyz line chart on the web's dark plot area; the y range grows with the data but never below [minRange]. */
@Composable
fun XyzChart(samples: List<Vec3>, minRange: Double, capacity: Int, modifier: Modifier = Modifier) {
    val measurer = rememberTextMeasurer()
    val labelStyle = remember { TextStyle(color = Palette.muted, fontSize = 9.sp, fontFamily = FontFamily.Monospace) }
    val shape = RoundedCornerShape(10.dp)
    Canvas(
        modifier
            .fillMaxWidth()
            .height(150.dp)
            .clip(shape)
            .background(Palette.chartBg)
            .border(1.dp, Palette.line, shape),
    ) {
        val range = niceRange(max(minRange, samples.maxOfOrNull { maxOf(abs(it.x), abs(it.y), abs(it.z)) } ?: 0.0))
        val mid = size.height / 2
        val grid = Palette.muted.copy(alpha = 0.18f)
        listOf(-1.0, -0.5, 0.0, 0.5, 1.0).forEach { f ->
            val y = (mid - f * mid * 0.95).toFloat()
            drawLine(if (f == 0.0) Palette.muted.copy(alpha = 0.4f) else grid, Offset(0f, y), Offset(size.width, y))
            val label = measurer.measure(compact(f * range), labelStyle)
            drawText(label, topLeft = Offset(4.dp.toPx(), (y - label.size.height - 1.dp.toPx()).coerceAtLeast(0f)))
        }
        if (samples.size < 2) return@Canvas
        val step = size.width / (capacity - 1)
        val offset = capacity - samples.size
        listOf<(Vec3) -> Double>({ it.x }, { it.y }, { it.z }).zip(listOf(Palette.axisX, Palette.axisY, Palette.axisZ))
            .forEach { (axis, color) ->
                val path = Path()
                samples.forEachIndexed { i, v ->
                    val x = (i + offset) * step
                    val y = (mid - axis(v) / range * mid * 0.95).toFloat()
                    if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                drawPath(path, color, style = Stroke(width = 1.6.dp.toPx()))
            }
    }
}

private fun compact(v: Double): String = if (v == v.toLong().toDouble()) v.toLong().toString() else String.format(java.util.Locale.US, "%.1f", v)

/** Rounds a range up to 1/2/5 × 10ⁿ so the y labels stay readable. */
private fun niceRange(range: Double): Double {
    val exp = Math.pow(10.0, Math.floor(Math.log10(range)))
    val f = range / exp
    return exp * when {
        f <= 1 -> 1.0
        f <= 2 -> 2.0
        f <= 5 -> 5.0
        else -> 10.0
    }
}

private const val SVG_HALF = 112f

private val CARD_CARDINALS = listOf("N", "NO", "O", "SO", "S", "SW", "W", "NW")

/**
 * Heading indicator like the web (HSI): rotating compass card with 5° ticks, tens-of-degrees numbers and German cardinals,
 * a fixed lubber mark on top and the Thingy as a teal aircraft. [headingUp] rotates the card (web "Kurs oben"),
 * otherwise the card stays and the pointer turns ("Norden oben").
 */
@Composable
fun CompassDial(headingDeg: Double?, headingUp: Boolean, modifier: Modifier = Modifier) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier.size(224.dp)) {
        val k = size.minDimension / (2 * SVG_HALF)
        val c = center
        val h = (headingDeg ?: 0.0).toFloat()
        drawCircle(Palette.bezel, 109 * k, c)
        drawCircle(Palette.line, 109 * k, c, style = Stroke(2 * k))
        rotate(if (headingUp) -h else 0f, c) {
            drawCircle(Color(0xE61F2937), 100 * k, c)
            drawCircle(Color(0xFF374151), 100 * k, c, style = Stroke(1 * k))
            for (deg in 0 until 360 step 5) {
                val major = deg % 30 == 0 || deg % 45 == 0
                val mid = deg % 10 == 0
                val a = Math.toRadians(deg.toDouble())
                val len = if (major) 13f else if (mid) 9f else 6f
                val r0 = 100f
                val s = sin(a).toFloat()
                val co = cos(a).toFloat()
                drawLine(
                    if (major) Palette.text else Color(0xFF94A3B8),
                    Offset(c.x + (r0 - len) * k * s, c.y - (r0 - len) * k * co),
                    Offset(c.x + r0 * k * s, c.y - r0 * k * co),
                    strokeWidth = (if (major) 2f else if (mid) 1.4f else 1f) * k,
                )
                val label = if (deg % 45 == 0) CARD_CARDINALS[deg / 45] else if (deg % 30 == 0) (deg / 10).toString() else null
                if (label != null) {
                    val cardinal = deg % 45 == 0
                    val style = TextStyle(
                        color = if (deg == 0) Palette.axisX else if (!cardinal) Palette.muted else if (deg % 90 == 0) Palette.text else Color(0xFFE5E7EB),
                        fontSize = (if (!cardinal) 9f else if (deg % 90 == 0) 15f else 11f).times(k).let { (it / density).sp },
                        fontWeight = if (!cardinal) FontWeight.SemiBold else FontWeight.ExtraBold,
                    )
                    val layout = measurer.measure(label, style)
                    val r = (if (cardinal) 72f else 76f) * k
                    val p = Offset(c.x + r * s, c.y - r * co)
                    rotate(deg.toFloat(), p) {
                        drawText(layout, topLeft = Offset(p.x - layout.size.width / 2f, p.y - layout.size.height / 2f))
                    }
                }
            }
        }
        rotate(if (headingUp) 0f else h, c) {
            val lubber = Path().apply {
                moveTo(c.x, c.y - 99 * k); lineTo(c.x - 6 * k, c.y - 111 * k); lineTo(c.x + 6 * k, c.y - 111 * k); close()
            }
            drawPath(lubber, Palette.accent, style = Fill)
            drawLine(Palette.accent.copy(alpha = 0.7f), Offset(c.x, c.y - 99 * k), Offset(c.x, c.y - 62 * k), strokeWidth = 1.5f * k)
            val plane = Path()
            listOf(
                0 to -34, 5 to -14, 5 to 4, 22 to 14, 22 to 19, 5 to 13, 4 to 26, 10 to 31, 10 to 34, 0 to 31, -10 to 34, -10 to 31,
                -4 to 26, -5 to 13, -22 to 19, -22 to 14, -5 to 4, -5 to -14,
            ).forEachIndexed { i, (x, y) ->
                val o = Offset(c.x + x * k, c.y + y * k)
                if (i == 0) plane.moveTo(o.x, o.y) else plane.lineTo(o.x, o.y)
            }
            plane.close()
            drawPath(plane, Palette.teal, style = Fill)
            drawPath(plane, Palette.bezel, style = Stroke(1 * k))
        }
    }
}

/** Artificial horizon (web `.adi`): teal sky, brown ground, pitch ladder, roll pointer and the lime aircraft symbol. */
@Composable
fun ArtificialHorizon(rollDeg: Double?, pitchDeg: Double?, modifier: Modifier = Modifier) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier.size(150.dp)) {
        val k = size.minDimension / 124f
        val c = center
        val circle = Path().apply { addOval(androidx.compose.ui.geometry.Rect(c, 50 * k)) }
        clipPath(circle) {
            rotate(-(rollDeg ?: 0.0).toFloat(), c) {
                val dy = (pitchDeg ?: 0.0).coerceIn(-90.0, 90.0).toFloat() * 1.5f * k
                drawRect(Palette.teal, Offset(c.x - 200 * k, c.y + dy - 400 * k), Size(400 * k, 400 * k))
                drawRect(Color(0xFF6B4F2A), Offset(c.x - 200 * k, c.y + dy), Size(400 * k, 400 * k))
                drawLine(Palette.text, Offset(c.x - 200 * k, c.y + dy), Offset(c.x + 200 * k, c.y + dy), strokeWidth = 1.2f * k)
                for (p in listOf(-30, -20, -10, 10, 20, 30)) {
                    val y = c.y + dy - p * 1.5f * k
                    val half = (if (p % 20 == 0) 14f else 8f) * k
                    drawLine(Palette.text.copy(alpha = 0.8f), Offset(c.x - half, y), Offset(c.x + half, y), strokeWidth = 0.9f * k)
                    if (p % 20 == 0) {
                        val l = measurer.measure(abs(p).toString(), TextStyle(color = Palette.text, fontSize = (6f * k / density).sp, fontWeight = FontWeight.SemiBold))
                        drawText(l, topLeft = Offset(c.x + half + 2 * k, y - l.size.height / 2f))
                    }
                }
            }
        }
        drawCircle(Palette.background, 50 * k, c, style = Stroke(3 * k))
        listOf(-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60).forEach { deg ->
            val a = Math.toRadians(deg.toDouble())
            val len = if (deg % 30 == 0) 7f else 4f
            drawLine(
                Palette.muted,
                Offset(c.x + (56 - len) * k * sin(a).toFloat(), c.y - (56 - len) * k * cos(a).toFloat()),
                Offset(c.x + 56 * k * sin(a).toFloat(), c.y - 56 * k * cos(a).toFloat()),
                strokeWidth = 1.2f * k,
            )
        }
        rotate((rollDeg ?: 0.0).toFloat().coerceIn(-90f, 90f) * -1f, c) {
            val pointer = Path().apply {
                moveTo(c.x, c.y - 49 * k); lineTo(c.x - 4 * k, c.y - 42 * k); lineTo(c.x + 4 * k, c.y - 42 * k); close()
            }
            drawPath(pointer, Palette.accent)
        }
        val wing = Stroke(3 * k, cap = StrokeCap.Round)
        val plane = Path().apply {
            moveTo(c.x - 32 * k, c.y); lineTo(c.x - 12 * k, c.y); lineTo(c.x - 6 * k, c.y + 7 * k)
            moveTo(c.x + 32 * k, c.y); lineTo(c.x + 12 * k, c.y); lineTo(c.x + 6 * k, c.y + 7 * k)
        }
        drawPath(plane, Palette.accent, style = wing)
        drawCircle(Palette.accent, 2.2f * k, c)
    }
}

/** Web `.meter`: dark bar with the green→yellow→red gradient for −80…0 dBFS and the scale below. */
@Composable
fun LevelMeter(dbfs: Double?, enabled: Boolean = true, modifier: Modifier = Modifier) {
    val fraction = (((dbfs ?: -80.0) + 80) / 80).coerceIn(0.0, 1.0).toFloat()
    val shape = RoundedCornerShape(8.dp)
    Column(modifier.fillMaxWidth().alpha(if (enabled) 1f else 0.4f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(26.dp)
                .clip(shape)
                .background(Palette.chartBg)
                .border(1.dp, Palette.line, shape),
        ) {
            Canvas(Modifier.matchParentSize()) {
                val w = size.width * fraction
                drawRect(
                    Brush.horizontalGradient(
                        0f to Color(0xFF16A34A), 0.55f to Palette.green, 0.75f to Palette.yellow, 0.92f to Palette.red,
                        startX = 0f, endX = size.width,
                    ),
                    size = size.copy(width = w),
                )
                if (dbfs != null) drawRect(Color(0xFFF8FAFC), Offset((w - 3.dp.toPx()).coerceAtLeast(0f), 2.dp.toPx()), Size(3.dp.toPx(), size.height - 4.dp.toPx()))
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf("−80", "−60", "−40", "−20", "0 dBFS").forEach {
                Text(it, color = Palette.muted, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
            }
        }
    }
}

/** Colour chip dot + text, like the web `.chip`. */
@Composable
fun LedChip(name: String, color: Color, selected: Boolean, enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(50)
    Row(
        modifier
            .clip(shape)
            .background(Palette.card)
            .border(if (selected) 2.dp else 1.dp, if (selected) Palette.accent else Palette.line, shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(start = 8.dp, end = 10.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Text(name, fontSize = 13.sp, color = if (enabled) Palette.text else Palette.muted)
    }
}

@Composable
fun Hint(text: String, modifier: Modifier = Modifier) =
    Text(text, modifier, color = Palette.muted, fontSize = 13.sp)
