package ch.disroop.thingylive.protocol

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

class ImaAdpcmTest {
    // Frame layout of the Thingy FW (libs/dvi_adpcm): i16 predictor big-endian (htons), u8 index,
    // then 4-bit codes, the first sample in the HIGH nibble.

    @Test fun `decodes hand computed nibbles high nibble first`() {
        assertArrayEquals(shortArrayOf(11, 41), ImaAdpcm.decode(bytes(0x00, 0x00, 0x00, 0x77)))
        assertArrayEquals(shortArrayOf(11, 13), ImaAdpcm.decode(bytes(0x00, 0x00, 0x00, 0x70)))
    }

    @Test fun `predictor header is big endian`() {
        assertArrayEquals(shortArrayOf(267, 297), ImaAdpcm.decode(bytes(0x01, 0x00, 0x00, 0x77)))
    }

    @Test fun `negative codes decrease the predictor`() {
        // code 0xF: sign + 7 → -11 from predictor 100
        assertEquals(89, ImaAdpcm.decode(bytes(0x00, 0x64, 0x00, 0xF0))[0].toInt())
    }

    @Test fun `out of range step index is clamped`() {
        assertEquals(2, ImaAdpcm.decode(bytes(0, 0, 200, 0x00)).size)
    }

    @Test fun `frame without payload decodes to nothing`() {
        assertEquals(0, ImaAdpcm.decode(bytes(0, 0, 0)).size)
    }

    @Test fun `encoder round trip follows a sine`() {
        val pcm = ShortArray(256) { (8000 * sin(2 * PI * 440 * it / 16000)).toInt().toShort() }
        val decoded = ImaAdpcm.decode(ImaAdpcm.encode(pcm))
        assertEquals(pcm.size, decoded.size)
        val maxError = pcm.indices.drop(32).maxOf { abs(pcm[it] - decoded[it]) }
        assertTrue("max error $maxError", maxError < 1500)
    }

    @Test fun `level of silence clamps to minus 100`() {
        assertEquals(-100.0, AudioLevel.dbfs(ShortArray(256)), 1e-9)
    }

    @Test fun `level of full scale square is about 0 dBFS`() {
        val square = ShortArray(256) { if (it % 2 == 0) Short.MAX_VALUE else Short.MIN_VALUE }
        assertEquals(0.0, AudioLevel.dbfs(square), 0.01)
    }

    @Test fun `level of a tenth of full scale is minus 20 dBFS`() {
        val square = ShortArray(256) { if (it % 2 == 0) 3277 else -3277 }
        assertEquals(-20.0, AudioLevel.dbfs(square), 0.01)
    }

    @Test fun `empty sample buffer is silence`() {
        assertEquals(-100.0, AudioLevel.dbfs(ShortArray(0)), 1e-9)
    }
}
