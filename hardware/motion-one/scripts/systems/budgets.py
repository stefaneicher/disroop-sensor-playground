#!/usr/bin/env python3
"""Motion One r1 – reproduzierbare System-Budgets (systems-engineer).

Aufruf (Container): ./project hw run "python3 hardware/motion-one/scripts/systems/budgets.py"
Ausgabe: Markdown auf stdout. Jede Eingangsgroesse traegt ein Label:
Q = QUELLE (siehe requirements/BUDGETS.md, Abschnitt Quellen), A = ANNAHME (Begruendung im Kommentar).
Alles, was hier berechnet wird, ist BERECHNUNG, keine Messung.
"""
import math

G = 9.80665


def h(t):
    print(f"\n## {t}\n")


def row(*c):
    print("| " + " | ".join(str(x) for x in c) + " |")


# ---------------------------------------------------------------- 1. Messbereich
h("1. Messbereich aus menschlichen Winkelgeschwindigkeiten")
peaks = [  # (Bewegung, Wert °/s, Quelle-Kuerzel)
    ("Handgelenk-Flexion Aufschlag, Weltklasse (Mittel)", 1950, "Q-FLEISIG"),
    ("Schulter-Innenrotation Aufschlag, Maenner (Mittel)", 2420, "Q-FLEISIG"),
    ("Oberarm |omega| 1. Aufschlag, Profis (Mittel)", 3206.6, "Q-TRIGT"),
    ("Oberarm |omega| 1. Aufschlag, Mittel + 1 SD", 3206.6 + 807.8, "Q-TRIGT"),
    ("Spiel: Schlagschwelle", 350, "Q-TENNIS:36"),
    ("Spiel: Ende Tempo-Skala", 1200, "Q-TENNIS:37"),
]
row("Bewegung", "Spitze °/s", "Beleg", "Thingy-Raw ±1024 °/s", "±2000 °/s", "±4000 °/s")
row(*["---"] * 6)
for n, w, s in peaks:
    row(n, f"{w:.0f}", s, "ok" if w < 1024 else "UEBERSTEUERT",
        "ok" if w < 2000 else "UEBERSTEUERT", "ok" if w < 4000 else "UEBERSTEUERT")
reserve = 4000 / 1950
print(f"\nReserve ±4000 °/s gegenueber Handgelenk-Spitze 1950 °/s: Faktor {reserve:.2f}; "
      f"gegenueber Oberarm-Mittel 3207 °/s: Faktor {4000/3206.6:.2f}. "
      "Profi-Spitzen (Mittel+1 SD) koennen ±4000 °/s ueberschreiten -> Saettigungsflag im erweiterten Kanal.")

# Zentripetal-Abschaetzung Beschleunigung a = omega^2 * r (A: Hebelarme)
h("2. Beschleunigung (Abschaetzung a = omega^2 * r)")
row("Fall", "omega °/s", "r m (A)", "a g")
row(*["---"] * 4)
for n, w, r in [("Handgelenk-Flexion, Geraet 8 cm vor Handgelenk", 1950, 0.08),
                ("Schulter-Innenrotation, Hand 0,10 m neben Oberarmachse", 2420, 0.10),
                ("Schulter-Innenrotation, Hand 0,30 m (Ellbogen gebeugt)", 2420, 0.30),
                ("Spiel-Schwung 1200 °/s, r 0,6 m (gestreckter Arm)", 1200, 0.60)]:
    a = (math.radians(w)) ** 2 * r / G
    row(n, w, r, f"{a:.1f}")
print("\nFolgerung: ±16 g wird bei schnellen Schlaegen rechnerisch erreicht bzw. ueberschritten; "
      "±32 g ist das Minimum. Thingy-Raw-Accel (i16 /1024) deckt genau ±32 g ab.")

