"""USB-C-Detailzeichnung: Gehaeuse-Aussparung mit eingestecktem Stecker, Abstaende (SVG).
Stecker-Masse (ANNAHME aus USB-Type-C-Spezifikation, aus dem Gedaechtnis, vor Druck gegen reales Kabel messen):
Metallhuelse 8.25 x 2.4 x 6.65, Umspritzung max 12.35 x 6.5. Receptacle: params.USB_*."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import params as P

BX = P.BOARD_X0
RX = BX - P.USB_OVERHANG                 # Receptacle-Front
J1_Z0, J1_Z1 = P.USB_ZTOP - P.USB_H, P.USB_ZTOP
J1_ZC = (J1_Z0 + J1_Z1) / 2
OM_W, OM_H = 12.35, 6.5
SH_W, SH_H, SH_L = 8.25, 2.4, 6.65
OM_X = RX - 0.45                         # Umspritzungs-Front (Huelse 6.65 > Receptacle-Tiefe ca. 6.2)
OLD = dict(w=P.USB_RECESS[0], h=P.USB_RECESS[1], d=P.USB_RECESS[2], zc=P.USB_ZTOP / 2)
NEW = dict(w=14.0, h=8.0, d=OM_X + 1.0, zc=J1_ZC)


def clr(r):
    return dict(seitlich=(r['w'] - OM_W) / 2, unten=(r['zc'] - r['h'] / 2) - (J1_ZC - OM_H / 2),
                oben=(r['zc'] + r['h'] / 2) - (J1_ZC + OM_H / 2) * 1.0 if False else (r['zc'] + r['h'] / 2) - (J1_ZC + OM_H / 2),
                tiefe=r['d'] - OM_X)


c_old, c_new = clr(OLD), clr(NEW)
# unten = Recess-Unterkante minus Umspritzungs-Unterkante (negativ = Stecker stoesst an)
c_old['unten'] = (J1_ZC - OM_H / 2) - (OLD['zc'] - OLD['h'] / 2)
c_new['unten'] = (J1_ZC - OM_H / 2) - (NEW['zc'] - NEW['h'] / 2)

S = 30
o = []
a = o.append
a('<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="900" viewBox="0 0 1240 900" font-family="system-ui,sans-serif" font-size="13">')
a('<rect width="1240" height="900" fill="#fff"/><text x="20" y="28" font-size="20" font-weight="bold">Motion One r4: USB-C mit eingestecktem Stecker (Masse in mm)</text>')
a('<text x="20" y="48" fill="#555">Rot = aktuelles Modell, gruen = Empfehlung. Stecker-Masse und J1-z-Lage = ANNAHME (siehe Fussnote).</text>')


def side(ox, oy, r, col, title):
    fx = lambda x: ox + x * S
    fz = lambda z: oy - z * S
    t = []
    t.append(f'<text x="{ox}" y="{oy-6.8*S}" font-weight="bold" fill="{col}">{title}</text>')
    # Gehaeusewand (Schnitt y=0): oben/unten ueber der Aussparung
    zt, zb = r['zc'] + r['h'] / 2, r['zc'] - r['h'] / 2
    t.append(f'<rect x="{fx(0)}" y="{fz(zt+2)}" width="{r["d"]*S}" height="{2*S}" fill="#bbb" stroke="#555"/>')
    t.append(f'<rect x="{fx(0)}" y="{fz(zb)}" width="{r["d"]*S}" height="{2*S}" fill="#bbb" stroke="#555"/>')
    # Schlitz (nur Receptacle-Durchbruch) dahinter
    sw, sh = P.USB_SLOT
    zs0, zs1 = P.USB_ZTOP / 2 - sh / 2, P.USB_ZTOP / 2 + sh / 2
    t.append(f'<rect x="{fx(r["d"])}" y="{fz(zs1+2)}" width="{(BX+0.5-r["d"])*S}" height="{2*S+0}" fill="#bbb" stroke="#555"/>' if False else '')
    t.append(f'<rect x="{fx(r["d"])}" y="{fz(zt+2)}" width="{(BX+0.5-r["d"])*S}" height="{(zt+2-zs1)*S}" fill="#bbb" stroke="#555"/>')
    t.append(f'<rect x="{fx(r["d"])}" y="{fz(zs0)}" width="{(BX+0.5-r["d"])*S}" height="{(zs0-(zb-2))*S}" fill="#bbb" stroke="#555"/>')
    # Platine und J1
    t.append(f'<rect x="{fx(BX)}" y="{fz(0.6)}" width="{8*S}" height="{1.6*S}" fill="#2e7d32" stroke="#124"/>')
    t.append(f'<rect x="{fx(RX)}" y="{fz(J1_Z1)}" width="{P.USB_D*S}" height="{P.USB_H*S}" fill="#cfd8dc" stroke="#37474f"/>')
    t.append(f'<text x="{fx(RX+1)}" y="{fz(J1_Z1)-4}" fill="#37474f">J1 Receptacle</text>')
    # Stecker
    t.append(f'<rect x="{fx(OM_X-6)}" y="{fz(J1_ZC+OM_H/2)}" width="{6*S}" height="{OM_H*S}" fill="#ffd54f" fill-opacity=".8" stroke="#a67c00"/>')
    t.append(f'<rect x="{fx(OM_X)}" y="{fz(J1_ZC+SH_H/2)}" width="{SH_L*S}" height="{SH_H*S}" fill="#90a4ae" stroke="#263238"/>')
    t.append(f'<text x="{fx(OM_X-5.6)}" y="{fz(J1_ZC)+4}">Umspritzung 12.35 x 6.5</text>')
    t.append(f'<text x="{fx(OM_X+0.4)}" y="{fz(J1_ZC)+4}" font-size="11">Metallhuelse 8.25 x 2.4</text>')
    # Masslinien
    t.append(f'<line x1="{fx(OM_X)}" y1="{fz(zb)+34}" x2="{fx(r["d"])}" y2="{fz(zb)+34}" stroke="{col}" stroke-width="2"/>')
    t.append(f'<text x="{fx(OM_X)}" y="{fz(zb)+52}" fill="{col}">Tiefe Luft {c_old["tiefe"] if col=="#c62828" else c_new["tiefe"]:+.2f}</text>')
    t.append(f'<text x="{fx(0)}" y="{fz(zb-2)+22}">Aussen x=0 | Recess-Tiefe {r["d"]:.2f} | Receptacle-Front x={RX:.2f}</text>')
    return ''.join(t)


a(side(60, 330, OLD, '#c62828', 'Schnitt y=0, aktuell (Recess 12.8 x 7.0 x 3.2)'))
a(side(660, 330, NEW, '#2e7d32', 'Schnitt y=0, Empfehlung (Recess 14.0 x 8.0 x %.1f)' % NEW['d']))


def front(ox, oy, r, col, title):
    fy = lambda y: ox + y * S
    fz = lambda z: oy - z * S
    t = [f'<text x="{ox-190}" y="{oy-4.9*S}" font-weight="bold" fill="{col}">{title}</text>']
    t.append(f'<rect x="{fy(-r["w"]/2)}" y="{fz(r["zc"]+r["h"]/2)}" width="{r["w"]*S}" height="{r["h"]*S}" fill="none" stroke="{col}" stroke-width="2" stroke-dasharray="6 3"/>')
    sw, sh = P.USB_SLOT
    t.append(f'<rect x="{fy(-sw/2)}" y="{fz(P.USB_ZTOP/2+sh/2)}" width="{sw*S}" height="{sh*S}" fill="none" stroke="#555"/>')
    t.append(f'<rect x="{fy(-P.USB_W/2)}" y="{fz(J1_Z1)}" width="{P.USB_W*S}" height="{P.USB_H*S}" fill="#cfd8dc" stroke="#37474f"/>')
    t.append(f'<rect x="{fy(-OM_W/2)}" y="{fz(J1_ZC+OM_H/2)}" width="{OM_W*S}" height="{OM_H*S}" fill="#ffd54f" fill-opacity=".55" stroke="#a67c00"/>')
    t.append(f'<rect x="{fy(-SH_W/2)}" y="{fz(J1_ZC+SH_H/2)}" width="{SH_W*S}" height="{SH_H*S}" fill="#90a4ae" stroke="#263238"/>')
    cc = c_old if col == '#c62828' else c_new
    t.append(f'<text x="{ox-190}" y="{oy+4.2*S}" fill="{col}">Luft seitlich {cc["seitlich"]:+.2f} | oben {cc["oben"]:+.2f} | unten {cc["unten"]:+.2f}</text>')
    return ''.join(t)


a(front(330, 700, OLD, '#c62828', 'Frontansicht aktuell'))
a(front(930, 700, NEW, '#2e7d32', 'Frontansicht Empfehlung'))
a('<text x="20" y="880" fill="#555" font-size="12">Fussnote: Stecker = USB-C-Spezifikation (Huelse 8.25x2.4x6.65, Umspritzung max 12.35x6.5; ANNAHME, vor Druck am echten Kabel nachmessen). J1-Hoehe z=1.0..4.26 aus params (USB_ZTOP, USB_H, ANNAHME). Umspritzungs-Front = Receptacle-Front - 0.45 (ANNAHME). Negative Luft = Stecker stoesst an. Generiert von usbc_detail.py.</text>')
a('</svg>')

out = os.path.join(os.path.dirname(__file__), '..', '..', 'mechanics', 'cad', 'usbc_detail.svg')
open(out, 'w').write(''.join(o))
print('aktuell', {k: round(v, 2) for k, v in c_old.items()})
print('empfehlung', {k: round(v, 2) for k, v in c_new.items()}, 'Recess', NEW)
