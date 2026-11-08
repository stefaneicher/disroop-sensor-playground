"""Kollision Gehaeuse (BREP exakt) gegen Board-STEP r4 (40 Koerper, pcb-engineer) und Zusatzkoerper.
Boolesche Schnittmenge OCC je Paar; Aufruf aus Repo-Root (Container). Ausgabe mechanics/cad/collision_r4.json"""
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
board = [b.translate(V(P.BOARD_X0, +P.BOARD_W / 2, P.Z_BB)) for b in board]  # r4 y -25..0


def ref_of(b):   # Bauteil-Referenz ueber naechste Position aus heights.json
    c = b.Center(); bx, by = c.x - P.BOARD_X0, c.y - P.BOARD_W / 2 + P.BOARD_W
    if b.BoundingBox().zlen < 1.01 and b.BoundingBox().xlen > 60:
        return "PCB"
    return min(heights, key=lambda r: (r[4] - bx) ** 2 + (r[5] - by) ** 2)[0]


B.OUTER = B.outer_solid(); B.MOTOR_Z0 = json.load(open(f"{CAD}/cad_results.json"))["motor_z0"]
comps = B.components()
extra = {k: comps[k] for k in ("akku", "motor", "akku_stecker", "schaum", "j5_stecker", "schraube_h2")}
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
# Antennen-Keepout: Board x>=66.2 -> Geraet x>=70.8; kein Dom/Schraube/Motor/Mulde naeher als 5 mm (Schale selbst ausgenommen)
KO = P.BOARD_X0 + 66.2
res["keepout"] = {k: round(KO - comps[k].BoundingBox().xmax, 3) for k in ("motor", "schraube_h2", "j5_stecker")}
res["keepout"]["dom_h2"] = round(KO - (B.dev(P.H_DOME[0])[0] + P.H_DOME_D / 2), 3)
res["keepout_pass"] = all(v >= 5.0 for k, v in res["keepout"].items() if k != "j5_stecker")
res["collisions"] = tot
res["status"] = "PASS" if tot == 0 and res["keepout_pass"] else "FAIL"
json.dump(res, open(f"{CAD}/collision_r4.json", "w"), indent=1)
print(json.dumps(res, indent=1))
