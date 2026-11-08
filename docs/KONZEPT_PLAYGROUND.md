# disroop Playground – Konzept

Status: **Richtung entschieden** (User, 2026-11-08). Ordner-Umbau umgesetzt (Branch `umbau/playground-struktur`), Rest offen. Weitere Konzepte: [`KONZEPT_HANDY_CONTROLLER.md`](KONZEPT_HANDY_CONTROLLER.md), [`KONZEPT_LANDSCHAFT.md`](KONZEPT_LANDSCHAFT.md).

## Was es ist

**Eine Spielkonsole, die KI gebaut hat.** Auf ihr laufen beliebige HTML-Spiele. Gesteuert wird mit Tastatur, Handy, Thingy:52 oder dem eigenen Controller Motion One. Alles ist von KI-Agenten gebaut, von der Leiterplatte bis zum Spiel, und läuft in Docker und CI.

**Kernbotschaft:** *KI baut nicht nur Software. Sie kommt in der physischen Welt an.* Die Spiele sind der Köder, die durchgehende Kette Hardware → Firmware → Funk → Software → Spiel ist der Beweis.

## Für wen

| Publikum | Was es sieht | Einstieg |
|---|---|---|
| **IT-Firmen (Hauptpublikum, disroop-Kunden)** | Toolchain, Pipeline, Architektur, Agenten-Workflow, Embedded als «Wow» | Handy spielen → Thingy → Motion One → «so wurde es gebaut» |
| Vortrag (z. B. Lions) | KI-Stufen live: vom Chat bis zur Hardware | Alle im Saal fahren per Handy Skicross |
| Familie / Kinder | Einfach spielen, eigene Spiele mit KI erfinden | Spiele-Menü, Tastatur oder Handy |

Jeder findet sich auf seiner Stufe wieder. Breite Spielfreude vorne, technische Tiefe dahinter.

## Das Konsolen-Bild

| Konsole | Im Playground |
|---|---|
| Konsole (Gehäuse, Menü) | `console/`: Startseite, Spielauswahl, gemeinsamer Header |
| Spielkassetten | `games/*`: je ein Ordner mit `game.json` |
| Controller | `games/src/input/`: gemeinsame Eingabe mit Adaptern (heute Bridge/Android-App und Tastatur, später Handy, Motion One) |
| Zubehör / Hardware | `hardware/`: Thingy-Bridge, Android-App, Motion One |
| Online-Dienst | `relay/`: Handy-Controller und Mehrspieler |
| «Making-of» auf der Packung | `docs/story/`: wie KI-Agenten das gebaut haben |

## Die Leiter

1. **Handy** – QR-Code scannen, sofort mitspielen, keine Hürde.
2. **Thingy:52** – echte Embedded-Sensorik über Bluetooth LE.
3. **Motion One** – eigenes Gerät, von Agenten entworfen (PCB, Firmware, Gehäuse).
4. **Unter der Haube** – Agenten, Journal, CI, Docker: wie es entstanden ist.

## Zielstruktur

Alle Eingabegeräte liefern dieselben Gesten (`tilt`, `swing`, `tuck`, `jump`, `button`). Die Spiele wissen nicht, woher sie kommen.

```
console/     Startseite (Konsole), Spielauswahl
games/       Browser-Paket: src/input (Controller), src/tennis, src/ski, src/common; später skicross, kids-*
hardware/    thingy-bridge (Go), android, shared (Lied, Telemetrie-Beispiel), motion-one
relay/       Go-Relay für Handys und Mehrspieler (Docker)
docs/        Verträge, Anleitungen, Konzepte; docs/story/ = Making-of
.devcontainer/ .github/ scripts/ tasks/ project t   bleiben im Root (Werkzeuge erwarten das)
```

Hinweis zur Umsetzung: `input/` liegt in `games/src/input/` und nicht im Root, weil die Eingabe mit den Spielen in einem TypeScript-Build entsteht (kein Bundler). Ein Spiel pro Ordner mit `game.json` folgt, sobald es mehr als zwei Spiele gibt.

Ein eigener Ordner `pipeline/` ist nicht sinnvoll. Devcontainer, GitHub Actions und das CLI müssen im Root liegen. In der Präsentation heisst diese Ebene trotzdem «Entwicklung» (siehe Landschaft).

## Ordner: alt → neu

| Heute | Neu | Bemerkung |
|---|---|---|
| `index.html` (Landingpage) | `console/index.html` | Pages-Workflow anpassen |
| `tennis/src/link.ts`, `core/motion.ts`, `quat.ts`, `calibration.ts` | `input/` | Wird das Gesten-SDK, Tests ziehen mit |
| `tennis/static/header.*` | `console/` | Gemeinsamer Header aller Spiele |
| `tennis/` (ohne Ski) | `games/tennis/` | |
| `tennis/src/ski/`, `tennis/static/ski/` | `games/ski/` | Eigenes `package.json` oder gemeinsamer Build |
| `bridge/` | `hardware/thingy-bridge/` | Go-Modulpfad ändern (`…/bridge` → `…/hardware/thingy-bridge`) |
| `android/` | `hardware/android/` | `applicationId` bleibt (siehe unten) |
| `devices/motion-one/` | `hardware/motion-one/` | Rund 94 Dateien verweisen auf den Pfad, deshalb zuletzt |
| `shared/` | `hardware/thingy-bridge/shared/` | Lied und Telemetrie-Beispiel gehören zur Bridge |
| JOURNAL, PROGRESS, RESUME, GOAL | bleiben im Root | Historische Einträge nicht umschreiben |

