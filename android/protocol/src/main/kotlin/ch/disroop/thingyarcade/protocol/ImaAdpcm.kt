package ch.disroop.thingyarcade.protocol

import kotlin.math.log10
import kotlin.math.sqrt

/**
 * IMA/DVI ADPCM as produced by the Thingy:52 firmware (`libs/dvi_adpcm/dvi_adpcm.c`):
 * 3-byte header = i16 predictor **big-endian** (htons) + u8 step index,
 * followed by 4-bit codes with the first sample in the **high** nibble.
 */
object ImaAdpcm {
    private const val HEADER_SIZE = 3

    private val indexTable = intArrayOf(-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8)

    private val stepTable = intArrayOf(
        7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
        50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307,
        337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,
        2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899,
        15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
    )

    private class State(var predictor: Int, var index: Int)

    fun decode(frame: ByteArray): ShortArray {
        require(frame.size >= HEADER_SIZE) { "ADPCM frame needs a $HEADER_SIZE byte header" }
        val predictor = ((frame[0].toInt() and 0xFF) shl 8 or (frame[1].toInt() and 0xFF)).toShort().toInt()
        val state = State(predictor, (frame[2].toInt() and 0xFF).coerceIn(0, stepTable.lastIndex))
        val out = ShortArray((frame.size - HEADER_SIZE) * 2)
        for (i in HEADER_SIZE until frame.size) {
            val byte = frame[i].toInt() and 0xFF
            val o = (i - HEADER_SIZE) * 2
            out[o] = decodeNibble(state, byte shr 4)
            out[o + 1] = decodeNibble(state, byte and 0x0F)
        }
        return out
    }

    /** Encodes [pcm] into one frame starting from silence (used by the simulator and tests). */
    fun encode(pcm: ShortArray): ByteArray {
        val state = State(0, 0)
        val out = ByteArray(HEADER_SIZE + (pcm.size + 1) / 2)
        for (i in pcm.indices) {
            val code = encodeSample(state, pcm[i].toInt())
            val o = HEADER_SIZE + i / 2
            out[o] = if (i % 2 == 0) (code shl 4).toByte() else (out[o].toInt() or code).toByte()
        }
        return out
    }

    private fun decodeNibble(state: State, code: Int): Short {
        val step = stepTable[state.index]
        var diff = step shr 3
        if (code and 4 != 0) diff += step
        if (code and 2 != 0) diff += step shr 1
        if (code and 1 != 0) diff += step shr 2
        state.predictor = (if (code and 8 != 0) state.predictor - diff else state.predictor + diff)
            .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
        state.index = (state.index + indexTable[code]).coerceIn(0, stepTable.lastIndex)
        return state.predictor.toShort()
    }

    private fun encodeSample(state: State, sample: Int): Int {
        var diff = sample - state.predictor
        val sign = if (diff < 0) 8 else 0
        if (sign != 0) diff = -diff
        val step = stepTable[state.index]
        var code = 0
        var threshold = step
        for (bit in intArrayOf(4, 2, 1)) {
            if (diff >= threshold) {
                code = code or bit
                diff -= threshold
            }
            threshold = threshold shr 1
        }
        decodeNibble(state, code or sign)
        return code or sign
    }
}

/** RMS level of PCM samples in dBFS (docs/protocol.md "Lautstärke aus dem Mikrofon"). */
object AudioLevel {
    const val MIN_DBFS = -100.0
    private const val FULL_SCALE = 32768.0

    fun dbfs(samples: ShortArray): Double {
        if (samples.isEmpty()) return MIN_DBFS
        val meanSquare = samples.sumOf { it.toDouble() * it } / samples.size
        val rms = sqrt(meanSquare)
        if (rms == 0.0) return MIN_DBFS
        return (20 * log10(rms / FULL_SCALE)).coerceIn(MIN_DBFS, 0.0)
    }
}
