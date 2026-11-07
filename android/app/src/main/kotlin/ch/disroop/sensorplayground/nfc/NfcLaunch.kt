package ch.disroop.sensorplayground.nfc

import android.content.Intent
import android.nfc.NfcAdapter

/** Recognises intents that come from touching the Thingy's NFC tag. */
object NfcLaunch {
    private val nfcActions = setOf(
        NfcAdapter.ACTION_NDEF_DISCOVERED,
        NfcAdapter.ACTION_TECH_DISCOVERED,
        NfcAdapter.ACTION_TAG_DISCOVERED,
    )

    fun isNfcIntent(intent: Intent?): Boolean = intent?.action in nfcActions
}
