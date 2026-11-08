"""FEM Unterschale (tragendes Teil): Gmsh Tet10 -> CalculiX C3D10, drei Lastfaelle.
Aufruf: python3 fem_shell.py <variante> <h1> [<h2> ...]   (aus Repo-Root, Container)
Randbedingung (ANNAHME): Trennebene z=0 (Kontakt/Verschraubung zur Oberschale) fest eingespannt.
Lastfaelle:
  griff  : 300 N Handkraft (ANNAHME, Power-Grip-Kraft Maennerhand P95 ~ 450-500 N, davon ~60 % auf Unterschale),
           Flaechenlast +z auf Aussenunterseite x 20..90 (Fingerseite).
  fall   : statische Ersatzlast Fall 1 m auf Kopfseite: v=sqrt(2 g h)=4.43 m/s, Bremsweg 2 mm (ANNAHME)
           -> a=v^2/(2 s)=4905 m/s^2, F=m a=0.12 kg*4905=589 N, Flaechenlast -y auf Seitenflaeche x>140.
  schraube: 150 N (ANNAHME, M2-Vorspannung ~ 0.2 Nm Anzug) auf Senkungsgrund Dom x=100 in +z.
Singularitaeten: Elemente mit Schwerpunkt < D_SING von der Einspannebene werden fuer sigma_bewertet ausgeschlossen
(scharfe Einspannkante = Rechenartefakt); globales Maximum wird zusaetzlich berichtet."""
import json, os, re, subprocess, sys, time
import numpy as np
import gmsh

DEV = "hardware/motion-one"
E, NU, RHO = 2550.0, 0.38, 1.25e-3     # QUELLE Bambu PETG-HF TDS: E_z (konservativ), rho g/mm3
SIG_ALLOW = 17.5                        # BERECHNUNG Rm_z 35 MPa / SF 2
D_SING = 3.0                            # mm, ANNAHME Ausschlussabstand Einspannkante
PERM = [0, 1, 2, 3, 4, 5, 6, 7, 9, 8]
Z_CB = -6.5
CASES = {
    "griff": dict(F=300.0, dir=(0, 0, 1), sel=lambda c, n: 20 < c[0] < 90 and n[2] < -0.5 and c[2] < -8),
    "fall": dict(F=589.0, dir=(0, -1, 0), sel=lambda c, n: c[0] > 140 and n[1] > 0.5),
    "schraube": dict(F=150.0, dir=(0, 0, 1), sel=lambda c, n: np.hypot(c[0] - 100, c[1]) < 3 and abs(c[2] - Z_CB) < 0.05 and abs(n[2]) > 0.9),
}


def mesh(step, h, level="tet10"):
    gmsh.initialize(); gmsh.option.setNumber("General.Terminal", 0)
    if step.endswith(".brep"):   # r3: exakte BREP-Geometrie (Geraetekoordinaten) direkt an OCC-Kernel von gmsh
        gmsh.model.occ.importShapes(step); gmsh.model.occ.synchronize()
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 12)
        gmsh.option.setNumber("Mesh.MeshSizeMin", h * 0.25); gmsh.option.setNumber("Mesh.MeshSizeMax", h)
        gmsh.option.setNumber("Mesh.Algorithm", 6); gmsh.option.setNumber("Mesh.Algorithm3D", 1)
        gmsh.option.setNumber("Mesh.SecondOrderLinear", 0)
        gmsh.model.mesh.generate(3); gmsh.model.mesh.optimize("Netgen")
        return _extract(level)
    # STL (wasserdicht geprueft) zurueck in Geraetekoordinaten: Druckorientierung = Rotation 180 deg um x
    import trimesh
    m = trimesh.load(step)
    m.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
    lo, hi = m.bounds
    m.apply_translation([-lo[0], -(lo[1] + hi[1]) / 2, -hi[2]])
    tmp = step.replace(".stl", "_dev.stl"); m.export(tmp)
    gmsh.merge(tmp); os.remove(tmp)
    # STL-Dreiecke direkt als Randnetz (keine Reparametrisierung), Volumen innen mit h vernetzt
    sl = gmsh.model.geo.addSurfaceLoop([t for _, t in gmsh.model.getEntities(2)])
    gmsh.model.geo.addVolume([sl]); gmsh.model.geo.synchronize()
    gmsh.option.setNumber("Mesh.AngleToleranceFacetOverlap", 0.01)
    gmsh.option.setNumber("Mesh.Algorithm", 6)
    print("Volumen-Entitaeten:", gmsh.model.getEntities(3), flush=True)
    gmsh.option.setNumber("Mesh.MeshSizeMin", h * 0.4); gmsh.option.setNumber("Mesh.MeshSizeMax", h)
    gmsh.option.setNumber("Mesh.Algorithm3D", 1); gmsh.option.setNumber("Geometry.Tolerance", 1e-4)
    gmsh.option.setNumber("Mesh.SecondOrderLinear", 1); gmsh.model.mesh.generate(3); gmsh.model.mesh.optimize("Netgen")
    return _extract(level)


