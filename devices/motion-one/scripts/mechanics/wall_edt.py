"""Wanddicke per Voxel-EDT (Medialachse), speicherschonend, Pitch 0.3 mm. Ausgabe logs/wall_edt.json"""
import sys, json, numpy as np, trimesh
from scipy import ndimage as ndi
D = "devices/motion-one/mechanics/assembly_stl/"
pitch = 0.3
out = {}
for n in ("oberschale", "unterschale_glatt"):
    t = trimesh.load(D + n + ".stl")
    vg = t.voxelized(pitch)
    m = ndi.binary_fill_holes(vg.matrix)
    edt = ndi.distance_transform_edt(m).astype(np.float32)
    mx = ndi.maximum_filter(edt, size=3)
    sk = m & (edt >= mx - 1e-6) & (edt > 0)
    th = 2 * edt * pitch
    idx = np.argwhere(sk & (th < 1.0) & (th > 0))
    pts = vg.indices_to_points(idx) if len(idx) else np.zeros((0, 3))
    e = th[tuple(idx.T)] if len(idx) else np.zeros(0)
    o = np.argsort(e)[:10]
    out[n] = dict(pitch=pitch, n_medial_lt_1=int(len(idx)), z_range=[float(pts[:, 2].min()), float(pts[:, 2].max())] if len(pts) else None,
                  worst=[dict(th=round(float(e[k]), 2), at=pts[k].round(1).tolist()) for k in o],
                  clusters_x=np.histogram(pts[:, 0], bins=12, range=(0, 170))[0].tolist() if len(pts) else [])
    print(n, json.dumps(out[n]), flush=True)
json.dump(out, open("devices/motion-one/logs/wall_edt.json", "w"), indent=1)
