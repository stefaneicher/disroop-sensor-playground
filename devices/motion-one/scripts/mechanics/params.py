"""Disroop Motion One - zentrale Parameterdatei Mechanik (alle Masse in mm, Geraetekoordinaten).
Koordinaten: x laengs (0 = Griffende/USB-C, +x Richtung Kopf), y quer, z hoch (Daumenseite +z).
Kennzeichnung je Wert: Q = QUELLE, A = ANNAHME, B = BERECHNUNG, I = INTERFACES r1 (dort ANNAHME)."""

# --- Aussenform (organisch, spiegelsymmetrisch zu y=0 -> Links-/Rechtshaender) ------------------------
# Ergonomie-QUELLEN (Literaturwerte, nicht online abgerufen, Werte aus Standardtabellen):
#  - Power-Grip-Griffdurchmesser 30-40 mm optimal (Eastman Kodak, Ergonomic Design for People at Work, 2004;
#    Pheasant/Haslegrave, Bodyspace, 3. Aufl. 2006: Griff-Ø 30-40 mm, ~35 mm Optimum fuer Kraftgriff)
#  - Handbreite (Mittelhand): P5 Frau ~69 mm, P95 Mann ~97 mm (Pheasant/Haslegrave 2006, Tab. GB-Population;
#    DIN 33402-2 aehnlich) -> Griffzone >= 97 mm + Daumen-/Zeigefingerreserve
#  - Fingerbreite proximal ~18-23 mm (P5-P95, Pheasant) -> Wellenteilung 21 mm
L = 170.0                 # A Gesamtlaenge (Auftrag 150-180, A1-mini-Bauraum 180)
N_SE = 2.4                # A Superellipsen-Exponent Querschnitt (2 = Ellipse; 2.4 = weich, Akku-Breite passt)
NPTS = 56                 # A Stuetzpunkte je Querschnitt-Spline
# Griffende x=6 leicht ausgestellt (Knauf 40.4 mm, verhindert Herausrutschen beim Schwung, A)
# Spantstationen x [mm]: Halbbreite a (y), Halbhoehe oben bt, unten bb. Griffzone x 8..105 (>= 97 mm P95-Handbreite)
PX  = [6.0, 15.0, 35.0, 55.0, 70.0, 86.0, 108.0, 134.0, 158.0, 164.0]
PA  = [20.2, 19.4, 19.8, 19.6, 18.9, 18.0, 19.4, 21.8, 21.6, 21.0]   # Taille x~86 (18.0), Kopf ausgestellt 43.6 breit
PBT = [11.0, 11.0, 11.4, 11.4, 11.0, 10.6, 11.8, 13.6, 13.4, 12.8]
PBB = [15.0, 15.6, 16.0, 15.6, 15.0, 14.0, 14.4, 15.4, 15.0, 14.4]
# -> Griffquerschnitt 39.6 x 27.4 mm, Umfang ~107 mm (B), aequivalenter Kreis-Ø ~34 mm: in 30-40 mm (QUELLE oben)
R_END, S_END0 = 7.0, 0.45 # A Stirnrundung: Viertelellipse Laenge 7 mm, Endquerschnitt 45 % (Kantenradius >> 3 mm)
THUMB = dict(x=52.6, sx=13.0, sy=9.0, depth=1.8)    # A Daumenmulde um den Taster (Gauss), Tiefe 1.8
WAVE = dict(x0=10.0, x1=96.0, pitch=21.5, amp=0.9, sy=11.0)   # A Fingerwellen Unterseite (4 Finger), +-0.9 mm
IN_END = 4.5              # A Stirnwandstaerke beidseitig
IN_END_SCALE = 0.92       # A Skalierung Innenquerschnitt an den Stirnseiten
R_EDGE = 3.0              # A Ziel-Mindestradius Aussenkanten (Querschnitt/Stirn, gepruefte Kruemmung)

