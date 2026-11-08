# Budgets V1 – Disroop Motion One (systems-engineer, 2026-11-07)

Erzeugt mit `./project hw run "python3 hardware/motion-one/scripts/systems/budgets.py"` (Python 3.12.3 im Container, Exit 0, 2026-11-07).
Vollständige Ausgabe: `requirements/budgets_output.md` (alle Zahlen dort mit Kennzeichnung je Zeile). Hardware-Messungen: NOT RUN.

## Ergebnisse (BERECHNUNG, Eingaben siehe Quellen)

| Budget | Ergebnis | Bewertung |
|---|---|---|
| Messbereich Gyro | Studienspitzen 1950–3207 °/s, Mittel+1 SD 4014 °/s | ±4000 °/s gewählt (Reserve 2,05 zu Handgelenk, 1,25 zu Oberarm-Mittel); Profi-Spitzen können sättigen → Flag |
| Messbereich Accel | ω²r = 9–55 g (Hebelarme ANNAHME) | ±32 g Minimum; Thingy-Raw deckt ±32 g ab |
| Quantisierung | IMU ±4000 °/s: 0,122 °/s/LSB; Raw-HR /8: 0,125 °/s; Thingy-Raw /32: 0,031 °/s | Raw-HR-Auflösung ≈ IMU-Auflösung, kein Verlust |
| Rauschen 100 Hz | Gyro 0,034 °/s RMS, Accel 0,62 mg, Neigung 0,036° | 84× unter Totzone 3° |
| Drift 60 s | Yaw ungestützt 2,73° worst case (Temp 1,5° + Rest-Bias 1,2°) | knapp < 3°, Rekalibrierung per Lang-Druck |
| BLE-Durchsatz | Quaternion 16 B + Raw 18 B, 200 Notif./s, 3,4 kB/s; Funkzeit 13 % des CI | MTU 23 genügt; CI 7,5–15 ms; ≤ 200 Notif./s (JOURNAL.md:21) |
| Latenz | im Gerät 2,8 typ. / 6,0 worst ms; bis Bildschirm 45 / 113 ms | Ziel < 10 ms im Gerät erfüllt (rechnerisch) |
| Leistung (Systemmodell) | Spiel 4,72 mA (6,13 mit ×1,3); 10 Hz 1,07 mA; Advertising 0,09 mA; Aus 5 µA | 500 mAh mit 80 % nutzbar und ×1,3 Reserve → 65 h; für 6 h reichen 46 mAh |
| Laden | 250 mA (0,5 C), ~2,5–3 h | ≤ 1 C |

Akkuvorschlag: 1S-LiPo 500 mAh mit Schutz (ANNAHME 503040-Klasse ~10 g); Laufzeit ist kein Treiber, Grösse folgt Griffvolumen und Alterung.

## PCB-Gegenrechnung und konservative Annahme

Das detaillierte PCB-Leistungsbudget kommt auf **8,1 mA** und **49 h** mit 500 mAh × 80 % nutzbarer Kapazität
(`electronics/analysis/ANALYSE_V1.md`, BERECHNUNG). Das liegt unter dem Systemmodell von 65 h, weil die beiden Modelle
andere ANNAHMEN für MCU-/Funk-Mittelstrom sowie Tastverhältnisse von LED, Summer und Motor verwenden. Die PCB-Gegenrechnung
enthält beispielsweise 5,0 mA Modulstrom und 1,0 mA LED-Mittelstrom; das Systemmodell rechnet MCU und Funk getrennt mit
insgesamt rund 1,56 mA und modelliert andere Aktor-Tastgrade (`requirements/budgets_output.md` §6).

Für Planung und Anforderung REQ-040 gilt daher **49 h als konservativer Rechenwert**; das Laufzeitziel ≥ 6 h besteht in
beiden Modellen rechnerisch. Beide Zahlen bleiben BERECHNUNG, bis Stromaufnahme und Laufzeit am realen Gerät gemessen
sind. Die Verbrauchsannahmen sind vor Fertigungsfreigabe zu vereinheitlichen.

## Quellen

- Q-FLEISIG: Fleisig et al. 2003, DOI 10.1080/14763140308522807, https://europepmc.org/article/MED/14658245 (Abruf 2026-11-07)
- Q-TRIGT: van Trigt et al. 2025, https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1463299/full (Abruf 2026-11-07)
- Q-ICM: https://invensense.tdk.com/products/motion-tracking/6-axis/icm-45686/ (Abruf 2026-11-07)
- Q-NRF: nRF52840 Product Specification v1.1, Spiegel https://content.arduino.cc/assets/Nano_BLE_MCU-nRF52840_PS_v1.1.pdf (Sekundärquelle, Nordic-Seite 403)
- Q-TENNIS docs/TENNIS.md:4,36-37,123 · Q-SKI docs/SKI.md:14,16 · Q-PROTO docs/protocol.md:8-35,117-121 · Q-JOURNAL JOURNAL.md:21

## Grenzen

Filter-Gruppenlaufzeit, Stack-/Browser-/Bildschirmlatenz, LED/Summer/Motor-Tastgrade, Regler-Ruhestrom, ΔT 5 K und Rest-Bias sind ANNAHMEN
(im Skript markiert). Akzeleration aus ω²r ist eine Abschätzung, keine Messung (MDPI-Forehand-Studie nicht abrufbar, HTTP 403).
