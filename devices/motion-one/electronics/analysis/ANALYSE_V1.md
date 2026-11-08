# Elektrische Analyse V1 – Motion One (pcb-engineer, 2026-11-08)

Kennzeichnung: QUELLE (Datenblatt/Seite), BERECHNUNG, SIMULATION (ngspice, `electronics/spice/*.cir|.log|.csv|.png`, Kennzahlen `results.json`, Skript `scripts/electronics/mo_spice.py`), ANNAHME. MESSUNG: keine (kein Muster) -> NOT RUN.

## 1 Leistungsbudget, Laufzeit, Ruhestrom, Lagerfaehigkeit
| Verbraucher (Spielmodus) | Strom | Kennz. |
|---|---|---|
| nRF52840-Modul, BLE 7.5–15 ms Intervall, 100–200 Notif./s, CPU-Fusion | 5.0 mA Mittel | ANNAHME (nicht gemessen) |
| ICM-45686 Accel+Gyro LN | 0.6 mA | ANNAHME (Datenblatt-Groessenordnung) |
| XC6206 Eigenstrom | 1 µA | QUELLE C5446-Datenblatt (typ.) |
| RGB-LED Mittel (1 Farbe, 25 % Duty) | 1.0 mA | BERECHNUNG 4 mA x 0.25 |
| Summer/Motor (Ereignisse, 5 % Duty) | 1.5 mA | ANNAHME (Motor 130 mA = 3.3 V/25 Ω BERECHNUNG, Duty ANNAHME) |
| **Summe** | **8.1 mA** | BERECHNUNG |

Laufzeit 500 mAh x 0.8 / 8.1 mA = **49 h** (BERECHNUNG) ≥ 6 h (REQ-040) -> PASS (vorbehaltlich MESSUNG).

Ruhestrom Aus (SW1 = Aus: Gate Q2 = Source ueber R10, VSW stromlos):
DW01A 3.0 µA (QUELLE Datenblatt typ.) + TP4056 Rueckstrom in BAT ohne VIN ≤ 2 µA (ANNAHME) + Q2 IDSS ≤ 1 µA (QUELLE AO3401A max., real << 1 µA) + Messteiler aus 9.4 pA (SIMULATION `vbat_div`) = **≤ 6 µA** (BERECHNUNG) ≤ 10 µA (REQ-047) -> PASS (MESSUNG NOT RUN).

Lagerfaehigkeit: 400 mAh / 6 µA = 66 700 h ≈ 7.6 Jahre (BERECHNUNG); real begrenzt durch LiPo-Selbstentladung ~2–3 %/Monat (ANNAHME) -> ≥ 1 Jahr bis DW01A-Unterspannung (2.4 V) PASS.

## 2 Lader TP4056 (U3)
- Ladestrom I = 1200 V / R_PROG = 1200/4.7k = **255 mA** (BERECHNUNG, Formel QUELLE C16581-Datenblatt) = 0.51 C bei 500 mAh ≤ 1 C PASS; IC-Toleranz ±10 % (ANNAHME) -> 230–281 mA ≤ 0.56 C.
- Verlust (5.0 V − Vbat) x I: 0.51 W bei 3.0 V, 0.33 W bei 3.7 V (BERECHNUNG). ESOP-8 mit EP auf 4-Lagen-GND: θJA ≈ 70 K/W (ANNAHME) -> ΔT ≤ 36 K, ≈ 61 °C bei 25 °C Umgebung; thermische Regelung bei 120 °C (QUELLE). PASS.
- NTC-Fenster: TEMP-Grenzen 45 % / 80 % VCC (QUELLE), Teiler R4 4.7k / R5 2.2k + NTC 10k B 3380 (QUELLE C77131) -> **+0.5 °C … +40.8 °C** (BERECHNUNG). LiPo-Laden 0–45 °C -> PASS (konservativ; Feinabstimmung R5 in V2 moeglich).
- Mit Last (Power-Path): Unter USB versorgt D1 (B5819W) VSYS aus VBUS, Q1 sperrt (Gate = VBUS). Batteriestrom durch Last unter USB ≈ 1e-10 A (SIMULATION `powerpath`) -> Ladeterminierung wird durch Spielen nicht gestoert. PASS. D1-Verlust 0.35 V x 0.15 A = 53 mW (BERECHNUNG).
- Ohne Last: reiner CC/CV-Zyklus, Terminierung bei I/10 = 25 mA (QUELLE TP4056).
- Lade-LED D5 an CHRG: (5 − 2.0)/1k = 3 mA (BERECHNUNG).

