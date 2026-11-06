package ch.disroop.thingylive.ui

import ch.disroop.thingylive.connection.LinkState
import ch.disroop.thingylive.protocol.Orientation
import java.util.Locale

private val swiss = Locale.GERMANY
private const val MISSING = "–"

fun Double?.format(decimals: Int = 1, unit: String = ""): String =
    this?.let { String.format(swiss, "%.${decimals}f", it) + unit } ?: MISSING

fun Int?.format(unit: String = ""): String = this?.let { "$it$unit" } ?: MISSING

fun Long?.format(unit: String = ""): String = this?.let { "$it$unit" } ?: MISSING

fun Orientation?.label(): String = when (this) {
    Orientation.PORTRAIT -> "Hochformat"
    Orientation.LANDSCAPE -> "Querformat"
    Orientation.REVERSE_PORTRAIT -> "Hochformat (umgekehrt)"
    Orientation.REVERSE_LANDSCAPE -> "Querformat (umgekehrt)"
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
