import sys, pcbnew as P
for a in sys.argv[1:]:
    lib, n = a.split(':'); fp = P.FootprintLoad('/usr/share/kicad/footprints/%s.pretty' % lib, n)
    xs, ys = [], []
    for g in fp.GraphicalItems():
        if g.GetLayer() == P.F_Fab and hasattr(g, 'GetStart'):
            for v in (g.GetStart(), g.GetEnd()): xs.append(P.ToMM(v.x)); ys.append(P.ToMM(v.y))
    print(a, 'fab x', min(xs), max(xs), 'y', min(ys), max(ys))
