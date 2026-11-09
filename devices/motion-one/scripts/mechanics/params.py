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
# Fuegestelle nach ADR-0001 (User-Entscheid): Lippe an der Unterschale, Nut in der Oberschale, Schattenfuge aussen.
# Abstaende d in mm von der Aussenkontur der Trennebene (Draufsicht) nach innen.
LIP_D0 = 1.8              # A Lippe Aussenkante ab Aussenkontur (Unterschalen-Auflage 0.5..1.2 bleibt als Anlageflaeche)
LIP_W = 1.2               # Q ADR-0001 Lippenbreite
LIP_H = 2.0               # Q ADR-0001 Lippenhoehe ueber Trennebene
GROOVE_CLR = 0.25         # A ADR-0001 nennt 0.2; r3 auf 0.25 erhoeht wegen SLS PA12 JLC3DP (+-0.2 mm) und FDM-Eigendruck; Toleranzkoerper MESSUNG NOT RUN
GROOVE_TOP = 0.2          # A Luft Lippenstirn -> Nutgrund (Anlage nur auf der Trennebene)
BAND_T = 1.2              # A Nut-Innenwand (lokale Verdickung innen, nur Fuegeband; Nennwand W bleibt 2.0)
BAND_Z = (-3.0, 3.4)      # A Hoehe des Fuegebands (unten Lippenwurzel, oben Nutgrund + 1.2)
SHADOW = 0.5              # Q ADR-0001 Schattenfuge 0.5 x 0.5 = 45-Grad-Fase je Schale
SW1_LIP_GAP = 0.2         # A Lippe im SW1-Fenster unterbrochen (Fensterlaenge + 2 x 0.2)
IN_TAPER = (0.85, 4.0)    # A Innenkontur an den Stirnwaenden auf 85 % verjuengt, Uebergang 4 mm
CLAMP_X = (40.0,)               # A r4: Klemmrippe beidseitig (|y| 11..12.5, Unterkante = Boardoberseite); x=66 -y kollidiert mit J5
CLAMP_X_POS = (33.0, 67.0)      # A r3: nur +y (SW1-Hebel frei); r4: 67 statt 66 (Abstand Kopf H2-Schraube)
CLAMP_X_NEG = (26.5, 53.0)      # A r3: nur -y (J2 frei); r4: 53 statt 66 (J5 Geraet x ~57-69 frei, zwischen J4 und C8)
CLAMP_VIA_INNER = ((33.0, 1), (40.0, 1), (67.0, 1))   # r4: diese Rippen per Innenraum-Subtraktion (Fusion mit Aussenhaut scheiterte)
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
COMP_H = 3.5              # I r3 max. Bauhoehe oben (SW1)
BOARD_STEP = "electronics/kicad/motion-one/export/motion-one-board.step"   # I r4 (14:40) (z=0 Board-Unterseite, y wie INTERFACES)
SW1_XY = (20.0, 23.2)     # I r3 Schiebeschalter MSK12C02, Hebel +y
SW1_WIN = (7.0, -0.3, 3.8)  # A seitlicher Durchbruch Oberschale: Laenge x, z0, z1 (Hebelweg +-1.5 + Spiel)
SW1_LEVER = dict(w=1.4, y_tip=13.55, z0=1.0, z1=2.5)   # A MSK12C02-Hebel (Datenblatt NICHT geprueft): Breite x, Spitze y (Geraet), z-Bereich
SLIDER = dict(travel=1.5, clr=0.2, shaft_w=3.6, z0=0.3, z_shaft=3.6, z_collar=4.4, collar_w=11.4, collar_y=(13.95, 14.95),
              y_in=13.05, slot_w=1.6, slot_y=14.8, slot_z=2.7, grip_w=10.0, grip_gap=0.3, grip_t=1.5, grip_z=4.6,
              groove_pitch=1.6, groove_w=0.8, groove_d=0.6, n_groove=5)   # A Schieber (Griffkappe)
