"""Fertigungsdaten (JLC BOM/CPL), Bauhoehen, PINOUT und STEP (cadquery-Quader) aus Board + mo_design.py."""
import csv, json, os, re, sys, zipfile, glob, pcbnew as P
sys.path.insert(0, os.path.dirname(__file__))
import mo_design as D
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
K, M = R + '/electronics/kicad/motion-one/', R + '/manufacturing/pcba/'
b = P.LoadBoard(K + 'motion-one.kicad_pcb')
b.GetDesignSettings().SetBoardThickness(P.FromMM(1.0)); P.SaveBoard(K + 'motion-one.kicad_pcb', b)
ROT = [('^SOT-23', -90), ('^SOIC-', 270), ('^USB_C_Receptacle_HRO_TYPE-C-31-M-12', 180), ('^JST_PH_S', 180), ('^JST_SH_SM', 180)]
# Bauhoehe mm ueber Platine (Q = Datenblatt QUELLE, A = ANNAHME)
HT = {'E73': (3.0, 'A'), 'USB_C': (3.26, 'Q'), 'JST_PH': (4.25, 'A'), 'JST_SH': (2.9, 'Q'), 'MSK12C02': (3.5, 'A'), 'TS-1187A': (1.5, 'A'),
      'MLT-5020': (2.0, 'Q'), 'SOIC': (1.75, 'Q'), 'SOT-23': (1.2, 'Q'), 'LGA': (0.81, 'Q'), 'Crystal': (0.9, 'A'),
      'C_0805': (1.35, 'A'), 'C_0603': (0.95, 'A'), 'C_0402': (0.55, 'A'), 'R_': (0.55, 'A'), 'SOD-123': (1.35, 'Q'),
      'LED_0603': (0.8, 'A'), 'XL-1615': (0.55, 'A'), 'TestPoint': (0.05, 'A'), 'MotorPads': (0.05, 'A'), 'Tag-Connect': (0.05, 'A'),
      'MountingHole': (0, 'A')}
def height(fp):
    for k, v in HT.items():
        if k in fp: return v
    return (2.0, 'A')
cpl, rows, hts, boxes = [], {}, [], []
for fp in b.GetFootprints():
    ref = fp.GetReference(); d = D.P[ref]; name = fp.GetFPID().GetLibItemName().wx_str()
    x, y = P.ToMM(fp.GetPosition().x), P.ToMM(fp.GetPosition().y); rot = fp.GetOrientationDegrees()
    h, src = height(name)
    c = fp.GetCourtyard(P.F_CrtYd)
    bb = fp.GetBoundingBox(False) if not c.OutlineCount() else c.BBox()
    bx = [P.ToMM(v) for v in (bb.GetX(), bb.GetY(), bb.GetRight(), bb.GetBottom())]
    if h > 0.1: boxes.append((ref, bx, h))
    hts.append((ref, name, h, src, x, 25 - y))
    if not d[4]: continue
    corr = next((r for pat, r in ROT if re.match(pat, name)), 0)
    cpl.append([ref, '%.3f' % x, '%.3f' % -y, 'Top', '%g' % ((rot + corr) % 360)])
    rows.setdefault(d[4], [d[2], name, [], d[4]])[2].append(ref)
