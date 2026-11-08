"""ASCII-Karte belegter Courtyards (0.5-mm-Raster, PCB-Koordinaten) zur Platzsuche r4."""
import sys, pcbnew as P
b = P.LoadBoard(sys.argv[1]); bb = []
for fp in b.GetFootprints():
    c = fp.GetCourtyard(P.F_CrtYd)
    r = c.BBox() if c.OutlineCount() else fp.GetBoundingBox(False)
    bb.append((fp.GetReference(), *[P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())]))
for ref, *v in sorted(bb): print(ref, [round(a, 2) for a in v])
for j in range(50):
    y = j * 0.5 + 0.25
    print('%5.2f ' % y + ''.join('#' if any(a <= i*0.5+0.25 <= c and bq <= y <= d for _, a, bq, c, d in bb) else '.' for i in range(140)))
