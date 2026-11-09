"""Nur Oberschale neu bauen (Unterschale unveraendert): BREP, STEP, print/oberschale.stl/.3mf, cad_results.json-Eintrag."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import cadquery as cq
import build_enclosure as B, params as P
B.OUTER = B.outer_solid(); inner = B.inner_solid()
for cx, sg in P.CLAMP_VIA_INNER:
    y0, y1 = (B.BCY - P.BOARD_EDGE_KEEPOUT, 30) if sg > 0 else (-30, -(B.BCY - P.BOARD_EDGE_KEEPOUT))
    inner = inner.cut(B.box(cx - P.RIB_T / 2, cx + P.RIB_T / 2, y0, y1, 0.02, 40))
shell = B.fuse_all(B.OUTER.cut(inner), [B.joint_band()])
top = B.top_shell(shell); print("top V", top.Volume(), "valid", top.isValid(), "solids", len(top.Solids()))
D = "devices/motion-one/mechanics"
top.exportBrep(f"{D}/cad/oberschale.brep"); cq.exporters.export(cq.Workplane().add(top), f"{D}/cad/oberschale.step")
ps = B.to_print(top, False)
for e in ("stl", "3mf"):
    cq.exporters.export(cq.Workplane().add(ps), f"{D}/print/oberschale.{e}", tolerance=0.02, angularTolerance=0.1)
r = json.load(open(f"{D}/cad/cad_results.json")); bb = ps.BoundingBox()
r["parts"]["oberschale"].update(volume_mm3=top.Volume(), valid=top.isValid(), print_bbox=[bb.xlen, bb.ylen, bb.zlen])
s, info = B.slider_geom(); r["slider"] = info; r["parts"]["schieber"].update(volume_mm3=s.Volume(), valid=s.isValid())
json.dump(r, open(f"{D}/cad/cad_results.json", "w"), indent=2)
