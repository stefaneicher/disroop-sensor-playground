"""Bedienplatine: JLC-BOM/CPL aus ui_design.py + kicad-cli pos, Gerber-Zip."""
import csv, os, sys, zipfile, collections
sys.path.insert(0, os.path.dirname(__file__)); import ui_design as D
O = 'manufacturing/pcba/ui'; ROT = {'Connector_JST:JST_SH_SM08B-SRSS-TB_1x08-1MP_P1.00mm_Horizontal': 180, 'ui:SOT-23-6_L2.9-W1.7-P0.95-LS2.8-BL': -90, 'Package_TO_SOT_SMD:SOT-23-6': -90}
pos = {r['Ref']: r for r in csv.DictReader(open(O + '/pos_raw.csv'))}
g = collections.OrderedDict()
for ref, (sl, sn, val, fp, lcsc, x, y, rot) in D.P.items():
    if lcsc: g.setdefault((val, fp.split(':')[1], lcsc), []).append(ref)
with open(O + '/BOM_motion-one-ui_JLC.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['Comment', 'Designator', 'Footprint', 'LCSC Part #'])
    for (v, fp, l), refs in g.items(): w.writerow([v, ','.join(refs), fp, l])
with open(O + '/CPL_motion-one-ui_JLC.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['Designator', 'Mid X', 'Mid Y', 'Layer', 'Rotation'])
    for ref, p in D.P.items():
        if not p[4]: continue
        r = pos[ref]; w.writerow([ref, r['PosX'] + 'mm', r['PosY'] + 'mm', 'Top' if r['Side'] == 'top' else 'Bottom', (float(r['Rot']) + ROT.get(p[3], 0)) % 360])
with zipfile.ZipFile(O + '/motion-one-ui_gerber_r4.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for n in sorted(os.listdir(O + '/gerber')): z.write(O + '/gerber/' + n, n)
print('bom', len(g), 'cpl', sum(1 for p in D.P.values() if p[4]))
