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
    /**
     * [volume] is read per note, so changes apply immediately. With [loop] the song repeats after
     * `pause_ms` until cancelled. [onNote] receives (note index, LED colour); (-1, OFF) at the end.
     */
    suspend fun play(
        song: Song,
        volume: () -> Int = { DEFAULT_VOLUME },
        loop: Boolean = false,
        onNote: (Int, Rgb) -> Unit = { _, _ -> },
    ) {
        try {
            playOnce(song, volume, onNote)
            while (loop) {
                delay(song.pauseMs.toLong())
                playOnce(song, volume, onNote)
            }
        } finally {
            withContext(NonCancellable) {
                thingy.write(ThingyUuids.LED, ThingyCommands.ledOff())
                onNote(-1, Rgb.OFF)
            }
        }
    }

    private suspend fun playOnce(song: Song, volume: () -> Int, onNote: (Int, Rgb) -> Unit) {
        song.notes.forEachIndexed { index, note ->
            val color = NoteColors.forHz(note.hz)
            thingy.write(ThingyUuids.SPEAKER, ThingyCommands.speakerTone(note.hz, note.onMs, volume()), withResponse = false)
            thingy.write(ThingyUuids.LED, ThingyCommands.ledConstant(color))
            onNote(index, color)
            delay(note.onMs.toLong())
            thingy.write(ThingyUuids.LED, ThingyCommands.ledOff())
            onNote(index, Rgb.OFF)
            delay(note.offMs.toLong())
        }
    }

    companion object {
        const val DEFAULT_VOLUME = 100
        const val MAX_VOLUME = 100
    }
}
