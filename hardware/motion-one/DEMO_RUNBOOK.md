# Disroop Motion One – Demo Runbook

## Status

Es gibt noch kein physisches Motion-One-Gerät. Platine und Gehäuse sind V1-Entwürfe; Bestellung, Druck, Flashen und
BLE-Verbindung mit Hardware sind NOT RUN. Dieses Runbook zeigt deshalb die vorhandene Software-Demo mit Simulator,
nicht die Motion-One-Hardware.

## Simulator-Demo Tennis/Ski

Voraussetzung: Docker läuft und das Repo ist ausgecheckt.

```sh
./project play --sim
```

Die Bridge startet mit simulierten Bewegungsdaten und öffnet Tennis im Browser. Über den Spielwahlschalter kann Ski
gestartet werden. Beenden mit `Ctrl+C`.

## Späterer Motion-One-Hardwaretest

Erst nach Fertigung, Sichtprüfung und ausdrücklicher Freigabe:

1. Firmware- und Boardrevision sowie SHA-256 notieren.
2. Akku und Platine gemäss Montageanleitung einsetzen; vor dem Schliessen Kurzschluss und Polarität kontrollieren.
3. Firmware gemäss `firmware/PROGRAMMING.md` programmieren. Nichts flashen, bevor die Freigabe erteilt ist.
4. USB-C-Laden, LED, Summer, Taster und Ruhestrom zuerst separat prüfen; Ladetemperatur beobachten.
5. BLE-Advertising „Thingy“, GATT-Services und Akkuwert gegen `docs/protocol.md` prüfen.
6. Mit Bridge verbinden und Tennis/Ski zunächst mit geringer Bewegung testen; dann 100-Hz-Spielmodus, Latenz und
   Verbindungsstabilität messen.
7. Messwerte und Abweichungen protokollieren. Funkreichweite, Laufzeit, Falltest und physische Ergonomie bleiben NOT RUN,
   bis sie tatsächlich gemessen wurden.

Bestellung/Bezahlung und Hardwaretests sind eigene Freigabeentscheidungen und werden durch dieses Runbook nicht autorisiert.
