"""Aktualisiert management/INTERFACES.json r1 -> r2 (pcb-engineer) unter Lock."""
import json, os, sys
B = os.path.join(os.path.dirname(__file__), '..', '..')
F = os.path.join(B, 'management', 'INTERFACES.json')
L = os.path.join(B, 'management', 'locks', 'INTERFACES.json.lock')
os.makedirs(os.path.dirname(L), exist_ok=True)
if os.path.exists(L):
    sys.exit('Lock existiert: ' + open(L).read())
open(L, 'w').write('pcb-engineer 2026-11-08 r1->r2\n')
try:
    d = json.load(open(F))
    assert d['revision'] == 'r1'
    d['revision'] = 'r2'
    d['status'] = ('Elektronik-Stand V1 (pcb-engineer, 2026-11-08): Positionen aus geroutetem KiCad-Layout '
                   'electronics/kicad/motion-one/motion-one.kicad_pcb (QUELLE), Hoehen aus export/heights.json; '
                   'Abstimmung Mechanik offen')
    b = d['board']
    b['mounting_holes'] = [
        {"x": 3.5, "y": 21.5, "d": 2.2, "screw": "M2"},
        {"x": 48.6, "y": 12.5, "d": 2.2, "screw": "M2",
         "note": "von x=66 verschoben: Modul+Antennen-Keepout belegen x 51.3..70"}]
    b['max_component_height_mm'] = {"top": 4.25, "bottom": 0,
        "note": "4.25 = JST-PH J2 (ANNAHME); ohne J2 3.5 (SW1). Option V2: JST-SH 1.0 -> 3.5"}
    b['antenna_keepout'] = {"x_min": 66.2, "x_max": 70, "layers": "alle", "note": "kein Metall/Akku/Motor <= 5 mm"}
    b['step'] = "electronics/kicad/motion-one/export/motion-one-board.step"
    b['heights_table'] = "electronics/kicad/motion-one/export/heights.json"
    p = d['positions']
    p['usb_c'].update({"x": 0, "y": 12.5, "height_mm": 3.26, "part": "HRO TYPE-C-31-M-12",
                       "note": "Buchse ragt ca. 0.6 mm ueber Board-Kante x=0"})
    p['ble_module'].update({"x": 60.6, "y": 12.5, "height_mm": 3.0, "rotation_deg": 90})
    p['imu'].update({"x": 32.5, "y": 12.5})
    p['button_main'].update({"x": 42.3, "y": 12.5, "height_mm": 1.5, "part": "TS-1187A 5.1x5.1"})
    p['button_power'] = {"x": 11, "y": 23.2, "side": "Seitenkante y=25", "type": "Schiebeschalter MSK12C02",
                         "height_mm": 3.5, "note": "Hebel zeigt nach +y ueber Kante"}
    p['led_rgb'].update({"x": 37, "y": 12.5, "part": "XL-1615RGBC 1.6x1.5"})
    p['buzzer'].update({"x": 22, "y": 13.2, "size_mm": "5x5x2", "part": "MLT-5020"})
    p['motor'].update({"pads_x": 26, "pads_y": 2.5, "location": "im Griff am Akku, Coin-Motor ueber Litzen an Lotpads J3"})
    p['battery_connector'].update({"x": 15.5, "y": 5.2, "height_mm": 4.25})
    p['swd_pads'] = {"x": 40, "y": 3.5, "type": "Tag-Connect TC2030-IDC-NL (Pads, kein Bauteil)",
                     "signals": ["VDD", "SWDIO", "RESET", "SWCLK", "GND", "NC"], "side": "oben"}
    p['charge_led'] = {"note": "Lade-LED D5 rot an CHRG, Position siehe heights.json"}
    d['connectors']['debug'] = "Tag-Connect TC2030 (Pads)"
    d['pinout'] = "electronics/PINOUT_V1.json"
    json.dump(d, open(F, 'w'), indent=2, ensure_ascii=False)
    print('INTERFACES r2 geschrieben')
finally:
    os.remove(L)
