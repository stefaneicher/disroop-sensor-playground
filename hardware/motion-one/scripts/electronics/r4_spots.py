"""r4: freie Kreise/Rechtecke auf Board r3 suchen (Courtyards, Randstreifen, Ausklinkungen, Antennen-Keepout)."""
import sys, pcbnew as P
b = P.LoadBoard(sys.argv[1]); bb = []
for fp in b.GetFootprints():
    c = fp.GetCourtyard(P.F_CrtYd); r = c.BBox() if c.OutlineCount() else fp.GetBoundingBox(False)
    bb.append((fp.GetReference(), *[P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())]))
def free(x0, y0, x1, y1, skip=()):
    if x0 < 0 or y0 < 1.5 or y1 > 23.5 or x1 > 66.2: return False
    if x0 < 10.5 and (y0 < 5.5 or y1 > 19.5): return False
    return not any(a < x1 and x0 < c and bq < y1 and y0 < d for r, a, bq, c, d in bb if r not in skip)
for name, w, h in (('M2 hole 5.4', 5.4, 5.4), ('JST8 12.5x6', 12.5, 6.0), ('JST8 rot 6x12.5', 6.0, 12.5)):
    res = [(x/4, y/4) for x in range(0, 280) for y in range(0, 100) if free(x/4, y/4, x/4 + w, y/4 + h)]
    print(name, len(res), res[:: max(1, len(res)//25)])
sk = {'TP1','TP2','TP3','TP4','TP5','TP6'}
res = [(x/4, y/4) for x in range(0, 280) for y in range(0, 100) if free(x/4, y/4, x/4 + 12.5, y/4 + 6.0, sk)]
print('JST8 ohne TPs', res)
f = P.FootprintLoad('/usr/share/kicad/footprints/Connector_JST.pretty', 'JST_SH_SM08B-SRSS-TB_1x08-1MP_P1.00mm_Horizontal')
r = f.GetCourtyard(P.F_CrtYd).BBox(); print('JST8 crt', [P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())])
for p in f.Pads(): print(p.GetNumber(), P.ToMM(p.GetPosition().x), P.ToMM(p.GetPosition().y))
f = P.FootprintLoad('/usr/share/kicad/footprints/MountingHole.pretty', 'MountingHole_2.2mm_M2')
r = f.GetCourtyard(P.F_CrtYd).BBox(); print('M2 crt', [P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())])
