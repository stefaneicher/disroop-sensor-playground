"""Smoke-Test FEM: Kragbalken 100x10x10 mm, Gmsh Tet10 -> CalculiX C3D10, Vergleich mit F*L^3/(3EI), RF-Summe.
Aufruf: python3 smoke_fem.py <outdir> <h1> <h2> ..."""
import json, os, re, subprocess, sys
import numpy as np
import gmsh

L, B, H = 100.0, 10.0, 10.0
E, NU, F = 3500.0, 0.35, 10.0          # ANNAHME PLA
I = B * H**3 / 12
D_EB = F * L**3 / (3 * E * I)
G = E / (2 * (1 + NU))
D_TIM = D_EB + F * L / (5 / 6 * G * B * H)
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
# gmsh tet10 -> Abaqus/CalculiX C3D10: Kantenknoten 8 und 9 vertauscht
PERM = [0, 1, 2, 3, 4, 5, 6, 7, 9, 8]


def run(h):
    gmsh.initialize(); gmsh.option.setNumber("General.Terminal", 0)
    gmsh.model.add("beam")
    gmsh.model.occ.addBox(0, 0, 0, L, B, H); gmsh.model.occ.synchronize()
    gmsh.option.setNumber("Mesh.MeshSizeMin", h); gmsh.option.setNumber("Mesh.MeshSizeMax", h)
    gmsh.model.mesh.generate(3); gmsh.model.mesh.setOrder(2)
    tags, xyz, _ = gmsh.model.mesh.getNodes()
    xyz = xyz.reshape(-1, 3); pos = dict(zip(tags.astype(int), xyz))
    et, etags, enodes = gmsh.model.mesh.getElements(3)
    i = list(et).index(11); tets = enodes[i].reshape(-1, 10).astype(int)
    # Endflaeche x=L: konsistente Knotenlasten fuer 6-Knoten-Dreiecke (Ecken 0, Kantenmitten A/3)
    surf = [t for d, t in gmsh.model.getEntitiesInBoundingBox(L - 1e-6, -1e-6, -1e-6, L + 1e-6, B + 1e-6, H + 1e-6, 2)]
    load = {}
    for s in surf:
        st, _, sn = gmsh.model.mesh.getElements(2, s)
        for tri in sn[list(st).index(9)].reshape(-1, 6).astype(int):
            p = np.array([pos[n] for n in tri[:3]])
            A = 0.5 * np.linalg.norm(np.cross(p[1] - p[0], p[2] - p[0]))
            for n in tri[3:]:
                load[n] = load.get(n, 0.0) + A / 3
    gmsh.finalize()
    area = sum(load.values())
    fix = [n for n, p in pos.items() if abs(p[0]) < 1e-6]
    tip = [n for n, p in pos.items() if abs(p[0] - L) < 1e-6]
    name = f"beam_h{h:g}"
    with open(f"{OUT}/{name}.inp", "w") as f:
        f.write("*NODE\n" + "".join(f"{n},{p[0]:.9g},{p[1]:.9g},{p[2]:.9g}\n" for n, p in pos.items()))
        f.write("*ELEMENT,TYPE=C3D10,ELSET=EALL\n")
        for k, t in enumerate(tets, 1):
            f.write(f"{k}," + ",".join(str(t[j]) for j in PERM) + "\n")
        f.write("*NSET,NSET=FIX\n" + "".join(f"{n},\n" for n in fix))
        f.write("*NSET,NSET=TIP\n" + "".join(f"{n},\n" for n in tip))
        f.write(f"*MATERIAL,NAME=PLA\n*ELASTIC\n{E},{NU}\n*SOLID SECTION,ELSET=EALL,MATERIAL=PLA\n")
        f.write("*BOUNDARY\nFIX,1,3\n*STEP\n*STATIC\n*CLOAD\n")
        f.write("".join(f"{n},3,{-F * a / area:.12g}\n" for n, a in load.items()))
        f.write("*NODE PRINT,NSET=FIX,TOTALS=ONLY\nRF\n*NODE PRINT,NSET=TIP\nU\n*NODE FILE\nU\n*END STEP\n")
    r = subprocess.run(["ccx", "-i", name], cwd=OUT, capture_output=True, text=True)
    open(f"{OUT}/{name}.ccx.log", "w").write(r.stdout + r.stderr)
    dat = open(f"{OUT}/{name}.dat").read()
    tot = re.search(r"total force.*?\n\s*\n?\s*([-\dE.+]+)\s+([-\dE.+]+)\s+([-\dE.+]+)", dat, re.S)
    rf = [float(x) for x in tot.groups()]
    blk = dat.split("displacements (vx,vy,vz) for set TIP")[1]
    uz = [float(m.group(1)) for m in re.finditer(r"^\s*\d+\s+\S+\s+\S+\s+(\S+)\s*$", blk, re.M)]
    d = -np.mean(uz)
    return dict(h=h, nodes=len(pos), elements=len(tets), ccx_rc=r.returncode, rf=rf, tip_uz_mean=d,
                tip_uz_min=-max(uz), tip_uz_max=-min(uz), dev_eb=(d - D_EB) / D_EB, dev_tim=(d - D_TIM) / D_TIM,
                load_area=area)


res = dict(L=L, B=B, H=H, E=E, nu=NU, F=F, I=I, delta_EB=D_EB, delta_Timoshenko=D_TIM, levels=[])
print(f"Analytisch: EB {D_EB:.5f} mm, Timoshenko {D_TIM:.5f} mm")
for h in map(float, sys.argv[2:]):
    r = run(h); res["levels"].append(r)
    print(f"h={h:g}: Knoten {r['nodes']}, Elemente {r['elements']}, rc={r['ccx_rc']}, RF={r['rf']}, "
          f"uz_tip={r['tip_uz_mean']:.5f} mm, Abw. EB {100*r['dev_eb']:+.2f} %, Timo {100*r['dev_tim']:+.2f} %")
json.dump(res, open(f"{OUT}/fem_results.json", "w"), indent=2)