CLIP = dict(t=1.0, head_h=0.8, engage=0.7, y_beam=13.0, z_root=-14.0)   # A Schnapphaken: Balken y 13.0..14.0, Kopf 0.8 hoch, 0.7 ueber Boardkante
CLIPS = [(+1, 68.1, 73.6), (+1, 58.3, 60.8), (-1, 70.0, 74.0)]   # A (Seite, x0, x1) Geraet; Mittelbereich durch Akkurahmen/J5/H2 blockiert
SERVICE_J4 = (6.0, 5.0)   # A Servicedurchbruch Oberschale ueber J4 (Tag-Connect, Board 45.0/21.4), Breite x Tiefe y
J4_XY = (45.0, 21.4)      # I r4 PCB-Handoff
J2_XY = (14.5, 5.1)       # I r3 JST-SH SM02B-SRSS-TB, Steckrichtung -y
J2_PLUG = (5.0, 4.5, 3.0)   # A SHR-02V-S-Stecker + Biegeradius Litze: Breite x, Laenge -y ab Receptacle-Front, Hoehe
CABLE_NOTCH = (16.0, 23.0)  # A Kabelschlitz im Akkurahmen -y (Geraet x) fuer Akku-Litze zum J2
USB_OVERHANG = 0.7        # Q r3 Board-STEP J1 x -0.69
USB_W, USB_H, USB_D = 8.94, 3.26, 7.35      # Q typ. USB-C-Receptacle (GCT USB4085 Datenblatt-Masse, A Bauform)
USB_ZTOP = 4.26           # Q r3 Board-STEP: J1-Oberkante z=4.26 (Geraetekoordinaten) > USB_H -> Kollision r3 (2.2 mm3)
USB_SLOT = (11.4, USB_ZTOP + 0.6)   # A r3: Board-STEP J1-Schale 10.74 breit (y +-5.37) + 0.3 Spiel je Seite; z -0.3 .. USB_ZTOP+0.3
USB_RECESS = (14.0, 8.0, 4.45)   # A r4-USB: 1.0 mm Luft vor Umspritzung (Front x=3.45), mittig auf J1 (USB_RECESS_ZC)
USB_RECESS_ZC = USB_ZTOP - USB_H / 2   # B 2.63
#   # A Aussparung Steckerumspritzung (B x H x Tiefe), Steckerfront <= 1 mm vor Receptacle
BUTTON_XY = (48.0, 12.5)  # I Haupttaster (Boardkoordinaten)
BUTTON_SW = (5.1, 5.1, 1.5)     # I r3 TS-1187A 5.1x5.1, Hoehe 1.5 (ANNAHME pcb)
LED_XY = (38.0, 12.5)     # I r3
LED_SZ = (1.6, 1.5, 0.55) # I r3 XL-1615RGBC
BUZZER_XY = (27.2, 12.4)  # I r3
BUZZER_SZ = (5.0, 5.0, 2.0)     # I r3 MLT-5020
BLE_XY = (60.6, 12.5)     # I r3
BLE_SZ = (18.0, 13.0, 3.0)   # I r3 Hoehe 3.0
ANT_KEEPOUT = 5.0         # I

