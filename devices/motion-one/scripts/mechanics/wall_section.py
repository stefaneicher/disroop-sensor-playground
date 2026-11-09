"""Wanddicke + Lippenpassung per Querschnitt (Netz, kein BREP). Ausgabe logs/wall_section.json.
Wand = Abstand Konturpunkt -> Gegenkontur entlang -Normale (2D, y/z), nur Punkte mit |z|>0.3 (ausserhalb Trennebene)."""
import json, numpy as np, trimesh
D = "devices/motion-one/mechanics/assembly_stl/"
M = {n: trimesh.load(D + n + ".stl") for n in ("oberschale", "unterschale_glatt")}
xs = sorted(set(np.round(np.concatenate([np.linspace(8, 162, 31), np.linspace(3, 17, 5), np.linspace(60, 100, 5), np.linspace(150, 166, 4)]), 1)))


def segs(m, x):
    s = trimesh.intersections.mesh_plane(m, [1, 0, 0], [x, 0, 0])
    return s[:, :, 1:] if len(s) else np.zeros((0, 2, 2))


def wall(sg, zmin=0.3):
    a, b = sg[:, 0], sg[:, 1]; t = b - a; L = np.linalg.norm(t, axis=1); ok = L > 1e-6
    a, b, t, L = a[ok], b[ok], t[ok], L[ok]; n = np.stack([t[:, 1], -t[:, 0]], 1) / L[:, None]
    c = (a + b) / 2; res = []
    for i in range(len(c)):
        if abs(c[i, 1]) <= zmin or L[i] < 0.05: continue
        o = c[i] - n[i] * 1e-3; d = -n[i]
        e = b - a; den = d[0] * (-e[:, 1]) + d[1] * e[:, 0]; g = np.abs(den) > 1e-12
        w = a - o; tt = np.where(g, (w[:, 0] * (-e[:, 1]) + w[:, 1] * e[:, 0]) / np.where(g, den, 1), -1)
        uu = np.where(g, (d[0] * w[:, 1] - d[1] * w[:, 0]) / np.where(g, den, 1), -1)
        h = g & (tt > 1e-4) & (uu >= 0) & (uu <= 1)
        if h.any(): res.append((tt[h].min() + 1e-3, c[i, 0], c[i, 1]))
    return np.array(res)


out = dict(method="trimesh.intersections.mesh_plane, 2D-Strahl je Segment, |z|>0.3", rows={})
for n, m in M.items():
    rows = []
    for x in xs:
        r = wall(segs(m, x))
        if len(r): j = r[:, 0].argmin(); rows.append(dict(x=float(x), min=round(float(r[j, 0]), 2), at_y=round(float(r[j, 1]), 1), at_z=round(float(r[j, 2]), 1)))
    out["rows"][n] = rows
    allm = min(rows, key=lambda r: r["min"])
    out[n] = dict(min_mm=allm["min"], at=allm, n_x_below_1_0=sum(r["min"] < 1.0 for r in rows), x_below=[r["x"] for r in rows if r["min"] < 1.0])
    print(n, out[n], flush=True)
# Lippenpassung: Querschnitt bei x=80, Konturen z in [0, 2.4] der Unterschale (Lippe) vs Oberschale (Nut), y-Abstand
fit = []
for x in (30, 60, 80, 100, 130):
    su, so = segs(M["unterschale_glatt"], x), segs(M["oberschale"], x)
    pu = su.reshape(-1, 2); po = so.reshape(-1, 2)
    # Lippenflanken: Punkte Unterschale mit z 0.5..1.8, y>0 -> y_aussen/innen; Nut: Oberschale z 0.5..1.8
    yl = pu[(pu[:, 1] > 0.5) & (pu[:, 1] < 1.8) & (pu[:, 0] > 0)][:, 0]; yg = po[(po[:, 1] > 0.5) & (po[:, 1] < 1.8) & (po[:, 0] > 0)][:, 0]
    if len(yl) and len(yg):
        # Lippe 2 Flanken (innen/aussen), Nut 2 Flanken: Spiel = Nutflanke - Lippenflanke
        fit.append(dict(x=x, lip_y=[round(float(yl.min()), 2), round(float(yl.max()), 2)], groove_y=[round(float(yg.min()), 2), round(float(yg.max()), 2)]))
out["lippenpassung"] = fit
for f in fit: print(f)
json.dump(out, open("devices/motion-one/logs/wall_section.json", "w"), indent=1)
