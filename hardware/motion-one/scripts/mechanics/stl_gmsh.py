"""STL per gmsh-2D-Netz aus STEP (konforme Kanten). Aufruf: stl_gmsh.py <step> <out.stl> <hmax_mm>; misst mit trimesh."""
import sys, json
import gmsh, numpy as np, trimesh
step, out, h = sys.argv[1], sys.argv[2], float(sys.argv[3])
gmsh.initialize(); gmsh.option.setNumber("General.Terminal", 0)
gmsh.model.occ.importShapes(step); gmsh.model.occ.synchronize()
gmsh.option.setNumber("Mesh.MeshSizeMax", h); gmsh.option.setNumber("Mesh.MeshSizeMin", h / 10)
gmsh.option.setNumber("Mesh.Algorithm", 6); gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 24)
gmsh.model.mesh.generate(2); gmsh.write(out); gmsh.finalize()
m = trimesh.load(out, process=False); m.merge_vertices()
u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
r = dict(file=out, hmax=h, watertight=bool(m.is_watertight), open=int((c == 1).sum()), nonmanifold=int((c > 2).sum()),
         volume=round(float(m.volume), 1), tris=len(m.faces))
print(json.dumps(r))
