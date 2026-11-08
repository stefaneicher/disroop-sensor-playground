import sys, numpy as np, trimesh
for n in sys.argv[1:]:
    m = trimesh.load(f"devices/motion-one/logs/fix_{n}_raw.stl", process=False); m.merge_vertices()
    u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
    for tag, sel in (("open", c == 1), ("nonman", c > 2)):
        v = m.vertices[u[sel].ravel()].reshape(-1, 2, 3).mean(1)
        print(n, tag, len(v), "bbox", v.min(0).round(1), v.max(0).round(1))
        h, e = np.histogram(v[:, 0], bins=17, range=(0, 170)); print("  x-hist", h.tolist())
