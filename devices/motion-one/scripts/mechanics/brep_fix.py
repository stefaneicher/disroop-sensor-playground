"""BREP pruefen (BRepCheck), reparieren (ShapeFix), tessellieren, mit trimesh messen. Aufruf: brep_fix.py <name> [tol]
Liest mechanics/cad/<name>.brep, schreibt logs/fix_<name>.stl und logs/fix_<name>.json"""
import sys, json
import numpy as np, trimesh, cadquery as cq
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.ShapeFix import ShapeFix_Shape
from OCP.BRepBuilderAPI import BRepBuilderAPI_Sewing
from OCP.BRepMesh import BRepMesh_IncrementalMesh

name = sys.argv[1]; tol = float(sys.argv[2]) if len(sys.argv) > 2 else 0.02
D = "devices/motion-one"
s = cq.Shape.importBrep(f"{D}/mechanics/cad/{name}.brep")
r = dict(name=name, tol=tol, valid_in=BRepCheck_Analyzer(s.wrapped).IsValid(), vol_in=round(s.Volume(), 1),
         n_faces=len(s.Faces()), n_solids=len(s.Solids()), n_shells=len(s.Shells()))

def measure(shape, tag):
    p = f"{D}/logs/fix_{name}_{tag}.stl"
    cq.exporters.export(cq.Workplane().add(shape), p, tolerance=tol, angularTolerance=0.1)
    m = trimesh.load(p, process=False); m.merge_vertices()
    u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
    return dict(open=int((c == 1).sum()), nonmanifold=int((c > 2).sum()), watertight=bool(m.is_watertight),
                vol=round(float(m.volume), 1) if m.is_watertight else None, tris=len(m.faces), file=p)

r["raw"] = measure(s, "raw"); print(r, flush=True)
f = ShapeFix_Shape(s.wrapped); f.SetPrecision(1e-4); f.Perform()
s2 = cq.Shape.cast(f.Shape())
r["valid_fix"] = BRepCheck_Analyzer(s2.wrapped).IsValid(); r["vol_fix"] = round(s2.Volume(), 1)
r["fix"] = measure(s2, "fix"); print(r, flush=True)
json.dump(r, open(f"{D}/logs/fix_{name}.json", "w"), indent=1)
