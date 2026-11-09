"""r4 Abschluss-Pruefungen (Netz, SIMULATION): Wand (Voxel-EDT 0.4), Lippenspiel, Schieber-Endlagen, pcb_r4-Zaehlung, Clip-Balken.
Ausgabe mechanics/cad/final_checks_r4.json"""
import json, hashlib, numpy as np, trimesh, manifold3d as m3
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
D = "devices/motion-one/mechanics/assembly_stl/"
out = {}
M = lambda t: m3.Manifold(m3.Mesh(vert_properties=np.asarray(t.vertices, np.float32), tri_verts=np.asarray(t.faces, np.uint32)))
# 1 Wand
pitch = 0.4
for n in ("oberschale", "unterschale_glatt"):
    t = trimesh.load(D + n + ".stl"); vg = t.voxelized(pitch)
    m = ndi.binary_fill_holes(vg.matrix); edt = ndi.distance_transform_edt(m).astype(np.float32)
    sk = m & (edt >= ndi.maximum_filter(edt, size=3) - 1e-6) & (edt > 0)
    th = 2 * edt * pitch; idx = np.argwhere(sk & (th > 0)); pts = vg.indices_to_points(idx); e = th[tuple(idx.T)]
    thin = e < 1.0; o = np.argsort(e)[:5]
    out["wand_" + n] = dict(pitch_mm=pitch, min_mm=round(float(e.min()), 2), at=pts[o[0]].round(1).tolist(), n_medial_lt_1mm=int(thin.sum()),
                            n_medial=int(len(e)), worst5=[dict(th=round(float(e[k]), 2), at=pts[k].round(1).tolist()) for k in o],
                            note="Medialachsen-Naeherung, Aufloesung 0.4 mm: Werte <1 mm an Rundungen/Kanten auch Messartefakt")
# 2 Lippenspiel
U, O = trimesh.load(D + "unterschale_glatt.stl"), trimesh.load(D + "oberschale.stl")
pu = trimesh.sample.sample_surface(U, 200000, seed=1)[0]; sel = pu[(pu[:, 2] > 0.3) & (pu[:, 2] < 1.9)]
po = trimesh.sample.sample_surface(O, 400000, seed=1)[0]
d = cKDTree(po).query(sel)[0]
out["lippenspiel"] = dict(min_mm=round(float(d.min()), 3), p5_mm=round(float(np.percentile(d, 5)), 3), nominal_mm=0.25, n=int(len(sel)))
# 3 Schieber-Endlagen
S = trimesh.load(D + "schieber.stl"); P = trimesh.load(D + "pcb_r4.stl")
for dx in (-1.5, 0.0, 1.5):
    r = {}
    for nm, t in (("oberschale", O), ("unterschale", U), ("pcb", P)):
        r[nm] = round(float((M(t) ^ M(S).translate((dx, 0, 0))).volume()), 3)
    out[f"schieber_dx{dx:+.1f}"] = r
# 4 pcb_r4
f = D + "pcb_r4.stl"; out["pcb_r4"] = dict(sha256=hashlib.sha256(open(f, "rb").read()).hexdigest())
for lab, kw in (("merge_vertices", dict(process=True)), ("raw", dict(process=False))):
    m = trimesh.load(f, **kw); bodies = m.split(only_watertight=False)
    out["pcb_r4"][lab] = dict(bodies=len(bodies), watertight_bodies=int(sum(b.is_watertight for b in bodies)), whole_watertight=bool(m.is_watertight))
# 5 Clip-Balken
E, t, L, dl, b = 1500.0, 1.0, 14.0, 0.7, 5.0
eps = 3 * t * dl / (2 * L ** 2)
out["clip_balken"] = dict(L_mm=L, t_mm=t, delta_mm=dl, eps=round(eps, 4), sigma_MPa=round(E * eps, 1), F_N=round(3 * E * (b * t ** 3 / 12) * dl / L ** 3, 2),
                          label="BERECHNUNG Balkentheorie, L=14 aus z_root -14..0 (ANNAHME starre Einspannung), E 1.5 GPa", ok_lt_2pct=bool(eps < 0.02))
json.dump(out, open("devices/motion-one/mechanics/cad/final_checks_r4.json", "w"), indent=1)
print(json.dumps(out, indent=1))
