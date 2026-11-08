"""FDM-Pruefung (Ueberhang, Wasserdichtheit, Bauraum), Kollision Gehaeuse vs. Einbauteile (Strahl-Paritaet auf STL),
Masse/Schwerpunkt Gesamtgeraet. Aufruf aus Repo-Root (Container): python3 check_print.py"""
import json, glob, math, os, sys
import numpy as np, trimesh
sys.path.insert(0, os.path.dirname(__file__))
import params as P

DEV = "devices/motion-one"; PRN = f"{DEV}/mechanics/print"
RHO = {"PETG": 1.25e-3, "PLA": 1.24e-3}   # g/mm3 QUELLE Bambu TDS
OVH = 45.0                                 # Grad ab Vertikal, QUELLE CHECKLIST_print3d / Bambu-Default support_threshold
PARTS = ["oberschale", f"unterschale_{P.CHOSEN}", "tastenkappe", "lichtleiter"]
FLIP = {"oberschale": False, "tastenkappe": True, "lichtleiter": True}


def overhang(m):
    n, a, c = m.face_normals, m.area_faces, m.triangles_center
    ang = np.degrees(np.arccos(np.clip(-n[:, 2], -1, 1)))   # 0 = Flaeche zeigt nach unten
    bad = (ang < 90 - OVH) & (c[:, 2] > 0.3)                # Bettauflage ausgenommen
    return float(a[bad].sum()), float(a[(n[:, 2] < -0.99) & (c[:, 2] < 0.3)].sum())


def to_dev(m, name):
    m = m.copy()
    flip = FLIP.get(name, True)
    if flip:
        m.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
    lo, hi = m.bounds
    return m, lo, hi


def inside(m, pts, chunk=400):
    """Paritaet eines +z-Strahls (ohne rtree)."""
    tri = m.triangles
    res = np.zeros(len(pts), bool)
    for i in range(0, len(pts), chunk):
        p = pts[i:i + chunk][:, None, :]
        a, b, c = tri[None, :, 0], tri[None, :, 1], tri[None, :, 2]
        def cr(u, v, w):
            return (v[..., 0] - u[..., 0]) * (w[..., 1] - u[..., 1]) - (v[..., 1] - u[..., 1]) * (w[..., 0] - u[..., 0])
        d0, d1, d2 = cr(p, a, b), cr(p, b, c), cr(p, c, a)
        hit = ((d0 > 0) & (d1 > 0) & (d2 > 0)) | ((d0 < 0) & (d1 < 0) & (d2 < 0))
        den = d0 + d1 + d2
        with np.errstate(divide="ignore", invalid="ignore"):
            z = (d1 * a[..., 2] + d2 * b[..., 2] + d0 * c[..., 2]) / den
        res[i:i + chunk] = (hit & (z > p[..., 2])).sum(1) % 2 == 1
    return res


