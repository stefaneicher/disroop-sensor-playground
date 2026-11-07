package ch.disroop.sensorplayground.ui

import ch.disroop.sensorplayground.connection.LinkState
import ch.disroop.sensorplayground.protocol.BatteryTrend
import ch.disroop.sensorplayground.protocol.Orientation
import ch.disroop.sensorplayground.protocol.TapDirection
import java.util.Locale

// Decimal point like the web dashboard.
private val numbers = Locale.US
private const val MISSING = "–"

fun Double?.format(decimals: Int = 1, unit: String = ""): String =
    this?.let { String.format(numbers, "%.${decimals}f", it) + unit } ?: MISSING

/** Explicit sign like the dashboard ("+0.41", "−8.0"); zero stays unsigned. */
fun Double?.signed(decimals: Int = 1, unit: String = ""): String {
    if (this == null) return MISSING
    val text = String.format(numbers, "%.${decimals}f", kotlin.math.abs(this))
    val sign = if (text.toDouble() == 0.0) "" else if (this > 0) "+" else "−"
    return sign + text + unit
}

private val CARDINALS = listOf("N", "NO", "O", "SO", "S", "SW", "W", "NW")

fun Double?.cardinal(): String =
    this?.let { CARDINALS[(Math.round((((it % 360) + 360) % 360) / 45.0).toInt()) % 8] } ?: ""

fun TapDirection.arrow(): String = when (this) {
    TapDirection.X_POS -> "→"
    TapDirection.X_NEG -> "←"
    TapDirection.Y_POS -> "↑"
    TapDirection.Y_NEG -> "↓"
    TapDirection.Z_POS -> "⊙"
    TapDirection.Z_NEG -> "⊗"
}

fun Int?.format(unit: String = ""): String = this?.let { "$it$unit" } ?: MISSING

fun Long?.format(unit: String = ""): String = this?.let { "$it$unit" } ?: MISSING

fun Orientation?.label(): String = when (this) {
    Orientation.PORTRAIT -> "Hochformat"
    Orientation.LANDSCAPE -> "Querformat"
    Orientation.REVERSE_PORTRAIT -> "Hochformat, umgekehrt"
    Orientation.REVERSE_LANDSCAPE -> "Querformat, umgekehrt"
    null -> MISSING
}

fun LinkState.label(): String = when (this) {
    LinkState.Idle -> "Getrennt"
    LinkState.Scanning -> "Suche Thingy …"
    is LinkState.Connecting -> "Verbinde …"
    is LinkState.Connected -> "Verbunden"
    is LinkState.Unavailable -> when (reason) {
        LinkState.Reason.NO_PERMISSION -> "Bluetooth-Berechtigung fehlt"
        LinkState.Reason.BLUETOOTH_OFF -> "Bluetooth ist ausgeschaltet"
        LinkState.Reason.SCAN_FAILED -> "Suche fehlgeschlagen, neuer Versuch …"
    }
}

fun BatteryTrend.label(): String = when (this) {
    BatteryTrend.CHARGING -> "lädt ↑"
    BatteryTrend.DISCHARGING -> "Akkubetrieb ↓"
    BatteryTrend.UNKNOWN -> "Ladezustand unbekannt"
}
