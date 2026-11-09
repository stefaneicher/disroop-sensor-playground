"""r4-Pad: Pruefung Schieber <-> Pad/Leisten (BREP exakt, SIMULATION): Kollision beider Endlagen, Spiel per Verschiebung,
Kippspiel, Hebeleingriff, Ueberhang Pad. Ausgabe mechanics/cad/slider_pad_checks.json"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
import cadquery as cq, numpy as np
import build_enclosure as B, params as P
V = B.V; D = "devices/motion-one/mechanics/cad"
top = cq.Shape.importBrep(f"{D}/oberschale.brep"); bot = cq.Shape.importBrep(f"{D}/unterschale_glatt.brep")
sl = cq.Shape.importBrep(f"{D}/schieber.brep")
sx, sy = B.dev(P.SW1_XY); S = P.SLIDER; G = P.SLIDER_GUIDE; tr = S["travel"]
loc = B.box(sx - 14, sx + 14, 10, 25, -4, 8)
topl, botl = top.intersect(loc), bot.intersect(loc)
iv = lambda a, b: round(a.intersect(b).Volume(), 4)
out = {"label": "SIMULATION (BREP exakt, OCC-Schnittvolumen)"}
for dx in (-tr, 0.0, tr):
    s = sl.translate(V(dx, 0, 0))
    out[f"kollision_dx{dx:+.1f}_mm3"] = dict(oberschale=iv(s, topl), unterschale=iv(s, botl))
def first_contact(vec, step=0.01, nmax=60):
    for k in range(1, nmax + 1):
        if sl.translate(V(*[c * k * step for c in vec])).intersect(topl).Volume() > 1e-4:
            return round((k - 1) * step, 3)
    return None
out["spiel_mm"] = {"+y (zum Pad)": first_contact((0, 1, 0)), "+z (obere Leiste)": first_contact((0, 0, 1)),
                   "-z (untere Leiste)": first_contact((0, 0, -1)),
                   "normal Dach (0,+1,+1)/sqrt2": first_contact((0, 1 / math.sqrt(2), 1 / math.sqrt(2))),
                   "normal Unterkante (0,+1,-1)/sqrt2": first_contact((0, 1 / math.sqrt(2), -1 / math.sqrt(2))),
                   "-y (nach innen, frei bis Hebel)": None}
# Kippen um Schieberachse x (Drehpunkt Kragenmitte)
pc = V(sx, (S["y_in"] + G["y_f1"]) / 2, (G["z0"] + G["z1"]) / 2)
def tilt(sign):
    for k in range(1, 300):
        if sl.rotate(pc, pc + V(1, 0, 0), sign * k * 0.05).intersect(topl).Volume() > 1e-4:
            return round((k - 1) * 0.05, 2)
out["kippen_um_x_frei_grad"] = {"+": tilt(1), "-": tilt(-1), "note": "Kragen frei gegen Pad/Leisten; Hebel im Schlitz zusaetzlich"}
lv = P.SW1_LEVER
out["hebel"] = dict(slot_y=(S["y_in"] - 0.1, lv["y_tip"] + P.SLIDER_PAD_CLR), lever_tip_y=lv["y_tip"],
                    eingriff_tiefe_mm=round(lv["y_tip"] - S["y_in"], 3), spiel_spitze_schlitzgrund_mm=P.SLIDER_PAD_CLR,
                    spiel_x_mm=round((S["slot_w"] - lv["w"]) / 2, 3),
                    kragen_gefangen=bool(lv["y_tip"] > S["y_in"] and lv["y_tip"] + P.SLIDER_PAD_CLR <= G["y_f1"]),
                    note="Schlitz bewegt sich mit dem Hebel; Eingriff in beiden Endlagen identisch, ANNAHME Hebelmasse (Datenblatt NICHT geprueft)")
# Kragen raus nach -y nur bis Hebel: Spiel y gesamt
out["spiel_y_gesamt_mm"] = round(P.SLIDER_PAD_CLR + P.SLIDER_PAD_CLR, 3)
# Ueberhang Pad-Region der Oberschale in Druckorientierung (Trennebene aufs Bett, +z nach oben): Faces mit Normal-z < -cos45
bad = []
for f in topl.Faces():
    if f.Area() < 0.05: continue
    c = f.Center(); n = f.normalAt(c)
    if n.z < -math.cos(math.radians(45)) - 1e-3 and c.z > 0.1 and 13.0 < c.y < 16 and abs(c.x - sx) < 11:
        bad.append(dict(c=[round(c.x, 2), round(c.y, 2), round(c.z, 2)], nz=round(n.z, 3), A=round(f.Area(), 2)))
out["ueberhang_pad_gt45"] = bad
json.dump(out, open(f"{D}/slider_pad_checks.json", "w"), indent=1); print(json.dumps(out, indent=1))
