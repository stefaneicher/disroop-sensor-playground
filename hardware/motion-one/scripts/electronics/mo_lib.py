"""Projektlokale KiCad-Bibliothek (Symbole + Footprints) fuer Motion One V1 erzeugen.
Masse: E73 aus Ebyte-Datenblatt S.5 (Bottom-Pad-Zeichnung, gespiegelt in Top-View),
XL-1615 und MLT-5020 aus den LCSC-Datenblaettern (siehe electronics/datasheets)."""
import os
D = os.path.join(os.path.dirname(__file__), '../../electronics/kicad/motion-one/')

def sym(name, ref, pins_l, pins_r, w=10.16, desc='', fp='', ds=''):
    import math
    n = max(len(pins_l), len(pins_r)); h = math.ceil((n + 1) / 2) * 2.54
    o = ['(symbol "%s" (pin_names (offset 1.016)) (exclude_from_sim no) (in_bom yes) (on_board yes)' % name]
    for k, v, y in (('Reference', ref, h + 1.27), ('Value', name, -h - 1.27)):
        o.append('(property "%s" "%s" (at 0 %.2f 0) (effects (font (size 1.27 1.27))))' % (k, v, y))
    for k, v in (('Footprint', fp), ('Datasheet', ds), ('Description', desc)):
        o.append('(property "%s" "%s" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))' % (k, v))
    o.append('(symbol "%s_0_1" (rectangle (start %.2f %.2f) (end %.2f %.2f) (stroke (width 0.254) (type default)) (fill (type background))))' % (name, -w / 2, h, w / 2, -h))
    o.append('(symbol "%s_1_1"' % name)
    for side, lst in ((0, pins_l), (1, pins_r)):
        for i, p in enumerate(lst):
            if p is None: continue
            num, pname, typ = p
            y = h - 2.54 * (i + 1)
            x = -w / 2 - 2.54 if side == 0 else w / 2 + 2.54
            o.append('(pin %s line (at %.2f %.2f %d) (length 2.54) (name "%s" (effects (font (size 1.27 1.27)))) (number "%s" (effects (font (size 1.27 1.27)))))' % (typ, x, y, 0 if side == 0 else 180, pname, num))
    o.append('))')
    return '\n'.join(o)

E73 = {1: 'P1.11', 2: 'P1.10', 3: 'P0.03', 4: 'P0.28/AIN4', 5: 'GND', 6: 'P1.13', 7: 'P0.02/AIN0', 8: 'P0.29/AIN5', 9: 'P0.31/AIN7',
       10: 'P0.30/AIN6', 11: 'XL1', 12: 'P0.26', 13: 'XL2', 14: 'P0.06', 15: 'P0.05/AIN3', 16: 'P0.08', 17: 'P1.09', 18: 'P0.04/AIN2',
       19: 'VCC', 20: 'P0.12', 21: 'GND', 22: 'P0.07', 23: 'VDH', 24: 'GND', 25: 'DCH', 26: 'RST/P0.18', 27: 'VBUS', 28: 'P0.15',
       29: 'D-', 30: 'P0.17', 31: 'D+', 32: 'P0.20', 33: 'P0.13', 34: 'P0.22', 35: 'P0.24', 36: 'P1.00', 37: 'SWDIO', 38: 'P1.02',
       39: 'SWCLK', 40: 'P1.04', 41: 'P0.09/NFC1', 42: 'P1.06', 43: 'P0.10/NFC2'}
def t(n): return 'power_in' if E73[n] in ('GND', 'VCC', 'VDH', 'VBUS') else 'bidirectional'
e_l = [(str(n), E73[n], t(n)) for n in range(1, 23)]
e_r = [(str(n), E73[n], t(n)) for n in range(23, 44)]
syms = [
    sym('E73-2G4M08S1C', 'U', e_l, e_r, 20.32, 'Ebyte nRF52840 BLE-Modul, Keramikantenne', 'motion-one:E73-2G4M08S1C',
        'https://www.ebyte.com/en/product-view-news.html?id=905'),
    sym('ICM-45686', 'U', [('8', 'VDD', 'power_in'), ('5', 'VDDIO', 'power_in'), ('12', 'CS', 'input'), ('13', 'SCLK/SCL', 'input'),
                           ('14', 'SDI/SDA', 'bidirectional'), ('1', 'SDO/AD0', 'bidirectional'), ('11', 'NC', 'no_connect')],
        [('4', 'INT1', 'output'), ('9', 'INT2', 'output'), ('6', 'GND', 'power_in'), ('2', 'RESV(GND)', 'passive'),
         ('3', 'RESV(GND)', 'passive'), ('7', 'RESV(GND)', 'passive'), ('10', 'RESV(GND)', 'passive')], 15.24,
        'TDK 6-Achsen-IMU, LGA-14 2.5x3', 'Package_LGA:LGA-14_3x2.5mm_P0.5mm_LayoutBorder3x4y', 'https://www.lcsc.com/product-detail/C22459454.html'),
    sym('FS8205A', 'Q', [('6', 'G1', 'input'), ('1', 'S1', 'passive'), ('2', 'D', 'passive')],
        [('4', 'G2', 'input'), ('3', 'S2', 'passive'), ('5', 'D', 'passive')], 10.16,
        'Dual N-MOSFET 20V 6A, gemeinsamer Drain', 'Package_TO_SOT_SMD:SOT-23-6', 'https://www.lcsc.com/product-detail/C2830320.html'),
]
open(D + 'motion-one.kicad_sym', 'w').write('(kicad_symbol_lib (version 20231120) (generator "mo_lib.py")\n' + '\n'.join(syms) + '\n)\n')

