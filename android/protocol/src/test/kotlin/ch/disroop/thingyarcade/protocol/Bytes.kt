package ch.disroop.thingyarcade.protocol

/** Test helper: `bytes(0x17, 0x28)` → ByteArray. */
fun bytes(vararg values: Int): ByteArray = ByteArray(values.size) { values[it].toByte() }
