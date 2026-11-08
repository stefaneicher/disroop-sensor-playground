# Konzept: Handy als Controller per QR-Code

Status: **Konzept, entschieden als Richtung** (User, 2026-11-08). Aufgaben stehen in [`TODO.md`](../TODO.md) unter «Handy-Controller».

## Idee

Besucher an einem Stand oder Vortrag scannen einen QR-Code auf dem grossen Bildschirm. Ihr Handy wird dann per Gyro und Beschleunigungssensor zum Controller für Ski oder Tennis, ohne App und ohne Hardware.

Warum das wichtig ist:
- **Niedrige Hürde:** Jeder hat einen Controller in der Tasche. Es gibt keinen Engpass mehr, nur weil ein einziger Thingy nur eine BLE-Verbindung annimmt.
- **Showcase-Leiter:** Erst das Handy, dann der Thingy:52 («echte Embedded-Sensorik»), dann Motion One («unser eigenes Gerät, von KI-Agenten entwickelt»). Alle drei liefern dieselben Bewegungsdaten an dieselben Spiele.
- **Story:** Die Spiele merken nicht, woher die Bewegung kommt. Genau diese Abstraktion ist die Embedded- und Architekturbotschaft.

## Ablauf

```
 Grosser Bildschirm (Spiel)                Handy des Besuchers
 ┌──────────────────────────┐              ┌──────────────────────┐
 │  Ski / Tennis            │   QR-Code    │ /pad?room=K7Q2       │
 │  [QR]  Raum K7Q2         │ ───────────▶ │ «Tippen zum Starten» │
 │  Rangliste               │              │ Sensor-Freigabe      │
 └────────────▲─────────────┘              └──────────┬───────────┘
              │ WebSocket (wss)                       │ MotionFrame 60 Hz
              └────────────── Relay (Raum K7Q2) ◀─────┘
```

1. Das Spiel auf dem Bildschirm öffnet einen Raum beim Relay und zeigt den QR-Code mit `…/pad?room=K7Q2` und dem Code als Text.
2. Das Handy öffnet die Pad-Seite. Ein Tipp holt die Sensor-Freigabe (iOS verlangt `DeviceMotionEvent.requestPermission()` nach einer Benutzergeste) und sperrt das Querformat.
3. Das Handy schickt Frames im bestehenden `MotionFrame`-Format (siehe `tennis/src/core/motion.ts`, `docs/protocol.md`).
4. Der Bildschirm bekommt die Frames über dieselbe `MotionLink`-Schnittstelle wie vom Thingy, nur mit der neuen Quelle `phone`.

## Technik

**Sensor → MotionFrame (auf dem Handy)**
- `q`: aus `deviceorientation` (alpha/beta/gamma) in eine Quaternion umrechnen, plus Bildschirmdrehung (`screen.orientation.angle`).
- `gyro`: `devicemotion.rotationRate` (°/s), Achsen auf das Thingy-Koordinatensystem abbilden.
- `accel`: `accelerationIncludingGravity` in m/s², geteilt durch 9.81 ergibt g.
- `button`: Finger auf dem Display, die ganze Fläche ist ein grosser Knopf. Optional `tap` per Doppeltipp.
- Rate: etwa 60 Hz, gedrosselt mit `requestAnimationFrame`. Das reicht für Ski. Für Tennis ist es zu prüfen (Thingy läuft im Spiel mit 100 Hz).
- Haptik: `navigator.vibrate()` als Treffer-Feedback (Gegenstück zu `/api/beep`, iOS hat das nicht).

**Transport**
- Sensoren im Browser gibt es nur über **HTTPS**. Die Bridge auf `127.0.0.1` ist vom Handy aus nicht erreichbar.
- **Phase 1 (empfohlen):** Die Spiele laufen auf GitHub Pages (HTTPS gibt es schon über `pages.yml`). Dazu kommt ein kleines **Relay in Go** (Docker-Image, kann `motion.Hub` aus der Bridge wiederverwenden), gehostet mit `wss://`. Der Raum-Code steht im Pfad, das Relay verteilt die Frames vom Pad an den Bildschirm.
- **Offline-Variante für Messen ohne gutes WLAN:** Die Bridge lauscht im LAN mit TLS, z. B. ein eigener Router mit fester Domain und Zertifikat. Ein Self-Signed-Zertifikat ist auf iOS mühsam.
- **Später (optional):** WebRTC-DataChannel Peer-to-Peer, das Relay macht dann nur noch Signaling. Das bringt weniger Latenz, ist aber komplexer.
- Ziel-Latenz Handy → Bildschirm: unter 50 ms im selben Netz. Zu messen ist sie mit Zeitstempel `t` und einem Ping.

**Spiele**
- `MotionLink` bekommt die Quelle `phone` (neben `ble` und `sim`) und einen Relay-Modus. An der Spiellogik ändert sich nichts.
- Der Kalibrier-Wizard und die Bewegungsgrenzen gelten auch fürs Handy, eventuell mit eigenem Profil, weil man das Handy anders hält als den Thingy.
- Das Header-Badge zeigt die Quelle: «Handy», «Thingy», «Motion One».

## Stand-Modus

- **Attract-Loop:** Ohne Spieler läuft eine Demo-Abfahrt (Simulator) mit grossem QR-Code.
- **Rangliste:** Ski-Zeiten mit Spitzname (frei gewählt, keine Personendaten), Tages-Reset.
- **Mehrspieler:** zwei Handys = Tennis 1:1. Bei Ski fährt nacheinander, wer in der Warteschlange ist.
- **Zweiter Bildschirm (optional):** CI-Pipeline, Agenten-Journal und «so wurde das gebaut».
- **Upgrade-Moment:** Neben dem Bildschirm liegen Thingy und Motion One. «Jetzt mit echter Embedded-Sensorik probieren.»

## Datenschutz und Robustheit

- Keine Konten, keine Cookies ausser dem Raum. Raum-Codes laufen nach 30 Minuten ohne Aktivität ab.
- Pro Raum genau ein Bildschirm und eine feste Zahl Pads. Neue Pads werfen alte nur auf Wunsch raus.
- Wenn der Sensor fehlt (Desktop, Freigabe abgelehnt), zeigt das Pad Touch-Steuerung als Fallback.

## Offene Fragen

- Hosting des Relays: Fly.io, Cloud Run oder ein eigener Server? Was kostet es, und läuft es im disroop-Umfeld?
- Reichen 60 Hz und die Handy-Sensorfusion für einen Tennis-Schwung, oder bleibt Tennis Thingy-exklusiv?
- Halten Besucher das Handy hoch oder quer? Das entscheidet das Achsen-Mapping.
- Wird Motion One später auch direkt per Web Bluetooth am Handy angebunden (Android Chrome)?
