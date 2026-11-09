"""Haken-Koepfe in vorhandene Unterschale (BREP) fusionieren (statt 15-min-Neubau); exportiert print/STL/3MF/STEP/BREP."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import cadquery as cq
import build_enclosure as B
D = "devices/motion-one/mechanics"
b = cq.Shape.importBrep(f"{D}/cad/unterschale_glatt.brep")
v0 = b.Volume()
r = B.fuse_all(b, B.clip_solids(True))
print("V", v0, "->", r.Volume(), "valid", r.isValid(), "solids", len(r.Solids()))
r.exportBrep(f"{D}/cad/unterschale_glatt.brep"); cq.exporters.export(cq.Workplane().add(r), f"{D}/cad/unterschale_glatt.step")
ps = B.to_print(r, False)
for e in ("stl", "3mf"):
    cq.exporters.export(cq.Workplane().add(ps), f"{D}/print/unterschale_glatt.{e}", tolerance=0.02, angularTolerance=0.1)
