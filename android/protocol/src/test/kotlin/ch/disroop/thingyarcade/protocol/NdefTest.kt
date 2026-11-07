package ch.disroop.thingyarcade.protocol

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class NdefTest {
    @Test fun `android application record matches protocol bytes`() {
        val msg = Ndef.androidApplicationRecord("ch.disroop.thingyarcade")
        val expected = bytes(0xD4, 0x0F, 0x17) + "android.com:pkg".toByteArray() + "ch.disroop.thingyarcade".toByteArray()
        assertEquals(41, msg.size)
        assertArrayEquals(expected, msg)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `package names longer than a short record are rejected`() {
        Ndef.androidApplicationRecord("x".repeat(256))
    }
}
