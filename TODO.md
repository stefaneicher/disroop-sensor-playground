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
- [ ] (Android/UI) Einen konstanten Header über alle Ansichten, am besten der Header der Sensordatenansicht, auch bei Tennis und Ski.
- [ ] (Ski) Auf dem Handy im Querformat verbessern: Anzeigen sind zu gross, man sieht nicht gut, wo der Skifahrer ist.
- [ ] (Tennis) Grafik deutlich verbessern, vor allem den Spieler mit dem Arm. Auch das Spielen auf dem Handy ist schwierig.
- [ ] (Tennis/Ski) Menü-Screens im Querformat auf dem Handy sind schlecht bedienbar, Auswahl verbessern.
- [ ] (Tennis/Ski) Kalibriermodus und Testmodus: zeigt live, wie die Bewegung des Geräts auf den Spieler wirkt.
- [ ] (Tennis/Ski) Bewegungsgrenzen: Dreht man das Gerät in einer Weise, die der Spieler (Mensch) nicht machen kann, gibt es Alarm oder Ton. So lernt man den möglichen Bewegungsradius.
- [ ] (Verbindung) Klären, ob die Verbindung bei jedem Wechsel zwischen Ansichten abbrechen und neu aufgebaut werden muss (heute trennt `TennisActivity.onStop`). Alternative: eine dauerhafte Verbindung (z. B. Service oder gemeinsamer Halter), die alle Ansichten nutzen.

### CI / Qualität (User, 2026-11-08)
- [x] (CI) Pfadbasierte Pipeline mit Sammel-Check `ci-ok` für bridge, web, tennis, android und firmware, 2026-11-08. **Noch nicht auf GitHub gelaufen**, erster Lauf prüfen.
- [x] (CI) Firmware-Job: baut das Image `docker/firmware/Dockerfile` und führt `firmware/smoke.sh` aus (Host-Tests, Pin-Check, Zephyr-Build), 2026-11-08.
- [ ] (CI) `ci-ok` als einzigen Required Check im Branch-Schutz eintragen (nach dem ersten grünen Lauf).
- [ ] (CI) Eigene Pipelines für Elektronik (ERC/DRC), Mechanik (CAD, Kollision) und Doku mit dem Tools-Image `disroop-motion-one-tools` (7.5 GB, nachts oder manuell).
- [ ] (CI) Entscheid: Pull-Request-Pflicht auf `main` statt direkter Pushes, und ob ein beratender KI-Review dazukommt.

### IEC-62304-Gedankenspiel „Klasse C“ (User, 2026-11-08), siehe `devices/motion-one/regulatory/`
- [x] (Doku) SRS, SAD, SDD, SOUP, Risiko, Rückverfolgbarkeit, Lückenanalyse, Skill-Vorschläge und HTML-Seite mit Code-Links aus dem Code erstellt, 2026-11-08. Entwurf, nicht freigegeben, Tests nicht ausgeführt.
- [ ] (Doku) OPEN-01: Zweckbestimmung bestätigen oder ersetzen (heute angenommen).
- [ ] (Doku) OPEN-02: Normen beschaffen (kostenpflichtig) und FDA-Leitfäden von Hand laden; `fda.gov` war aus der Sitzung nicht erreichbar.
- [ ] (Doku) Bedeutung von „SCD“ klären (gelesen als Detailentwurf).
- [ ] (CI) `python3 devices/motion-one/regulatory/build_site.py --check` in die CI aufnehmen (prüft Code-Links und Rückverfolgbarkeit).
- [ ] (Firmware) P1-Befunde aus `08_Luecken.md`: Watchdog und Fehlerzustand (GAP-05), Version und UDI (GAP-14), BLE-Sicherheit (GAP-13), ICM-Datenblattabgleich (GAP-12).
- [ ] (Firmware) Testbericht: README sagt 32/32, Code hat 69 Tests (GAP-20).
- [ ] (Skills) Skills und Agent-Profil aus `09_Skills.md` anlegen, falls gewünscht.
- [ ] (Prozess) `devices/motion-one/regulatory/10_Prozessanforderungen.md` mit dem User iterieren (MC/DC, GoogleTest/ZTest, Gherkin, Anforderungssprache), offene Fragen OPEN-10 bis OPEN-15. Nichts umsetzen, bevor entschieden ist.
- [ ] (Toolchain) Compiler-Matrix mit Warnungen als Fehler, Conan 2 und modernem CMake, siehe `IDEEN.md`.

### Motion One (siehe `devices/motion-one/management/RESUME.md`)
- [ ] (Elektronik/Mechanik/Firmware) Iteration abschliessen: Board an Mechanik-Handoff anpassen, CAD und Kollision neu prüfen, DTS-Pinmap aus `PINOUT_V1.json`.
- [ ] (Docs/Media) §11 Montage- und Benutzeranleitung, Renderings.
- [ ] (Sourcing) Angebote für PCBA und 3D-Druck beim selben Hersteller, J2 JST-SH C160402 nachführen.
- [ ] (Release) §12 Integrationsreview, §13 `releases/V1_BASELINE/`.

## Erledigt
