# Flutlicht-Kick – Zieldesign v2

Stand: 28.11.2026 · Status: Spielgefühl und Präsentation in der Three.js-Version umgesetzt; Godot-Prototyp (Phase 0) offen

**Umgesetzt in `index.html` (Three.js, 28.11.2026):** Kleinfeld 68 × 44 m, 7 gegen 7 (2-3-1), automatischer Spielerwechsel (Timo #10 als Star), Pass/Schuss bzw. Grätsche/Wechsel je nach Situation, drei Hilfe-Stufen und drei erfundene Gegner, Formation, Pressing, Decken, Laufwege, Torhüter mit Hechten, Fangen und Fausten, Einwurf, Ecke, Abstoss, Anstoss, Halbzeit, Einlauf, TV-Kamera, Tor-Wiederholung in Zeitlupe, Jubel, Konfetti, Feuerwerk, Netz-Wölbung, Flutlicht-Glow, Radar, Pause, erzeugter Sound. Realistische Figuren (Mixamo) und Saison-Modus fehlen noch.

## 1. Ziel in einem Satz

Ein Fussballspiel für Android-Tablets im Stil von «FIFA light»: realistische Spieler und TV-Optik in einem Stadion am Bergsee, aber so einfach zu bedienen, dass ein geübter 8-Jähriger sofort loslegen kann.

## 2. Leitplanken

- **Realistisch, aber ehrlich:** Wir erreichen nicht das Niveau von FIFA. Dort stecken Motion-Capture-Studios, Künstlerteams und Kommentatoren dahinter. Wir erreichen «sieht echt aus und fühlt sich flüssig an». Wenn der realistische Stil im Test ruckelig oder seltsam wirkt, wechseln wir auf einen stilisierten Look (siehe Abschnitt 9).
- **Wenig, dafür gut:** keine Menü-Labyrinthe, keine Kamera-Auswahl, kein Abseits, keine Karten.
- **Tablet zuerst:** Querformat, Steuerung mit dem Daumen, flüssig mit 60 Bildern pro Sekunde auf einem Mittelklasse-Tablet.
- **Offline**, ohne Werbung und ohne In-App-Käufe.

## 3. Technik

| Thema | Entscheid | Begründung |
|---|---|---|
| Engine | **Godot 4** (Mobile-Renderer) | Gratis, keine Lizenzkosten, Szenen und Skripte als Textdateien, damit kann Claude Code gut arbeiten. Android-Export eingebaut. |
| Alternative | Unity | Grösserer Asset Store mit fertigen Fussball-Paketen, aber Editor-lastig und schlechter für Arbeit per KI. Nur wählen, wenn ein bestimmtes Asset-Paket den Ausschlag gibt. |
| Sprache | GDScript | Einfach, schnell zu iterieren |
| Figuren und Bewegungen | Mixamo (Adobe) | Realistische Figuren und Motion-Capture-Animationen. Lizenz vor Phase 1 prüfen und hier festhalten. |
| Stadion | Selbst modelliert (Blender oder direkt in Godot) | Erfundenes Stadion am See, dahinter Berge |
| Sound | Eigene Aufnahmen und lizenzfreie Samples (CC0) | Mit Code erzeugte Sounds klingen künstlich |
| Speicherstand | Godot `user://` | Saison-Fortschritt bleibt erhalten |

## 4. Spielfeld und Mannschaften

- **Kleinfeld etwa 68 × 45 m, 7 gegen 7** (Vorschlag). Ein grosses Feld mit wenigen Spielern wirkt leer und zäh.
- Standardsituationen werden richtig ausgeführt: Einwurf, Ecke, Abstoss, Anstoss. Spieler laufen hin, nichts wird hingebeamt.
- Keine Fouls, kein Abseits. Optional später: Elfmeter bei klarem Foul im Strafraum.
- Spieldauer: 2 × 3 Minuten mit Pause.

## 5. Steuerung

- **Links:** fester runder Joystick. Ganz ausgeschlagen = Sprint.
- **Rechts: zwei grosse Knöpfe**, die je nach Situation ihre Funktion ändern:

| Situation | Knopf A | Knopf B |
|---|---|---|
| Wir haben den Ball | Pass (zum Mitspieler in Laufrichtung) | Schuss (halten = mehr Kraft) |
| Gegner hat den Ball | Grätsche / Pressing | Spielerwechsel |

- **Spielerwechsel:** In der Abwehr wechselt die Steuerung automatisch zum Spieler, der dem Ball am nächsten ist. Timo (#10) bleibt der Star: Er ist etwas schneller und hat einen Spezialschuss.
- **Hilfe in drei Stufen** (die einzige Einstellung): Junior (starke Ziel- und Passhilfe), Profi, Legende.
- Klare Hinweise: Ring unter dem gesteuerten Spieler, Pfeil zum Ball, Markierung beim Gegner mit dem Ball, Kraftanzeige beim Schuss.

## 6. Verhalten der Spieler (KI)

- Die Mannschaft hält eine Formation (z. B. 2-3-1 plus Goalie), die mit dem Ball mitschiebt.
- Angriff: freilaufen, Doppelpass, Flanke, Schuss nach Lage.
- Abwehr: Ein Spieler presst, die anderen decken Passwege und Gegner.
- Goalies: Position zum Ball, hechten, fausten, rauslaufen bei Steilpässen.
- Gegnerteams unterscheiden sich in Tempo, Technik und Härte. Die Stärke passt zur gewählten Hilfe-Stufe.

## 7. Grafik und Präsentation

- Realistische Spieler mit Motion-Capture-Animationen und weichen Übergängen (Godot AnimationTree): laufen, sprinten, Ballannahme, Pass, Schuss, Grätsche, Jubel.
- TV-Kamera, die automatisch dem Spiel folgt. Keine Kamera-Auswahl.
- **Einlauf** vor dem Spiel mit Kameraflug übers Stadion.
- **Tor-Wiederholung** in Zeitlupe aus einem zweiten Winkel.
- Flutlicht mit Glow-Effekt, Rasen mit Mähmuster, Tornetz bewegt sich, Leuchtschweif bei harten Schüssen.
- Fans mit Schals und Fahnen, Pyro und Konfetti bei Bergsee-Toren.
- Anzeigetafel im Stadion zeigt Resultat und Torschützen.
- Grafikqualität passt sich automatisch dem Gerät an.

## 8. Spielmodi

1. **Schnelles Spiel:** Gegner wählen und sofort los.
2. **Saison:** 6 Spiele mit Tabelle, am Schluss Cupfinal in der Bergsee-Arena.
3. **Elfmeterschiessen**

Dazu ein kurzes Training beim ersten Start (etwa 60 Sekunden), das Joystick, Pass, Schuss und Grätsche erklärt.

## 9. Sound

- Stadion-Hintergrund, Jubel, Pfiff, Schussgeräusch, Netz, Pfosten.
- Familien-Aufnahmen: «Tooor!», «Hopp Bergsee!», Klatschen, Namen der Spieler.
- Kein Computer-Kommentator, weil das blechern klingt.

## 10. Phasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0 – Prototyp-Test** (ein Wochenende) | Godot-Projekt, ein Mixamo-Spieler mit Laufen und Schuss, Ball mit Physik, Tor, Feld, Joystick, Android-Build aufs Tablet | Entscheid: realistischer oder stilisierter Look |
| 1 – Spielgefühl | 7 gegen 7, Steuerung, Spielerwechsel, KI, Standardsituationen, Kamera | Ein ganzes Spiel ist spielbar und macht Spass |
| 2 – Look und Effekte | Stadion, Licht, Einlauf, Tor-Wiederholung, Jubel, Menüs | Wirkt wie ein bezahltes Spiel |
| 3 – Inhalt | Saison, Elfmeterschiessen, Training, Sounds, Speicherstand | Fertige App |
| 4 – Veröffentlichung (optional) | Play-Store-Konto, geschlossener Test | Siehe Abschnitt 12 |

**Erfolgskriterium Phase 0:** Der Sohn spielt 10 Minuten ohne Erklärung und will weiterspielen. Der Spieler läuft, dreht und schiesst ohne sichtbares Ruckeln.

**Rückfall-Variante:** Stilisierte Figuren im Spielzeug-Look. Steuerung, KI und Spielmodi bleiben gleich, nur die Figuren ändern sich.

## 11. Offene Entscheidungen

| # | Frage | Vorschlag |
|---|---|---|
| 1 | Nur Timo steuern oder automatischer Spielerwechsel in der Abwehr? | Automatischer Wechsel, Timo als Star |
| 2 | 5 gegen 5 oder 7 gegen 7? | 7 gegen 7 |
| 3 | Echte Gegner (YB, FC Basel …) oder erfundene Teams? | Erfunden. Echte Vereinsnamen und Logos sind Markenrechte, heikel, sobald die App weitergegeben wird. |
| 4 | Sounds selbst aufnehmen? | Ja, als Familienprojekt |
| 5 | Godot oder Unity? | Godot, ausser ein bestimmtes Unity-Fussballpaket überzeugt im Test |
| 6 | Play Store oder nur Installation aufs eigene Tablet? | Zuerst nur aufs eigene Tablet |

## 12. Android und Play Store

- Für die Familie: APK direkt aufs Tablet installieren, ohne Play Store.
- Play Store: Die Registrierung kostet einmalig 25 US-Dollar. Ein neues privates Konto braucht vor der Veröffentlichung einen geschlossenen Test mit mindestens 12 Testern über 14 Tage. Konten für Organisationen sind davon ausgenommen, brauchen aber eine Firmenprüfung (D-U-N-S-Nummer).
- Hochformat sperren, nur Querformat. Vibration bei Schuss und Tor.

## 13. Referenz

`index.html` in diesem Ordner ist der bisherige Three.js-Prototyp. Daraus übernehmen wir die Spielregeln, die Stadion-Idee, den Joystick, die Grätsche und die Hinweise. Der Code wird nicht übernommen.
