"""INTERFACES.json r3 -> r4 (pcb-engineer, Q-04) unter Lock; Positionen aus heights.json (QUELLE Layout)."""
import json, os, sys, datetime
B = os.path.join(os.path.dirname(__file__), '..', '..')
F = os.path.join(B, 'management', 'INTERFACES.json'); L = os.path.join(B, 'management', 'locks', 'INTERFACES.json.lock')
if os.path.exists(L): sys.exit('Lock existiert: ' + open(L).read())
open(L, 'w').write('pcb-engineer %s r3->r4\n' % datetime.datetime.now().isoformat(timespec='minutes'))
try:
    H = {r[0]: r for r in json.load(open(os.path.join(B, 'electronics/kicad/motion-one/export/heights.json')))}
    pos = lambda r: {"x": round(H[r][4], 2), "y": round(H[r][5], 2), "height_mm": H[r][2]}
    d = json.load(open(F)); assert d['revision'] == 'r3'
    d['revision'] = 'r4'
    d['status'] = 'Board r4 (pcb-engineer, 2026-11-08, Q-04): J5 Erweiterungsstecker + 2x M2; Mechanik-Abnahme offen (Gehaeuse r3 hat keinen J5-Durchbruch)'
    b = d['board']
    b['mounting_holes'] = [dict(ref=r, x=round(H[r][4], 2), y=round(H[r][5], 2), drill_mm=2.2, pad_mm=None, screw="M2", keepout_d_mm=4.4) for r in ('H1', 'H2')]
    b['mounting_note'] = 'r4: H1/H2 M2 (NPTH 2.2) fuer Eigen-Gehaeuse; Motion-One-Gehaeuse klemmt weiterhin ueber Randstreifen'
    b['edge_strip_mm']['exception'] = 'SW1 an y=25; J5 an y=0 (Steckoeffnung zur Kante); H2-Keepout-Ring beruehrt Randstreifen y=0'
    d['positions']['expansion_connector'] = dict(pos('J5'), ref='J5', type='JST-SH 1.0 mm 8-polig SM08B-SRSS-TB liegend, Steckrichtung zur Kante y=0',
        part='C160407', pins={"1": "3V3 (max. 10 mA)", "2": "EXT1 P0.29/AIN5", "3": "EXT2 P0.30/AIN6", "4": "EXT3 P0.31/AIN7",
        "5": "EXT4 P0.03/AIN1", "6": "EXT5 P1.11 GPIO", "7": "RSV (NC)", "8": "GND"})
    d['positions']['testpoints'] = {r: pos(r) for r in ('TP1', 'TP2', 'TP5', 'TP6')}
    d['connectors']['expansion'] = 'JST-SH 1.0 8-polig (J5), Gegenstueck Bedienplatine J1'
    d['ui_board'] = {"project": "electronics/kicad/motion-one-ui", "outline_mm": {"length": 41.0, "width": 27.0, "thickness": 1.6, "corner_r": 2.0},
        "origin": "Ecke oben links (KiCad), y nach unten", "layers": 2,
        "mounting_holes": [{"ref": "H1", "x": 37.5, "y": 17.0, "drill_mm": 2.2}, {"ref": "H2", "x": 24.0, "y": 23.5, "drill_mm": 2.2}],
        "stick": {"ref": "SW1", "part": "Alps RKJXV1224005 C146170", "x": 12.0, "y": 13.5, "note": "Bauhoehe/Hebel gemaess Datenblatt, THT"},
        "touch_pad": {"ref": "E1", "x": 32.0, "y": 8.0, "size_mm": [10, 10], "note": "Gehaeusewand darueber <= 2 mm Kunststoff (ANNAHME)"},
        "connector": {"ref": "J1", "x": 33.0, "y": 23.4, "part": "C160407", "height_mm": 2.9, "orientation": "Steckoeffnung zur Kante y=27"},
        "step": "electronics/kicad/motion-one-ui/export/motion-one-ui-board.step"}
    json.dump(d, open(F, 'w'), indent=2, ensure_ascii=False); print('INTERFACES r4 geschrieben')
finally:
    os.remove(L)