os.makedirs(M, exist_ok=True)
with open(M + 'CPL_motion-one_JLC.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['Designator', 'Mid X', 'Mid Y', 'Layer', 'Rotation']); w.writerows(sorted(cpl))
with open(M + 'BOM_motion-one_JLC.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['Comment', 'Designator', 'Footprint', 'LCSC Part #'])
    for v in sorted(rows.values(), key=lambda r: r[2][0]): w.writerow([v[0], ','.join(sorted(v[2])), v[1], v[3]])
z = zipfile.ZipFile(M + 'motion-one_gerber_r4.zip', 'w', zipfile.ZIP_DEFLATED)
for g in sorted(glob.glob(M + 'gerber/*')): z.write(g, os.path.basename(g))
z.close()
json.dump(sorted(hts), open(K + 'export/heights.json', 'w'), indent=1)
# PINOUT
pn = json.load(open(K + 'motion-one.kicad_sch.uuids.json'))['pinname']
use = {'BTN': 'Taster aktiv low, interner Pull-up', 'MOT_EN': 'Motor-FET Gate, high=an (100k Pull-down)', 'BUZ_PWM': 'Summer-FET Gate PWM 2-4 kHz (100k Pull-down)',
       'LED_B': 'RGB blau, aktiv low (Common-Anode 3V3)', 'LED_G': 'RGB gruen, aktiv low', 'LED_R': 'RGB rot, aktiv low', 'XL1': '32.768 kHz', 'XL2': '32.768 kHz',
       'IMU_INT2': 'IMU INT2, push-pull', 'IMU_SCK': 'SPI SCK (SPIM, bis 8 MHz)', 'VBAT_EN': 'Teiler-Freigabe high=an (Messung), sonst low',
       'IMU_MOSI': 'SPI MOSI', 'IMU_MISO': 'SPI MISO', 'VBAT_ADC': 'SAADC AIN2, Vbat/2, Freigabe >= 25 ms vor Messung (tau 5 ms, 1%)', 'IMU_CS': 'SPI CS aktiv low',
       'IMU_INT1': 'IMU INT1 (Data-ready/Wake-on-motion), push-pull', 'NRESET': 'Reset (TC2030)', 'USB_DM': 'USB D-', 'USB_DP': 'USB D+',
       'SWDIO': 'SWD', 'SWCLK': 'SWD',
       'EXT1': 'J5.2 EXT1, SAADC AIN5 (Stick X), 0..3V3', 'EXT2': 'J5.3 EXT2, SAADC AIN6 (Stick Y), 0..3V3', 'EXT3': 'J5.4 EXT3, SAADC AIN7 (frei/analog)',
       'EXT4': 'J5.5 EXT4, GPIO/AIN1 (Stick-Taste aktiv low, interner Pull-up)', 'EXT5': 'J5.6 EXT5, GPIO (Touch-Ausgang TTP233H, aktiv high)', 'VBUS': 'USB-Detect (VBUS-Pin Modul, POWER.USBDETECTED)'}
pins = []
for net, m in D.N.items():
    for r, p in m:
        if r == 'U1' and net in use:
            pins.append({'signal': net, 'module_pin': int(p), 'gpio': pn['U1.' + p], 'function': use[net]})
json.dump({'revision': 'r4', 'board': 'motion-one V1', 'module': 'Ebyte E73-2G4M08S1C (nRF52840)', 'source': 'scripts/electronics/mo_design.py',
           'pins': sorted(pins, key=lambda q: q['module_pin']),
           'notes': ['LED aktiv low: GPIO low = an', 'IMU ICM-45686 per SPI Mode 0/3, AP_CS aktiv low', 'VBAT_ADC = VBAT * 100k/(100k+100k), Referenz intern 0.6 V Gain 1/6',
                     'Ein/Aus: Schiebeschalter SW1 trennt VSYS->VSW hardwareseitig (kein GPIO)', 'Ladezustand nur LED (TP4056 CHRG), kein GPIO',
                     'r4: J5 JST-SH 8p: 1=3V3 (max. 10 mA), 2..6=EXT1..EXT5, 7=RSV (NC), 8=GND; Serien-R 100 Ohm + ESD auf Bedienplatine',
                     'r4: LED R/G/B von P0.30/P0.31/P0.29 auf P0.15/P0.17/P1.10 verlegt (ADC-Pins frei fuer EXT)']},
          open(R + '/electronics/PINOUT_V1.json', 'w'), indent=1)
# STEP
import cadquery as cq
T = 1.0
# r3: Umriss mit Ausklinkungen x 0..10 / y 0..5 und 20..25 (Schraubdome), Kopfende R2, keine Bohrungen
pcb = cq.Workplane('XY').box(70, 25, T, centered=False).edges('|Z and >X').fillet(2.0)
for y0 in (0, 20):
    pcb = pcb.cut(cq.Workplane('XY').box(10, 5, T, centered=False).translate((0, y0, 0)))
asm = cq.Assembly().add(pcb, name='pcb', color=cq.Color(0.1, 0.4, 0.15))
for ref, (x0, y0, x1, y1), h in boxes:
    bx = cq.Workplane('XY').box(x1 - x0, y1 - y0, h, centered=False).translate((x0, 25 - y1, T))
    asm.add(bx, name=ref, color=cq.Color(0.6, 0.6, 0.6))
asm.save(K + 'export/motion-one-board.step')
print('cpl', len(cpl), 'bom lines', len(rows), 'boxes', len(boxes), 'max h', max(h for *_, h in boxes))