# ---------------------------------------------------------------- 3. Quantisierung, Rauschen, Drift
h("3. Quantisierung, Rauschen bei 100 Hz, Drift ueber 60 s (IMU ICM-45686, Q-ICM)")
gyro_nd = 0.0038      # °/s/sqrt(Hz)  Q-ICM
acc_nd = 70e-6        # g/sqrt(Hz)    Q-ICM
gyro_tc = 0.005       # °/s/°C        Q-ICM (Temperaturstabilitaet)
odr_out = 100         # Hz            Q-TENNIS:4
bw = odr_out / 2      # A: Tiefpass bei Nyquist der Ausgaberate
enbw = bw * math.pi / 2  # A: 1.-Ordnung-Aequivalenz
deadzone = 3.0        # °             Q-SKI:14
row("Groesse", "Wert", "Einheit", "Kennzeichnung")
row(*["---"] * 4)
for fs, lab in [(4000, "IMU ±4000 °/s 16 bit"), (2000, "IMU ±2000 °/s 16 bit")]:
    row(f"LSB {lab}", f"{2*fs/65536:.4f}", "°/s", "BERECHNUNG")
row("LSB Thingy-Raw gyro (/32)", f"{1/32:.4f}", "°/s", "BERECHNUNG (Q-PROTO:26)")
row("LSB erweiterter Kanal gyro (/8)", f"{1/8:.4f}", "°/s", "BERECHNUNG (Vorschlag)")
row("LSB Thingy-Raw accel (/1024)", f"{1/1024*1000:.3f}", "mg", "BERECHNUNG")
row("LSB Quaternion Q2.30 -> Winkel", f"{math.degrees(2/2**30):.2e}", "°", "BERECHNUNG")
row("LSB Euler (/65536)", f"{1/65536:.2e}", "°", "BERECHNUNG")
g_rms = gyro_nd * math.sqrt(enbw)
a_rms = acc_nd * math.sqrt(enbw)
tilt_noise = math.degrees(math.atan(a_rms))
row("Gyro-Rauschen RMS bei 100 Hz (BW 50 Hz)", f"{g_rms:.4f}", "°/s", "BERECHNUNG")
row("Accel-Rauschen RMS bei 100 Hz", f"{a_rms*1000:.3f}", "mg", "BERECHNUNG")
row("Neigungsrauschen aus Accel (1 sigma)", f"{tilt_noise:.4f}", "°", "BERECHNUNG")
arw60 = gyro_nd * math.sqrt(60)
row("Winkel-Random-Walk 60 s (nur Rauschen)", f"{arw60:.4f}", "°", "BERECHNUNG")
dT = 5.0  # A: Erwaermung in der Hand nach Kalibrierung
bias_res = 0.02  # A: Rest-Bias nach Ruhe-Kalibrierung (°/s)
drift_temp = gyro_tc * dT * 60
drift_res = bias_res * 60
row(f"Drift 60 s durch Temperatur ({dT} K, Q-ICM TC)", f"{drift_temp:.2f}", "°", "BERECHNUNG")
row(f"Drift 60 s durch Rest-Bias {bias_res} °/s (A)", f"{drift_res:.2f}", "°", "BERECHNUNG")
tot_open = drift_temp + drift_res + arw60
row("Summe ohne Schwerkraftstuetzung (Yaw, worst case linear)", f"{tot_open:.2f}", "°", "BERECHNUNG")
print(f"\nBewertung: Roll/Pitch werden in der Fusion ueber die Schwerkraft gestuetzt -> Fehler ~ Neigungsrauschen "
      f"{tilt_noise:.3f}° << Totzone {deadzone}° (Faktor {deadzone/tilt_noise:.0f}). "
      f"Ungestuetzter Yaw-Drift {tot_open:.2f}° in 60 s {'<' if tot_open < deadzone else '>='} Totzone; "
      "Yaw wird im Spiel nur relativ (Schwungrichtung) genutzt, Rekalibrierung per Taster lang.")

