"""pcb_r4.stl neu aus Board-STEP (je Koerper vernetzt, wie export_assembly.py), explode.json-Eintrag aktualisieren.
Aufruf aus Repo-Root im Container."""
import json, os, sys, hashlib
import numpy as np, trimesh, cadquery as cq
sys.path.insert(0, 'devices/motion-one/scripts/mechanics')
import params as P

DEV = 'devices/motion-one'; OUT = f'{DEV}/mechanics/assembly_stl'
V = cq.Vector
board = cq.importers.importStep(f'{DEV}/{P.BOARD_STEP}').solids().vals()
comp = cq.Compound.makeCompound(board).translate(V(P.BOARD_X0, +P.BOARD_W / 2, P.Z_BB))
ms = []
for s in comp.Solids():
    v, t = s.tessellate(0.05, 0.3)
    ms.append(trimesh.Trimesh(np.array([x.toTuple() for x in v]), np.array(t), process=True))
wt = sum(bool(m.is_watertight) for m in ms)
m = trimesh.util.concatenate(ms)
f = f'{OUT}/pcb_r4.stl'
m.export(f, file_type='stl')
u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
r = json.load(open(f'{OUT}/explode.json'))
bb = m.bounds
r['parts']['pcb_r4'].update(triangles=len(m.faces), bytes=os.path.getsize(f), watertight=bool(m.is_watertight),
                            bodies_watertight=f'{wt}/{len(ms)}', bbox_min=np.round(bb[0], 2).tolist(), bbox_max=np.round(bb[1], 2).tolist(),
                            sha256=hashlib.sha256(open(f, 'rb').read()).hexdigest())
json.dump(r, open(f'{OUT}/explode.json', 'w'), indent=1)
res = {'bodies': len(ms), 'bodies_watertight': wt, 'open_edges': int((c == 1).sum()), 'nonmanifold_edges': int((c > 2).sum()), 'sha256': r['parts']['pcb_r4']['sha256']}
json.dump(res, open(f'{DEV}/logs/pcb-r4d/pcb_r4_stl_check.json', 'w'), indent=1)
print(res)
