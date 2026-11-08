"""r4: freie Plaetze fuer M2-Loch (Courtyard 4.9 mm) suchen; Randstreifen erlaubt (kein Bauteil), Ausklinkung/Keepout nicht."""
import sys, pcbnew as P
b = P.LoadBoard(sys.argv[1]); bb = []
for fp in b.GetFootprints():
    if fp.GetReference() == 'H2': continue
    c = fp.GetCourtyard(P.F_CrtYd); r = c.BBox() if c.OutlineCount() else fp.GetBoundingBox(False)
    bb.append((fp.GetReference(), *[P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())]))
w = 4.9
for x in range(0, 280):
    for y in range(0, 100):
        x0, y0 = x/4, y/4; x1, y1 = x0 + w, y0 + w
        if y0 < 0.3 or y1 > 24.7 or x1 > 66.0 or (x0 < 10.5 and (y0 < 5.3 or y1 > 19.7)): continue
        if not any(a < x1 and x0 < c and q < y1 and y0 < d for _, a, q, c, d in bb): print('free', x0 + w/2, y0 + w/2)
