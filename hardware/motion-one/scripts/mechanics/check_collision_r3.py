"""Kollision Gehaeuse (BREP exakt) gegen Board-STEP r3 (60 Koerper, pcb-engineer) und Zusatzkoerper.
Boolesche Schnittmenge OCC je Paar; Aufruf aus Repo-Root (Container). Ausgabe mechanics/cad/collision_r3.json"""
import json, os, sys
import cadquery as cq
sys.path.insert(0, os.path.dirname(__file__))
import params as P
import build_enclosure as B

DEV = "hardware/motion-one"; CAD = f"{DEV}/mechanics/cad"
V = cq.Vector
shells = {n: cq.Shape.importBrep(f"{CAD}/{n}.brep") for n in ("oberschale", f"unterschale_{P.CHOSEN}", "tastenkappe", "lichtleiter")}
board = cq.importers.importStep(f"{DEV}/{P.BOARD_STEP}").solids().vals()
heights = json.load(open("hardware/motion-one/electronics/kicad/motion-one/export/heights.json"))
board = [b.translate(V(P.BOARD_X0, -P.BOARD_W / 2, P.Z_BB)) for b in board]


def ref_of(b):   # Bauteil-Referenz ueber naechste Position aus heights.json
    c = b.Center(); bx, by = c.x - P.BOARD_X0, c.y + P.BOARD_W / 2
    if b.BoundingBox().zlen < 1.01 and b.BoundingBox().xlen > 60:
        return "PCB"
    return min(heights, key=lambda r: (r[4] - bx) ** 2 + (r[5] - by) ** 2)[0]


B.OUTER = B.outer_solid(); B.MOTOR_Z0 = json.load(open(f"{CAD}/cad_results.json"))["motor_z0"]
comps = B.components()
extra = {k: comps[k] for k in ("akku", "motor", "akku_stecker", "schaum")}
res = dict(board_step=P.BOARD_STEP, n_board_solids=len(board), tol_mm3=0.01, pairs=[], clearance_min={})
tot = 0
for sn, sh in shells.items():
    for i, b in enumerate(board):
        ref = ref_of(b)
        v = sh.intersect(b).Volume() if sh.BoundingBox().add(b.BoundingBox()) and True else 0
        if v > res["tol_mm3"]:
            res["pairs"].append(dict(shell=sn, part=ref, vol_mm3=round(v, 3))); tot += 1
    for k, c in extra.items():
        v = sh.intersect(c).Volume()
        if v > res["tol_mm3"]:
            res["pairs"].append(dict(shell=sn, part=k, vol_mm3=round(v, 3))); tot += 1
    # Mindestabstand Schale -> Bauteile (ohne PCB-Platte, die geklemmt wird)
    if sn in ("tastenkappe", "lichtleiter"):   # Abstand nur Kleinteile (Schalen: BRepExtrema ueber 60 Koerper > 10 min)
        d = min(sh.distance(b) for b in board if ref_of(b) != "PCB")
        res["clearance_min"][sn] = round(d, 3)
res["collisions"] = tot
res["status"] = "PASS" if tot == 0 else "FAIL"
json.dump(res, open(f"{CAD}/collision_r3.json", "w"), indent=1)
print(json.dumps(res, indent=1))