**Umgesetzt** am 2026-11-08 ausser `game.json` und getrennten Spiel-Paketen: `games/src/{input,tennis,ski,common}`, `console/`, `hardware/{thingy-bridge,android,shared,motion-one}`. Die URLs bleiben (`/tennis/`, `/tennis/ski/` in Bridge und App). Auf GitHub Pages liegen die Spiele neu unter `/games/` und Motion One unter `/hardware/motion-one/`.

**Vorgehen:** Ein Schritt pro Commit, immer mit `git mv` (die Historie bleibt erhalten). Nach jedem Schritt laufen `./project <bereich> test` und die CI grün. Reihenfolge: `input/` → `games/` → `console/` → `hardware/thingy-bridge` und `hardware/android` → `relay/` neu → `hardware/motion-one` zuletzt.

## Repo umbenennen: `disroop-sensor-playground` → `disroop-playground`

Das ist schon einmal passiert (`disroop-thingy-arcade` → `disroop-sensor-playground`, 2026-11-07, siehe JOURNAL). Checkliste:

1. **Zuerst eine eigene Domain für Pages** (z. B. `play.disroop.ch`). GitHub leitet Repo-URLs nach einer Umbenennung weiter, **Pages-URLs aber nicht**. Mit eigener Domain bleiben QR-Codes, Folien und Links gültig.
2. **Umbenennung in GitHub** (Settings → Repository name). Danach die Remotes lokal nachziehen: `git remote set-url origin …`.
3. **Namen im Code ersetzen:** `project` (Image `…-dev`, Cache-Volume), `t`, `tasks/_lib.py` (APK-Name), `tasks/release.py`, `.devcontainer/` (Name, Volume), `bridge/go.mod` (Modulpfad), `README.md`, Landingpage-Footer, `THREADS.json`, `RESUME.md`.
4. **APK-Datei** heisst neu `disroop-playground-debug.apk`.
5. **Bewusst nicht ändern:** Die Android-`applicationId` `ch.disroop.sensorplayground` bleibt. Sonst müsste man die App neu installieren und den NFC-Tag neu schreiben, und Nutzer sehen das ohnehin nicht.
6. **Lokal:** WSL-Ordner umbenennen, Devcontainer-Image neu bauen (`./project image`).
7. **Historie:** JOURNAL und PROGRESS behalten den alten Namen, neuer JOURNAL-Eintrag zur Umbenennung.

## Präsentation

### Startseite (Landingpage) als Konsole

Aufbau von oben nach unten, wie eine Konsole, die man einschaltet:

1. **Einschalten (Hero):** «disroop Playground – die Spielkonsole, die KI gebaut hat.» Daneben gross der QR-Code: «Scannen und mitfahren.» Im Hintergrund läuft die Ski-Abfahrt als Attract-Loop.
2. **Spiele (Kassetten):** Kacheln aus den `game.json` – Tennis, Ski, Skicross, Kinderspiele. Pro Kachel stehen die möglichen Controller als Symbole.
3. **Controller (die Leiter):** Tastatur → Handy → Thingy:52 → Motion One. Kurz pro Stufe: was es ist und was es zeigt.
4. **Unter der Haube:** die animierte Systemlandschaft mit Entwicklung, Auslieferung, Geräte und Programme, Hardware. Die Ebenen bauen sich nacheinander auf, eine Bewegung läuft sichtbar vom Gerät bis ins Spiel.
5. **So wurde es gebaut:** Agenten-Rollen (Systems, Firmware, PCB, Mechanik, Docs), Zahlen aus `metrics.json`, Auszüge aus dem Journal.
6. **Für Firmen:** «Das können wir auch für euch» – Kontakt zu disroop.

### README

Die README folgt demselben Narrativ, nur kürzer und für Entwickler:

1. Ein Satz und ein Bild: Konsole, Spiele, Controller.
2. «In 1 Minute spielen»: Link zu Pages und QR-Code, ohne Installation.
3. Systemlandschaft als Mermaid-Diagramm (aus `KONZEPT_LANDSCHAFT.md`).
4. Ordnerstruktur (Konsolen-Bild).
5. Quickstart für Entwickler (Devcontainer, `./project`).
6. Links: Konzepte, Verträge (`docs/protocol.md`), Making-of.

Die heutige README (Thingy-zentriert, Sensorübersicht, NFC) wandert nach `hardware/thingy-bridge/README.md`.

## Reihenfolge der Umsetzung

1. Eigene Domain für Pages, dann das Repo umbenennen.
2. Ordner umbauen nach obiger Tabelle, Schritt für Schritt.
3. Neue README und Konsolen-Startseite mit animierter Landschaft.
4. Relay und Handy-Controller, dann Skicross (siehe Handy-Konzept).
5. Kinderspiele als `games/kids-*` aufnehmen.
