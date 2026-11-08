Python 3.12.3

## 1. Messbereich aus menschlichen Winkelgeschwindigkeiten

| Bewegung | Spitze °/s | Beleg | Thingy-Raw ±1024 °/s | ±2000 °/s | ±4000 °/s |
| --- | --- | --- | --- | --- | --- |
| Handgelenk-Flexion Aufschlag, Weltklasse (Mittel) | 1950 | Q-FLEISIG | UEBERSTEUERT | ok | ok |
| Schulter-Innenrotation Aufschlag, Maenner (Mittel) | 2420 | Q-FLEISIG | UEBERSTEUERT | UEBERSTEUERT | ok |
| Oberarm |omega| 1. Aufschlag, Profis (Mittel) | 3207 | Q-TRIGT | UEBERSTEUERT | UEBERSTEUERT | ok |
| Oberarm |omega| 1. Aufschlag, Mittel + 1 SD | 4014 | Q-TRIGT | UEBERSTEUERT | UEBERSTEUERT | UEBERSTEUERT |
| Spiel: Schlagschwelle | 350 | Q-TENNIS:36 | ok | ok | ok |
| Spiel: Ende Tempo-Skala | 1200 | Q-TENNIS:37 | UEBERSTEUERT | ok | ok |

Reserve ±4000 °/s gegenueber Handgelenk-Spitze 1950 °/s: Faktor 2.05; gegenueber Oberarm-Mittel 3207 °/s: Faktor 1.25. Profi-Spitzen (Mittel+1 SD) koennen ±4000 °/s ueberschreiten -> Saettigungsflag im erweiterten Kanal.

## 2. Beschleunigung (Abschaetzung a = omega^2 * r)

| Fall | omega °/s | r m (A) | a g |
| --- | --- | --- | --- |
| Handgelenk-Flexion, Geraet 8 cm vor Handgelenk | 1950 | 0.08 | 9.4 |
| Schulter-Innenrotation, Hand 0,10 m neben Oberarmachse | 2420 | 0.1 | 18.2 |
| Schulter-Innenrotation, Hand 0,30 m (Ellbogen gebeugt) | 2420 | 0.3 | 54.6 |
| Spiel-Schwung 1200 °/s, r 0,6 m (gestreckter Arm) | 1200 | 0.6 | 26.8 |

Folgerung: ±16 g wird bei schnellen Schlaegen rechnerisch erreicht bzw. ueberschritten; ±32 g ist das Minimum. Thingy-Raw-Accel (i16 /1024) deckt genau ±32 g ab.

## 3. Quantisierung, Rauschen bei 100 Hz, Drift ueber 60 s (IMU ICM-45686, Q-ICM)

| Groesse | Wert | Einheit | Kennzeichnung |
| --- | --- | --- | --- |
| LSB IMU ±4000 °/s 16 bit | 0.1221 | °/s | BERECHNUNG |
| LSB IMU ±2000 °/s 16 bit | 0.0610 | °/s | BERECHNUNG |
| LSB Thingy-Raw gyro (/32) | 0.0312 | °/s | BERECHNUNG (Q-PROTO:26) |
| LSB erweiterter Kanal gyro (/8) | 0.1250 | °/s | BERECHNUNG (Vorschlag) |
| LSB Thingy-Raw accel (/1024) | 0.977 | mg | BERECHNUNG |
| LSB Quaternion Q2.30 -> Winkel | 1.07e-07 | ° | BERECHNUNG |
| LSB Euler (/65536) | 1.53e-05 | ° | BERECHNUNG |
| Gyro-Rauschen RMS bei 100 Hz (BW 50 Hz) | 0.0337 | °/s | BERECHNUNG |
| Accel-Rauschen RMS bei 100 Hz | 0.620 | mg | BERECHNUNG |
| Neigungsrauschen aus Accel (1 sigma) | 0.0355 | ° | BERECHNUNG |
| Winkel-Random-Walk 60 s (nur Rauschen) | 0.0294 | ° | BERECHNUNG |
| Drift 60 s durch Temperatur (5.0 K, Q-ICM TC) | 1.50 | ° | BERECHNUNG |
| Drift 60 s durch Rest-Bias 0.02 °/s (A) | 1.20 | ° | BERECHNUNG |
| Summe ohne Schwerkraftstuetzung (Yaw, worst case linear) | 2.73 | ° | BERECHNUNG |

Bewertung: Roll/Pitch werden in der Fusion ueber die Schwerkraft gestuetzt -> Fehler ~ Neigungsrauschen 0.036° << Totzone 3.0° (Faktor 84). Ungestuetzter Yaw-Drift 2.73° in 60 s < Totzone; Yaw wird im Spiel nur relativ (Schwungrichtung) genutzt, Rekalibrierung per Taster lang.

## 4. BLE-Durchsatz Spielmodus (Quaternion + Raw, 100 Hz)

