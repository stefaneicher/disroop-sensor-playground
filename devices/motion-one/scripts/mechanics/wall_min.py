"""Min. Wandstaerke (Strahlmethode, trimesh) auf Tessellierung der BREPs. Ausgabe logs/wall_min.json"""
import json, numpy as np, trimesh
out = {}
for n in ("oberschale", "unterschale_glatt"):
    m = trimesh.load(f"devices/motion-one/mechanics/assembly_stl/{n}.stl", process=False); m.merge_vertices()
    pts, fi = trimesh.sample.sample_surface(m, 150000, seed=1); nr = m.face_normals[fi]
    from scipy.spatial import cKDTree
    t = cKDTree(pts); d = []; L = []
    for i in range(0, len(pts), 3):
        for j in t.query_ball_point(pts[i], 3.0):
            v = pts[j] - pts[i]
            if nr[j] @ nr[i] < -0.95 and v @ nr[i] < -0.05 and abs(v @ nr[i]) > 0.9 * np.linalg.norm(v):
                d.append(-(v @ nr[i])); L.append(pts[i])
    d = np.array(d)
    L = np.array(L); th = L[d < 0.9] if (d < 0.9).any() else np.zeros((1, 3))
    print('thin<0.9 n', len(th), 'min', th.min(0).round(1), 'max', th.max(0).round(1), 'xhist', np.histogram(th[:, 0], bins=17, range=(0, 170))[0].tolist())
    out[n] = dict(min_mm=round(float(d.min()), 2), p1_mm=round(float(np.percentile(d, 1)), 2), n=int(len(d)))
    print(n, out[n])
json.dump(out, open("devices/motion-one/logs/wall_min.json", "w"), indent=1)
