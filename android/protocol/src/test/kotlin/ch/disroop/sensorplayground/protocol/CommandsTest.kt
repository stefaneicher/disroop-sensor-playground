package ch.disroop.sensorplayground.protocol

import org.junit.Assert.assertArrayEquals
import org.junit.Test

class CommandsTest {
    @Test fun `motion config per start sequence`() {
        assertArrayEquals(
            bytes(0xE8, 0x03, 0xF4, 0x01, 0x64, 0x00, 0x0A, 0x00, 0x01),
            ThingyCommands.motionConfig(pedometerMs = 1000, temperatureMs = 500, compassMs = 100, motionHz = 10, wakeOnMotion = true),
        )
    }

    @Test fun `env config keeps led bytes of the current value`() {
        val current = bytes(0xD0, 0x07, 0xD0, 0x07, 0xD0, 0x07, 0xD0, 0x07, 0x02, 0x11, 0x22, 0x33)
        assertArrayEquals(
            bytes(0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0x01, 0x11, 0x22, 0x33),
            ThingyCommands.envConfig(current, intervalMs = 1000, gasMode = 1),
        )
    }

    @Test fun `env config with unreadable current value uses led zero`() {
        assertArrayEquals(
            bytes(0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0x01, 0, 0, 0),
            ThingyCommands.envConfig(ByteArray(0), intervalMs = 1000, gasMode = 1),
        )
    }

    @Test fun `sound config freq speaker and adpcm mic`() {
        assertArrayEquals(bytes(1, 1), ThingyCommands.soundConfig())
    }

    @Test fun `speaker tone hz duration volume`() {
        assertArrayEquals(bytes(0xB8, 0x01, 0xB4, 0x00, 0x64), ThingyCommands.speakerTone(hz = 440, durationMs = 180, volume = 100))
    }

    @Test fun `speaker volume is clamped`() {
        assertArrayEquals(bytes(0xB8, 0x01, 0xB4, 0x00, 0x64), ThingyCommands.speakerTone(440, 180, 150))
    }

    @Test fun `led constant and off`() {
        assertArrayEquals(bytes(1, 0xFF, 0x80, 0x00), ThingyCommands.ledConstant(Rgb(255, 128, 0)))
        assertArrayEquals(bytes(0), ThingyCommands.ledOff())
    }
}
