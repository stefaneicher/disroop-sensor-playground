package ch.disroop.sensorplayground.song

import ch.disroop.sensorplayground.connection.FakeConnection
import ch.disroop.sensorplayground.protocol.Note
import ch.disroop.sensorplayground.protocol.NoteColors
import ch.disroop.sensorplayground.protocol.Rgb
import ch.disroop.sensorplayground.protocol.Song
import ch.disroop.sensorplayground.protocol.ThingyCommands
import ch.disroop.sensorplayground.protocol.ThingyUuids
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SongPlayerTest {
    private val song = Song("t", pauseMs = 1500, notes = listOf(Note(440, 100, 50), Note(523, 200, 25)))

    @Test fun `plays every note with tone and led and waits on plus off time`() = runTest {
        val thingy = FakeConnection().apply { now = { testScheduler.currentTime } }
        val progress = mutableListOf<Pair<Int, Rgb>>()

        SongPlayer(thingy).play(song, volume = { 80 }) { index, color -> progress += index to color }

        val speaker = thingy.writes.filter { it.uuid == ThingyUuids.SPEAKER }
        assertEquals(listOf(0L, 150L), speaker.map { it.atMs })
        assertEquals(ThingyCommands.speakerTone(440, 100, 80).toList(), speaker[0].value)
        assertEquals(ThingyCommands.speakerTone(523, 200, 80).toList(), speaker[1].value)
        assertEquals(false, speaker[0].withResponse)

        val leds = thingy.writes.filter { it.uuid == ThingyUuids.LED }.map { it.atMs to it.value }
        assertEquals(
            listOf(
                0L to ThingyCommands.ledConstant(NoteColors.forHz(440)).toList(),
                100L to ThingyCommands.ledOff().toList(),
                150L to ThingyCommands.ledConstant(NoteColors.forHz(523)).toList(),
                350L to ThingyCommands.ledOff().toList(),
                375L to ThingyCommands.ledOff().toList(),
            ),
            leds,
        )
        assertEquals(375L, testScheduler.currentTime)
        assertEquals(-1 to Rgb.OFF, progress.last())
        assertEquals(0 to NoteColors.forHz(440), progress.first())
    }

    @Test fun `stopping mid song switches the led off`() = runTest {
        val thingy = FakeConnection().apply { now = { testScheduler.currentTime } }
        var last: Pair<Int, Rgb>? = null
        val job = launch { SongPlayer(thingy).play(song) { i, c -> last = i to c } }
        advanceTimeBy(120)
        runCurrent()
        job.cancel()
        job.join()

        assertEquals(1, thingy.writes.count { it.uuid == ThingyUuids.SPEAKER })
        assertEquals(ThingyCommands.ledOff().toList(), thingy.writes.last().value)
        assertEquals(-1 to Rgb.OFF, last)
    }

    @Test fun `looping repeats the song after the pause until cancelled`() = runTest {
        val thingy = FakeConnection().apply { now = { testScheduler.currentTime } }
        var volume = 100
        val job = launch { SongPlayer(thingy).play(song, volume = { volume }, loop = true) }
        advanceTimeBy(200)
        volume = 30
        advanceTimeBy(375 + 1500 + 10 - 200)
        runCurrent()
        job.cancel()
        job.join()

        val speaker = thingy.writes.filter { it.uuid == ThingyUuids.SPEAKER }
        assertEquals(listOf(0L, 150L, 1875L), speaker.map { it.atMs })
        assertEquals(ThingyCommands.speakerTone(440, 100, 100).toList(), speaker[0].value)
        assertEquals("volume changes apply to the next note", ThingyCommands.speakerTone(440, 100, 30).toList(), speaker[2].value)
    }
}
