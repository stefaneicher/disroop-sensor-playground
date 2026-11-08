"""STL-Dichtheit messen/reparieren (trimesh). Aufruf aus Repo-Root im Container. Ausgabe mechanics/cad/stl_repair_r4.json.
Schreibt reparierte Netze nur, wenn watertight, als <name>.stl (Original bleibt als <name>.orig.stl)."""
import json, shutil
import numpy as np, trimesh

res = {}
for f in ["print/oberschale", "print/unterschale_glatt", "assembly_stl/oberschale", "assembly_stl/unterschale_glatt", "assembly_stl/pcb_r4"]:
    p = f"hardware/motion-one/mechanics/{f}.stl"
    m = trimesh.load(p, process=False)
    def stat(m):
        u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
        return dict(watertight=bool(m.is_watertight), open=int((c == 1).sum()), nonmanifold=int((c > 2).sum()))
    before = stat(m)
    m.merge_vertices(digits_vertex=3)
    m.update_faces(m.nondegenerate_faces()); m.update_faces(m.unique_faces()); m.remove_unreferenced_vertices()
    trimesh.repair.fix_inversion(m); trimesh.repair.fix_normals(m); trimesh.repair.fill_holes(m)
    after = stat(m)
    after["volume_mm3"] = round(float(m.volume), 1) if m.is_watertight else None
    res[f] = dict(before=before, after=after)
    print(f, res[f], flush=True)
    if after["watertight"]:
        shutil.copy(p, p.replace(".stl", ".orig.stl")); m.export(p)
json.dump(res, open("hardware/motion-one/mechanics/cad/stl_repair_r4.json", "w"), indent=1)
