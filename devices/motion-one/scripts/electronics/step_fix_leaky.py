"""Board-STEP: undichte Koerper (trimesh pro Koerper) durch Bounding-Box-Quader ersetzen.
Aufruf: step_fix_leaky.py in.step out.step report.json
"""
import sys, json, numpy as np, trimesh
import cadquery as cq


def leaky(s):
    v, t = s.tessellate(0.01, 0.1)
    m = trimesh.Trimesh([x.toTuple() for x in v], t, process=True)
    u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
    return int((c == 1).sum()), int((c > 2).sum())


src, dst, rep = sys.argv[1:4]
solids = cq.importers.importStep(src).solids().vals()
out, log = [], []
for i, s in enumerate(solids):
    o, n = leaky(s)
    if o or n:
        b = s.BoundingBox()
        box = cq.Workplane('XY').box(b.xlen, b.ylen, b.zlen, centered=False).translate((b.xmin, b.ymin, b.zmin)).val()
        log.append({'i': i, 'open': o, 'nonmanifold': n, 'replaced_by_bbox': [round(x, 2) for x in (b.xmin, b.ymin, b.zmin, b.xmax, b.ymax, b.zmax)]})
        s = box
    out.append(s)
cq.exporters.export(cq.Workplane('XY').newObject([cq.Compound.makeCompound(out)]), dst)
chk = [leaky(s) for s in cq.importers.importStep(dst).solids().vals()]
res = {'bodies': len(chk), 'replaced': log, 'after_open': sum(a for a, _ in chk), 'after_nonmanifold': sum(b for _, b in chk)}
json.dump(res, open(rep, 'w'), indent=1)
print(res)
