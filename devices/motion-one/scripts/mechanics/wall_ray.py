"""Wanddicke per Raycast (Gegenflaeche entlang -Normale), Stichprobe 60000 Punkte, Ausgabe logs/wall_ray.json"""
import json, numpy as np, trimesh
out = {}
for n in ("oberschale", "unterschale_glatt"):
    m = trimesh.load(f"devices/motion-one/mechanics/assembly_stl/{n}.stl")
    p, fi = trimesh.sample.sample_surface(m, 60000, seed=2); nr = m.face_normals[fi]
    p, nr = p[:12000], nr[:12000]
    T = m.triangles; v0 = T[:, 0]; e1 = T[:, 1] - v0; e2 = T[:, 2] - v0
    d = np.full(len(p), np.inf)
    for i in range(len(p)):
        o = p[i] - nr[i] * 1e-3; dr = -nr[i]
        h = np.cross(dr, e2); a_ = (e1 * h).sum(1); ok = np.abs(a_) > 1e-12
        f = np.where(ok, 1 / np.where(ok, a_, 1), 0); sv = o - v0
        u = f * (sv * h).sum(1); q_ = np.cross(sv, e1); w = f * (q_ @ dr); t = f * (e2 * q_).sum(1)
        g = ok & (u >= 0) & (w >= 0) & (u + w <= 1) & (t > 1e-4)
        if g.any(): d[i] = t[g].min() + 1e-3
    k = np.isfinite(d); d = d[k]; q = p[k]
    sel = d < 0.9
    out[n] = dict(min_mm=round(float(d.min()), 3), p0_1_mm=round(float(np.percentile(d, 0.1)), 3), n_lt_0_9=int(sel.sum()), n_lt_1_0=int((d < 1.0).sum()),
                  where_min=q[d.argmin()].round(1).tolist(), xhist_lt_1_0=np.histogram(q[d < 1.0][:, 0], bins=17, range=(0, 170))[0].tolist())
    print(n, out[n], flush=True)
json.dump(out, open("devices/motion-one/logs/wall_ray.json", "w"), indent=1)