def main():
    cad = json.load(open(f"{DEV}/mechanics/cad/cad_results.json"))
    out = dict(overhang_limit_deg=OVH, parts={}, collisions={})
    dev = {}
    for name in PARTS:
        f = f"{PRN}/{name}.stl"; m = trimesh.load(f)
        ext = m.bounds[1] - m.bounds[0]
        oa, bed = overhang(m)
        out["parts"][name] = dict(watertight=bool(m.is_watertight), winding=bool(m.is_winding_consistent),
                                  volume_mm3=float(m.volume), extent_mm=ext.round(2).tolist(), fits_a1mini=bool(ext.max() <= 180),
                                  overhang_area_mm2=round(oa, 1), bed_contact_mm2=round(bed, 1), mass_petg_g=float(m.volume * RHO["PETG"]))
        print(name, out["parts"][name])
    # Unter-/Oberschale zurueck in Geraetekoordinaten (Bezug: Oberschale-bbox, Trennebene z=0, y symmetrisch)
    ob = trimesh.load(f"{PRN}/oberschale.stl"); lo, hi = ob.bounds
    ob.apply_translation([-lo[0] + (-0.1), -(lo[1] + hi[1]) / 2, 0])
    ub = trimesh.load(f"{PRN}/unterschale_{P.CHOSEN}.stl")
    ub.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0])); l2, h2 = ub.bounds
    ub.apply_translation([-l2[0] - 0.1, -(l2[1] + h2[1]) / 2, -h2[2]])
    # Komponenten-Huellkoerper (gleiche Masse wie build_enclosure.components)
    BX, BCY = P.BOARD_X0, P.BOARD_W / 2
    bl, bw, bh = P.BAT
    zm0 = cad["motor_z0"]
    btn = (BX + P.BUTTON_XY[0], P.BUTTON_XY[1] - BCY); led = (BX + P.LED_XY[0], P.LED_XY[1] - BCY)
    buz = (BX + P.BUZZER_XY[0], P.BUZZER_XY[1] - BCY); ble = (BX + P.BLE_XY[0], P.BLE_XY[1] - BCY)
    k = P.BOARD_EDGE_KEEPOUT; nx, ny = P.BOARD_NOTCH
    comps = dict(
        board=[(BX + nx, BX + P.BOARD_L, -BCY, BCY, P.Z_BB, P.Z_BB + P.BOARD_T), (BX, BX + nx, -BCY + ny, BCY - ny, P.Z_BB, 0)],
        bauraum_oben=[(BX + nx, BX + P.BOARD_L - 0.5, -BCY + k, BCY - k, 0, P.COMP_H)],
        usb_c=[(BX - P.USB_OVERHANG, BX - P.USB_OVERHANG + P.USB_D, -P.USB_W / 2, P.USB_W / 2, 0, P.USB_H)],
        taster=[(btn[0] - 3, btn[0] + 3, btn[1] - 3, btn[1] + 3, 0, P.BUTTON_SW[2])],
        led=[(led[0] - .8, led[0] + .8, led[1] - .4, led[1] + .4, 0, P.LED_SZ[2])],
        summer=[(buz[0] - 4.5, buz[0] + 4.5, buz[1] - 4.5, buz[1] + 4.5, 0, P.BUZZER_SZ[2])],
        ble=[(ble[0] - 9, ble[0] + 9, ble[1] - 6.5, ble[1] + 6.5, 0, P.BLE_SZ[2])],
        akku=[(P.BAT_X0, P.BAT_X0 + bl, -bw / 2, bw / 2, P.Z_BAT, P.Z_BAT + bh)],
        motor=[(P.MOTOR_X - 3.5, P.MOTOR_X + 3.5, -3.5, 3.5, zm0, zm0 + P.MOTOR_H)],
        kabelkanal=[(P.BAT_X0 + bl + 0.1, BX + P.BOARD_L - 11, -5, 5, P.Z_BAT + 1, P.Z_BB - 0.1)],
    )
    g = 0.4
    for cname, boxes in comps.items():
        pts = []
        for (x0, x1, y0, y1, z0, z1) in boxes:
            e = 0.05   # Beruehrung an Auflageflaechen zulassen
            xs, ys, zs = (np.arange(a + e, b - e + 1e-9, g) for a, b in ((x0, x1), (y0, y1), (z0, z1)))
            if len(zs) == 0:
                zs = np.array([(z0 + z1) / 2])
            pts.append(np.stack(np.meshgrid(xs, ys, zs, indexing="ij"), -1).reshape(-1, 3))
        pts = np.vstack(pts)
        pts = pts + np.array([1e-4, 2.3e-4, 0])   # Strahl nicht auf Kanten
        hits = {}
        for sname, sm in (("oberschale", ob), ("unterschale", ub)):
            n = int(inside(sm, pts).sum())
            hits[sname] = dict(points_inside=n, volume_mm3=round(n * g**3, 2))
        out["collisions"][cname] = dict(points=len(pts), **hits)
        print("Kollision", cname, hits, flush=True)
    # Masse / Schwerpunkt
    items = [("oberschale", ob.volume * RHO["PETG"], ob.center_mass, "SIMULATION Volumen STL x rho PETG"),
             ("unterschale", ub.volume * RHO["PETG"], ub.center_mass, "SIMULATION"),
             ("tastenkappe", out["parts"]["tastenkappe"]["mass_petg_g"], np.array([btn[0], btn[1], 9.0]), "SIMULATION"),
             ("lichtleiter", out["parts"]["lichtleiter"]["mass_petg_g"], np.array([led[0], led[1], 6.0]), "SIMULATION"),
             ("akku", 10.0, np.array([P.BAT_X0 + bl / 2, 0, P.Z_BAT + bh / 2]), "ANNAHME BUDGETS 503040-Klasse ~10 g"),
             ("board_bestueckt", 9.0, np.array([BX + P.BOARD_L / 2, 0, 0.5]), "ANNAHME FR4 70x25x1 ~3.3 g + Bauteile ~5.7 g"),
             ("muenzmotor", 1.0, np.array([P.MOTOR_X, 0, zm0 + 1.35]), "ANNAHME 10x2.7 Muenzmotor ~0.9 g"),
             ("schrauben_einsaetze", 4 * (0.3 + 0.35), np.array([80.0, 0, -2]), "ANNAHME M2x10 Stahl ~0.3 g, ruthex M2 ~0.35 g"),
             ("kabel_schaum_kleber", 2.0, np.array([45.0, 0, -2]), "ANNAHME")]
    M = sum(i[1] for i in items); cg = sum(i[1] * np.asarray(i[2]) for i in items) / M
    out["mass"] = dict(items=[dict(name=a, g=round(b, 2), basis=d) for a, b, _, d in items], total_g=round(M, 1),
                       cg_mm=cg.round(1).tolist(), req_max_g=120, status="PASS" if M <= 120 else "FAIL")
    print("Masse", round(M, 1), "g, Schwerpunkt", cg.round(1))
    json.dump(out, open(f"{DEV}/mechanics/print/check_print.json", "w"), indent=1)


if __name__ == "__main__":
    main()