# --- Schalen ----------------------------------------------------------------------------------
Z_S = 0.0                 # A Trennebene = breiteste Stelle jedes Querschnitts -> keine Aussen-Ueberhaenge beim Druck auf Trennebene
W_T = 2.0                 # A Wandstaerke Oberschale (FDM >= 4 Linien a 0.42)
W_B = 2.0                 # A Wandstaerke Unterschale (alle Varianten gleich -> gleiche Schnittstellen)
W = 2.0                   # A gemeinsame Wandstaerke (Innenkontur = Aussenkontur - W)
# Keine umlaufende Zentrierlippe: sie wuerde ueber die Trennebene ragen und die Druckauflage beider Schalen zerstoeren.
# Zentrierung ueber 4 Schrauben/Dome + Board-Klemmung (Versatz an der Fuge <= Lochspiel 0.2, A).
IN_TAPER = (0.85, 4.0)    # A Innenkontur an den Stirnwaenden auf 85 % verjuengt, Uebergang 4 mm
CLAMP_X = (22.0, 40.0, 66.0)    # A Klemmrippen Oberschale (|y| 11..12.5, Unterkante = Boardoberseite)
BOARD_SUPPORT_X = (72.0, 74.0)  # A Querrippe Board-Auflage hinten (zusaetzlich Akkurahmen-Stirnwaende)

# --- Verbindungselemente (Q: ruthex RX-M2x4, 3djake.com/ruthex/threaded-insert-m2-70-pieces, Abruf 2026-11-07)
INS_D_HOLE = 3.2          # Q Lochdurchmesser 3.1-3.2 (Toleranzkoerper prueft 3.0-3.3)
INS_D_OUT = 3.6           # Q Aussendurchmesser
INS_L = 4.0               # Q Laenge
INS_HOLE_DEPTH = 5.5      # B Einsatz 4.0 + 1.5 Schraubenueberstand
BOSS_D_INS = 6.4          # A Dom-Aussen-Ø >= 1.75 x Einsatz-Ø
# Schraube M2x10 ISO 7045 (Q Norm: dk 4.0, k 1.6)
SCREW_HEAD_D = 4.0
SCREW_HEAD_K = 1.6
SCREW_LEN = 10.0
BOSS_D_SCREW = 7.0        # A Schraubdom Unterschale
D_THROUGH = 2.4           # A Durchgangsloch M2
D_CBORE = 4.4             # A Senkung Schraubenkopf (Kopf 4.0 + 0.4)
SCREWS = [(10.5, -11.5), (10.5, 11.5), (100.0, 0.0), (150.0, 0.0)]   # A Gehaeuseschrauben (Griffende in Board-Ausklinkung, Kopf ausserhalb Antennen-Keep-out)
Z_CB = Z_S - (SCREW_LEN - 3.5)   # B Senkungsgrund: 3.5 mm Gewinde im Einsatz -> -6.5

# --- Board (I: 70 x 25 x 1.0, Loecher (4,12.5),(66,12.5), Bauhoehe oben 3.5) --------------------
BOARD_X0 = 4.6            # A Board-Ursprung x (USB-C-Front 1.1 mm vor Boardkante, A)
BOARD_L, BOARD_W, BOARD_T = 70.0, 25.0, 1.0
Z_BB = -1.0               # A Board-Unterseite; Board-Oberseite = Trennebene (Klemmrippen Oberschale)
BOARD_HOLES_I = [(4.0, 12.5), (66.0, 12.5)]   # I r1 (Konflikt USB-C-Ausschnitt bzw. BLE-Modul, s. Aenderungswunsch)
BOARD_NOTCH = (10.0, 5.0)  # A Aenderungswunsch: Ausklinkung x 0..10, y 0..5 und 20..25 (Boardkoordinaten) fuer Gehaeusedome
BOARD_EDGE_KEEPOUT = 1.5  # A Aenderungswunsch: bauteilfreier Randstreifen laengs (Klemmrippen oben, Auflage unten)
COMP_H = 3.5              # I max. Bauhoehe oben
USB_OVERHANG = 1.1        # A Receptacle ueberragt Boardkante
USB_W, USB_H, USB_D = 8.94, 3.26, 7.35      # Q typ. USB-C-Receptacle (GCT USB4085 Datenblatt-Masse, A Bauform)
USB_SLOT = (9.6, 4.0)     # A Durchbruch Receptacle (0.3 Spiel je Seite)
USB_RECESS = (12.8, 7.0, 3.2)   # A Aussparung Steckerumspritzung (B x H x Tiefe), Steckerfront <= 1 mm vor Receptacle
BUTTON_XY = (48.0, 12.5)  # I Haupttaster (Boardkoordinaten)
BUTTON_SW = (6.0, 6.0, 3.5)     # I/A Taster 6x6, Hoehe 3.5
LED_XY = (38.0, 12.5)     # A ABWEICHUNG zu I (52): siehe Aenderungswunsch, sonst Kollision mit Tastenkappe
LED_SZ = (1.6, 0.8, 0.6)  # A 0603-RGB
BUZZER_XY = (22.0, 12.5)  # I
BUZZER_SZ = (9.0, 9.0, 4.0)     # I (ANNAHME dort)
BLE_XY = (60.0, 12.5)     # I E73 Mittelpunkt (A: x=Mitte)
BLE_SZ = (18.0, 13.0, 2.2)
ANT_KEEPOUT = 5.0         # I

