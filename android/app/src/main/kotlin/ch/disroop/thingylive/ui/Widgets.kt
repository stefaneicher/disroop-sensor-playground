package ch.disroop.thingylive.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ch.disroop.thingylive.protocol.Vec3
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

@Composable
fun SectionCard(title: String, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Palette.card),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

@Composable
fun ValueTile(label: String, value: String, modifier: Modifier = Modifier, trailing: @Composable (() -> Unit)? = null) {
    Column(
        modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Palette.background.copy(alpha = 0.6f))
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Palette.muted)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (trailing != null) {
                Spacer(Modifier.width(8.dp))
                trailing()
            }
        }
    }
}

@Composable
fun Dot(color: Color, size: Int = 14) = Box(Modifier.size(size.dp).clip(CircleShape).background(color))

@Composable
fun AxisLegend(x: String, y: String, z: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf(x to Palette.axisX, y to Palette.axisY, z to Palette.axisZ).forEach { (text, color) ->
            Text(text, color = color, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        }
    }
}

/** Live xyz line chart; the y range grows with the data but never below [minRange]. */
@Composable
fun XyzChart(samples: List<Vec3>, minRange: Double, capacity: Int, modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(90.dp)) {
        val range = max(minRange, samples.maxOfOrNull { maxOf(abs(it.x), abs(it.y), abs(it.z)) } ?: 0.0)
        val mid = size.height / 2
        drawLine(Palette.muted.copy(alpha = 0.3f), Offset(0f, mid), Offset(size.width, mid))
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
                drawPath(path, color, style = Stroke(width = 2.dp.toPx()))
            }
    }
}

/** Compass rose with a needle pointing to [headingDeg] (0° = north). */
@Composable
fun CompassDial(headingDeg: Double?, modifier: Modifier = Modifier) {
    val measurer = rememberTextMeasurer()
    val labelStyle = remember { TextStyle(color = Palette.muted, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
    Canvas(modifier.size(140.dp)) {
        val r = size.minDimension / 2
        val c = center
        drawCircle(Palette.background, r)
        drawCircle(Palette.muted.copy(alpha = 0.5f), r, style = Stroke(2.dp.toPx()))
        listOf("N" to 0.0, "O" to 90.0, "S" to 180.0, "W" to 270.0).forEach { (text, deg) ->
            val layout = measurer.measure(text, labelStyle)
            val a = Math.toRadians(deg)
            val p = Offset(c.x + (r - 14.dp.toPx()) * sin(a).toFloat(), c.y - (r - 14.dp.toPx()) * cos(a).toFloat())
            drawText(layout, topLeft = Offset(p.x - layout.size.width / 2, p.y - layout.size.height / 2))
        }
        if (headingDeg != null) {
            rotate(headingDeg.toFloat(), c) {
                val tip = r * 0.62f
                drawLine(Palette.red, c, Offset(c.x, c.y - tip), strokeWidth = 4.dp.toPx())
                drawLine(Palette.muted, c, Offset(c.x, c.y + tip * 0.6f), strokeWidth = 4.dp.toPx())
            }
            drawCircle(Palette.sky, 5.dp.toPx(), c)
        }
    }
}

/** Horizontal level meter for −80…0 dBFS. */
@Composable
fun LevelMeter(dbfs: Double?, modifier: Modifier = Modifier) {
    val fraction = (((dbfs ?: -80.0) + 80) / 80).coerceIn(0.0, 1.0).toFloat()
    Box(
        modifier
            .fillMaxWidth()
            .height(18.dp)
            .clip(RoundedCornerShape(9.dp))
            .background(Palette.background),
    ) {
        Canvas(Modifier.matchParentSize()) {
            drawRect(
                Brush.horizontalGradient(listOf(Palette.green, Palette.yellow, Palette.red)),
                size = size.copy(width = size.width * fraction),
            )
        }
    }
}