def fp(name, descr, pads, fab, crt, silk=(), extra=''):
    o = ['(footprint "%s" (version 20240108) (generator "mo_lib.py") (layer "F.Cu")' % name, '(descr "%s")' % descr, '(attr smd)',
         '(property "Reference" "REF**" (at 0 %.2f 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))' % (-crt[1] - 0.8),
         '(property "Value" "%s" (at 0 %.2f 0) (layer "F.Fab") (effects (font (size 0.8 0.8) (thickness 0.12))))' % (name, crt[1] + 0.8),
         '(fp_text user "${REFERENCE}" (at 0 0 0) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))',
         '(fp_rect (start %.3f %.3f) (end %.3f %.3f) (stroke (width 0.1) (type solid)) (fill no) (layer "F.Fab"))' % (-fab[0], -fab[1], fab[0], fab[1]),
         '(fp_rect (start %.3f %.3f) (end %.3f %.3f) (stroke (width 0.05) (type solid)) (fill no) (layer "F.CrtYd"))' % (-crt[0], -crt[1], crt[0], crt[1])]
    for a, b in silk:
        o.append('(fp_line (start %.3f %.3f) (end %.3f %.3f) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))' % (a + b))
    for num, x, y, w, h in pads:
        o.append('(pad "%s" smd roundrect (at %.4f %.4f) (size %.3f %.3f) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.15))' % (num, x, y, w, h))
    o.append(extra + ')')
    open(D + 'motion-one.pretty/%s.kicad_mod' % name, 'w').write('\n'.join(o) + '\n')

# E73 Top-View: Antenne bei +y (y=+9), Pins 1..10 rechts (x=+6.5), 26..43 links, 11..25 oben (y=-9)
P = []
for n in range(1, 11):  # rechts, 10 oben .. 1 unten
    P.append((str(n), 6.2, -6.4 + (10 - n) * 1.27, 1.4, 0.8))
outer_l = [26, 27, 29, 31, 33, 35, 37, 39, 41, 43]
for j, n in enumerate(outer_l):
    P.append((str(n), -6.2, -6.4 + 1.27 * j, 1.4, 0.8))
for j, n in enumerate(range(28, 43, 2)):
    P.append((str(n), -4.4, -9 + 4.505 + 1.27 * j, 0.8, 0.8))
for k, n in enumerate(range(11, 26, 2)):
    P.append((str(n), 4.445 - 1.27 * k, -8.7, 0.8, 1.4))
for k, n in enumerate(range(12, 25, 2)):
    P.append((str(n), 3.81 - 1.27 * k, -6.9, 0.8, 0.8))
fp('E73-2G4M08S1C', 'Ebyte E73-2G4M08S1C 13x18x3mm, 43 Pads P1.27, Pads aus Datenblatt S.5 (Top-View), Antenne unten (+y), Antennenbereich ab y=+5.6 kupferfrei',
   P, (6.5, 9.0), (6.75, 9.25), [((-6.6, 5.6), (6.6, 5.6)), ((-6.6, 5.6), (-6.6, 9.1)), ((6.6, 5.6), (6.6, 9.1)), ((-6.6, 9.1), (6.6, 9.1))],
   '(fp_text user "ANT KEEPOUT" (at 0 7.3 0) (layer "F.Fab") (effects (font (size 0.8 0.8) (thickness 0.12))))')
fp('LED_XL-1615RGBC', 'XINGLIGHT XL-1615RGBC-RF 1.6x1.5mm, 1=R-K 2=A 3=G-K 4=B-K', [('1', -0.625, -0.475, 0.65, 0.45), ('2', -0.625, 0.475, 0.65, 0.45),
   ('3', 0.625, -0.475, 0.65, 0.45), ('4', 0.625, 0.475, 0.65, 0.45)], (0.8, 0.75), (1.2, 1.0), [((-1.15, -0.95), (-1.15, -0.2))])
fp('Buzzer_MLT-5020', 'Jiangsu Huawha MLT-5020 5x5x2mm, 4 Eckpads (1=+ links), Masse Datenblatt Kap.4 ANNAHME Padgroesse',
   [('1', -1.6, 1.75, 1.0, 1.2), ('1', -1.6, -1.75, 1.0, 1.2), ('2', 1.6, 1.75, 1.0, 1.2), ('2', 1.6, -1.75, 1.0, 1.2)],
   (2.5, 2.5), (2.75, 2.75), [((-2.6, 2.7), (-2.6, -2.7))], '(fp_text user "+" (at -3.1 2.2 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))')
fp('MotorPads_2x1.5', 'Loetpads fuer Vibrationsmotor-Litzen 1=+ 2=-', [('1', -1.5, 0, 2.0, 1.5), ('2', 1.5, 0, 2.0, 1.5)], (2.5, 0.75), (2.75, 1.0))
print('ok', len(P))
