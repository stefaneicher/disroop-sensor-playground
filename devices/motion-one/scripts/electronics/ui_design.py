"""Motion One Bedienplatine motion-one-ui (r4, 2026-11-08): Analog-Stick RKJXV1224005 + Touch TTP233H-BA6 + JST-SH 8p (Gegenstueck zu J5 Hauptboard).
PCB-Koordinaten mm, y nach unten, Platine 0..W x 0..H."""
PROJ, LOCALLIB, SYMLIB = 'motion-one-ui', 'ui', '../../electronics/kicad/motion-one-ui/lib/ui.kicad_sym'
W, H = 41.0, 27.0
R04, C04 = 'Resistor_SMD:R_0402_1005Metric', 'Capacitor_SMD:C_0402_1005Metric'
P = {
 'SW1': ('ui', 'RKJXV1224005', 'RKJXV1224005', 'ui:SW-TH_RKJXV1224005', 'C146170', 12.0, 13.5, 0),
 'U1': ('ui', 'TTP233H-BA6', 'TTP233H-BA6', 'ui:SOT-23-6_L2.9-W1.7-P0.95-LS2.8-BL', 'C2890349', 24.5, 9.0, 0),
 'J1': ('Connector_Generic_MountingPin', 'Conn_01x08_MountingPin', 'EXT JST-SH 8p', 'Connector_JST:JST_SH_SM08B-SRSS-TB_1x08-1MP_P1.00mm_Horizontal', 'C160407', 33.0, 23.4, 0),
 'E1': ('Connector_Generic', 'Conn_01x01', 'TouchPad', 'ui:TouchPad_10x10', '', 32.0, 8.0, 0),
 'R1': ('Device', 'R', '100', R04, 'C25076', 28.5, 17.0, 90), 'R2': ('Device', 'R', '100', R04, 'C25076', 29.7, 17.0, 90),
 'R3': ('Device', 'R', '100', R04, 'C25076', 30.9, 17.0, 90), 'R4': ('Device', 'R', '100', R04, 'C25076', 32.1, 17.0, 90),
 'R5': ('Device', 'R', '1k', R04, 'C11702', 24.5, 12.6, 0),
 'C1': ('Device', 'C', '100nF', C04, 'C1525', 24.5, 5.6, 0),
 'H1': ('Mechanical', 'MountingHole', 'M2', 'MountingHole:MountingHole_2.2mm_M2', '', 37.5, 17.0, 0),
 'H2': ('Mechanical', 'MountingHole', 'M2', 'MountingHole:MountingHole_2.2mm_M2', '', 24.0, 23.5, 0),
}
N = {
 '3V3': 'J1.1 SW1.3 SW1.4 U1.5 C1.1',
 'GND': 'J1.8 J1.MP SW1.1 SW1.6 SW1.7 SW1.8 SW1.9 SW1.10 SW1.b SW1.d U1.2 U1.4 U1.6 C1.2',
 'EXT1': 'J1.2 R1.1', 'STICK_X': 'R1.2 SW1.2', 'EXT2': 'J1.3 R2.1', 'STICK_Y': 'R2.2 SW1.5',
 'EXT4': 'J1.5 R3.1', 'STICK_BTN': 'R3.2 SW1.a SW1.c', 'EXT5': 'J1.6 R4.1', 'TOUCH_Q': 'R4.2 U1.1',
 'TOUCH_PAD': 'E1.1 R5.1', 'TOUCH_I': 'R5.2 U1.3',
}
N = {k: [tuple(t.rsplit('.', 1)) for t in v.split()] for k, v in N.items()}
NC = [('J1', '4'), ('J1', '7')]
