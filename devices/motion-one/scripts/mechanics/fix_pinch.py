"""r5: trennt Pinch-Kanten (nichtmanifolde Kanten, count > 2) der Schalen-STLs durch Vertex-Duplizierung je Dreiecksfaecher.
Geometrie bleibt unveraendert (nur Topologie). Bricht ab, wenn das Ergebnis nicht dicht/konsistent ist. Aufruf aus Repo-Root:
python3 fix_pinch.py <print|assembly_stl> [teil ...]   (Standard: oberschale unterschale_glatt)"""
import sys, collections, numpy as np, trimesh


def unpinch(m):
    F = m.faces.copy(); V = m.vertices.copy().tolist()
    u, inv, cnt = np.unique(m.edges_sorted, axis=0, return_inverse=True, return_counts=True)
    inv = inv.reshape(-1)
    ecount = cnt[inv].reshape(-1, 3)            # je Face drei Kanten (edges sind face-weise 3er-Gruppen)
    bad_v = set(u[cnt > 2].ravel().tolist())
    # Kante -> Faces
    e2f = collections.defaultdict(list)
    for fi, f in enumerate(m.faces):
        for k in range(3):
            a, b = sorted((int(f[k]), int(f[(k + 1) % 3])))
            e2f[(a, b)].append(fi)
    v2f = collections.defaultdict(list)
    for fi, f in enumerate(m.faces):
        for v in f:
            if int(v) in bad_v:
                v2f[int(v)].append(fi)
    n_new = 0
    for v, fl in v2f.items():
        par = {f: f for f in fl}
        def find(x):
            while par[x] != x:
                par[x] = par[par[x]]; x = par[x]
            return x
        for f in fl:
            for k in range(3):
                a, b = int(m.faces[f][k]), int(m.faces[f][(k + 1) % 3])
                if v not in (a, b): continue
                es = e2f[tuple(sorted((a, b)))]
                if len(es) != 2: continue         # Pinch-Kante verbindet nicht
                g = es[0] if es[1] == f else es[1]
                if g in par: par[find(f)] = find(g)
        groups = collections.defaultdict(list)
        for f in fl: groups[find(f)].append(f)
        for gi, (_, fs) in enumerate(groups.items()):
            if gi == 0: continue
            V.append(V[v]); nv = len(V) - 1; n_new += 1
            for f in fs:
                F[f][F[f] == v] = nv
    return trimesh.Trimesh(np.array(V), F, process=False), n_new


if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else "assembly_stl"
    names = sys.argv[2:] or ["oberschale", "unterschale_glatt"]
    for n in names:
        p = f"devices/motion-one/mechanics/{d}/{n}.stl"
        m = trimesh.load(p, process=True)
        if m.is_watertight:
            print(n, d, "bereits dicht"); continue
        v0 = m.volume
        m2, nn = unpinch(m)
        ok = m2.is_watertight and m2.is_winding_consistent and m2.volume > 0
        print(n, d, "neue Vertices", nn, "dicht", m2.is_watertight, "winding", m2.is_winding_consistent, "Vol", round(m2.volume, 2), "vorher", round(v0, 2))
        if ok: m2.export(p)
        else: print("NICHT repariert"); sys.exit(1)