## 3 Regler XC6206P332MR (U5)
- Dropout 250 mV @ 100 mA (QUELLE C5446). Bei Vbat 3.0 V und 20 mA: 3V3 ≈ 2.95 V (BERECHNUNG, R_DO ≈ 2.5 Ω ANNAHME) – nRF52840 1.7–3.6 V, ICM-45686 1.71–3.6 V (QUELLE) -> PASS. Ab ≈ 3.35 V Vbat geregelt 3.30 V.
- Verlust max (4.2 − 3.3) x 0.05 A = 45 mW, Spitze Funk 0.1 A -> 90 mW (BERECHNUNG), SOT-23 PASS.
- Stabilitaet: XC6206 stabil mit ≥ 1 µF Keramik (QUELLE). Ausgang C7 4.7 µF/0603 (DC-Bias @3.3 V −40 % -> 2.8 µF, ANNAHME) + weitere Abblock-C am Modul/IMU -> ≥ 3.5 µF effektiv (BERECHNUNG) ≥ 1 µF -> PASS.
- 3V3 bei Ein-/Ausstecken USB: min 3.2985 V (SIMULATION `powerpath`).

## 4 SPICE-Ergebnisse (ngspice, Modelle level-1/Verhalten, Parameter ANNAHME im .cir)
| Fall | Dateien | Ergebnis | Status |
|---|---|---|---|
| Power-Path USB ein/aus + Last | `spice/powerpath.*` | VSYS USB 4.87 V, Bat 3.70 V, beim Abziehen min 3.67 V; 3V3 ≥ 3.2985 V | PASS |
| Einschaltstrom SW1 (Q2 hart ein) | `spice/inrush.*` | Spitze **6.75 A** (µs-Puls, 4.2 V, 0.15 Ω Quelle), 3V3 ≥ 3.0 V nach 0.16 ms | PARTIAL: DW01A-Ueberstrom hat ms-Verzoegerung (QUELLE Groessenordnung), kein Abschalten erwartet; V2: RC am Gate Q2 (z. B. 100k/10 nF) fuer Soft-Start |
| Summer + Motor ein/aus @ Vbat 3.5 V | `spice/buzzer_motor.*` | 3V3 min 3.07 V, VSW min 3.47 V, MOT_N max 4.41 V, BUZ_N max 4.01 V (Freilauf wirkt, ≪ V_DS 30 V) | PASS |
| Batteriemessteiler | `spice/vbat_div.*` | 4.2 V -> 2.097 V (−0.13 %), 99 % nach 24 ms, aus 9.4 pA, ein 25 µA | PASS (Firmware: EN ≥ 25 ms vor Messung) |

## 5 Leiterbahnen/Stroeme (IPC-2221, BERECHNUNG, aussen 35 µm, ΔT 10 K)
0.4 mm -> 1.2 A; 0.3 mm -> 1.0 A; 0.2 mm -> 0.74 A; innen ×0.5. Netzklasse Power 0.4 mm, Freerouting-Engstellen 0.2–0.3 mm (VBUS, VSYS, VSW, 3V3). Max. Dauerstrom 0.28 A (Laden) bzw. 0.13 A (Motor) -> PASS. GND: In1 vollflaechig + Flaechen F/B/In2.

## 6 SPI/Interrupts/Pull-ups
- IMU per SPI (kein I²C -> keine Pull-ups). nRF52840 SPIM 8 MHz auf Normal-Pins (QUELLE nRF52840 PS), ICM-45686 SPI bis 24 MHz (ANNAHME aus Datenblatt-Klasse) -> 8 MHz, Leitungslaenge ~30 mm, Laufzeit < 0.2 ns ≪ 62 ns Halbperiode PASS.
- CS beim Boot hochohmig -> Firmware setzt CS sofort high. Option V2: 100k Pull-up.
- INT1/INT2 push-pull (Firmware-Konfiguration), BTN mit internem Pull-up (13 k typ., QUELLE nRF PS), Entprellung in Firmware.

## 7 Antenne (Ebyte E73 / Nordic)
Modul am Kopfende, Antennenabschnitt (Board x 66.2–70) als Rule-Area auf allen 4 Kupferlagen (keine Bahnen/Vias/Flaechen). Gehaeuse: kein Metall/Akku/Motor ≤ 5 mm um x ≥ 66 (an Mechanik). Layout PASS, Reichweitentest NOT RUN.

## 8 Toleranzen (BERECHNUNG)
- Messteiler 1 %: Verhaeltnisfehler ±1 % -> ±42 mV; SAADC-Gain ±2 % (ANNAHME) -> gesamt ±0.13 V worst case; Einpunkt-Kalibrierung empfohlen.
- RGB: Vf ±0.2 V -> 2–6 mA; bei 3V3 = 2.95 V Blau schwach (Akku leer) – akzeptiert.
- Ladestrom 230–281 mA; NTC-Fenster ±1 K.
- Summer-Spitze ≈ 87 mA (16 Ω ANNAHME + 22 Ω Serie).

## 9 ERC/DRC
ERC 0 Fehler; DRC 0 Fehler, 0 unverbunden, 0 Paritaet; 2 Warnungen silk_edge_clearance am USB-C (Buchse ragt bewusst ueber die Kante) – begruendete Ausnahme. Regeln: 0.15/0.15 (Engstelle IMU-LGA 0.12 mm; JLC Multilayer min 0.09/0.09, QUELLE `logs/pcb-v1/sourcing/jlc_capabilities.txt`), Via 0.3/0.6, Kante 0.2.
