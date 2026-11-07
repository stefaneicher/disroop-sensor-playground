package ch.disroop.thingylive.protocol

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class StartSequenceTest {
    private val steps = StartSequence.steps()

    @Test fun `configures motion env and sound before subscribing`() {
        val writes = steps.take(3)
        assertEquals(ThingyUuids.MOTION_CONFIG, (writes[0] as GattStep.Write).uuid)
        assertArrayEquals(ThingyCommands.motionConfig(1000, 500, 100, 10, true), (writes[0] as GattStep.Write).value)
        assertEquals(ThingyUuids.ENV_CONFIG, (writes[1] as GattStep.ReadModifyWrite).uuid)
        assertEquals(ThingyUuids.SOUND_CONFIG, (writes[2] as GattStep.Write).uuid)
        assertArrayEquals(bytes(1, 1), (writes[2] as GattStep.Write).value)
    }

    @Test fun `env config read modify write keeps led`() {
        val rmw = steps[1] as GattStep.ReadModifyWrite
        val result = rmw.transform(bytes(0, 0, 0, 0, 0, 0, 0, 0, 3, 9, 8, 7))
        assertArrayEquals(bytes(0xE8, 3, 0xE8, 3, 0xE8, 3, 0xE8, 3, 1, 9, 8, 7), result)
    }

    @Test fun `subscribes to every notify characteristic except the microphone`() {
        val subscribed = steps.filterIsInstance<GattStep.Subscribe>().map { it.uuid }.toSet()
        val expected = setOf(
            ThingyUuids.TEMPERATURE, ThingyUuids.PRESSURE, ThingyUuids.HUMIDITY, ThingyUuids.GAS, ThingyUuids.COLOR,
            ThingyUuids.BUTTON, ThingyUuids.TAP, ThingyUuids.ORIENTATION, ThingyUuids.QUATERNION,
            ThingyUuids.PEDOMETER, ThingyUuids.RAW_MOTION, ThingyUuids.EULER, ThingyUuids.HEADING,
            ThingyUuids.GRAVITY, ThingyUuids.SPEAKER_STATUS, ThingyUuids.BATTERY_LEVEL,
        )
        assertEquals(expected, subscribed)
        assertTrue(steps.filterIsInstance<GattStep.Subscribe>().filter { it.optional }.map { it.uuid }
            .containsAll(listOf(ThingyUuids.GRAVITY, ThingyUuids.QUATERNION)))
    }

    @Test fun `reads battery once`() {
        assertTrue(steps.any { it is GattStep.Read && it.uuid == ThingyUuids.BATTERY_LEVEL })
    }

    @Test fun `enabling the microphone writes the sound config and subscribes the microphone`() {
        val steps = StartSequence.microphone(enabled = true)
        val config = steps[0] as GattStep.Write
        assertEquals(ThingyUuids.SOUND_CONFIG, config.uuid)
        assertArrayEquals(ThingyCommands.soundConfig(), config.value)
        assertEquals(listOf(GattStep.Subscribe(ThingyUuids.MICROPHONE)), steps.drop(1))
    }

    @Test fun `disabling the microphone only unsubscribes it`() {
        assertEquals(listOf(GattStep.Unsubscribe(ThingyUuids.MICROPHONE)), StartSequence.microphone(enabled = false))
    }

    @Test fun `game mode runs motion at 100 Hz and skips euler, heading, compass and environment`() {
        val game = StartSequence.game()
        assertArrayEquals(ThingyCommands.motionConfig(1000, 1000, 1000, 100, true), (game[0] as GattStep.Write).value)
        assertEquals(
            setOf(ThingyUuids.BUTTON, ThingyUuids.TAP, ThingyUuids.RAW_MOTION, ThingyUuids.QUATERNION),
            game.filterIsInstance<GattStep.Subscribe>().map { it.uuid }.toSet(),
        )
    }
}
