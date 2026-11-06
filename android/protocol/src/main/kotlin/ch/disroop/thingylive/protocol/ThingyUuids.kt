package ch.disroop.thingylive.protocol

import java.util.UUID

/** GATT UUIDs of the Thingy:52 stock firmware v2.x (docs/protocol.md §1). */
object ThingyUuids {
    private fun thingy(short: Int): UUID = UUID.fromString("ef68%04x-9b35-4933-9b10-52ffa9740042".format(short))
    private fun sig(short: Int): UUID = UUID.fromString("%08x-0000-1000-8000-00805f9b34fb".format(short))

    const val ADVERTISED_NAME = "Thingy"

    val CONFIG_SERVICE: UUID = thingy(0x0100)
    val NFC: UUID = thingy(0x0109)

    val ENVIRONMENT_SERVICE: UUID = thingy(0x0200)
    val TEMPERATURE: UUID = thingy(0x0201)
    val PRESSURE: UUID = thingy(0x0202)
    val HUMIDITY: UUID = thingy(0x0203)
    val GAS: UUID = thingy(0x0204)
    val COLOR: UUID = thingy(0x0205)
    val ENV_CONFIG: UUID = thingy(0x0206)

    val UI_SERVICE: UUID = thingy(0x0300)
    val LED: UUID = thingy(0x0301)
    val BUTTON: UUID = thingy(0x0302)

    val MOTION_SERVICE: UUID = thingy(0x0400)
    val MOTION_CONFIG: UUID = thingy(0x0401)
    val TAP: UUID = thingy(0x0402)
    val ORIENTATION: UUID = thingy(0x0403)
    val QUATERNION: UUID = thingy(0x0404)
    val PEDOMETER: UUID = thingy(0x0405)
    val RAW_MOTION: UUID = thingy(0x0406)
    val EULER: UUID = thingy(0x0407)
    val HEADING: UUID = thingy(0x0409)
    val GRAVITY: UUID = thingy(0x040A)

    val SOUND_SERVICE: UUID = thingy(0x0500)
    val SOUND_CONFIG: UUID = thingy(0x0501)
    val SPEAKER: UUID = thingy(0x0502)
    val SPEAKER_STATUS: UUID = thingy(0x0503)
    val MICROPHONE: UUID = thingy(0x0504)

    val BATTERY_SERVICE: UUID = sig(0x180F)
    val BATTERY_LEVEL: UUID = sig(0x2A19)

    /** Client Characteristic Configuration Descriptor. */
    val CCCD: UUID = sig(0x2902)
}
