"""Smoke-Test CAD: parametrischer Wuerfel mit Bohrung, STEP-Roundtrip, 3MF/STL-Export, trimesh-Pruefung."""
import json, math, sys
import cadquery as cq
import trimesh
import zipfile
import xml.etree.ElementTree as ET
import numpy as np


def load_3mf_mesh(path):
    # trimesh braucht fuer 3MF networkx (im Image nicht vorhanden) -> Mesh direkt aus 3D/3dmodel.model lesen
    z = zipfile.ZipFile(path)
    name = [n for n in z.namelist() if n.lower().endswith(".model")][0]
    root = ET.fromstring(z.read(name))
    ns = {"m": root.tag.split("}")[0].strip("{")}
    meshes = []
    for mesh in root.iter("{%s}mesh" % ns["m"]):
        v = np.array([[float(e.get(k)) for k in "xyz"] for e in mesh.find("m:vertices", ns)])
        f = np.array([[int(e.get(k)) for k in ("v1", "v2", "v3")] for e in mesh.find("m:triangles", ns)])
        meshes.append(trimesh.Trimesh(v, f, process=True))
    return trimesh.util.concatenate(meshes)

OUT = "hardware/motion-one/mechanics/smoke"


def cube_with_hole(edge=20.0, hole_d=5.0):
    return cq.Workplane("XY").box(edge, edge, edge).faces(">Z").workplane().hole(hole_d)


def formula_volume(edge, hole_d):
    return edge**3 - math.pi * (hole_d / 2) ** 2 * edge


res = {}
for d in (5.0, 6.0):
    wp = cube_with_hole(20.0, d)
    v = wp.val().Volume()
    res[f"cad_volume_d{d:g}"] = v
    res[f"formula_volume_d{d:g}"] = formula_volume(20.0, d)
    print(f"d={d}: CadQuery-Volumen {v:.4f} mm3, Formel {formula_volume(20.0, d):.4f} mm3")

edge, d = 20.0, 6.0
wp = cube_with_hole(edge, d)
step = f"{OUT}/cube20_hole6.step"
cq.exporters.export(wp, step)
imp = cq.importers.importStep(step)
v_imp = imp.val().Volume()
v_f = formula_volume(edge, d)
res["step_import_volume"] = v_imp
res["step_import_rel_err"] = abs(v_imp - v_f) / v_f
bb = imp.val().BoundingBox()
res["step_bbox"] = [bb.xlen, bb.ylen, bb.zlen]
print(f"STEP-Import: Volumen {v_imp:.4f} mm3, rel. Abw. {res['step_import_rel_err']:.2e}, BBox {res['step_bbox']}")

stl = f"{OUT}/cube20_hole6.stl"
tmf = f"{OUT}/cube20_hole6.3mf"
# Bodenflaeche auf z=0 fuer den Slicer
placed = imp.translate((0, 0, edge / 2))
cq.exporters.export(placed, stl, tolerance=0.01, angularTolerance=0.1)
cq.exporters.export(placed, tmf, tolerance=0.01, angularTolerance=0.1)

for name, path in (("stl", stl), ("3mf", tmf)):
    m = trimesh.load(path, force="mesh") if name == "stl" else load_3mf_mesh(path)
    res[f"{name}_watertight"] = bool(m.is_watertight)
    res[f"{name}_winding_consistent"] = bool(m.is_winding_consistent)
    res[f"{name}_volume"] = float(m.volume)
    res[f"{name}_faces"] = int(len(m.faces))
    res[f"{name}_euler"] = int(m.euler_number)
    print(f"{name}: watertight={m.is_watertight} winding={m.is_winding_consistent} V={m.volume:.3f} faces={len(m.faces)} euler={m.euler_number}")

json.dump(res, open(f"{OUT}/cad_results.json", "w"), indent=2)
ok = res["step_import_rel_err"] < 1e-6 and res["stl_watertight"] and res["3mf_watertight"] and abs(res["stl_volume"] - v_f) / v_f < 0.01
print("CAD-SMOKE", "OK" if ok else "FEHLER")
sys.exit(0 if ok else 1)
