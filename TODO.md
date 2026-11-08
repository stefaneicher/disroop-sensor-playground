# To-do

Konkrete, offene Aufgaben für das ganze Repo. Ideen ohne Entscheid stehen in [`IDEEN.md`](IDEEN.md).

**Regeln**
- Neue Aufgabe: unten eintragen (`- [ ]`, Bereich in Klammern, kurzer Satz).
- Erledigt: `- [x]` setzen und das Datum anhängen, Details gehören in `JOURNAL.md`.
- Der Detailstand je Teilprojekt steht in dessen `RESUME.md`. Hier nur das, was man nicht verlieren darf.

## Offen

### Thingy / Spiele (siehe `RESUME.md`)
- [ ] (Dashboard) Ausrichtung prüfen: Heading und Pitch-Vorzeichen, dann Würfel, LED-Position und 3D-Modell korrigieren.
- [ ] (NFC) Tag neu schreiben (`thingy.exe nfc`) und prüfen, dass der Tap die App öffnet.
- [ ] (Tennis/Ski) Mit echten Bewegungen live testen, Schwellen nachjustieren.
- [ ] (Release) Optional Release-Tag mit exe und apk.

### Android-App: WebViews, Spiele, Verbindung (User, 2026-11-08)
Status aller Punkte: **offen**.
- [ ] (Android/Architektur) Die ganze App mit HTML-WebViews bauen, auch die Sensordatenansicht (heute nativ mit Compose). BLE bleibt nativ in Kotlin, das HTML bekommt die Daten wie bei Tennis und Ski per `evaluateJavascript` und `ThingyNative`.
- [ ] (Android/UI, teilweise 2026-11-08: header.js/css in Tennis+Ski eingebunden, Sensorseite noch Compose, ungetestet) Einen konstanten Header über alle Ansichten, am besten der Header der Sensordatenansicht, auch bei Tennis und Ski.
- [x] (Ski, 2026-11-08, Layout per Screenshot 844x390 geprüft, nicht auf echtem Handy) Auf dem Handy im Querformat verbessern: Anzeigen sind zu gross, man sieht nicht gut, wo der Skifahrer ist.
- [ ] (Tennis) Grafik deutlich verbessern, vor allem den Spieler mit dem Arm. Auch das Spielen auf dem Handy ist schwierig. — Teilweise 2026-11-08: Touch-Bedienung (Aussenfünftel = laufen, Mitte = Schlag), grössere Touch-Ziele. Grafik/Arm NICHT verbessert; nicht im Browser getestet.
- [~] (Ski erledigt 2026-11-08, per Screenshot; Tennis offen) (Tennis/Ski) Menü-Screens im Querformat auf dem Handy sind schlecht bedienbar, Auswahl verbessern.
- [~] (Ski erledigt 2026-11-08, ohne Gerät nicht live geprüft; Tennis offen) (Tennis/Ski) Kalibriermodus und Testmodus: zeigt live, wie die Bewegung des Geräts auf den Spieler wirkt.
- [~] (Ski erledigt 2026-11-08, Alarm/Ton nur per Unit-Test, nicht mit echtem Gerät; Tennis offen) (Tennis/Ski) Bewegungsgrenzen: Dreht man das Gerät in einer Weise, die der Spieler (Mensch) nicht machen kann, gibt es Alarm oder Ton. So lernt man den möglichen Bewegungsradius.
- [ ] (Verbindung, teilweise 2026-11-08: ConnectionHub, alle Ansichten migriert, ungebaut/ungetestet) Klären, ob die Verbindung bei jedem Wechsel zwischen Ansichten abbrechen und neu aufgebaut werden muss (heute trennt `TennisActivity.onStop`). Alternative: eine dauerhafte Verbindung (z. B. Service oder gemeinsamer Halter), die alle Ansichten nutzen.

### Handy-Controller per QR-Code (User, 2026-11-08, Konzept: [`docs/KONZEPT_HANDY_CONTROLLER.md`](docs/KONZEPT_HANDY_CONTROLLER.md))
Status aller Punkte: **offen**.
- [ ] (Pad) Pad-Seite `/pad`: Sensor-Freigabe per Tipp (iOS), Querformat, `deviceorientation`/`devicemotion` → `MotionFrame`, Touch = Taster, Vibration als Feedback.
- [ ] (Relay) Kleines Go-Relay im Docker-Image: Räume mit Code, wss, Pad → Bildschirm, Ablauf nach Inaktivität, Tests mit Fake-Pads.
- [ ] (Spiele) `MotionLink` um Quelle `phone` und Relay-Modus erweitern, Header-Badge «Handy».
- [ ] (Spiele) QR-Code und Raum-Code im Menü von Ski und Tennis anzeigen.
- [ ] (Ski) Achsen-Mapping und Kalibrierprofil fürs Handy, live mit iPhone und Android testen.
- [ ] (Tennis) Prüfen, ob 60 Hz vom Handy für den Schwung reichen.
- [ ] (Latenz) Latenz Handy → Bildschirm messen und anzeigen, Ziel unter 50 ms.
- [ ] (Stand) Stand-Modus: Attract-Loop mit grossem QR, Ski-Rangliste mit Spitznamen, Tennis 1:1 mit zwei Handys.
- [ ] (Skicross) Mehrspieler-Skicross bis 20 Handys: Lobby, Simulation auf dem Bildschirm, Strecke, Rangliste, optional Turnier.
- [ ] (Umbau) Eigene Domain für Pages, dann Repo in `disroop-playground` umbenennen (Checkliste in `docs/KONZEPT_PLAYGROUND.md`).
- [ ] (Umbau) Ordner schrittweise umbauen (Tabelle alt → neu in `docs/KONZEPT_PLAYGROUND.md`).
- [ ] (Präsentation) Neue README und Konsolen-Startseite nach `docs/KONZEPT_PLAYGROUND.md`.
- [ ] (Story) Animierte Übersichtszeichnung (Leiter + Architektur) für die Landingpage.
- [ ] (Hosting) Relay-Hosting entscheiden (offene Frage im Konzept), Deployment in CI.

### Motion One (siehe `devices/motion-one/management/RESUME.md`)
- [ ] (Elektronik/Mechanik/Firmware) Iteration abschliessen: Board an Mechanik-Handoff anpassen, CAD und Kollision neu prüfen, DTS-Pinmap aus `PINOUT_V1.json`.
- [ ] (Docs/Media) §11 Montage- und Benutzeranleitung, Renderings.
- [ ] (Sourcing) Angebote für PCBA und 3D-Druck beim selben Hersteller, J2 JST-SH C160402 nachführen.
- [ ] (Release) §12 Integrationsreview, §13 `releases/V1_BASELINE/`.

## Erledigt