# --- Akku / Motor (I: 503040 5x30x40, 10 g) ----------------------------------------------------
BAT = (40.0, 30.0, 5.0)   # I L x B x H
BAT_X0 = 15.5             # B Schraube x=10.5 (Senkung r=2.2 -> 12.7): Abstand 2.8 >= 2 (REQ-058)
BAT_GAP = 0.25            # A Spiel Akkurahmen
Z_BAT = -7.5              # B Akku-Unterseite (Oberseite -2.5, 1.5 mm Schaum zum Board)
FOAM_T = 1.5              # A PU-Schaum zwischen Akku und Boardunterseite (verpresst)
MOTOR_D, MOTOR_H = 8.0, 2.7     # Q r4 LCM0827A3038F (INTERFACES positions.motor, Datenblatt S.9)
MOTOR_POCKET = (8.6, 3.2)       # I r4 Mulde D x Tiefe (INTERFACES: Spiel 0.3 radial, ANNAHME)
MOTOR_POCKET_TOP = -7.8         # A Podest-Oberkante = Akku-Unterseite Z_BAT - 0.3 (Akku liegt auf Wiegerippen)
MOTOR_LEAD_CH = (3.2, 2.0)      # A Litzenkanal Breite x Tiefe (Zunge 3.0 breit, 2x AWG32), Richtung -y zum J3 (Board 29.5;2.7)
# r4 Board-Befestigung (ADR-0004): H2 Dom selbstschneidend, H1 kein Dom (Akku x 15.5..55.5 unter H1)
H_DOME = [(58.5, 22.8)]         # I r4 H2 (Boardkoordinaten); H1 (42.4;12.7) liegt ueber dem Akku -> kein Dom
H_DOME_D = 5.0                  # A Dom-Aussen-D (>= 2.5 x Kernloch)
H_PILOT = (1.7, 6.0)            # A Kernloch D x Tiefe fuer M2-Kunststoff-Gewindeformer (PA12), Schraube M2x6
# r4 J5 Kabeldurchfuehrung (Erweiterung JST-SH 8p, Stecker bleibt innen)
J5_XY = (58.5, 3.35)            # I r4
J5_SLOT = (9.5, -0.2, 2.8)      # A Schlitz Breite x, z0, z1 = 9.5 x 3.0 (8 Adern AWG32 Teilung 1.0 -> 8.0 breit; >= 1.5 x 4 erfuellt)
J5_POCKET = (11.0, -0.4, 3.4, 3.8)   # A Steckertasche innen: Breite, z0, z1, Tiefe ab Boardkante (Stecker SHR-08V-S 10.0 breit, ANNAHME)
J5_ENV = (11.0, 4.25, 2.9)      # Q Huellkoerper SM08B-SRSS-TB (LCSC C160407, JST SH 8-pol. seitlich): A=11.0, Tiefe 4.25, Hoehe 2.9 (QUELLE Datenblatt JST SH)
J5_PLUG = (10.0, 3.0, 2.9)      # A Stecker SHR-08V-S Ueberstand ueber Boardkante (-y)
J5_CHAMF = (0.6, 0.6)           # A Fase aussen / innen (45 Grad)
MOTOR_X = 34.0            # A Muenzmotor unter dem Akku in Mulde (Griffmitte, Antenne-Abstand >= 30 mm)
MOTOR_Y = -5.0            # A r4 aus Mitte Richtung J3 (Litze 27 mm reicht: 6.7 + 10 + 6 = 23 mm, BERECHNUNG)
RING_T = 1.0              # A Motorring-Wand
CRADLE_Y = (-10.0, 10.0)  # A Laengsrippen unter dem Akku (Mitte frei fuer Motor)
RIB_T = 1.2               # A Rippenstaerke (~3 Linien)

# --- Bedienteile --------------------------------------------------------------------------------
CAP_D = 10.0              # A Tastenkappe
CAP_CLR = 0.2             # A radiales Spiel Kappe/Loch (Toleranzkoerper 0.1-0.4)
CAP_PROUD = 1.5           # A Ueberstand ueber Oberseite
CAP_FLANGE_D = 13.0       # A Verliersicherung
CAP_STEM_D = 3.0
CAP_TRAVEL_GAP = 0.1      # A Luft Stoessel -> Tasterkopf (bewusst lang: nachfeilen statt neu drucken)
LP_D = 3.0                # A Lichtleiter-Stab
LP_CLR = 0.2              # A
LP_GAP = 0.0              # Luft Lichtleiter -> LED (bewusst lang: nachfeilen)
LP_COLLAR_D = 5.0
LP_PROUD = 0.3
SOUND_HOLES_D = 1.2       # A 5 Loecher ueber Summer (r3 5x5 -> Teilung 2.0)
SOUND_PITCH = 2.0
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

# --- r4 Nachtrag 2026-11-09 -----------------------------------------------------------------------
BAT_TABS = dict(xs=(28.3, 45.7), len=5.6, over=0.4, z0=-2.4, z1=-1.0)   # A Halte-Nasen am Akkurahmen: ragen 0.4 mm ueber die Akkukante (Luft 0.1 zur Akku-Oberseite), Beutelzelle gibt nach
J1_RIB = dict(x0=6.0, x1=8.0, hw=6.0)   # A Querrippe unter Board hinter J1: Steckkraft USB-C in die Unterschale (KEINE Kabelzugentlastung)
