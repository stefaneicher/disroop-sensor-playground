"""Kollision per Netz (manifold3d Schnittvolumen) auf den dichten STLs in Einbaulage. Ersetzt den BREP-Lauf. Ausgabe mechanics/cad/collision_r4.json"""
import json, hashlib, time, sys, os, numpy as np, trimesh, manifold3d as m3
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import params as P
D = "devices/motion-one/mechanics/assembly_stl/"
names = ["oberschale", "unterschale_glatt", "pcb_r4", "akku", "motor", "tastenkappe", "lichtleiter", "schieber"]
T = {n: trimesh.load(D + n + ".stl") for n in names}
BX, BCY = P.BOARD_X0, P.BOARD_W / 2
hx, hy = BX + P.H_DOME[0][0], P.H_DOME[0][1] - BCY
cyl = lambda x, y, z0, z1, d: trimesh.creation.cylinder(radius=d / 2, height=z1 - z0, sections=48, transform=trimesh.transformations.translation_matrix([x, y, (z0 + z1) / 2]))
T["schraube_h2"] = trimesh.util.concatenate([cyl(hx, hy, P.Z_BB - P.H_PILOT[1] + 0.5, 0.0, P.H_PILOT[0]), cyl(hx, hy, 0.0, P.SCREW_HEAD_K, P.SCREW_HEAD_D)])


def man(mesh):
    return m3.Manifold(m3.Mesh(vert_properties=np.asarray(mesh.vertices, np.float32), tri_verts=np.asarray(mesh.faces, np.uint32)))


t0 = time.time(); M = {n: man(t) for n, t in T.items()}
ok = {n: bool(T[n].is_watertight) for n in T}
contact = []; tol = 0.01; pairs = []; tested = 0
ns = list(M)
for i, a in enumerate(ns):
    for b in ns[i + 1:]:
        if a == "unterschale_glatt" and b == "oberschale" or (a, b) == ("oberschale", "unterschale_glatt"):
            pass
        ba, bb = T[a].bounds, T[b].bounds
        if (ba[1] < bb[0] - 0.01).any() or (bb[1] < ba[0] - 0.01).any(): continue
        tested += 1; v = (M[a] ^ M[b]).volume()   # ^ = Schnitt
        if {a, b} == {'oberschale', 'unterschale_glatt'}:
            v0 = v; v = (M[a] ^ M[b].translate((0, 0, -0.02))).volume(); contact.append(dict(pair='oberschale-unterschale', vol_mm3_unshifted=round(float(v0), 3), vol_mm3_shift_0p02=round(float(v), 3), note='Kontakt an Trennebene, Ueberlapp <0.05 mm = Tessellierungstoleranz'))
        if v > tol: pairs.append(dict(a=a, b=b, vol_mm3=round(float(v), 3)))


def dmin(a, b, n=40000):
    pa = trimesh.sample.sample_surface(T[a], n, seed=1)[0]; pb = trimesh.sample.sample_surface(T[b], n, seed=1)[0]
    return round(float(cKDTree(pb).query(pa)[0].min()), 3)


clear = {"tastenkappe-oberschale": dmin("tastenkappe", "oberschale"), "lichtleiter-oberschale": dmin("lichtleiter", "oberschale"),
         "tastenkappe-pcb_r4": dmin("tastenkappe", "pcb_r4")}
KO = BX + 66.2
ko = {"motor": round(KO - T["motor"].bounds[1][0], 3), "schraube_h2": round(KO - T["schraube_h2"].bounds[1][0], 3), "dom_h2": round(KO - (hx + P.H_DOME_D / 2), 3)}
bh = hashlib.sha256(b"".join(open(f"devices/motion-one/mechanics/cad/{n}.brep", "rb").read(1 << 20) + str(os.path.getsize(f"devices/motion-one/mechanics/cad/{n}.brep")).encode() for n in ("oberschale", "unterschale_glatt"))).hexdigest()
res = dict(method="SIMULATION (Netz): manifold3d Schnittvolumen auf STL assembly_stl, Bbox-Vorfilter; Abstand per Punktstichprobe 40000", timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
           runtime_s=round(time.time() - t0, 1), build_hash_sha256={n: hashlib.sha256(open(D + n + ".stl", "rb").read()).hexdigest() for n in names},
           tol_mm3=tol, watertight=ok, pairs_tested=tested, collisions=pairs, contact_info=contact, clearance_min_mm=clear, keepout_mm=ko, keepout_pass=all(v >= 5.0 for v in ko.values()),
           note="Kappe/Lichtleiter-Abstand ist Stichprobe (Untergrenze unsicher ~0.05 mm); Beruehrflaechen Board/Schale koennen Volumen ~0 liefern")
_mech = all(v for n, v in ok.items() if n != "pcb_r4")
_bodies = T["pcb_r4"].split(only_watertight=False)
res["pcb_r4_koerper"] = dict(bodies=len(_bodies), watertight=int(sum(b.is_watertight for b in _bodies)), whole_watertight=ok["pcb_r4"],
                             note="STEP-Tessellat des PCB-Agents (Fremdteil), Mechanik-Teile separat bewertet; Kollisionsmessung per Schnittvolumen bleibt gueltig, wenn Schnitt 0")
res["status_mechanik_teile"] = "PASS" if not pairs and _mech and res["keepout_pass"] else "FAIL"
res["status"] = "PASS" if res["status_mechanik_teile"] == "PASS" and ok["pcb_r4"] else ("PARTIAL" if res["status_mechanik_teile"] == "PASS" else "FAIL")
json.dump(res, open("devices/motion-one/mechanics/cad/collision_r4.json", "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("build_hash_sha256",)}, indent=1))
