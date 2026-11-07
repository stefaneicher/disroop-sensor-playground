# Troubleshooting

## Thingy wird nicht gefunden

**Meldung:** „Thingy nicht gefunden – Taste drücken oder schütteln, um es zu wecken“

- **Er schläft:** Nach einigen Minuten ohne Verbindung hört der Thingy auf zu senden. **Knopf drücken** oder schütteln. `thingy.exe` sucht weiter und verbindet sich dann von selbst.
- **Akku leer:** Thingy per USB laden. Der Akku-Wert steht im Terminal und im Dashboard.
- **Prüfen:** `./project bridge scan --timeout 20s` listet alle Thingys mit RSSI. Hast du mehrere, wähle einen mit `--addr E3:58:08:1B:53:5F`.

## Lädt der Thingy?

Die Firmware meldet über Bluetooth nur den Akkustand in %, nicht ob ein USB-Kabel steckt.
Terminal und App **schätzen** den Trend aus dem Verlauf: „↑ lädt“, „↓ Akkubetrieb“ oder „?“ bzw. „Ladezustand unbekannt“.

- **Direkt nach dem Verbinden steht „?“:** Die Schätzung braucht mindestens 2 Minuten Daten und eine Änderung um 1 Prozentpunkt.
- **Bei 100 % bleibt „lädt“ stehen:** „Voll“ ist nicht vom Laden zu unterscheiden. Die Anzeige behält den letzten Trend, bis der Wert sinkt.
- Details zur Regel: [protocol.md, „Akku-Trend“](protocol.md#akku-trend-lädt--akkubetrieb--heuristik).

## Nur eine BLE-Verbindung

Der Thingy akzeptiert **eine** Verbindung gleichzeitig. Ist schon etwas verbunden, sendet er kein Advertising mehr, und `thingy.exe` findet ihn nicht. Mögliche Verbindungen:
- Nordic-App „nRF Thingy“ oder „nRF Connect“ auf einem Handy
- unsere Android-App im Vordergrund (im Hintergrund trennt sie selbst)
- eine zweite laufende `thingy.exe`, z. B. `run` und `nfc` gleichzeitig

Abhilfe: Die andere Verbindung trennen bzw. die App schliessen, dann neu starten.

## WSL hat kein Bluetooth

WSL2 hat keinen Zugriff auf den Bluetooth-Adapter. Deshalb ist `thingy.exe` ein **Windows-Programm**, das über WSL-Interop startet (`./project bridge run`).
- `build/thingy-linux` kann **nur** `--sim`. Ohne `--sim` meldet es „Bluetooth wird nur unter Windows unterstützt (--sim verwenden)“.
- Startet die exe gar nicht („Exec format error“), ist die WSL-Interop deaktiviert. Prüfe in `/etc/wsl.conf` den Abschnitt `[interop]` mit `enabled=true` und führe danach `wsl.exe --shutdown` aus.
- Alternativ startest du die exe direkt in PowerShell: `.\build\thingy.exe`

## Dashboard aus WSL nicht erreichbar

`thingy.exe` lauscht auf `127.0.0.1:8052` **von Windows**. Im WSL2-Standard-Netzwerk (NAT) ist `localhost` in WSL ein anderer Host. Deshalb:
- Browser unter Windows: http://localhost:8052
- aus WSL: `curl.exe http://localhost:8052/healthz` (Windows-curl). `curl` aus Linux erreicht den Port nicht.
- „HTTP-Port: … address already in use“: Eine andere `thingy.exe` läuft schon. Beende sie mit `Strg+C` bzw. im Task-Manager oder nimm `--port 8060`.

Der Mock-Server (`./project web serve`) läuft dagegen im Container und ist unter Windows auf http://localhost:8053 erreichbar.

## Docker-Daemon hängt oder ist gestoppt

Typische Meldungen sind „Cannot connect to the Docker daemon“ oder Container, die hängen bleiben. Neustart aus WSL oder Windows:

```bash
wsl.exe -d Ubuntu -u root -- systemctl restart docker
```

Danach den `./project`-Befehl wiederholen. Fehlt das Image, baut `./project` es neu. Bauen von Grund auf: `./project image`.

## Windows-Bluetooth-Cache

Windows merkt sich GATT-Daten. Nach Firmware-Änderungen am Thingy oder bei seltsamen Fehlern (Abo schlägt fehl, Verbindung bricht sofort ab):
1. Unter *Einstellungen → Bluetooth und Geräte* den Thingy entfernen, falls er gekoppelt ist. Die Bridge braucht keine Kopplung.
2. Bluetooth aus- und wieder einschalten.
3. Thingy neu starten: Schalter am Gerät aus und ein, bzw. USB ab und an.

## Dashboard lädt nicht oder ist leer

- **MIME-Typen:** Unter Windows ordnet die Registry `.js` manchmal `text/plain` zu. Dann lädt der Browser die ES-Module nicht. Die Bridge setzt deshalb die Content-Types für `.js`, `.css`, `.html` und weitere explizit (`internal/server/server.go`, `staticTypes`). Tritt der Fehler trotzdem auf, prüfst du ihn mit `curl.exe -sI http://localhost:8052/js/app.js`. Erwartet ist `text/javascript`.
- **„Daten veraltet“:** 3 s lang kam kein Wert. Meist ist die Verbindung zum Thingy weg. Das Terminal bzw. die Protokoll-Karte zeigt den Grund. Die Bridge verbindet sich nach 3 s neu, das Dashboard baut SSE selbst wieder auf.
- **Browser-Cache:** Nach einem Update `Strg+F5`.

## Lied oder LED reagieren nicht

- `POST /api/led` antwortet `503`: Es ist kein Thingy verbunden.
- Lautstärke 0 im Dashboard-Regler oder `--volume 0` ist stumm.
- Der Lautsprecher ist leise. Im Frequenz-Modus ist das bei der Werksfirmware normal.

## NFC

- **`nfc` schlägt fehl:** Die App und `thingy.exe` müssen getrennt sein, weil nur eine Verbindung erlaubt ist. Der Thingy muss wach sein.
- **Backup:** `build/nfc-backup.hex` wird nur beim **ersten** `nfc` geschrieben und danach nie überschrieben. `--restore` schreibt es zurück. Liegt keines vor, meldet die exe „NFC-Backup lesen: …“.
- **App öffnet sich nicht beim Antippen:**
  - NFC am Handy einschalten, Bildschirm entsperren.
  - Die NFC-Antenne sitzt meist in der Mitte der Handy-Rückseite. Halte sie an die Oberseite des Thingy.
  - Die App muss installiert sein. Sonst führt der AAR in den Play Store, wo es die App nicht gibt.
  - Prüfen, ob der Tag umgeschrieben ist: Mit „NFC Tools“ o. ä. lesen, erwartet ist der Record `android.com:pkg` → `ch.disroop.sensorplayground`.

## Android-App

- **„Berechtigung erteilen“:** Ab Android 12 braucht die App „Geräte in der Nähe“ (`BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT`), unter Android 8–11 „Standort“. Der Knopf öffnet die App-Einstellungen.
- **„Bluetooth einschalten“:** Bluetooth ist aus. Der Knopf fordert das Einschalten an.
- **Kein Thingy:** Er schläft (Knopf drücken), oder `thingy.exe` bzw. eine andere App ist verbunden.
- **Installation scheitert** mit „App nicht installiert“ oder Signaturkonflikt: Alte Version deinstallieren, dann `adb install -r build\disroop-sensor-playground-debug.apk`. Alle Builds nutzen denselben Demo-Schlüssel.
- **Ohne Bluetooth LE** (Emulator) startet die App automatisch im Simulator.
