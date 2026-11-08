"""Hilfsskript: Padliste/Bbox von KiCad-Footprints ausgeben. Aufruf: fp_dump.py lib:fp ..."""
import sys, os, pcbnew as P
for a in sys.argv[1:]:
    lib, name = a.split(':')
    fp = P.FootprintLoad('/usr/share/kicad/footprints/' + lib + '.pretty', name)
    if fp is None: print(a, 'FEHLT'); continue
    bb = fp.GetBoundingBox(False)
    m = []
    print(a, 'bbox', round(P.ToMM(bb.GetWidth()), 2), round(P.ToMM(bb.GetHeight()), 2), 'models', [os.path.exists(x.replace('${KICAD10_3DMODEL_DIR}', '/usr/share/kicad/3dmodels')) for x in m])
    print('  ', ' '.join(f'{p.GetNumber()}@{P.ToMM(p.GetPosition().x):.2f},{P.ToMM(p.GetPosition().y):.2f}' for p in fp.Pads()))
