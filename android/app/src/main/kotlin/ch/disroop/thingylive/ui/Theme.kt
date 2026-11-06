package ch.disroop.thingylive.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object Palette {
    val background = Color(0xFF0F172A)
    val card = Color(0xFF1E293B)
    val muted = Color(0xFF94A3B8)
    val sky = Color(0xFF38BDF8)
    val green = Color(0xFF22C55E)
    val yellow = Color(0xFFEAB308)
    val red = Color(0xFFEF4444)
    val axisX = Color(0xFFF87171)
    val axisY = Color(0xFF4ADE80)
    val axisZ = Color(0xFF60A5FA)
}

private val colors = darkColorScheme(
    primary = Palette.sky,
    onPrimary = Palette.background,
    secondary = Palette.green,
    background = Palette.background,
    surface = Palette.background,
    surfaceContainer = Palette.card,
    surfaceContainerHighest = Palette.card,
    onSurfaceVariant = Palette.muted,
    error = Palette.red,
)

@Composable
fun ThingyTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = colors, content = content)
