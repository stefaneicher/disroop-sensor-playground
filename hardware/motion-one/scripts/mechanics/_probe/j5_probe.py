"""Probe: J5-Schnitt isoliert. Aufruf: j5_probe.py <mode>
modes: prep (Schale -> hardware/motion-one/logs/mo_shell.brep), slot, pocket, fase_loft, fase_prism, all_prism"""
import sys, os, time
sys.path.insert(0, "hardware/motion-one/scripts/mechanics")
import build_enclosure as B
import cadquery as cq
P = B.P; V = cq.Vector
mode = sys.argv[1]
t = time.time()
if mode == "prep":
    B.OUTER = B.outer_solid()
    shell = B.OUTER.cut(B.inner_solid())
    shell = B.fuse_all(shell, [B.joint_band().intersect(B.OUTER)])
    shell.exportBrep("hardware/motion-one/logs/mo_shell.brep"); B.OUTER.exportBrep("hardware/motion-one/logs/mo_outer.brep")
    print("prep done", time.time() - t); sys.exit()
shell = cq.Shape.importBrep("hardware/motion-one/logs/mo_shell.brep"); B.OUTER = cq.Shape.importBrep("hardware/motion-one/logs/mo_outer.brep")
top = shell.intersect(B.box(-5, P.L + 5, -40, 40, P.Z_S, 40))
print("top V", top.Volume(), time.time() - t, flush=True)
slot, pocket, fase = B.j5_cuts()
x = B.J5[0]; w, z0, z1 = P.J5_SLOT; c = P.J5_CHAMF[0]
yo = -B.dims(x)[0]
# Fase als Prisma (Extrusion Trapez-Profil in x): Profil in y-z, extrudiert ueber x
def prism():
    zc, hz = (z0 + z1) / 2, (z1 - z0) / 2
    pts = [(yo - 1.0, zc - hz - c - 1.0), (yo - 1.0, zc + hz + c + 1.0), (yo + c, zc + hz), (yo + c, zc - hz)]
    wp = cq.Workplane("YZ", origin=(x - w / 2 - c - 1.0, 0, 0)).polyline(pts).close().extrude(w + 2 * c + 2.0)
    return wp.val()
tool = {"slot": [slot], "pocket": [pocket], "fase_loft": [fase], "fase_prism": [prism()],
        "all_prism": [slot, pocket, prism()], "full": []}[mode]
if mode=="full":
    t1=time.time(); r=B.top_shell(shell); print("full top_shell V",r.Volume(),"valid",r.isValid(),f"{time.time()-t1:.1f}s",flush=True); sys.exit()
print("tool volumes",[round(x.Volume(),2) for x in (slot,pocket,fase,prism())])
for tl in tool:
    r = top.cut(tl)
    print(mode, "valid", r.isValid(), "dV", top.Volume() - r.Volume(), "solids", len(r.Solids()), f"{time.time()-t:.1f}s", flush=True)
