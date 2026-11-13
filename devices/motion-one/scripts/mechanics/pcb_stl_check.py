"""r5: pcb_r4.stl-Dichtheit aus dem aktuellen Board-STEP neu erzeugen und mit mehreren Zaehlmethoden vermessen.
Loest den Widerspruch 38/72 (Mechanik) vs 40/40 (PCB) auf. Ausgabe mechanics/cad/pcb_stl_check_r5.json. Aufruf aus Repo-Root (Container)."""
import os, sys, json, hashlib
import numpy as np, trimesh, cadquery as cq
sys.path.insert(0, os.path.dirname(__file__))
import params as P

DEV = "devices/motion-one"; D = f"{DEV}/mechanics/assembly_stl/"
V = cq.Vector
res = dict(board_step=P.BOARD_STEP, board_step_sha256=hashlib.sha256(open(f"{DEV}/{P.BOARD_STEP}", "rb").read()).hexdigest())
imp = cq.importers.importStep(f"{DEV}/{P.BOARD_STEP}")
sol = imp.solids().vals()
res["step_solids"] = len(sol)
res["step_solids_valid"] = int(sum(s.isValid() for s in sol))
res["step_solids_nonpositive_volume"] = int(sum(s.Volume() <= 0 for s in sol))


def tess(s, tol, ang):
    vs, fs = s.tessellate(tol, ang)
    return trimesh.Trimesh(np.array([v.toTuple() for v in vs]), np.array(fs), process=True)


def classify(m):
    return dict(watertight=bool(m.is_watertight), winding=bool(m.is_winding_consistent), volume=float(m.volume) if m.is_watertight else None)


res["methods"] = {}
for tol, ang in ((0.05, 0.3), (0.02, 0.1), (0.1, 0.5)):
    ms = [tess(s, tol, ang) for s in sol]
    wt = [m.is_watertight for m in ms]
    # Zaehlung A: je STEP-Volumenkoerper getrennt vernetzt (so wie export_assembly.py)
    # Zaehlung B: je STEP-Koerper, nur positive-Volumen-Koerper (Flaechen mit Orientierung)
    res["methods"][f"per_solid_tol{tol}"] = dict(bodies=len(ms), watertight=int(sum(wt)), triangles=int(sum(len(m.faces) for m in ms)),
                                                  not_watertight_idx=[i for i, w in enumerate(wt) if not w][:20])
# Zaehlung C: aus bestehender STL mit trimesh.split (Komponenten ueber Kanten)
f = D + "pcb_r4.stl"
res["stl_current"] = dict(sha256=hashlib.sha256(open(f, "rb").read()).hexdigest(), size=os.path.getsize(f))
for lab, kw in (("process_true_merge", dict(process=True)), ("process_false_raw", dict(process=False))):
    m = trimesh.load(f, **kw)
    parts = m.split(only_watertight=False)
    res["stl_current"][lab] = dict(bodies=len(parts), watertight=int(sum(p.is_watertight for p in parts)), whole_watertight=bool(m.is_watertight))
# Zaehlung D: Verschweissen aller Koerper in einem Netz (Beruehrflaechen -> nichtmanifolde Kanten erwartet)
ms = [tess(s, 0.05, 0.3) for s in sol]
whole = trimesh.util.concatenate(ms)
whole.merge_vertices()
res["merged_whole"] = dict(watertight=bool(whole.is_watertight), non_manifold_edges=int((np.bincount(np.unique(whole.edges_sorted, axis=0, return_inverse=True)[1]) > 2).sum()))
json.dump(res, open(f"{DEV}/mechanics/cad/pcb_stl_check_r5.json", "w"), indent=1)
print(json.dumps(res, indent=1))
