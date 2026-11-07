package ch.disroop.thingyarcade.protocol

/** Raw NDEF messages for the Thingy NFC characteristic `EF680109`. */
object Ndef {
    private const val MB_ME_SR_TNF_EXTERNAL = 0xD4
    private const val AAR_TYPE = "android.com:pkg"
    private const val SHORT_RECORD_MAX = 255

    /** Single Android Application Record: launches [packageName] when the tag is tapped. */
    fun androidApplicationRecord(packageName: String): ByteArray {
        val type = AAR_TYPE.toByteArray(Charsets.US_ASCII)
        val payload = packageName.toByteArray(Charsets.US_ASCII)
        require(payload.size <= SHORT_RECORD_MAX) { "package name too long for a short record" }
        return byteArrayOf(MB_ME_SR_TNF_EXTERNAL.toByte(), type.size.toByte(), payload.size.toByte()) + type + payload
    }
}
