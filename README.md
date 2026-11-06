# thingy52-live

Live-Demo mit dem **Nordic Thingy:52**: Alle Sensorwerte laufen per Bluetooth LE live ins Terminal, in ein Web-Dashboard und in eine Android-App. Der Thingy spielt dazu „Highway to Hell“, die LED blinkt mit. Der Thingy läuft mit der **Werksfirmware**, Flashen ist nicht nötig.

![Web-Dashboard](docs/img/dashboard.png)
*Web-Dashboard im Simulator-Modus (`thingy.exe --sim`). Mobile-Ansicht: [docs/img/dashboard-mobile.png](docs/img/dashboard-mobile.png)*

> **Keine Firmware, kein Flashen, kein Debugger.** Für dieses Projekt wird keine Firmware gebaut. Der Thingy läuft unverändert mit der Nordic-Werksfirmware (v2.x). Unsere Software ist ein reiner **BLE-Client**:
> - **Empfangen:** Sie abonniert die GATT-Notifications des Thingy (Sensordaten) und dekodiert sie.
> - **Senden:** Sie schreibt Befehle in GATT-Characteristics: Ton für das Lied, LED-Farbe, Sensor-Intervalle, NFC-Inhalt.
>
> Das hat Grenzen: Es geht nur, was die Werksfirmware anbietet. So ist z. B. die Mikrofon-Abtastrate fest auf 16 kHz. Deshalb ist die Lautstärkemessung standardmässig aus, sie würde die BLE-Verbindung überlasten.
>
> ```
> Thingy:52 (Werks-FW) ──BLE──▶ thingy.exe (Windows) ──▶ Terminal + Web-Dashboard :8052
>                      ──BLE──▶ Android-App ch.disroop.thingylive (direkt, Start per NFC)
> ```

## Features

- **`thingy.exe`** (Go, Windows): verbindet sich per BLE mit dem Thingy und zeigt alle Werte live im Terminal:
  - Beschleunigung, Gyro, Kompass, Kurs, Euler-Winkel, Lage, Tippen, Schritte
  - Temperatur, Feuchte, Luftdruck, eCO₂/TVOC, Farbe
  - Mikrofonpegel, Taster, Akku, RSSI
- **Web-Dashboard** auf http://localhost:8052. Es ist in die exe eingebettet und bekommt die Daten live per Server-Sent Events. Es zeigt Charts, 3D-Lage und Kompass, und du kannst damit das Lied und die LED steuern.
- **Lied:** „Highway to Hell“ (Refrain, 24 Noten) über den Thingy-Lautsprecher. Die LED-Farbe folgt der Tonhöhe. Starten und stoppen geht per Taster am Thingy, im Dashboard oder in der App.
- **NFC:** `thingy.exe nfc` schreibt einen Android Application Record auf den NFC-Tag des Thingy. Hältst du das Handy an den Thingy, öffnet sich die App.
- **Android-App** `ch.disroop.thingylive`: verbindet sich direkt per BLE und zeigt dieselben Werte. Sie hat einen eingebauten Simulator.
- **Simulator** (`--sim`) für Demos, Tests und CI ohne Hardware.
- **Alles im Docker-Devcontainer:** Lokal wird ausser Docker nichts installiert.

## Quickstart

**Voraussetzungen**
- Windows 11 mit WSL2 (Ubuntu) und Docker in WSL
- Bluetooth-LE-Adapter unter Windows
- Thingy:52 mit Werksfirmware, geladen. Zum Aufwecken den Knopf drücken.

**Im Repo-Ordner unter WSL:**

```bash
./project image          # Devcontainer-Image bauen (einmalig, dauert einige Minuten)
./project build          # build/thingy.exe, build/thingy-linux, build/thingylive-debug.apk
./project bridge run     # thingy.exe auf Windows starten: Terminal-Live-Ansicht + Web-GUI
```

Dann im Browser http://localhost:8052 öffnen. `Strg+C` beendet die exe.

**Ohne Hardware:** `./project bridge run --sim` startet die exe mit dem Simulator.

> Die exe läuft über WSL-Interop **unter Windows**, weil WSL kein Bluetooth hat. Der Port lauscht nur auf `127.0.0.1` von Windows. Aus WSL brauchst du deshalb `curl.exe` statt `curl`, siehe [Troubleshooting](docs/TROUBLESHOOTING.md).

## Android-App installieren

1. APK bauen mit `./project android build`. Das ergibt `build/thingylive-debug.apk`. Ein GitHub-Release mit fertiger APK ist geplant, siehe [Releases](https://github.com/stefaneicher/thingy52-live/releases).
2. Installieren:
   - **Sideload:** APK aufs Handy kopieren, öffnen und „Unbekannte Apps installieren“ erlauben.
   - **adb (Windows):** `adb install -r build\thingylive-debug.apk`
3. Beim ersten Start die Berechtigung „Geräte in der Nähe“ (Bluetooth) erteilen.

Die APK ist mit einem öffentlich eingecheckten Demo-Schlüssel signiert. Neuinstallationen über lokale und CI-Builds hinweg funktionieren deshalb. Für den produktiven Einsatz ist sie nicht gedacht.

## NFC: Handy an den Thingy halten

```bash
./project bridge nfc             # Backup nach build/nfc-backup.hex, dann AAR "ch.disroop.thingylive" schreiben
./project bridge nfc --restore   # Original-Inhalt (Nordic-App) aus dem Backup zurückschreiben
```

Der Thingy nimmt nur **eine** BLE-Verbindung an. Während `nfc` läuft, müssen `thingy.exe` und die App getrennt sein.

## Projektstruktur

```
project                 CLI: ./project <befehl>, ruft scripts/<bereich>.sh auf
scripts/                bridge.sh, web.sh, android.sh (Builds und Tests im Devcontainer)
.devcontainer/          Toolchain-Image (Go, Node, JDK 21, Android SDK, Chromium)
bridge/                 Go: thingy.exe (BLE, Decoder, Telemetrie, TUI, HTTP/SSE, Lied, NFC)
bridge/web/             Web-Dashboard (ES-Module ohne Build-Step), Tests, Mock-Server
android/                Android-App (Kotlin, Compose) + reines Kotlin-Modul :protocol
shared/                 chorus.json (Lied), telemetry.example.json (Beispiel-Snapshot)
docs/                   Protokoll-Vertrag, Schema, Architektur, Anleitungen
build/                  Build-Ausgaben (nicht im Git)
```

## Dokumentation

Die Übersicht findest du in [docs/index.md](docs/index.md):

- [Architektur](docs/ARCHITECTURE.md)
- [Bedienung](docs/USAGE.md)
- [Entwicklung](docs/DEVELOPMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Protokoll-Vertrag](docs/protocol.md)
- READMEs der Bereiche: [bridge](bridge/README.md), [web](bridge/web/README.md), [android](android/README.md)

## Lizenz

Demo-Projekt, aktuell ohne Lizenzdatei. „Highway to Hell“ ist hier nur als grobe Tonfolge des Refrains enthalten (`shared/chorus.json`).
