"""Disroop Motion One - parametrisches Gehaeuse (CadQuery/OCC). Alle Masse aus params.py.
Aufruf (Repo-Root): ./project hw run "python3 devices/motion-one/scripts/mechanics/build_enclosure.py"
Ausgaben: mechanics/cad/*.step (Geraetekoordinaten), mechanics/print/*.stl|.3mf (Druckorientierung), mechanics/cad/cad_results.json"""
import json, math, os, sys, time
import numpy as np
import cadquery as cq
from scipy.interpolate import PchipInterpolator

sys.path.insert(0, os.path.dirname(__file__))
import params as P

DEV = "devices/motion-one"
CAD, PRN = f"{DEV}/mechanics/cad", f"{DEV}/mechanics/print"
V = cq.Vector

_fa, _fbt, _fbb = (PchipInterpolator(P.PX, v) for v in (P.PA, P.PBT, P.PBB))


def end_scale(x):
    u = max(P.R_END - x, x - (P.L - P.R_END), 0.0)
    return P.S_END0 + (1 - P.S_END0) * math.sqrt(max(0.0, 1 - (u / P.R_END) ** 2))


def dims(x):
    xc = min(max(x, P.PX[0]), P.PX[-1])
    s = end_scale(x)
    return float(_fa(xc)) * s, float(_fbt(xc)) * s, float(_fbb(xc)) * s


def thumb(x, y):
    t = P.THUMB
    return t["depth"] * math.exp(-((x - t["x"]) / t["sx"]) ** 2 - (y / t["sy"]) ** 2)


def wave(x, y):
    w = P.WAVE
    if not (w["x0"] < x < w["x1"]):
        return 0.0
    ramp = min(1.0, (x - w["x0"]) / 8.0, (w["x1"] - x) / 8.0)
    win = math.sin(0.5 * math.pi * ramp) ** 2
    return w["amp"] * math.sin(2 * math.pi * (x - w["x0"]) / w["pitch"]) * win * math.exp(-(y / w["sy"]) ** 2)


