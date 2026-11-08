# disroop Playground – Konzept auf einer Seite

Status: **Richtung entschieden** (User, 2026-11-08). Details zum Handy: [`KONZEPT_HANDY_CONTROLLER.md`](KONZEPT_HANDY_CONTROLLER.md).

## Was es ist

Eine Spielebasis, auf der beliebige HTML-Spiele laufen. Gesteuert wird mit Tastatur, Handy, Thingy:52 oder dem eigenen Controller Motion One. Alles ist von KI-Agenten gebaut, von der Leiterplatte bis zum Spiel, und läuft in Docker und CI.

**Kernbotschaft:** *KI baut nicht nur Software. Sie kommt in der physischen Welt an.* Die Spiele sind der Köder, die durchgehende Kette Hardware → Firmware → Funk → Software → Spiel ist der Beweis.

## Für wen

| Publikum | Was es sieht | Einstieg |
|---|---|---|
| **IT-Firmen (Hauptpublikum, disroop-Kunden)** | Toolchain, Pipeline, Architektur, Agenten-Workflow, Embedded als «Wow» | Handy spielen → Thingy → Motion One → «so wurde es gebaut» |
| Vortrag (z. B. Lions) | KI-Stufen live: vom Chat bis zur Hardware | Alle im Saal fahren per Handy Skicross |
| Familie / Kinder | Einfach spielen, eigene Spiele mit KI erfinden | Spiele-Menü, Tastatur oder Handy |

Jeder findet sich auf seiner Stufe wieder. Breite Spielfreude vorne, technische Tiefe dahinter.

## Die Leiter

1. **Handy** – QR-Code scannen, sofort mitspielen, keine Hürde.
2. **Thingy:52** – echte Embedded-Sensorik über Bluetooth LE.
3. **Motion One** – eigenes Gerät, von Agenten entworfen (PCB, Firmware, Gehäuse).
4. **Hinter den Kulissen** – Agenten, Journal, CI, Docker: wie es entstanden ist.

## Architektur

Alle Eingabegeräte liefern dieselben Gesten (`tilt`, `swing`, `tuck`, `jump`, `button`). Die Spiele wissen nicht, woher sie kommen.

```
games/       tennis, ski, skicross, kids-*   (je game.json: Name, Gesten, Alter, Spielerzahl)
input/       Gesten-SDK + Adapter: keyboard, touch, phone, thingy, motion-one, sim
hardware/    thingy-bridge (Go), android, motion-one
relay/       Go-Relay für Handys und Mehrspieler (Docker)
pipeline/    devcontainer, CI, release
story/       Journal, Metriken, «wie es gebaut wurde»
```

## Was das fürs Umbauen heisst

Schrittweise und jeder Schritt einzeln lauffähig. Kein Big Bang.

1. **Input herauslösen:** `tennis/src/link.ts` und `core/motion.ts` werden zu `input/` (Gesten-SDK). Tastatur und Touch aus Tennis und Ski kommen als Adapter dazu.
2. **Spiele trennen:** `tennis/` wird zu `games/tennis/` und `games/ski/`, beide mit `game.json`. Die Startseite listet die Spiele aus den Manifesten.
3. **Handy-Adapter + Relay** (siehe Handy-Konzept), danach **Skicross** als erstes Mehrspieler-Spiel.
4. **Kinderspiele** als einfache `games/kids-*` aufnehmen, zuerst nur mit Tastatur oder Touch.
5. **Hardware ordnen:** `bridge/`, `android/` und `devices/motion-one/` kommen unter `hardware/`. Skripte, CI und Pages-Pfade werden nachgezogen.
6. **Repo umbenennen** in `disroop-playground` (GitHub leitet alte Links weiter).
7. **Story-Seite:** Landingpage mit animierter Übersicht (Leiter + Architektur).
