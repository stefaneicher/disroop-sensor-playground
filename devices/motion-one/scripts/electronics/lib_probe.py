"""Hilfsskript: Pins von Bibliothekssymbolen und Pads von Footprints ausgeben."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from sexpr import parse, find
cache = {}
for a in sys.argv[1:]:
    if a.startswith('S='):
        lib, name = a[2:].split(':')
        if lib not in cache: cache[lib] = parse(open('/usr/share/kicad/symbols/%s.kicad_sym' % lib).read())
        s = [x for x in find(cache[lib], 'symbol') if x[1] == name][0]
        ext = find(s, 'extends'); src = [x for x in find(cache[lib], 'symbol') if x[1] == ext[0][1]][0] if ext else s
        out = []
        for sub in find(src, 'symbol'):
            for p in find(sub, 'pin'):
                out.append('%s=%s/%s' % (find(p, 'number')[0][1], find(p, 'name')[0][1], p[1]))
        fp = [p[2] for p in find(s, 'property') if p[1] == 'Footprint']
        print(a, fp, ' '.join(out))
    else:
        import pcbnew as P
        lib, name = a.split(':')
        fp = P.FootprintLoad('/usr/share/kicad/footprints/' + lib + '.pretty', name)
        if fp is None: print(a, 'FEHLT'); continue
        print(a, ' '.join(f'{p.GetNumber()}@{P.ToMM(p.GetPosition().x):.2f},{P.ToMM(p.GetPosition().y):.2f}' for p in fp.Pads()))