def section(x, off=0.0, scale=1.0, n=P.NPTS):
    """Querschnitt (y,z) bei x: Superellipse oben/unten getrennt, Daumenmulde oben, Fingerwellen unten,
    optional um 'off' nach innen versetzt (Innenkontur) und skaliert."""
    a, bt, bb = dims(x)
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        c, s = math.cos(t), math.sin(t)
        y = a * math.copysign(abs(c) ** (2 / P.N_SE), c)
        if s >= 0:
            z = bt * abs(s) ** (2 / P.N_SE)
            z -= thumb(x, y) * z / bt
        else:
            z = -bb * abs(s) ** (2 / P.N_SE)
            z += wave(x, y) * (-z) / bb
        pts.append((y, z))
    p = np.array(pts)
    if off:
        d = np.roll(p, -1, 0) - np.roll(p, 1, 0)
        nrm = np.stack([d[:, 1], -d[:, 0]], 1)   # Aussennormale (Umlauf gegen Uhrzeiger)
        nrm /= np.linalg.norm(nrm, axis=1)[:, None]
        p = p - off * nrm
        p[0, 1] = p[n // 2, 1] = 0.0   # Trennebene exakt an breitester Stelle
    return p * scale


def z_top_out(x, y=0.0):
    a, bt, _ = dims(x)
    z = bt * max(0.0, 1 - (abs(y) / a) ** P.N_SE) ** (1 / P.N_SE)
    return z - thumb(x, y) * z / bt


def z_bot_out(x, y=0.0):
    a, _, bb = dims(x)
    z = -bb * max(0.0, 1 - (abs(y) / a) ** P.N_SE) ** (1 / P.N_SE)
    return z + wave(x, y) * (-z) / bb


def stations(x0, x1, dense):
    th = np.linspace(0, math.pi / 2, 7)
    e0 = x0 + dense * (1 - np.cos(th))
    e1 = x1 - dense * (1 - np.cos(th))
    mid = np.arange(x0 + dense + 4.0, x1 - dense - 2.0, 4.0)
    return np.unique(np.round(np.concatenate([e0, mid, e1[::-1]]), 4))


def loft(xs, fn):
    wires = []
    for x in xs:
        p = fn(x)
        e = cq.Edge.makeSpline([V(x, float(y), float(z)) for y, z in p], periodic=True)
        wires.append(cq.Wire.assembleEdges([e]))
    return cq.Solid.makeLoft(wires, ruled=False)


def outer_solid():
    return loft(stations(0.0, P.L, P.R_END), lambda x: section(x))


def inner_solid():
    x0, x1 = P.IN_END, P.L - P.IN_END
    sc0, lt = P.IN_TAPER

    def fn(x):
        u = min(x - x0, x1 - x)
        sc = sc0 + (1 - sc0) * math.sin(0.5 * math.pi * min(1.0, u / lt))
        return section(x, off=P.W, scale=sc)
    return loft(stations(x0, x1, lt), fn)


def box(x0, x1, y0, y1, z0, z1):
    return cq.Solid.makeBox(x1 - x0, y1 - y0, z1 - z0, V(x0, y0, z0))


def cyl(x, y, z0, z1, d):
    return cq.Solid.makeCylinder(d / 2, z1 - z0, V(x, y, z0), V(0, 0, 1))


def safe_clean(s):
    c = s.clean()
    return c if c.isValid() and c.Volume() > 0.99 * s.Volume() else s


def fuse_all(base, parts):
    for p in parts:
        if p.Volume() < 1e-6:
            continue
        r = base.fuse(p)
        if not r.isValid():
            r = r.fix()
        if r.isValid() and base.Volume() - 1e-3 <= r.Volume() <= base.Volume() + p.Volume() + 1e-3:
            base = r
        else:
            print("WARNUNG Fusion verworfen:", p.Center())
    return safe_clean(base)


def cut_all(base, parts):
    for p in parts:
        try:
            r = base.cut(p)
            if not r.isValid():
                r = r.fix()
        except ValueError as e:
            print("WARNUNG Schnitt fehlgeschlagen:", p.Center(), e)
            continue
        if not (r.isValid() and 1 < r.Volume() <= base.Volume() + 1e-3):
            print(f"  Diagnose Schnitt {p.Center()}: valid={r.isValid()} V={r.Volume():.1f} base={base.Volume():.1f}")
            bb = p.BoundingBox(); xs = np.linspace(bb.xmin - 0.01, bb.xmax + 0.01, 5); rr = base; ok = True
            for i in range(4):   # Fallback: Schnittkoerper in 4 x-Scheiben (OCC-Tangentialfaelle)
                try:
                    t = rr.cut(p.intersect(box(xs[i], xs[i + 1] + 0.0013, -50, 50, -50, 50)))
                    t = t if t.isValid() else t.fix()
                except ValueError:
                    ok = False; break
                if t.isValid() and 1 < t.Volume() <= rr.Volume() + 1e-3:
                    rr = t
                else:
                    ok = False; break
            if ok:
                r = rr; print("  Schnitt in Scheiben OK:", p.Center())
        if r.isValid() and 1 < r.Volume() <= base.Volume() + 1e-3:
            base = r
        else:
            print("WARNUNG Schnitt verworfen:", p.Center())
    return safe_clean(base)


BX = P.BOARD_X0          # Board-Ursprung x (Geraet)
BCY = P.BOARD_W / 2      # Board-Mittellinie y=0


def dev(bxy):
    return BX + bxy[0], bxy[1] - BCY


BTN, LED, BUZ, BLE = dev(P.BUTTON_XY), dev(P.LED_XY), dev(P.BUZZER_XY), dev(P.BLE_XY)
USB_Z = P.USB_ZTOP / 2   # r3: Durchbruch mittig zwischen z=0 und J1-Oberkante (Board-STEP)


def usb_cuts():
    sw, sh = P.USB_SLOT
    rw, rh, rd = P.USB_RECESS
    return [box(-2, BX + 0.5, -sw / 2, sw / 2, USB_Z - sh / 2, USB_Z + sh / 2),
            box(-2, rd, -rw / 2, rw / 2, USB_Z - rh / 2, USB_Z + rh / 2)]


def cap_geom():
    """Tastenkappe in Geraetekoordinaten: Stoessel, 45-Grad-Kegel + Kragen (Verliersicherung), Koerper, Kuppe."""
    x, y = BTN
    z_in = z_top_out(x) - P.W
    z_sw = P.BUTTON_SW[2] + P.CAP_TRAVEL_GAP
    z_fl_top = z_in - 0.2
    fl_h, cone_h = 0.6, (P.CAP_FLANGE_D - P.CAP_D) / 2
    z_top = z_top_out(x) + P.CAP_PROUD
    body = cyl(x, y, z_fl_top - 0.01, z_top, P.CAP_D)
    cone = cq.Solid.makeCone(P.CAP_FLANGE_D / 2, P.CAP_D / 2, cone_h, V(x, y, z_fl_top - cone_h), V(0, 0, 1))
    fl = cyl(x, y, z_fl_top - cone_h - fl_h, z_fl_top - cone_h + 0.01, P.CAP_FLANGE_D)
    stem = cyl(x, y, z_sw, z_fl_top - cone_h - fl_h + 0.01, P.CAP_STEM_D)
    c = fuse_all(body, [cone, fl, stem])
    c = cq.Workplane().add(c).faces(">Z").edges().fillet(1.0).val()
    return c, dict(z_switch_gap=z_sw, z_flange_top=z_fl_top, z_top=z_top, z_inner_ceiling=z_in)


def lightpipe_geom():
    x, y = LED
    z_in = z_top_out(x) - P.W
    z0 = P.LED_SZ[2] + 0.2
    z_top = z_top_out(x) + P.LP_PROUD
    zc = z_in - 0.2
    cone_h = (P.LP_COLLAR_D - P.LP_D) / 2
    rod = cyl(x, y, z0, z_top, P.LP_D)
    cone = cq.Solid.makeCone(P.LP_COLLAR_D / 2, P.LP_D / 2, cone_h, V(x, y, zc - cone_h), V(0, 0, 1))
    col = cyl(x, y, zc - cone_h - 0.8, zc - cone_h + 0.01, P.LP_COLLAR_D)
    return fuse_all(rod, [cone, col]), dict(z_bottom=z0, z_top=z_top)


def plan_pts(off, n=240):
    """Draufsicht-Umriss der Trennebene (y = +-a(x)), CCW, um 'off' nach innen versetzt."""
    t = np.linspace(0, math.pi, n)
    xs = P.L / 2 - P.L / 2 * np.cos(t)
    lo = [(x, -dims(x)[0]) for x in xs]
    up = [(x, dims(x)[0]) for x in xs[::-1]]
    a0, a1 = dims(0.0)[0], dims(P.L)[0]
    e1 = [(P.L, y) for y in np.linspace(-a1, a1, 9)[1:-1]]
    e0 = [(0.0, y) for y in np.linspace(a0, -a0, 9)[1:-1]]
    p = np.array(lo + e1 + up + e0)
    d = np.roll(p, -1, 0) - np.roll(p, 1, 0)
    nrm = np.stack([d[:, 1], -d[:, 0]], 1)
    nrm /= np.linalg.norm(nrm, axis=1)[:, None]
    return p - off * nrm


_PLAN_W0 = None


def plan_wire(off, z, kind="arc"):
    """Exakter Trennebenen-Umriss (Schnitt OUTER z=0, Spline-Kanten) per offset2D; schneller als Polygon."""
    global _PLAN_W0
    if _PLAN_W0 is None:
        o = OUTER if OUTER is not None else outer_solid()
        sec = o.intersect(box(-5, P.L + 5, -40, 40, -0.001, 0.001))
        f = [fa for fa in sec.Faces() if abs(fa.Center().z - 0.001) < 1e-3 and fa.normalAt().z > 0.5]
        _PLAN_W0 = f[0].outerWire().translate(V(0, 0, -0.001))
    w = _PLAN_W0.offset2D(-off, kind)[0] if abs(off) > 1e-9 else _PLAN_W0
    return w.translate(V(0, 0, z))


def plan_prism(off, z0, z1):
    return cq.Solid.extrudeLinear(cq.Face.makeFromWires(plan_wire(off, z0)), V(0, 0, z1 - z0))


def plan_ring(d0, d1, z0, z1):
    return plan_prism(d0, z0, z1).cut(plan_prism(d1, z0 - 0.1, z1 + 0.1))


def shadow_cutter(sgn):
    """Schattenfuge: Ring ausserhalb der 45-Grad-Linie d = SHADOW - |z| (sgn=+1 Oberschale, -1 Unterschale).
    Trennebene liegt im breitesten Schnitt (Aussenwand dort senkrecht) -> Fase SHADOW x SHADOW.
    Prisma z-Bereich liegt strikt innerhalb des Loft-Bereichs (keine koplanaren Deckflaechen)."""
    s = P.SHADOW
    ws = [plan_wire(s + 0.01, -0.01 * sgn), plan_wire(0.0, s * sgn)]
    fr = cq.Solid.makeLoft(ws if sgn > 0 else ws[::-1], ruled=True)   # immer von unten nach oben (Orientierung)
    za, zb = -0.005 * sgn, (s - 0.005) * sgn
    return plan_prism(-3.0, min(za, zb), max(za, zb)).cut(fr)


def joint_band():
    """Fuegeband (lokale Innenverdickung) beidseits der Trennebene; wird vor der Teilung in die Schale fusioniert."""
    d1 = P.LIP_D0 + P.LIP_W + P.GROOVE_CLR + P.BAND_T
    return plan_ring(1.0, d1, *P.BAND_Z)


def lip():
    return plan_ring(P.LIP_D0, P.LIP_D0 + P.LIP_W, -0.5, P.LIP_H)


def groove():
    c = P.GROOVE_CLR
    return plan_ring(P.LIP_D0 - c, P.LIP_D0 + P.LIP_W + c, -0.5, P.LIP_H + P.GROOVE_TOP)


def top_shell(shell):
    top = shell.intersect(box(-5, P.L + 5, -40, 40, P.Z_S, 40))
    o = OUTER
    adds = [cyl(sx, sy, 0, 40, P.BOSS_D_INS).intersect(o) for sx, sy in P.SCREWS]
    ribs = [(cx, sg) for cx in P.CLAMP_X for sg in (-1, 1)] + [(cx, 1) for cx in P.CLAMP_X_POS] + [(cx, -1) for cx in P.CLAMP_X_NEG]
    for cx, sgn in ribs:   # Klemmrippen: Unterkante auf Board-Oberseite (Randstreifen |y| 11..12.5)
        if True:
            y0, y1 = (BCY - P.BOARD_EDGE_KEEPOUT, 30) if sgn > 0 else (-30, -(BCY - P.BOARD_EDGE_KEEPOUT))
            adds.append(box(cx - P.RIB_T / 2, cx + P.RIB_T / 2, y0, y1, 0.02, 40).intersect(o))   # 0.02: vermeidet koplanare Flaeche (OCC-Fehler)
    top = fuse_all(top, adds)
    cuts = [cyl(sx, sy, -1, P.INS_HOLE_DEPTH, P.INS_D_HOLE) for sx, sy in P.SCREWS]
    cuts.append(cyl(BTN[0], BTN[1], 0, 40, P.CAP_D + 2 * P.CAP_CLR))
    cuts.append(cyl(LED[0], LED[1], 0, 40, P.LP_D + 2 * P.LP_CLR))
    sp = P.SOUND_PITCH
    for dx, dy in [(0, 0), (sp, 0), (-sp, 0), (0, sp), (0, -sp)]:
        cuts.append(cyl(BUZ[0] + dx, BUZ[1] + dy, 0, 40, P.SOUND_HOLES_D))
    cuts += usb_cuts()
    sx, sy = dev(P.SW1_XY)   # r3: seitlicher Durchbruch SW1-Hebel (+y)
    wl, wz0, wz1 = P.SW1_WIN
    cuts.append(box(sx - wl / 2, sx + wl / 2, BCY - P.BOARD_EDGE_KEEPOUT + 0.5, 30, wz0, wz1))
    cuts += [groove(), shadow_cutter(+1)]   # ADR-0001
    return cut_all(top, cuts)


def bottom_shell(shell, variant):
    bot = shell.intersect(box(-5, P.L + 5, -40, 40, -40, P.Z_S))
    o = OUTER
    bl, bw, bh = P.BAT
    g, t = P.BAT_GAP, P.RIB_T
    bx0, bx1, by = P.BAT_X0 - g, P.BAT_X0 + bl + g, bw / 2 + g
    zb_top = P.Z_BB
    adds = [cyl(sx, sy, -40, 0, P.BOSS_D_SCREW).intersect(o) for sx, sy in P.SCREWS]
    # Akkurahmen (Oberkante = Board-Unterseite -> Board-Auflage); Kabeldurchlass in der Stirnwand am Kopfende
    adds += [box(bx0 - t, bx0, -by - t, by + t, -40, zb_top), box(bx1, bx1 + t, -by - t, -6, -40, zb_top),
             box(bx1, bx1 + t, 6, by + t, -40, zb_top),
             box(bx0 - t, bx1 + t, -by - t, -by, -40, zb_top), box(bx0 - t, bx1 + t, by, by + t, -40, zb_top)]
    adds += [box(bx0, bx1, cy - t / 2, cy + t / 2, -40, P.Z_BAT) for cy in P.CRADLE_Y]   # Wiegerippen
    for sx in P.BOARD_SUPPORT_X[:1]:
        adds.append(box(sx, P.BOARD_SUPPORT_X[1], -BCY, BCY, -40, zb_top))
    # Muenzmotor: ebenes Podest + Ring (Motor unter dem Akku)
    zm0 = MOTOR_Z0
    adds.append(box(P.MOTOR_X - 6.2, P.MOTOR_X + 6.2, -6.2, 6.2, -40, zm0))
    adds.append(cyl(P.MOTOR_X, 0, -40, zm0 + P.MOTOR_H - 0.4, P.MOTOR_D + 0.3 + 2 * P.RING_T))
    # Lanyard-Block
    ly = P.LANYARD
    adds.append(box(P.IN_END - 0.5, ly["x"] + 2.6, -6.5, 6.5, -40, ly["z_tunnel"] + 3.0))
    if variant != "glatt":
        for bxk in P.BULKHEAD_X:
            plate = box(bxk - P.BULKHEAD_T / 2, bxk + P.BULKHEAD_T / 2, -40, 40, -40, 0)
            if variant == "verrippt_ausgespart":
                a, _, bb = dims(bxk)
                hw = a - P.W - P.RIB_RING
                plate = plate.cut(box(bxk - 1, bxk + 1, -hw, hw, -(bb - P.W - P.RIB_RING), 1))
            adds.append(plate)
        x0, x1, h = P.FLOOR_RIB
        floor = [box(x0, x1, -P.RIB_T / 2, P.RIB_T / 2, -40, -(max(dims(xx)[2] for xx in np.arange(x0, x1, 2.0)) - P.W - h))]
        adds += floor
    clip = o
    bot = fuse_all(bot, [a.intersect(clip) for a in adds])
    bot = safe_clean(bot.intersect(box(-5, P.L + 5, -40, 40, -40, P.Z_S)))
    bot = fuse_all(bot, [lip().intersect(clip)])   # ADR-0001 Lippe (ragt bis +LIP_H ueber die Trennebene)
    print(f'  {variant}: nach Fusion V={bot.Volume():.0f} valid={bot.isValid()}')
    cuts = []
    for sx, sy in P.SCREWS:
        cuts.append(cyl(sx, sy, -40, 1, P.D_THROUGH))
        cuts.append(cyl(sx, sy, -40, P.Z_CB, P.D_CBORE))
    cuts.append(box(bx0 + 0.013, bx1 - 0.017, -by + 0.011, by - 0.019, P.Z_BAT + 0.011, P.Z_S - 0.013))   # Akkufach freihalten (r3: nicht koplanar zu Wiegerippen, nicht in Lippe)
    cuts.append(cyl(P.MOTOR_X, 0, zm0, 1, P.MOTOR_D + 0.3))
    cuts.append(box(P.CABLE_NOTCH[0], P.CABLE_NOTCH[1], -by - t - 0.3, -by + 0.5, P.Z_BAT + 1.0, 0.5))   # r3 Kabelschlitz Akku -> J2
    for sy in (-ly["y"], ly["y"]):
        cuts.append(cyl(ly["x"], sy, -40, ly["z_tunnel"], ly["d"]))
    cuts.append(cq.Solid.makeCylinder(ly["d"] / 2, 2 * ly["y"] + ly["d"], V(ly["x"], -ly["y"] - ly["d"] / 2, ly["z_tunnel"]), V(0, 1, 0)))
    cuts += usb_cuts()
    sx, sy = dev(P.SW1_XY)   # Lippe im SW1-Fenster unterbrechen
    hl = P.SW1_WIN[0] / 2 + P.SW1_LIP_GAP
    cuts.append(box(sx - hl, sx + hl, BCY - P.BOARD_EDGE_KEEPOUT + 0.5, 30, -0.3, P.LIP_H + 1))
    cuts.append(shadow_cutter(-1))
    return cut_all(bot, cuts)


def motor_z0():
    # Podest-Oberkante: 0.8 mm ueber dem hoechsten Innenboden im Motorbereich, max. Akku-Unterseite - Motor - 1.0
    zf = max(z_bot_out(x, y) + P.W for x in np.linspace(P.MOTOR_X - 6, P.MOTOR_X + 6, 13) for y in np.linspace(-6, 6, 7))
    return min(zf + 0.8, P.Z_BAT - P.MOTOR_H - 1.0)


def components():
    """Hüllkoerper der Einbauteile (Geraetekoordinaten) fuer Kollision/Masse/Baugruppe."""
    nx, ny = P.BOARD_NOTCH
    b = box(BX, BX + P.BOARD_L, -BCY, BCY, P.Z_BB, P.Z_BB + P.BOARD_T)
    b = b.cut(box(BX - 1, BX + nx, BCY - ny, BCY + 1, -5, 5)).cut(box(BX - 1, BX + nx, -BCY - 1, -BCY + ny, -5, 5))
    k = P.BOARD_EDGE_KEEPOUT
    env = box(BX + nx, BX + P.BOARD_L - 0.5, -BCY + k, BCY - k, 0, P.COMP_H)
    env = env.cut(box(BTN[0] - 3.5, BTN[0] + 3.5, -3.5, 3.5, -1, 9)).cut(box(LED[0] - 2.6, LED[0] + 2.6, -2.6, 2.6, -1, 9))
    bl, bw, bh = P.BAT
    c = dict(
        board=b,
        bauraum_oben=env,
        usb_c=box(BX - P.USB_OVERHANG, BX - P.USB_OVERHANG + P.USB_D, -P.USB_W / 2, P.USB_W / 2, 0, P.USB_H),
        taster=box(BTN[0] - 3, BTN[0] + 3, -3, 3, 0, P.BUTTON_SW[2]),
        led=box(LED[0] - 0.8, LED[0] + 0.8, -0.4, 0.4, 0, P.LED_SZ[2]),
        summer=box(BUZ[0] - 4.5, BUZ[0] + 4.5, -4.5, 4.5, 0, P.BUZZER_SZ[2]),
        ble=box(BLE[0] - 9, BLE[0] + 9, -6.5, 6.5, 0, P.BLE_SZ[2]),
        akku=box(P.BAT_X0, P.BAT_X0 + bl, -bw / 2, bw / 2, P.Z_BAT, P.Z_BAT + bh),
        schaum=box(P.BAT_X0, P.BAT_X0 + bl, -bw / 2, bw / 2, P.Z_BAT + bh, P.Z_BB),
        motor=cyl(P.MOTOR_X, 0, MOTOR_Z0, MOTOR_Z0 + P.MOTOR_H, P.MOTOR_D),
        akku_stecker=box(dev(P.J2_XY)[0] - P.J2_PLUG[0] / 2, dev(P.J2_XY)[0] + P.J2_PLUG[0] / 2,
                         dev((0, 1.77))[1] - P.J2_PLUG[1], dev((0, 1.77))[1], 0, P.J2_PLUG[2]),
        kabelkanal=box(P.BAT_X0 + bl + 0.1, BX + P.BOARD_L - 9.0 - 2, -5, 5, P.Z_BAT + 1, P.Z_BB - 0.1),
    )
    return c


def board_r3():
    """Board-STEP r3 (pcb-engineer) in Geraetekoordinaten: x+BX, y-BCY, z-1 (Board-Unterseite z=-1)."""
    s = cq.importers.importStep(P.BOARD_STEP if os.path.exists(P.BOARD_STEP) else f"{DEV}/{P.BOARD_STEP}")
    return cq.Compound.makeCompound(s.solids().vals()).translate(V(BX, -BCY, P.Z_BB))


def to_print(shape, flip):
    s = shape.rotate(V(0, 0, 0), V(1, 0, 0), 180) if flip else shape
    bb = s.BoundingBox()
    return s.translate(V(-bb.xmin, -bb.ymin, -bb.zmin))


def min_section_radius():
    """Min. Kruemmungsradius der Aussenquerschnitte (B, numerisch) und der Stirnrundung."""
    rmin, where = 1e9, None
    for x in np.arange(P.R_END, P.L - P.R_END + 1e-6, 2.0):
        p = section(x, n=720)
        d1 = (np.roll(p, -1, 0) - np.roll(p, 1, 0)) / 2
        d2 = np.roll(p, -1, 0) - 2 * p + np.roll(p, 1, 0)
        k = np.abs(d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / np.linalg.norm(d1, axis=1) ** 3
        i = int(np.argmax(k))
        if 1 / k[i] < rmin:
            rmin, where = 1 / k[i], (float(x), float(p[i, 0]), float(p[i, 1]))
    a, bt, bb = (v / P.S_END0 * P.S_END0 for v in dims(P.R_END))
    r_end = min(((1 - P.S_END0) * v) ** 2 / P.R_END for v in (a, bt, bb))
    r_end_meridian = min(P.R_END ** 2 / ((1 - P.S_END0) * v) for v in (a, bt, bb))
    return dict(section_r_min=rmin, section_r_min_at=where, end_ellipse_r_min=min(r_end, r_end_meridian))


def main():
    global OUTER, MOTOR_Z0
    t0 = time.time()
    os.makedirs(CAD, exist_ok=True); os.makedirs(PRN, exist_ok=True); os.makedirs(f"{PRN}/varianten", exist_ok=True)
    OUTER = outer_solid()
    inner = inner_solid()
    MOTOR_Z0 = motor_z0()
    print(f"Loft aussen V={OUTER.Volume():.0f} mm3 valid={OUTER.isValid()}, innen V={inner.Volume():.0f} ({time.time()-t0:.1f}s)")
    shell = OUTER.cut(inner)
    jb = joint_band().intersect(OUTER)
    print(f"Fuegeband V={jb.Volume():.0f} valid={jb.isValid()}")
    shell = fuse_all(shell, [jb])
    top = top_shell(shell)
    print(f"Oberschale V={top.Volume():.0f} valid={top.isValid()} ({time.time()-t0:.1f}s)")
    bots = {v: bottom_shell(shell, v) for v in P.VARIANTS}
    for v, b in bots.items():
        print(f"Unterschale {v}: V={b.Volume():.0f} valid={b.isValid()} ({time.time()-t0:.1f}s)")
    cap, capinfo = cap_geom()
    lp, lpinfo = lightpipe_geom()
    comps = components()
    res = dict(params_file="scripts/mechanics/params.py", motor_z0=MOTOR_Z0, cap=capinfo, lightpipe=lpinfo,
               outer_volume=OUTER.Volume(), inner_volume=inner.Volume(), parts={})
    res.update(min_section_radius())
    parts = {"oberschale": (top, False), "tastenkappe": (cap, True), "lichtleiter": (lp, True)}
    for v, b in bots.items():
        parts[f"unterschale_{v}"] = (b, False)   # ADR-0001: Lippe muss nach oben zeigen -> Aussenboden aufs Bett (Support aussen)
    for name, (s, flip) in parts.items():
        cq.exporters.export(cq.Workplane().add(s), f"{CAD}/{name}.step")
        ps = to_print(s, flip)
        base = f"{PRN}/varianten/{name}" if name.startswith("unterschale") and not name.endswith(P.CHOSEN) else f"{PRN}/{name}"
        for ext in ("stl", "3mf"):
            cq.exporters.export(cq.Workplane().add(ps), f"{base}.{ext}", tolerance=0.02, angularTolerance=0.1)
        bb = ps.BoundingBox()
        cm = s.Center()
        res["parts"][name] = dict(volume_mm3=s.Volume(), valid=s.isValid(), print_bbox=[bb.xlen, bb.ylen, bb.zlen],
                                  com=[cm.x, cm.y, cm.z], print_flip_about_x=flip, print_file=base)
    for n, c in comps.items():
        cq.exporters.export(cq.Workplane().add(c), f"{CAD}/komp_{n}.step")
    asm = cq.Assembly(name="motion_one")
    col = dict(oberschale=(0.122, 0.161, 0.216), unterschale=(0.067, 0.094, 0.153), tastenkappe=(0.639, 0.902, 0.208),
               lichtleiter=(0.9, 0.9, 0.85))
    asm.add(top, name="oberschale", color=cq.Color(*col["oberschale"]))
    asm.add(bots[P.CHOSEN], name="unterschale", color=cq.Color(*col["unterschale"]))
    asm.add(cap, name="tastenkappe", color=cq.Color(*col["tastenkappe"]))
    asm.add(lp, name="lichtleiter", color=cq.Color(*col["lichtleiter"]))
    for n in ("akku", "motor", "akku_stecker"):
        asm.add(comps[n], name=n, color=cq.Color(0.6, 0.6, 0.6))
    asm.add(board_r3(), name="board_r3", color=cq.Color(0.1, 0.5, 0.2))
    for name, (s, flip) in parts.items():   # BREP exakt (fuer FEM/Kollision; STEP-Reimport der Schalen ungueltig)
        s.exportBrep(f"{CAD}/{name}.brep")
    asm.save(f"{CAD}/motion-one_baugruppe.step")
    res["chosen_variant"] = P.CHOSEN
    res["runtime_s"] = time.time() - t0
    json.dump(res, open(f"{CAD}/cad_results.json", "w"), indent=2)
    print(json.dumps({k: v for k, v in res.items() if k != "parts"}, indent=1))
    for k, v in res["parts"].items():
        print(k, f"V={v['volume_mm3']:.0f}", "valid", v["valid"], "bbox", [round(b, 1) for b in v["print_bbox"]])


OUTER = None
MOTOR_Z0 = None
if __name__ == "__main__":
    main()