# --- Akku / Motor (I: 503040 5x30x40, 10 g) ----------------------------------------------------
BAT = (40.0, 30.0, 5.0)   # I L x B x H
BAT_X0 = 15.5             # B Schraube x=10.5 (Senkung r=2.2 -> 12.7): Abstand 2.8 >= 2 (REQ-058)
BAT_GAP = 0.25            # A Spiel Akkurahmen
Z_BAT = -7.5              # B Akku-Unterseite (Oberseite -2.5, 1.5 mm Schaum zum Board)
FOAM_T = 1.5              # A PU-Schaum zwischen Akku und Boardunterseite (verpresst)
MOTOR_D, MOTOR_H = 10.0, 2.7    # I Muenzmotor
MOTOR_X = 34.0            # A Muenzmotor unter dem Akku auf dem Boden (Griffmitte, fern Antenne)
RING_T = 1.0              # A Motorring-Wand
CRADLE_Y = (-10.0, 10.0)  # A Laengsrippen unter dem Akku (Mitte frei fuer Motor)
RIB_T = 1.2               # A Rippenstaerke (~3 Linien)

# --- Bedienteile --------------------------------------------------------------------------------
CAP_D = 10.0              # A Tastenkappe
CAP_CLR = 0.2             # A radiales Spiel Kappe/Loch (Toleranzkoerper 0.1-0.4)
CAP_PROUD = 1.5           # A Ueberstand ueber Oberseite
CAP_FLANGE_D = 13.0       # A Verliersicherung
CAP_STEM_D = 3.0
CAP_TRAVEL_GAP = 0.3      # A Luft Stoessel -> Tasterkopf
LP_D = 3.0                # A Lichtleiter-Stab
LP_CLR = 0.1              # A
LP_COLLAR_D = 5.0
LP_PROUD = 0.3
SOUND_HOLES_D = 1.6       # A 5 Loecher ueber Summer
LANYARD = dict(x=6.9, y=3.5, d=2.6, z_tunnel=-8.0)   # A Oese Griffende unten: zwei Bohrungen + Quertunnel

# --- Varianten tragendes Teil (Unterschale) -----------------------------------------------------
BULKHEAD_X = (86.0, 104.0, 122.0, 138.0, 160.0)   # A Schotten im Kopf (nicht an Schraubdomen)
BULKHEAD_T = 1.2
RIB_RING = 4.0            # A Ringtiefe Variante "verrippt + Aussparungen"
FLOOR_RIB = (80.0, 165.0, 4.0)   # A Bodenrippe x0, x1, Hoehe
VARIANTS = ("glatt", "verrippt", "verrippt_ausgespart")
CHOSEN = "glatt"         # A vorlaeufig, Entscheid nach FEM-Vergleich (fem_shell.py)

# --- Werkstoff (Q: Bambu TDS, Abruf 2026-11-07) ---------------------------------------------------
MAT = {"PETG": dict(E_xy=2780.0, E_z=2550.0, Rm_xy=51.0, Rm_z=35.0, rho=1.25),
       "PLA": dict(E_xy=2580.0, E_z=2060.0, Rm_xy=35.0, Rm_z=31.0, rho=1.24)}
NU = 0.38                 # A Querkontraktion
SF = 2.0                  # A Sicherheitsfaktor gegen Rm_z (Schichthaftung, ungunstigste Richtung)

# --- Lastfaelle -----------------------------------------------------------------------------------
F_GRIP = 300.0            # A Handkraft verteilt auf Griffunterseite
M_DEV = 0.120             # I REQ-055 Obergrenze (konservativ)
H_DROP = 1.0              # Auftrag
S_STOP = 2.0              # A Bremsweg (Schale + Boden) fuer statische Ersatzlast
F_SCREW = 150.0           # B M2, Anzugsmoment 0.06 Nm, K 0.2: F = T/(K d) = 0.06/(0.2*0.002)
