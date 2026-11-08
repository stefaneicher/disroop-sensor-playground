# Elektrische Analyse V1 – Motion One (pcb-engineer, 2026-11-08)

Kennzeichnung: QUELLE (Datenblatt/Seite), BERECHNUNG, SIMULATION (ngspice, `electronics/spice/*.cir|.log|.csv|.png`, Kennzahlen `results.json`, Skript `scripts/electronics/mo_spice.py`), ANNAHME. MESSUNG: keine (kein Muster) -> NOT RUN.

## 1 Leistungsbudget, Laufzeit, Ruhestrom, Lagerfaehigkeit
| Verbraucher (Spielmodus) | Strom | Kennz. |
|---|---|---|
| nRF52840-Modul, BLE 7.5–15 ms Intervall, 100–200 Notif./s, CPU-Fusion | 5.0 mA Mittel | ANNAHME (nicht gemessen) |
| ICM-45686 Accel+Gyro LN | 0.6 mA | ANNAHME (Datenblatt-Groessenordnung) |
| XC6206 Eigenstrom | 1 µA | QUELLE C5446-Datenblatt (typ.) |
| RGB-LED Mittel (1 Farbe, 25 % Duty) | 1.0 mA | BERECHNUNG 4 mA x 0.25 |
| Summer MLT-5020 (2 % Tonanteil, 87 mA Spitze, PWM 50 % -> 43.5 mA waehrend Ton) | 0.87 mA | BERECHNUNG; Tonanteil ANNAHME |
| Motor M1 LCM0827A3038F (Nenn 80 mA max @ 3.0 V, QUELLE Datenblatt), 5 % Vibrationsanteil | 4.0 mA | BERECHNUNG 80 mA x 0.05; Anteil ANNAHME |
| **Summe** | **11.5 mA** | BERECHNUNG `scripts/electronics/motor_budget.py` |

Laufzeit 500 mAh x 0.8 / 11.5 mA = **34.9 h** (BERECHNUNG) ≥ 6 h (REQ-040) -> PASS (vorbehaltlich MESSUNG). Korrektur 2026-11-08: frueher 1.5 mA fuer Summer+Motor (zu tief; 130 mA x 5 % = 6.5 mA).

Motor-Kennwerte (QUELLE `electronics/datasheets/LCM0827A3038F_C2759981.pdf` S.1/9): 3.0 V nenn (2.7–3.3 V), I_nenn ≤ 80 mA, I_Anlauf ≤ 120 mA, R 30 Ω ±15 %, Anlaufspannung ≤ 2.3 V. Motor haengt an VSW (Akku 3.0–4.2 V): Firmware-PWM auf U_eff ≤ 3.0 V (Duty = 3.0/Vbat, ANNAHME Firmware-Vorgabe), sonst Ueberspannung. Stillstand-/Anlaufstrom ohne PWM worst Vbat/R_min = 4.2/25.5 Ω = 165 mA (BERECHNUNG). AO3400 (5.8 A) und 1N4148W-Freilauf (I_F 0.3 A Klasse, ANNAHME) -> PASS. Bisherige SPICE `buzzer_motor` mit 25 Ω liegt konservativ (≈ R_min) -> bleibt gueltig.

Sensitivitaet Vibrationsanteil (BERECHNUNG, Grundlast 6.6 mA + Summer 0.87 mA):
| Vibrationsanteil | Motor | Summe | Laufzeit (400 mAh) |
|---|---|---|---|
| 5 % | 4.0 mA | 11.5 mA | 34.9 h |
| 10 % | 8.0 mA | 15.5 mA | 25.9 h |
| 20 % | 16.0 mA | 23.5 mA | 17.0 h |
Alle ≥ 6 h (REQ-040) -> PASS.

### 1a Worst Case: alle Verbraucher gleichzeitig (BERECHNUNG `motor_budget.py` -> `electronics/analysis/motor_budget.json`, SIMULATION `spice/worstcase_3v5.*`, `worstcase_3v3.*`)
Annahmen: nRF52840 TX +8 dBm ≈ 32.7 mA + CPU 64 MHz ≈ 6.3 mA (ANNAHME Groessenordnung nRF52840 PS, LDO-Modus), IMU 0.6 mA, RGB alle 3 Farben 12 mA, Summer Spitze 87 mA, Motor Anlauf ohne PWM = Vbat/25.5 Ω.
| Groesse | Vbat 3.5 V | Vbat 3.3 V | Kennz. |
|---|---|---|---|
| I_3V3 ueber LDO (Spitze) | 138.6 mA | 138.6 mA | BERECHNUNG |
| 3V3 (R_DO 2.5 Ω) | 3.15 V | 2.95 V | BERECHNUNG |
| 3V3 min SPICE (Last 51.6 mA + Summer-PWM, Motor-Anlauf bei 1 ms) | 2.99 V | 2.80 V | SIMULATION |
| Motor-Anlauf | 137 mA | 129 mA | BERECHNUNG (SPICE 136/128 mA) |
| Akkustrom gesamt | 276 mA | 268 mA | BERECHNUNG (bei 4.2 V: 303 mA) |
| DW01A-Ueberstromschwelle | 150 mV / (2 x 28 mΩ FS8205A) ≈ 2.7 A | | ANNAHME (V_OCP typ., R_DS bei U_GS ≈ 3.5 V) |
Ergebnis: Akkustrom ≤ 0.31 A ≪ 2.7 A -> kein Abschalten, PASS. 3V3 ≥ 2.80 V ≥ 1.71/1.7 V (IMU/nRF) -> PASS; Blau/Gruen-LED bei 2.8 V schwach (akzeptiert). Hinweis SPICE: LDO als Verhaltensquelle, Akkustrom im Modell enthaelt nur den VSW-Zweig (Motor).

Betrieb an USB waehrend Laden (VSYS 4.87 V, SIMULATION powerpath): Ladestrom max 281 mA + CHRG-LED 3 mA + I_3V3 138.6 mA + Motor:
- Motor ohne PWM-Begrenzung an 4.87 V: 191 mA -> **VBUS 614 mA > 500 mA (USB 2.0) FAIL**; zudem 4.87 V > 3.3 V Motor-Maximum.
- Motor mit PWM auf 3.0 V (Anlauf ≤ 120 mA): **VBUS 543 mA > 500 mA FAIL (Spitze, ms)**.
- Typisch (Lader 255 mA, Funk 39 mA, Summer 43.5 mA, Motor 80 mA): 433 mA ≤ 500 mA PASS.
Massnahme (Firmware, keine Hardwareaenderung): an USB Motor-PWM auf 3.0 V/VSYS (≈ 62 %) und nicht gleichzeitig mit Summer (-> ≤ 456 mA PASS, BERECHNUNG). Option V2: R_PROG 4.7k -> 5.6k (214 mA). USB-C mit 5.1k CC-Pull-down erlaubt bei Default-USB-Quelle 500 mA, bei Type-C-Quellen 1.5 A typisch (ANNAHME) -> Risiko gering.

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
| Worst Case alle Verbraucher @ 3.5 / 3.3 V | `spice/worstcase_3v5.*`, `worstcase_3v3.*` | 3V3 min 2.99 / 2.80 V, VSW min 3.47 / 3.27 V, Motorzweig 136 / 128 mA | PASS |

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
