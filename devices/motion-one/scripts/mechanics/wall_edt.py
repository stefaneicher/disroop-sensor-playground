"""r5: Wanddicke per Voxel-EDT (Medialachsen-Naeherung), Aufloesung 0.4/0.3/0.2 mm (Konvergenz), auf STLs in Einbaulage.
Dicke = 2 * EDT(Medialpunkt) ; Fehler je Messung ca. +-pitch (Voxelmitte). Ausgabe mechanics/cad/wall_edt_r5.json (SIMULATION).
Aufruf aus Repo-Root: python3 devices/motion-one/scripts/mechanics/wall_edt.py [pitch ...]"""
import sys, json, numpy as np, trimesh
from scipy import ndimage as ndi
D = "devices/motion-one/mechanics/assembly_stl/"
pitches = [float(a) for a in sys.argv[1:]] or [0.4, 0.3, 0.2]
parts = ("oberschale", "unterschale_glatt", "schieber", "tastenkappe", "lichtleiter")
out = {}
for n in parts:
    t = trimesh.load(D + n + ".stl")
    for pitch in pitches:
        vg = t.voxelized(pitch)
        m = ndi.binary_fill_holes(vg.matrix)
        edt = ndi.distance_transform_edt(m).astype(np.float32)
        mx = ndi.maximum_filter(edt, size=3)
        sk = m & (edt >= mx - 1e-6) & (edt > 0)
        th = 2 * edt * pitch
        idx = np.argwhere(sk)
        e = th[tuple(idx.T)]
        pts = vg.indices_to_points(idx)
        o = np.argsort(e)[:8]
        r = dict(pitch_mm=pitch, n_medial=int(len(e)), min_mm=round(float(e.min()), 2),
                 p001_mm=round(float(np.percentile(e, 0.1)), 2), p01_mm=round(float(np.percentile(e, 1)), 2),
                 n_lt_1p0=int((e < 1.0).sum()), n_lt_0p8=int((e < 0.8).sum()), frac_lt_1p0=round(float((e < 1.0).mean()), 5),
                 worst=[dict(th=round(float(e[k]), 2), at=pts[k].round(1).tolist()) for k in o])
        out[f"{n}@{pitch}"] = r
        print(n, pitch, json.dumps(r), flush=True)
        del edt, mx, sk, m, vg
json.dump(out, open("devices/motion-one/mechanics/cad/wall_edt_r5.json", "w"), indent=1)
