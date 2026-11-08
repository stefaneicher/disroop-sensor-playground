# Handoff Marktauftritt – Motion One (DRAFT, Stand r3-Renders)

Status: **PARTIAL**. Alle Aussagen mit Beleg aus `management/metrics.json`. Hardwaregestützte Aussagen sind **NOT RUN** und dürfen nicht als Tatsache beworben werden.

## Bildmaterial (r3-Gehäusestand, nicht r4)
Pfad `media/renders/`, je 3840 x 2160 px, RGBA (transparent): `iso_closed.png`, `iso_open.png`, `top_open.png`, `exploded_raw.png` (unbeschriftet). Beschriftete Explosionsansicht, Video: offen.

## Belegte Aussagen
| Aussage | Wert | Klasse | Status | Beleg |
|---|---|---|---|---|
| Länge Gehäuse | 170 mm | ANNAHME | PARTIAL | metrics.json `enclosure_length` |
| Griffdurchmesser (äquivalent) | 34 mm | BERECHNUNG | PASS (Entwurf, Ergonomie ungetestet) | `enclosure_grip_equivalent_diameter` |
| Masse (Schätzung) | 80.8 g | BERECHNUNG | PARTIAL | `enclosure_mass_estimate` |
| Spielmodus-Laufzeit | 49 h (konservativ) | BERECHNUNG | NOT RUN | `calculated_runtime_game_mode` |
| Sensor-zu-BLE-Latenz | typ. 2.8 ms, worst 5.3 ms | BERECHNUNG | PARTIAL | `firmware_sensor_to_notify_latency` |
| Ladestrom | 255 mA | BERECHNUNG | PASS (nur Rechnung) | `charger_current` |

## Nicht verwenden
- Laufzeit 65 h (Systemmodell, überholt), jede Aussage zu Akkusicherheit, Robustheit/FEM (Netzstudie PARTIAL), Preis (Schätzung, Versand ANNAHME) und Messwerte am Gerät: kein Beleg.
