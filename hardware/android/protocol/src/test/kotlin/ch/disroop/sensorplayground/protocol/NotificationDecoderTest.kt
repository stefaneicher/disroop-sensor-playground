package ch.disroop.sensorplayground.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class NotificationDecoderTest {
    @Test fun `routes characteristics to events`() {
        assertEquals(TelemetryEvent.Temperature(23.4), NotificationDecoder.decode(ThingyUuids.TEMPERATURE, bytes(0x17, 0x28)))
        assertEquals(TelemetryEvent.Humidity(41), NotificationDecoder.decode(ThingyUuids.HUMIDITY, bytes(41)))
        assertEquals(TelemetryEvent.Button(true), NotificationDecoder.decode(ThingyUuids.BUTTON, bytes(1)))
        assertEquals(TelemetryEvent.Battery(87), NotificationDecoder.decode(ThingyUuids.BATTERY_LEVEL, bytes(87)))
        assertEquals(TelemetryEvent.Heading(47.0), NotificationDecoder.decode(ThingyUuids.HEADING, bytes(0, 0, 0x2F, 0)))
    }

    @Test fun `microphone frames become level events`() {
        val event = NotificationDecoder.decode(ThingyUuids.MICROPHONE, bytes(0, 0, 0, 0, 0, 0))
        assertTrue(event is TelemetryEvent.MicLevel)
    }

    @Test fun `unknown uuid and malformed payloads are ignored`() {
        assertNull(NotificationDecoder.decode(UUID.randomUUID(), bytes(1)))
        assertNull(NotificationDecoder.decode(ThingyUuids.PRESSURE, bytes(1)))
    }

    @Test fun `uuids use the thingy base`() {
        assertEquals("ef680100-9b35-4933-9b10-52ffa9740042", ThingyUuids.CONFIG_SERVICE.toString())
        assertEquals("ef680504-9b35-4933-9b10-52ffa9740042", ThingyUuids.MICROPHONE.toString())
        assertEquals("00002a19-0000-1000-8000-00805f9b34fb", ThingyUuids.BATTERY_LEVEL.toString())
        assertEquals("00002902-0000-1000-8000-00805f9b34fb", ThingyUuids.CCCD.toString())
    }
}
