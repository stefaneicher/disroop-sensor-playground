"""Export aller Teile in EINBAULAGE (Geraetekoordinaten, wie motion-one_baugruppe.step) als binaere STL
nach mechanics/assembly_stl/ + explode.json. Aufruf aus Repo-Root (Container)."""
import json, os, sys, hashlib
import numpy as np, trimesh, cadquery as cq
sys.path.insert(0, os.path.dirname(__file__))
import params as P

DEV = "devices/motion-one"; CAD = f"{DEV}/mechanics/cad"; OUT = f"{DEV}/mechanics/assembly_stl"
os.makedirs(OUT, exist_ok=True); V = cq.Vector
MAXB = 2_000_000


def mesh_of(shape, tol=0.05, ang=0.3):
    vs, fs = shape.tessellate(tol, ang)
    return trimesh.Trimesh(np.array([v.toTuple() for v in vs]), np.array(fs), process=True)


parts = {n: cq.Shape.importBrep(f"{CAD}/{n}.brep") for n in ("oberschale", f"unterschale_{P.CHOSEN}", "tastenkappe", "lichtleiter")}
board = cq.importers.importStep(f"{DEV}/{P.BOARD_STEP}").solids().vals()
parts["pcb_r4"] = cq.Compound.makeCompound(board).translate(V(P.BOARD_X0, +P.BOARD_W / 2, P.Z_BB))  # r4-STEP liegt bei y -25..0
bl, bw, bh = P.BAT
parts["akku"] = cq.Solid.makeBox(bl, bw, bh, V(P.BAT_X0, -bw / 2, P.Z_BAT))
import json as _j
import build_enclosure as B
B.MOTOR_Z0 = _j.load(open(f"{CAD}/cad_results.json"))["motor_z0"]
parts["motor"] = B.components()["motor"]
explode = {"oberschale": [0, 0, 30], f"unterschale_{P.CHOSEN}": [0, 0, -30], "tastenkappe": [0, 0, 55],
           "lichtleiter": [0, 0, 50], "pcb_r4": [0, 0, 10], "akku": [0, 0, -12], "motor": [0, 0, -20]}
res = dict(coordinate_system="Geraetekoordinaten mm: x laengs (0=Griffende/USB-C, +x Kopf), y quer (Symmetrie y=0), z hoch (Daumenseite +z), Trennebene z=0",
           source="BREP aus build_enclosure.py (r4), Board-STEP r4 (pcb-engineer, Quader-Bauteile), Akku-Huellkoerper 503040 (ANNAHME)",
           explode_unit="mm", explode_note="Explosionsvektor relativ zur Einbaulage (ANNAHME, Darstellung)", parts={})
for n, s in parts.items():
    tol = 0.05
    while True:
        m = mesh_of(s, tol)
        f = f"{OUT}/{n}.stl"; m.export(f, file_type="stl")
        if os.path.getsize(f) < MAXB or tol > 0.8:
            break
        tol *= 2
    bb = m.bounds
    res["parts"][n] = dict(file=f"{n}.stl", explode_mm=explode[n], tess_tol_mm=tol, triangles=len(m.faces),
                           bytes=os.path.getsize(f), watertight=bool(m.is_watertight),
                           bbox_min=np.round(bb[0], 2).tolist(), bbox_max=np.round(bb[1], 2).tolist(),
                           sha256=hashlib.sha256(open(f, "rb").read()).hexdigest())
    print(n, res["parts"][n], flush=True)
json.dump(res, open(f"{OUT}/explode.json", "w"), indent=1)