| Characteristic | Nutzlast B | passt in MTU 23 (max 20 B) | LL-PDU B | Luftzeit inkl. Ack µs |
| --- | --- | --- | --- | --- |
| Quaternion EF680404 | 16 | ja | 23 | 644 |
| Raw EF680406 | 18 | ja | 25 | 660 |
| Raw-HR EF680480 (nur wenn abonniert) | 16 | ja | 23 | 644 |
- CI 7.5 ms, 2 Stroeme: 1.50 Notifications pro Verbindungsereignis, Funkzeit 0.98 ms = 13 % des Intervalls, Nutzdaten 3.4 kB/s
- CI 7.5 ms, 3 Stroeme: 2.25 Notifications pro Verbindungsereignis, Funkzeit 1.46 ms = 19 % des Intervalls, Nutzdaten 5.0 kB/s
- CI 15 ms, 2 Stroeme: 3.00 Notifications pro Verbindungsereignis, Funkzeit 1.96 ms = 13 % des Intervalls, Nutzdaten 3.4 kB/s
- CI 15 ms, 3 Stroeme: 4.50 Notifications pro Verbindungsereignis, Funkzeit 2.92 ms = 19 % des Intervalls, Nutzdaten 5.0 kB/s
- CI 30 ms, 2 Stroeme: 6.00 Notifications pro Verbindungsereignis, Funkzeit 3.91 ms = 13 % des Intervalls, Nutzdaten 3.4 kB/s
- CI 30 ms, 3 Stroeme: 9.00 Notifications pro Verbindungsereignis, Funkzeit 5.84 ms = 19 % des Intervalls, Nutzdaten 5.0 kB/s

Thingy-Befund (Q-JOURNAL:21): 400 Notifications/s brachen unter Windows ab, 200/s stabil. Anforderung: Spielmodus <= 200 Notifications/s; Raw-HR ersetzt im spaeteren Bridge-Change Raw statt es zu ergaenzen.

## 5. Latenzbudget Bewegung -> Bildschirm

| Glied | typ. ms | worst ms | Kennzeichnung |
| --- | --- | --- | --- |
| IMU-Abtastung ODR 400 Hz (halbe/ganze Periode) | 1.2 | 2.5 | BERECHNUNG |
| IMU-Digitalfilter Gruppenlaufzeit | 1.0 | 2.0 | ANNAHME (Datenblatt-Tabelle offen) |
| FIFO/Interrupt + SPI-Lesen | 0.2 | 0.5 | ANNAHME |
| Fusion + Kodierung im MCU | 0.3 | 1.0 | ANNAHME |
| Warten auf Verbindungsereignis (CI/2 bzw. CI) | 7.5 | 15.0 | BERECHNUNG (CI 15.0 ms A) |
| Funk (34 B Paket, 1M PHY) | 0.3 | 15.3 | BERECHNUNG; worst = 1 Wiederholung |
| Windows-BLE-Stack -> Bridge-Callback | 1.0 | 5.0 | ANNAHME |
| Bridge JSON + WebSocket lokal | 0.5 | 2.0 | ANNAHME |
| Browser: bis naechstes requestAnimationFrame (60 Hz) | 8.3 | 16.7 | BERECHNUNG |
| Rendern + Compositor (1 Frame) | 16.7 | 33.3 | ANNAHME |
| Bildschirm (Scanout + Pixel) | 8.0 | 20.0 | ANNAHME |
| **Summe im Geraet (Sensor -> Notification bereit)** | 2.8 | 6.0 | Ziel < 10 ms |
| **Summe bis Bildschirm** | 45.0 | 113.3 | BERECHNUNG |

## 6. Leistungsbudget und Laufzeit

| Betriebsart | cpu | radio | imu | led | buzzer | motor | reg | misc | Summe mA | mit Reserve ×1,3 | Laufzeit 500 mAh h | noetige Kapazitaet fuer 6 h mAh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Spielmodus (100 Hz, Q+Raw, Beeps) | 0.499 | 1.056 | 0.420 | 0.500 | 0.990 | 1.190 | 0.050 | 0.010 | 4.72 | 6.13 | 65 | 46 |
| Verbunden, Standard 10 Hz (alle Abos) | 0.100 | 0.290 | 0.420 | 0.200 | 0.000 | 0.000 | 0.050 | 0.010 | 1.07 | 1.39 | 287 | 10 |
| Advertising, IMU Wake-on-Motion | 0.002 | 0.020 | 0.010 | 0.000 | 0.000 | 0.000 | 0.050 | 0.010 | 0.09 | 0.12 | 3344 | 1 |
| Aus (Lastschalter offen, nur Lader/Teiler) | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 0.01 | 0.01 | 61538 | 0 |

Spalten: cpu = MCU-CPU (Q-NRF 52 µA/MHz × 64 MHz × Tastgrad A); radio = Funk (Q-NRF Stroeme, Tastgrad BERECHNUNG); imu = IMU 6-Achsen LN (Q-ICM 0,42 mA); led = RGB-LED Mittel (A); buzzer = Summer 30 mA × 3,3 % (A: 100 ms je 3 s); motor = Motor 70 mA × 1,7 % (A: 50 ms je 3 s); reg = Regler-Ruhestrom (A 50 µA); misc = Akku-Teiler + Leckstroeme (A)

Aus-Zustand: 7.0 Jahre rechnerisch (Selbstentladung der Zelle dominiert, nicht modelliert).

Laden: Vorschlag 250 mA (0,5 C <= 1 C). Ladezeit ~ 2.0 h CC + ~0,5–1 h CV (A) -> ca. 2,5–3 h; Spielstrom beim Laden 4.7 mA << Eingang 500 mA (USB 2.0 default).
