# Kinder-Spielplatz – Konzept

Status: **erste Version umgesetzt** (User, 2026-11-27). Teil des [disroop Playground](KONZEPT_PLAYGROUND.md): die Familienschiene der Konsole.

## Was es ist

Alle Three.js-Spiele, die mit den Kindern in Claude-Chats entstanden sind, liegen als «Kassetten» unter `games/kids-*`. Eine eigene Startseite `console/kinder/` zeigt sie kindgerecht an und führt ein **Zeitkonto**: Jedes Kind hat pro Woche ein festes Spielzeitbudget.

## Regeln des Zeitkontos

| Regel | Wert | Einstellbar |
|---|---|---|
| Budget | 30 Minuten pro Kind und Woche | ja, Standard und pro Kind |
| Woche | Samstag 00:00 bis Samstag 00:00 (Ortszeit) | im Code (`DEFAULTS`) |
| Was zählt | nur Zeit, in der ein Spiel sichtbar offen ist | – |
| Warnungen | bei 5 Minuten und 1 Minute Restzeit | – |
| Zeit vorbei | Spiel wird beendet, Hinweis auf den nächsten Samstag | – |
| Bonus | +10 Minuten für die laufende Woche | Eltern-Bereich |
| Lernspiele | zählen standardmässig mit | Eltern-Bereich |
| Eltern-Bereich | hinter einer 4-stelligen PIN (als SHA-256 gespeichert) | PIN ändern |

Die Logik steckt in `console/kinder/zeitkonto.js` (reine Funktionen, ohne DOM) und ist mit `node --test tests/kids-zeitkonto.test.mjs` geprüft.

## Grenzen der Web-Version (bewusst)

- Das Konto liegt im `localStorage` des Browsers auf **einem** Gerät. Zwei Tablets haben zwei Konten.
- Wer Browserdaten löscht oder ein Spiel direkt über `games/kids-*/index.html` öffnet, umgeht das Konto.
- Für Kinder von 5 bis 8 Jahren reicht das als erste Version. Verbindlich wird es erst in der Android-App.

## Android-App (nächster Schritt)

Eine App «Spielplatz», die die Startseite und alle Spiele offline in einer WebView zeigt:

- Spiele sind nur über die Startseite erreichbar, die Adresse ist nicht sichtbar.
- Das Zeitkonto wird nativ gespeichert (Kotlin, `SharedPreferences` oder DataStore), die Startseite liest und schreibt es über eine JavaScript-Bridge. Das gleiche Muster nutzt die bestehende App schon für Tennis und Ski (`ThingyNative`, `evaluateJavascript`).
- Optional Bildschirm fixieren (Android «App anpinnen»), damit die Kinder nicht aus der App wechseln.
- Später optional: Abgleich zwischen mehreren Geräten über das geplante Relay.

Offen ist, ob die Kinder-App Teil der bestehenden App (`ch.disroop.sensorplayground`) wird oder eine eigene App ist. Vorschlag: zuerst ein eigener Einstieg in der bestehenden App, damit der Build und die CI nicht verdoppelt werden.

## Ordnung im Repo

```
console/kinder/            Startseite mit Zeitkonto
  index.html               Profile → Spielauswahl → Spiel im Vollbild
  zeitkonto.js             Regeln des Zeitkontos (getestet)
  games.json               Katalog, erzeugt mit `node scripts/kids-catalog.mjs`
games/kids-<name>/         eine Kassette pro Spiel
  index.html               das Spiel (eine Datei, Three.js über CDN)
  game.json                Name, Kategorie, Alter, Eingaben, zählt zur Spielzeit
  README.md                Herkunft (Claude-Artifact), Stand
games/kids-flutlicht-kick/ZIELDESIGN.md   Zielbild für die Profi-Version (Godot, Android)
scripts/kids-catalog.mjs   erzeugt den Katalog
tests/kids-zeitkonto.test.mjs
```

Neues Spiel aufnehmen: Ordner `games/kids-<name>/` mit `index.html` und `game.json` anlegen, dann `node scripts/kids-catalog.mjs` ausführen.

## Verbindung zum Playground

- Die `game.json` folgt dem Kassetten-Gedanken aus dem Playground-Konzept. Das Feld `gestures` ist bei den Kinderspielen noch leer: Sie laufen mit Touch und Tastatur.
- Sobald das Gesten-SDK (`input/`) steht, kann man einzelne Kinderspiele mit dem Handy-Controller, dem Thingy:52 oder Motion One steuern, z. B. die Dorf-Rallye per Neigen.
- Für den Vortrag und die Familie ist die Kinder-Startseite eine eigene Kachel auf der Konsole.

## Datenschutz

Das Repo ist öffentlich. Echte Vornamen der Kinder, kleine Ortschaften, Adressen und Vereinsnamen kommen nicht in die Spiele: Sie sind durch erfundene ersetzt (z. B. Timo statt des echten Namens, Dorf-Rallye mit erfundenen Weilern, FC Bergsee). Neue Spiele vor dem Commit darauf prüfen.

## Nicht auf Pages

Die Kinderspiele werden absichtlich noch nicht über GitHub Pages veröffentlicht. Wenn sie per Adresse auf dem Tablet laufen sollen, muss der Pages-Workflow `console/kinder` und `games/kids-*` mitkopieren.
