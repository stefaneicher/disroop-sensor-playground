package ch.disroop.thingyarcade.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight

/** Disroop look (disroop.ch, web dashboard): gray-900/800 surfaces with a lime accent. */
object Palette {
    val background = Color(0xFF111827)
    val card = Color(0xFF1F2937)
    val panel2 = Color(0xFF263142)
    val line = Color(0xFF374151)
    val inset = Color(0x73020617)
    val chartBg = Color(0x8C020617)
    val cardHead = Color(0x59111827)
    val track = Color(0xFF334155)
    val bezel = Color(0xFF0B1220)
    val text = Color(0xFFF9FAFB)
    val muted = Color(0xFF9CA3AF)
    val accent = Color(0xFFA3E635)
    val lime500 = Color(0xFF84CC16)
    val lime600 = Color(0xFF65A30D)
    val lime700 = Color(0xFF4D7C0F)
    val lime800 = Color(0xFF3F6212)
    val teal = Color(0xFF2AA5A1)
    val green = Color(0xFF22C55E)
    val yellow = Color(0xFFFACC15)
    val red = Color(0xFFEF4444)
    val axisX = Color(0xFFF87171)
    val axisY = Color(0xFF4ADE80)
    val axisZ = Color(0xFF60A5FA)
}

private val colors = darkColorScheme(
    primary = Palette.accent,
    onPrimary = Palette.background,
    primaryContainer = Palette.lime800,
    onPrimaryContainer = Palette.accent,
    secondary = Palette.teal,
    onSecondary = Palette.background,
    secondaryContainer = Palette.line,
    onSecondaryContainer = Palette.text,
    background = Palette.background,
    onBackground = Palette.text,
    surface = Palette.background,
    onSurface = Palette.text,
    surfaceVariant = Palette.line,
    onSurfaceVariant = Palette.muted,
    surfaceContainer = Palette.card,
    surfaceContainerHigh = Palette.card,
    surfaceContainerHighest = Palette.line,
    outline = Palette.line,
    outlineVariant = Palette.line,
    error = Palette.red,
)

private val typography = Typography().run {
    copy(
        titleLarge = titleLarge.copy(fontWeight = FontWeight.ExtraBold),
        titleMedium = titleMedium.copy(fontWeight = FontWeight.Bold),
        labelLarge = labelLarge.copy(fontWeight = FontWeight.SemiBold),
    )
}

/** The app is always dark, like the dashboard. */
@Composable
fun ThingyTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = colors, typography = typography, content = content)
