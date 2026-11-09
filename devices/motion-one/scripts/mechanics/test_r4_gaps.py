"""Testkoerper Schieber/Clips: Dichtheit per trimesh. Aufruf im Container aus Repo-Root."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, trimesh, cadquery as cq
import build_enclosure as B
B.OUTER = B.outer_solid()


def chk(name, s):
    vs, fs = s.tessellate(0.02, 0.1)
    m = trimesh.Trimesh(np.array([v.toTuple() for v in vs]), np.array(fs), process=True)
    print(name, "valid", s.isValid(), "V", round(s.Volume(), 1), "watertight", m.is_watertight, "bbox", np.round(m.bounds, 2).tolist())


s, info = B.slider_geom()
print(info)
chk("schieber", s)
for i, c in enumerate(B.clip_solids()):
    chk(f"clip{i}", c)
    chk(f"clip{i}_clipped", c.intersect(B.OUTER))
