# android – Thingy Arcade (`ch.disroop.thingyarcade`)

Die Android-App verbindet sich **direkt per BLE** mit dem Thingy:52 und zeigt dieselben Werte wie Terminal und Dashboard. Hältst du das Handy an den Thingy, öffnet sie sich per NFC-Tap (Android Application Record).

> Status: Die App wird noch entwickelt, Details können sich ändern. Unit-Tests, Lint und `assembleDebug` laufen im Devcontainer.

## Befehle

```bash
./project android test      # JUnit :protocol + :app (inkl. SimulatorSmokeTest) + Android-Lint
./project android build     # → build/disroop-thingy-arcade-debug.apk
./project android screenshots  # Roborazzi/Robolectric → docs/img/android-*.png (Simulator-Daten)
./project android badging   # Paket, SDK, Berechtigungen der APK
./project android clean
```

Installation: `adb install -r build\disroop-thingy-arcade-debug.apk` (Windows) oder die APK per Sideload installieren. Siehe [README](../README.md#android-app-installieren).

## Eckdaten

| | |
|---|---|
| Paket | `ch.disroop.thingyarcade`, App-Name „Thingy Arcade“ |
| SDK | minSdk 26 (Android 8), target/compileSdk 36 |
| UI | Jetpack Compose, Material 3, eine Activity (`MainActivity`, `singleTop`). Disroop-Look wie das Dashboard: fest dunkel (Grau/Lime), Logo in der Top-Bar und als App-Icon |
| Sprache | Kotlin, JVM 17 (App) / Toolchain 21 (`:protocol`), Gradle-Wrapper, Versionskatalog `gradle/libs.versions.toml` |
| Signatur | Debug-Build mit **öffentlichem Demo-Keystore** `keystore/demo-debug.keystore`, nur für die Demo |
| Berechtigungen | `BLUETOOTH_SCAN` (neverForLocation) + `BLUETOOTH_CONNECT` ab Android 12. Bis Android 11: `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION`. Dazu `NFC`. |

## Module

```
protocol/   reines Kotlin/JVM, ohne Android-Abhängigkeit, JUnit-getestet
  ThingyUuids, ThingyDecoders, TelemetryEvent (+ NotificationDecoder), Snapshot (+ reduce)
  ThingyCommands (LED, Speaker, Configs), StartSequence, ImaAdpcm, Ndef, Song, NotificationEncoder (für den Simulator)
  shared/chorus.json wird beim Build als Ressource eingebunden (keine Kopie im Repo)
app/
  MainActivity          Permissions, Bluetooth einschalten, NFC-Intent, trennt in onStop
  connection/           ThingyConnection (Port), BleThingyConnection (GATT, GattQueue, Reconnect), SimulatedThingy
  ui/                   ThingyViewModel (StateFlow UiState), ThingyScreen, Widgets, Theme, Format
  song/SongPlayer       Lied über den Lautsprecher, LED-Farbe je Note
  nfc/NfcLaunch         erkennt NFC-Intents
```

Architekturdiagramm: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#android-app).

## Verhalten

- **Verbinden:**
  - Die App scannt und nimmt den Thingy mit dem stärksten Signal.
  - Sie fordert MTU 247 an, schreibt die Startsequenz aus [docs/protocol.md](../docs/protocol.md#startsequenz-client) und abonniert die Notifications.
  - Bei Abbruch verbindet sie sich automatisch neu.
- **NFC:**
  - Der Intent-Filter `NDEF_DISCOVERED` für `vnd.android.nfc://ext/android.com:pkg` greift nur bei Tags mit unserem AAR.
  - Ein Tap verbindet sofort per BLE und beendet dabei den Simulator.
  - Den Tag schreibt die Bridge: `./project bridge nfc`. Die App selbst schreibt keine Tags.
- **Simulator:** Per Schalter in der Status-Karte. Ohne BLE-Hardware (Emulator) ist er automatisch aktiv. Er sendet dieselben rohen Bytes wie die Firmware.
- **Lied:** Knopf in der Karte „Lied & LED“ oder Taster am Thingy. Die App spielt die 24 Noten in **Endlosschleife** mit `pause_ms` (1500 ms) aus `shared/chorus.json` dazwischen, bis du stoppst oder die Verbindung abbricht. Der Schieber „Lautstärke Lied“ (0..100) wirkt ab der nächsten Note.
- **Lautstärke messen:** Das Mikrofon ist **standardmässig aus**, weil der ADPCM-Stream (~32 kB/s) die BLE-Verbindung überlasten kann. Die Startsequenz abonniert es nicht. Der Schalter in der Karte „Mikrofon & Taster“ schreibt die Sound-Config und schaltet die Mikrofon-Notification (CCCD) ein oder aus. Bricht die Verbindung innerhalb von 30 s nach dem Einschalten ab, bleibt das Mikrofon danach aus. Lief es stabil, schaltet die App es nach dem Reconnect wieder ein.
- **Hintergrund:** In `onStop` trennt die App, damit `thingy.exe` den Thingy wieder nutzen kann.

## Offen

- TODO (in Arbeit): Test auf echter Hardware (BLE-Verbindung, NFC-Tap)
- TODO (in Arbeit): Release-APK über GitHub Actions / GitHub Release
- TODO (in Arbeit): Screenshot der App
