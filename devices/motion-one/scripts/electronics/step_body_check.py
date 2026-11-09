"""Pro Koerper des Board-STEP: trimesh Dichtheit (offene/nichtmanifolde Kanten)."""
import sys, json, numpy as np, trimesh
import cadquery as cq
p = sys.argv[1]
sh = cq.importers.importStep(p)
res = []
for i, s in enumerate(sh.solids().vals()):
    v, t = s.tessellate(0.01, 0.1)
    m = trimesh.Trimesh([x.toTuple() for x in v], t, process=True)
    e = m.edges_sorted
    u, c = np.unique(e, axis=0, return_counts=True)
    bb = s.BoundingBox()
    res.append({'i': i, 'open': int((c == 1).sum()), 'nonmanifold': int((c > 2).sum()), 'watertight': bool(m.is_watertight),
                'vol': round(float(m.volume), 3), 'bbox': [round(x, 2) for x in (bb.xmin, bb.ymin, bb.zmin, bb.xmax, bb.ymax, bb.zmax)]})
bad = [r for r in res if r['open'] or r['nonmanifold']]
print(len(res), 'Koerper, undicht:', len(bad))
for r in bad: print(r)
if len(sys.argv) > 2: json.dump(res, open(sys.argv[2], 'w'), indent=1)
