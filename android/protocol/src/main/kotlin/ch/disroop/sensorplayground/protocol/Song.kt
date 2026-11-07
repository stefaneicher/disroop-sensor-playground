package ch.disroop.sensorplayground.protocol

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.math.log2
import kotlin.math.roundToInt

@Serializable
data class Note(
    val hz: Int,
    @SerialName("on_ms") val onMs: Int,
    @SerialName("off_ms") val offMs: Int,
)

/** Song as defined by `shared/chorus.json` (bundled into the jar at build time). */
@Serializable
data class Song(
    val title: String,
    @SerialName("pause_ms") val pauseMs: Int,
    val notes: List<Note>,
) {
    val durationMs: Long get() = notes.sumOf { (it.onMs + it.offMs).toLong() }

    companion object {
        private const val CHORUS_RESOURCE = "chorus.json"
        private val json = Json { ignoreUnknownKeys = true }

        fun parse(text: String): Song = json.decodeFromString(serializer(), text)

        fun highwayToHell(): Song {
            val stream = Song::class.java.getResourceAsStream(CHORUS_RESOURCE)
                ?: error("$CHORUS_RESOURCE missing from resources")
            return stream.bufferedReader().use { parse(it.readText()) }
        }
    }
}

/** LED colour per pitch class: the 12 semitones are spread over the colour wheel, A = red. */
object NoteColors {
    private const val SEMITONES = 12
    private const val A4_HZ = 440.0

    fun forHz(hz: Int): Rgb {
        val semitone = (SEMITONES * log2(hz / A4_HZ)).roundToInt()
        val pitchClass = Math.floorMod(semitone, SEMITONES)
        return hueToRgb(pitchClass * 360.0 / SEMITONES)
    }

    private fun hueToRgb(hue: Double): Rgb {
        val x = 1 - abs((hue / 60) % 2 - 1)
        val (r, g, b) = when ((hue / 60).toInt()) {
            0 -> Triple(1.0, x, 0.0)
            1 -> Triple(x, 1.0, 0.0)
            2 -> Triple(0.0, 1.0, x)
            3 -> Triple(0.0, x, 1.0)
            4 -> Triple(x, 0.0, 1.0)
            else -> Triple(1.0, 0.0, x)
        }
        fun channel(v: Double) = (v * 255).roundToInt()
        return Rgb(channel(r), channel(g), channel(b))
    }
}
