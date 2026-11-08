package ch.disroop.sensorplayground.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class SongTest {
    @Test fun `bundled chorus comes from shared chorus json`() {
        val song = Song.highwayToHell()
        assertEquals(24, song.notes.size)
        assertEquals(1500, song.pauseMs)
        assertEquals(Note(hz = 440, onMs = 180, offMs = 80), song.notes.first())
        assertEquals(Note(hz = 440, onMs = 2080, offMs = 1040), song.notes.last())
    }

    @Test fun `parses minimal json`() {
        val song = Song.parse("""{"title":"t","pause_ms":10,"notes":[{"on_ms":1,"off_ms":2,"hz":3}]}""")
        assertEquals(Song(title = "t", pauseMs = 10, notes = listOf(Note(hz = 3, onMs = 1, offMs = 2))), song)
    }

    @Test fun `song duration sums on and off times`() {
        val song = Song("t", 10, listOf(Note(440, 100, 50), Note(392, 200, 25)))
        assertEquals(375, song.durationMs)
    }

    @Test fun `note colors depend on pitch class`() {
        assertEquals(NoteColors.forHz(440), NoteColors.forHz(880))
        assertNotEquals(NoteColors.forHz(440), NoteColors.forHz(523))
        assertNotEquals(NoteColors.forHz(392), NoteColors.forHz(440))
    }

    @Test fun `note colors are bright`() {
        listOf(392, 440, 494, 523, 587).forEach { hz ->
            val c = NoteColors.forHz(hz)
            assertEquals("max channel of $hz", 255, maxOf(c.r, c.g, c.b))
        }
    }
}