def _extract(level):
    if level.endswith("r"):
        gmsh.model.mesh.refine()
    if not level.startswith("tet4"):
        gmsh.model.mesh.setOrder(2)
    tags, xyz, _ = gmsh.model.mesh.getNodes()
    pos = dict(zip(tags.astype(int), xyz.reshape(-1, 3)))
    et, _, en = gmsh.model.mesh.getElements(3)
    nv, ns = (4, 3) if level.startswith("tet4") else (10, 6)
    tets = en[list(et).index(11 if nv == 10 else 4)].reshape(-1, nv).astype(int)
    tris = []
    for _, s in gmsh.model.getEntities(2):
        st, _, sn = gmsh.model.mesh.getElements(2, s)
        tt = 9 if ns == 6 else 2
        if tt in list(st):
            tris.append(sn[list(st).index(tt)].reshape(-1, ns).astype(int))
    gmsh.finalize()
    return pos, tets, np.vstack(tris)


def surf_loads(pos, tets, tris, case):
    # Aussennormale: Dreieck vs. Schwerpunkt des zugehoerigen Volumens -> ueber Nachbar-Tet bestimmt
    cen_tet = {}
    for t in tets:
        c = np.mean([pos[n] for n in t[:4]], axis=0)
        for n in t[:4]:
            cen_tet.setdefault(n, c)
    load, area = {}, 0.0
    for tri in tris:
        p = np.array([pos[n] for n in tri[:3]])
        nv = np.cross(p[1] - p[0], p[2] - p[0]); A = 0.5 * np.linalg.norm(nv); nv = nv / (2 * A)
        c = p.mean(axis=0)
        if np.dot(nv, c - cen_tet[tri[0]]) < 0:
            nv = -nv
        if case["sel"](c, nv):
            area += A
            for n in (tri[3:] if len(tri) == 6 else tri[:3]):
                load[n] = load.get(n, 0.0) + A / 3
    return load, area


