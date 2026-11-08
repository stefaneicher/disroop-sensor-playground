"""Aktualisiert management/INTERFACES.json r2 -> r3 (pcb-engineer) unter Lock; Positionen aus export/heights.json (QUELLE Layout)."""
import json, os, sys, datetime
B = os.path.join(os.path.dirname(__file__), '..', '..')
F = os.path.join(B, 'management', 'INTERFACES.json')
L = os.path.join(B, 'management', 'locks', 'INTERFACES.json.lock')
os.makedirs(os.path.dirname(L), exist_ok=True)
if os.path.exists(L): sys.exit('Lock existiert: ' + open(L).read())
open(L, 'w').write('pcb-engineer %s r2->r3\n' % datetime.datetime.now().isoformat(timespec='minutes'))
try:
    H = {r[0]: r for r in json.load(open(os.path.join(B, 'electronics/kicad/motion-one/export/heights.json')))}
    pos = lambda r: {"x": round(H[r][4], 2), "y": round(H[r][5], 2), "height_mm": H[r][2]}
    d = json.load(open(F)); assert d['revision'] == 'r2'
    d['revision'] = 'r3'
    d['status'] = ('Board r3 (pcb-engineer, 2026-11-08): Mechanik-Forderungen 1-7 aus Handoff mechanical-engineer 2026-11-07 umgesetzt; '
                   'Positionen aus geroutetem Layout (QUELLE heights.json); Mechanik-Abnahme offen')
    b = d['board']
    b['outline_mm']['shape'] = 'laenglich, Kopfende Ecken R2, Griffende Ausklinkungen fuer Schraubdome'
    b['notches'] = [{"x_min": 0, "x_max": 10, "y_min": 0, "y_max": 5}, {"x_min": 0, "x_max": 10, "y_min": 20, "y_max": 25}]
    b['notch_note'] = 'Schraubdome bei Board (10.5; 12.5+-11.5) sitzen in den Ausklinkungen; Zone bauteilfrei'
    b['mounting_holes'] = []
    b['mounting_note'] = 'H1/H2 entfernt (r3); Board wird ueber Randstreifen geklemmt'
    b['edge_strip_mm'] = {"width": 1.5, "edges": "y=0 und y=25 (laengs)", "component_free": True,
                          "exception": "SW1-Hebel/Koerper an y=25 (Hebel muss ueber Kante ragen, seitlicher Durchbruch)"}
    b['max_component_height_mm'] = {"top": 3.5, "bottom": 0, "note": "3.5 = SW1 MSK12C02 (ANNAHME); J2 JST-SH 2.9 (QUELLE LCSC C160402)"}
    p = d['positions']
    p['button_main'].update(pos('SW2'), part="TS-1187A 5.1x5.1", rotation_deg=90)
    p['led_rgb'].update(pos('D4'), part="XL-1615RGBC 1.6x1.5")
    p['button_power'].update(pos('SW1'), side="Seitenkante y=25", note="Hebel zeigt nach +y ueber Kante; Gehaeuse-Durchbruch noetig")
    p['buzzer'].update(pos('BZ1'))
    p['motor'].update(pads_x=pos('J3')['x'], pads_y=pos('J3')['y'])
    p['battery_connector'] = dict(pos('J2'), type="JST-SH 1.0 mm 2-polig SM02B-SRSS-TB, horizontal, Steckrichtung -y",
                                  part="C160402", note="Akku-Kabel mit JST-SHR-02V-S Stecker")
    p['swd_pads'].update({k: v for k, v in pos('J4').items() if k != 'height_mm'})
    p['charge_led'] = dict(pos('D5'), note="Lade-LED D5 rot an CHRG")
    p['testpoints'] = {r: pos(r) for r in ('TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6')}
    d['connectors']['battery'] = 'JST-SH 1.0 2-polig'
    json.dump(d, open(F, 'w'), indent=2, ensure_ascii=False)
    print('INTERFACES r3 geschrieben')
finally:
    os.remove(L)
