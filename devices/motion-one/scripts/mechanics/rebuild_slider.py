"""Nur Schieber neu bauen (unabhaengig von den Schalen): BREP, print/schieber.stl/.3mf, danach export_assembly.py."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import cadquery as cq
import build_enclosure as B
B.OUTER = B.outer_solid()
s, info = B.slider_geom(); print(info, s.Volume(), s.isValid())
D = "devices/motion-one/mechanics"
s.exportBrep(f"{D}/cad/schieber.brep"); cq.exporters.export(cq.Workplane().add(s), f"{D}/cad/schieber.step")
ps = B.to_print(s, False)
for e in ("stl", "3mf"):
    cq.exporters.export(cq.Workplane().add(ps), f"{D}/print/schieber.{e}", tolerance=0.02, angularTolerance=0.1)
