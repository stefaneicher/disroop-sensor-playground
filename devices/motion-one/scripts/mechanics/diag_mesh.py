"""Diagnose: Schnittvolumen Ober/Unterschale lokalisieren, pcb_r4 Dichtheit, Wand per EDT."""
import numpy as np, trimesh, manifold3d as m3, json
from scipy import ndimage as ndi
D = "devices/motion-one/mechanics/assembly_stl/"
def man(t):
    return m3.Manifold(m3.Mesh(vert_properties=np.asarray(t.vertices, np.float32), tri_verts=np.asarray(t.faces, np.uint32)))
o = trimesh.load(D + "oberschale.stl"); u = trimesh.load(D + "unterschale_glatt.stl")
I = man(o) ^ man(u)
mm = I.to_mesh(); iv = np.asarray(mm.vert_properties)[:, :3]
print("intersect vol", I.volume(), "bbox", iv.min(0).round(2), iv.max(0).round(2))
parts = trimesh.Trimesh(iv, np.asarray(mm.tri_verts)).split(only_watertight=False)
for p in sorted(parts, key=lambda p: -abs(p.volume))[:8]:
    print(" part vol %.3f" % p.volume, p.bounds.round(2).tolist())
p = trimesh.load(D + "pcb_r4.stl")
print("pcb watertight", p.is_watertight, "bodies", len(p.split(only_watertight=False)), "winding", p.is_winding_consistent)
p2 = p.copy(); p2.merge_vertices(); print("after merge", p2.is_watertight, "volume", p2.volume)
bodies = p.split(only_watertight=False)
print("bodies not watertight:", sum(not b.is_watertight for b in bodies), "of", len(bodies))
# Wand per EDT
pitch = 0.2
for n, t in (("oberschale", o), ("unterschale", u)):
    vg = t.voxelized(pitch).fill()
    m = vg.matrix; edt = ndi.distance_transform_edt(m) * pitch * 2  # lokale Dicke ~ 2*Abstand (an Medialachse)
    sk = m & (ndi.maximum_filter(edt, size=3) <= edt + 1e-9)
    th = np.where(sk, edt, np.inf)
    idx = np.argwhere(sk & (edt < 1.0)); print(n, "voxels", m.sum(), "medial<1.0:", len(idx))
    ws = vg.indices_to_points(idx) if len(idx) else np.zeros((0, 3))
    if len(ws):
        e = edt[tuple(idx.T)]; order = np.argsort(e)[:6]
        for k in order: print("  th %.2f at" % e[k], ws[k].round(1).tolist())
        z = ws[:, 2]; print("  z-hist of <1.0:", np.histogram(z, bins=8)[0].tolist(), "z range", z.min().round(1), z.max().round(1))