# ---------------------------------------------------------------- 4. BLE-Durchsatz
h("4. BLE-Durchsatz Spielmodus (Quaternion + Raw, 100 Hz)")
payload = {"Quaternion EF680404": 16, "Raw EF680406": 18, "Raw-HR EF680480 (nur wenn abonniert)": 16}
att_hdr, l2cap_hdr = 3, 4
phy_us_per_byte = 8   # LE 1M PHY
ll_overhead = 1 + 4 + 2 + 3  # Praeambel, Access Address, Header, CRC (unverschluesselt)
t_ifs, empty = 150, (ll_overhead) * 8
mtu_default = 23
row("Characteristic", "Nutzlast B", "passt in MTU 23 (max 20 B)", "LL-PDU B", "Luftzeit inkl. Ack µs")
row(*["---"] * 5)
air = {}
for k, p in payload.items():
    pdu = p + att_hdr + l2cap_hdr
    t = (pdu + ll_overhead) * phy_us_per_byte + t_ifs + empty + t_ifs
    air[k] = t
    row(k, p, "ja" if p <= mtu_default - 3 else "nein", pdu, t)
for ci in (7.5, 15, 30):
    for streams in (2, 3):
        n = 100 * streams * ci / 1000
        t_ev = sum(list(air.values())[:streams]) / streams * n
        print(f"- CI {ci} ms, {streams} Stroeme: {n:.2f} Notifications pro Verbindungsereignis, "
              f"Funkzeit {t_ev/1000:.2f} ms = {100*t_ev/1000/ci:.0f} % des Intervalls, "
              f"Nutzdaten {100*sum(list(payload.values())[:streams])/1000:.1f} kB/s")
print("\nThingy-Befund (Q-JOURNAL:21): 400 Notifications/s brachen unter Windows ab, 200/s stabil. "
      "Anforderung: Spielmodus <= 200 Notifications/s; Raw-HR ersetzt im spaeteren Bridge-Change Raw statt es zu ergaenzen.")

# ---------------------------------------------------------------- 5. Latenz
h("5. Latenzbudget Bewegung -> Bildschirm")
ci = 15.0  # A: Windows-Verbindungsintervall im Durchsatzprofil nicht garantiert (Q-TENNIS:116)
lat = [  # (Glied, typisch ms, worst ms, Label)
    ("IMU-Abtastung ODR 400 Hz (halbe/ganze Periode)", 1.25, 2.5, "BERECHNUNG"),
    ("IMU-Digitalfilter Gruppenlaufzeit", 1.0, 2.0, "ANNAHME (Datenblatt-Tabelle offen)"),
    ("FIFO/Interrupt + SPI-Lesen", 0.2, 0.5, "ANNAHME"),
    ("Fusion + Kodierung im MCU", 0.3, 1.0, "ANNAHME"),
    ("Warten auf Verbindungsereignis (CI/2 bzw. CI)", ci / 2, ci, f"BERECHNUNG (CI {ci} ms A)"),
    ("Funk (34 B Paket, 1M PHY)", 0.3, 0.3 + ci, "BERECHNUNG; worst = 1 Wiederholung"),
    ("Windows-BLE-Stack -> Bridge-Callback", 1.0, 5.0, "ANNAHME"),
    ("Bridge JSON + WebSocket lokal", 0.5, 2.0, "ANNAHME"),
    ("Browser: bis naechstes requestAnimationFrame (60 Hz)", 8.3, 16.7, "BERECHNUNG"),
    ("Rendern + Compositor (1 Frame)", 16.7, 33.3, "ANNAHME"),
    ("Bildschirm (Scanout + Pixel)", 8.0, 20.0, "ANNAHME"),
]
row("Glied", "typ. ms", "worst ms", "Kennzeichnung")
row(*["---"] * 4)
for n, a, b, l in lat:
    row(n, f"{a:.1f}", f"{b:.1f}", l)
dev_typ = sum(x[1] for x in lat[:4])
dev_wc = sum(x[2] for x in lat[:4])
row("**Summe im Geraet (Sensor -> Notification bereit)**", f"{dev_typ:.1f}", f"{dev_wc:.1f}", "Ziel < 10 ms")
row("**Summe bis Bildschirm**", f"{sum(x[1] for x in lat):.1f}", f"{sum(x[2] for x in lat):.1f}", "BERECHNUNG")

