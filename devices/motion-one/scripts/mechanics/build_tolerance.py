"""Toleranz-Testkoerper: Stifte 5.0 mm in Loechern mit Spiel 0.1/0.2/0.3/0.4 mm (separat brechbare Stifte, auf Bett liegend
gedruckt) und Einpressmutter-Loecher fuer ruthex M2 (QUELLE Hersteller: 3.2 mm) in Stufen 3.0/3.1/3.2/3.3 mm, Tiefe 5.5 mm."""
import cadquery as cq, trimesh, os
DEV = "devices/motion-one"
CLR = (0.1, 0.2, 0.3, 0.4); INS = (3.0, 3.1, 3.2, 3.3); PIN = 5.0
w = cq.Workplane().box(60, 24, 7, centered=(False, False, False)).edges("|Z").fillet(3)
for i, c in enumerate(CLR):
    w = w.cut(cq.Workplane().center(8 + 14 * i, 7).circle(PIN / 2 + c).extrude(7))
for i, d in enumerate(INS):
    w = w.cut(cq.Workplane().workplane(offset=1.5).center(8 + 14 * i, 18).circle(d / 2).extrude(5.5))
pins = cq.Workplane()
for i in range(4):   # Stifte stehend, Fase unten gegen Elefantenfuss
    pins = pins.union(cq.Workplane().center(8 + 14 * i, 36).circle(PIN / 2).extrude(10).faces("<Z").chamfer(0.4))
pins = pins.union(cq.Workplane().center(8, 33).rect(44, 1.2, centered=False).extrude(0.6))
part = w.union(pins)
os.makedirs(f"{DEV}/mechanics/cad", exist_ok=True)
cq.exporters.export(part, f"{DEV}/mechanics/cad/toleranzkoerper.step")
cq.exporters.export(part, f"{DEV}/mechanics/print/toleranzkoerper.stl")
cq.exporters.export(part, f"{DEV}/mechanics/print/toleranzkoerper.3mf")
m = trimesh.load(f"{DEV}/mechanics/print/toleranzkoerper.stl")
print("toleranzkoerper", m.is_watertight, round(m.volume), (m.bounds[1] - m.bounds[0]).round(1))
