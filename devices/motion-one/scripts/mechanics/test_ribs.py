"""Testkoerper: Klemmrippen via Innenraum-Subtraktion (inner minus Rippenbox), dann OUTER minus inner'."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import build_enclosure as B, params as P
B.OUTER = B.outer_solid(); inner = B.inner_solid()
ribs = [B.box(cx - 0.6, cx + 0.6, 11.0, 30, 0.02, 40) for cx in (33.0, 40.0, 67.0)]
i2 = inner
for r in ribs:
    t = i2.cut(r); print("inner cut valid", t.isValid(), "dV", round(t.Volume() - i2.Volume(), 2)); i2 = t
shell = B.OUTER.cut(i2)
print("shell valid", shell.isValid(), "V", shell.Volume(), "vs", B.OUTER.cut(inner).Volume())