# ---------------------------------------------------------------- 6. Leistung
h("6. Leistungsbudget und Laufzeit")
# Strom aus Akku; Regler linear (A) -> Iakku = Ilast.
v_radio = 4.8    # mA TX 0 dBm DC/DC 3 V, Q-NRF
v_rx = 4.6       # mA RX 1M, Q-NRF
cpu_ua_mhz = 52  # µA/MHz, Q-NRF
def radio_avg(ci_ms, notif_per_s):
    ev = 1000 / ci_ms
    t_rx = 0.08 + 0.15  # ms je Ereignis (Empfang Master-Paket + Hochlauf), A
    t_tx = notif_per_s / ev * 0.66  # ms, Luftzeit je Paket aus Abschnitt 4
    return ev * (t_rx * v_rx + t_tx * v_radio) / 1000 * 1.5  # Faktor 1,5 Hochlauf/Overhead (A)
modes = {
    "Spielmodus (100 Hz, Q+Raw, Beeps)": dict(
        cpu=cpu_ua_mhz * 64 / 1000 * 0.15, radio=radio_avg(15, 200), imu=0.42, led=0.5,
        buzzer=30 * 0.033, motor=70 * 0.017, reg=0.05, misc=0.01),
    "Verbunden, Standard 10 Hz (alle Abos)": dict(
        cpu=cpu_ua_mhz * 64 / 1000 * 0.03, radio=radio_avg(30, 50), imu=0.42, led=0.2,
        buzzer=0, motor=0, reg=0.05, misc=0.01),
    "Advertising, IMU Wake-on-Motion": dict(
        cpu=0.002, radio=0.02, imu=0.01, led=0.0, buzzer=0, motor=0, reg=0.05, misc=0.01),
    "Aus (Lastschalter offen, nur Lader/Teiler)": dict(
        cpu=0, radio=0, imu=0, led=0, buzzer=0, motor=0, reg=0, misc=0.005),
}
labels = {"cpu": "MCU-CPU (Q-NRF 52 µA/MHz × 64 MHz × Tastgrad A)", "radio": "Funk (Q-NRF Stroeme, Tastgrad BERECHNUNG)",
          "imu": "IMU 6-Achsen LN (Q-ICM 0,42 mA)", "led": "RGB-LED Mittel (A)",
          "buzzer": "Summer 30 mA × 3,3 % (A: 100 ms je 3 s)", "motor": "Motor 70 mA × 1,7 % (A: 50 ms je 3 s)",
          "reg": "Regler-Ruhestrom (A 50 µA)", "misc": "Akku-Teiler + Leckstroeme (A)"}
cap = 500.0      # mAh, Vorschlag
usable = 0.8     # A: Alterung + Abschaltreserve
margin = 1.3     # A: Entwurfsreserve auf Summe
row("Betriebsart", *[k for k in labels], "Summe mA", "mit Reserve ×1,3", "Laufzeit 500 mAh h", "noetige Kapazitaet fuer 6 h mAh")
row(*["---"] * (len(labels) + 5))
res = {}
for m, d in modes.items():
    s = sum(d.values())
    sr = s * margin
    rt = cap * usable / sr
    res[m] = rt
    row(m, *[f"{d[k]:.3f}" for k in labels], f"{s:.2f}", f"{sr:.2f}", f"{rt:.0f}", f"{6*sr/usable:.0f}")
print("\nSpalten: " + "; ".join(f"{k} = {v}" for k, v in labels.items()))
print(f"\nAus-Zustand: {cap*usable/(modes['Aus (Lastschalter offen, nur Lader/Teiler)']['misc']*margin)/24/365:.1f} Jahre "
      "rechnerisch (Selbstentladung der Zelle dominiert, nicht modelliert).")
ic = 0.5 * cap
print(f"\nLaden: Vorschlag {ic:.0f} mA (0,5 C <= 1 C). Ladezeit ~ {cap/ic*1.0:.1f} h CC + ~0,5–1 h CV (A) -> ca. 2,5–3 h; "
      f"Spielstrom beim Laden {sum(modes['Spielmodus (100 Hz, Q+Raw, Beeps)'].values()):.1f} mA << Eingang 500 mA (USB 2.0 default).")
