"""Lokalisiert offene/nichtmanifolde Kanten der Schalen-STLs (r5-Diagnose). Aufruf aus Repo-Root (Container)."""
import sys, numpy as np, trimesh
D = "devices/motion-one/mechanics/%s/" % (sys.argv[1] if len(sys.argv) > 1 else "assembly_stl")
for n in ("oberschale", "unterschale_glatt"):
    m = trimesh.load(D + n + ".stl")
    u, c = np.unique(m.edges_sorted, axis=0, return_counts=True)
    bad = u[c != 2]
    print(n, "watertight", m.is_watertight, "open/nonmanifold edges", len(bad), "of which count==1:", int((c == 1).sum()), ">2:", int((c > 2).sum()))
    if len(bad):
        p = m.vertices[bad.ravel()].reshape(-1, 2, 3).mean(1)
        print("  bbox", p.min(0).round(2).tolist(), p.max(0).round(2).tolist())
        for q in p[:12]:
            print("   ", q.round(2).tolist())
