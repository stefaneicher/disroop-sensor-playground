"""Hilfsskript: Courtyard-Ausdehnung von Footprints (mm)."""
import sys, pcbnew as P
for a in sys.argv[1:]:
    lib, name = a.split(':')
    fp = P.FootprintLoad('/usr/share/kicad/footprints/' + lib + '.pretty', name)
    if fp is None: print(a, 'FEHLT'); continue
    xs, ys = [], []
    for g in fp.GraphicalItems():
        if g.GetLayer() == P.F_CrtYd:
            bb = g.GetBoundingBox(); xs += [bb.GetLeft(), bb.GetRight()]; ys += [bb.GetTop(), bb.GetBottom()]
    if xs: print(name, 'crtyd', *[round(P.ToMM(v), 2) for v in (min(xs), min(ys), max(xs), max(ys))])
    else: print(name, 'kein crtyd')
