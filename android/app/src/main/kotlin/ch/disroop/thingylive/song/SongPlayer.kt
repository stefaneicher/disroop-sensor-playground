package ch.disroop.thingylive.song

import ch.disroop.thingylive.connection.ThingyConnection
import ch.disroop.thingylive.protocol.NoteColors
import ch.disroop.thingylive.protocol.Rgb
import ch.disroop.thingylive.protocol.Song
import ch.disroop.thingylive.protocol.ThingyCommands
import ch.disroop.thingylive.protocol.ThingyUuids
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Plays a [Song] on the Thingy speaker (frequency mode) with an LED colour per note.
 * Timing uses coroutine [delay], so tests run it on virtual time.
 */
class SongPlayer(private val thingy: ThingyConnection) {
    /** [onNote] receives (note index, LED colour); (-1, OFF) when the song ends or is cancelled. */
    suspend fun play(song: Song, volume: Int = DEFAULT_VOLUME, onNote: (Int, Rgb) -> Unit = { _, _ -> }) {
        try {
            song.notes.forEachIndexed { index, note ->
                val color = NoteColors.forHz(note.hz)
                thingy.write(ThingyUuids.SPEAKER, ThingyCommands.speakerTone(note.hz, note.onMs, volume), withResponse = false)
                thingy.write(ThingyUuids.LED, ThingyCommands.ledConstant(color))
                onNote(index, color)
                delay(note.onMs.toLong())
                thingy.write(ThingyUuids.LED, ThingyCommands.ledOff())
                onNote(index, Rgb.OFF)
                delay(note.offMs.toLong())
            }
        } finally {
            withContext(NonCancellable) {
                thingy.write(ThingyUuids.LED, ThingyCommands.ledOff())
                onNote(-1, Rgb.OFF)
            }
        }
    }

    companion object {
        const val DEFAULT_VOLUME = 100
    }
}