def run(variant, h, outroot, level="tet10"):
    sub = "" if variant == json.load(open(f"{DEV}/mechanics/cad/cad_results.json"))["chosen_variant"] else "varianten/"
    step = f"{DEV}/mechanics/cad/unterschale_{variant}.brep"   # r3: BREP direkt (v1: STL)
    tag = f"{variant}_h{h:g}" + ("" if level == "tet10" else f"_{level}")
    out = f"{outroot}/{tag}"; os.makedirs(out, exist_ok=True)
    t0 = time.time()
    pos, tets, tris = mesh(step, h, level)
    ids = np.array(list(pos)); X = np.array([pos[i] for i in ids])
    fix = ids[X[:, 2] > -0.02]
    vol = 0.0
    for t in tets:
        p = np.array([pos[n] for n in t[:4]]); vol += abs(np.linalg.det(np.array([p[1] - p[0], p[2] - p[0], p[3] - p[0]]))) / 6
    res = dict(variant=variant, h=h, level=level, nodes=len(pos), elements=len(tets), volume_mm3=vol, mass_g=vol * RHO * 1e3 / 1e3, cases={})
    res["mass_g"] = vol * RHO
    ecen = np.array([np.mean([pos[n] for n in t[:4]], axis=0) for t in tets])
    dist = -ecen[:, 2]   # Abstand zur Einspannebene z=0
    with open(f"{out}/mesh.inc", "w") as f:
        f.write("*NODE\n" + "".join(f"{n},{p[0]:.7g},{p[1]:.7g},{p[2]:.7g}\n" for n, p in pos.items()))
        f.write(f"*ELEMENT,TYPE={'C3D4' if level.startswith('tet4') else 'C3D10'},ELSET=EALL\n")
        f.write("".join(f"{k}," + ",".join(str(t[j]) for j in (PERM if len(t) == 10 else range(4))) + "\n" for k, t in enumerate(tets, 1)))
        f.write("*NSET,NSET=ALLN\n" + "".join(f"{n},\n" for n in pos))
        f.write("*NSET,NSET=FIX\n" + "".join(f"{n},\n" for n in fix))
    for cname, case in CASES.items():
        load, area = surf_loads(pos, tets, tris, case)
        fs = set(fix.tolist())
        load = {n: a for n, a in load.items() if n not in fs}   # Lastanteil auf Einspannknoten wuerde direkt abfliessen
        wsum = sum(load.values())
        F, d = case["F"], case["dir"]
        with open(f"{out}/{cname}.inp", "w") as f:
            f.write("*INCLUDE,INPUT=mesh.inc\n")
            f.write(f"*MATERIAL,NAME=PETG\n*ELASTIC\n{E},{NU}\n*SOLID SECTION,ELSET=EALL,MATERIAL=PETG\n")
            f.write("*BOUNDARY\nFIX,1,3\n*STEP\n*STATIC,SOLVER=PARDISO\n*CLOAD\n" if False else "*BOUNDARY\nFIX,1,3\n*STEP\n" + ("*STATIC,SOLVER=ITERATIVE CHOLESKY\n" if level == "tet10r" else "*STATIC\n") + "*CLOAD\n")
            for n, a in load.items():
                for k in range(3):
                    if d[k]:
                        f.write(f"{n},{k+1},{d[k] * F * a / wsum:.10g}\n")
            f.write("*NODE PRINT,NSET=FIX,TOTALS=ONLY\nRF\n*NODE PRINT,NSET=ALLN\nU\n*EL PRINT,ELSET=EALL\nS\n*END STEP\n")
        r = subprocess.run(["ccx", "-i", cname], cwd=out, capture_output=True, text=True, env=dict(os.environ, OMP_NUM_THREADS="4"))
        open(f"{out}/{cname}.ccx.log", "w").write(r.stdout[-5000:] + r.stderr)
        dat = open(f"{out}/{cname}.dat").read()
        tot = re.search(r"total force.*?\n\s*\n?\s*([-\dE.+]+)\s+([-\dE.+]+)\s+([-\dE.+]+)", dat, re.S)
        rf = [float(x) for x in tot.groups()]
        ublk = dat.split("displacements (vx,vy,vz)")[1].split("stresses")[0]
        U = np.array([[float(v) for v in m.groups()] for m in re.finditer(r"^\s*\d+\s+(\S+)\s+(\S+)\s+(\S+)\s*$", ublk, re.M)])
        sblk = dat.split("stresses (elem, integ.pnt.,sxx,syy,szz,sxy,sxz,syz)")[1]
        S = np.array([[float(v) for v in m.groups()] for m in
                      re.finditer(r"^\s*(\d+)\s+\d+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$", sblk, re.M)])
        el = S[:, 0].astype(int) - 1; s = S[:, 1:]
        vm = np.sqrt(0.5 * ((s[:, 0] - s[:, 1])**2 + (s[:, 1] - s[:, 2])**2 + (s[:, 2] - s[:, 0])**2) + 3 * (s[:, 3]**2 + s[:, 4]**2 + s[:, 5]**2))
        ok = dist[el] >= D_SING
        imax = np.argmax(np.where(ok, vm, -1))
        fsum = np.array(d) * F
        res["cases"][cname] = dict(F_N=F, dir=d, load_area_mm2=area, load_nodes=len(load), ccx_rc=r.returncode,
                                   rf_N=rf, rf_check_rel=float(np.linalg.norm(np.array(rf) + fsum) / F),
                                   u_max_mm=float(np.linalg.norm(U, axis=1).max()),
                                   vm_max_global_MPa=float(vm.max()), vm_max_bewertet_MPa=float(vm[imax]),
                                   vm_p999_MPa=float(np.percentile(vm, 99.9)),
                                   vm_max_bewertet_at=[round(float(v), 1) for v in ecen[el[imax]]],
                                   sf_bewertet=float(SIG_ALLOW * 2 / vm[imax]))
        c = res["cases"][cname]
        print(f"{variant} h={h:g} {level} {cname}: RF={np.round(rf,1)} (Abw {100*c['rf_check_rel']:.3f} %), u={c['u_max_mm']:.3f} mm, "
              f"vM global {c['vm_max_global_MPa']:.1f}, bewertet {c['vm_max_bewertet_MPa']:.1f} MPa @ {c['vm_max_bewertet_at']}, "
              f"SF(Rm_z) {c['sf_bewertet']:.1f}", flush=True)
        for ext in ("dat", "frd", "sta", "cvg", "12d"):
            if ext == "dat":
                continue
            p = f"{out}/{cname}.{ext}"
            if os.path.exists(p):
                os.remove(p)
        os.remove(f"{out}/{cname}.dat")
    os.remove(f"{out}/mesh.inc")
    res["runtime_s"] = time.time() - t0
    print(f"{variant} h={h:g}: Knoten {res['nodes']}, Elemente {res['elements']}, Masse {res['mass_g']:.1f} g, {res['runtime_s']:.0f} s", flush=True)
    return res


if __name__ == "__main__":
    outroot = f"{DEV}/mechanics/fem"
    rp = f"{outroot}/fem_results.json"
    allr = json.load(open(rp)) if os.path.exists(rp) else {}
    v = sys.argv[1]
    for a in sys.argv[2:]:
        h, _, lev = a.partition(":")
        lev = lev or "tet10"
        r = run(v, float(h), outroot, lev)
        allr[f"{v}_h{float(h):g}" + ("" if lev == "tet10" else f"_{lev}")] = r
        json.dump(allr, open(rp, "w"), indent=1)
