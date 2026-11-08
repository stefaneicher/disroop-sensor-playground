"""Bedienplatine motion-one-ui: Platzierung aus ui_design.py, 2 Lagen, DSN (Stufe place) bzw. SES + GND-Flaechen (Stufe finish)."""
import json, os, sys, pcbnew as P
sys.path.insert(0, os.path.dirname(__file__))
import ui_design as D
mm, FPL = P.FromMM, '/usr/share/kicad/footprints/'
LOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../electronics/kicad/motion-one-ui/lib/ui.pretty')
STAGE, OUT = sys.argv[1], sys.argv[2]
W, H, R = D.W, D.H, 2.0
TPAD = D.P['E1'][5:7]

def place():
    uu = json.load(open(OUT.replace('.kicad_pcb', '.kicad_sch') + '.uuids.json'))
    b = P.NewBoard(OUT); b.SetCopperLayerCount(2); nets = {}
    def net(n):
        if n not in nets: x = P.NETINFO_ITEM(b, n); b.Add(x); nets[n] = x
        return nets[n]
    pin2net = {(r, p): '/' + n for n, m in D.N.items() for r, p in m}
    for ref, (sl, sn, val, fpid, lcsc, x, y, rot) in D.P.items():
        lib, name = fpid.split(':')
        fp = P.FootprintLoad(LOC if lib == 'ui' else FPL + lib + '.pretty', name)
        fp.SetReference(ref); fp.SetValue(val); fp.SetFPIDAsString(fpid)
        fp.SetPath(P.KIID_PATH('/' + uu['uuid'][ref])); fp.SetSheetfile('motion-one-ui.kicad_sch'); fp.SetSheetname('Root')
        for fname in [k for k in uu['props'][ref] if k not in ('Reference', 'Value', 'Footprint', 'LCSC')]:
            f = fp.GetField(fname)
            if f is None: f = P.PCB_FIELD(fp, fp.GetNextFieldOrdinal(), fname); fp.Add(f)
            f.SetText(uu['props'][ref].get(fname, '')); f.SetVisible(False)
        fp.Reference().SetLayer(P.F_Fab)
        if lcsc: f = P.PCB_FIELD(fp, fp.GetNextFieldOrdinal(), 'LCSC'); f.SetText(lcsc); f.SetVisible(False); fp.Add(f)
        b.Add(fp); fp.SetPosition(P.VECTOR2I(mm(x), mm(y))); fp.SetOrientationDegrees(rot)
        for p in fp.Pads():
            num = p.GetNumber()
            if not num: continue
            if (ref, num) in pin2net: p.SetNet(net(pin2net[(ref, num)]))
            elif ref + '.' + num in uu['pinname']:
                p.SetNet(net('unconnected-(%s-%s-Pad%s)' % (ref, uu['pinname'][ref + '.' + num], num)))
    def seg(a, c):
        s = P.PCB_SHAPE(b); s.SetShape(P.SHAPE_T_SEGMENT); s.SetLayer(P.Edge_Cuts); s.SetWidth(mm(0.1))
        s.SetStart(P.VECTOR2I(mm(a[0]), mm(a[1]))); s.SetEnd(P.VECTOR2I(mm(c[0]), mm(c[1]))); b.Add(s)
    def arc(st, mid, en):
        s = P.PCB_SHAPE(b); s.SetShape(P.SHAPE_T_ARC); s.SetLayer(P.Edge_Cuts); s.SetWidth(mm(0.1))
        s.SetArcGeometry(*[P.VECTOR2I(mm(a), mm(c)) for a, c in (st, mid, en)]); b.Add(s)
    k = R * (1 - 0.70710678)
    seg((R, 0), (W - R, 0)); seg((W, R), (W, H - R)); seg((W - R, H), (R, H)); seg((0, H - R), (0, R))
    arc((W - R, 0), (W - k, k), (W, R)); arc((W, H - R), (W - k, H - k), (W - R, H))
    arc((R, H), (k, H - k), (0, H - R)); arc((0, R), (k, k), (R, 0))
    # Touch-Pad: keine Flaechen/Leiterbahnen darunter (beide Lagen), Abstand 1 mm
    z = P.ZONE(b); z.SetIsRuleArea(True); z.SetLayerSet(P.LSET.AllCuMask(2)); z.SetDoNotAllowTracks(False)
    z.SetDoNotAllowVias(True); z.SetDoNotAllowZoneFills(True); z.SetDoNotAllowPads(False); z.SetDoNotAllowFootprints(False)
    z.SetZoneName('TOUCH_KEEPOUT'); ol = z.Outline(); ol.NewOutline()
    for dx, dy in ((-6, -6), (6, -6), (6, 6), (-6, 6)): ol.Append(mm(TPAD[0] + dx), mm(TPAD[1] + dy))
    b.Add(z)
    bb = {}
    for fp in b.GetFootprints():
        c = fp.GetCourtyard(P.F_CrtYd)
        if c.OutlineCount(): r = c.BBox(); bb[fp.GetReference()] = [P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())]
    ks = sorted(bb)
    for i, a in enumerate(ks):
        A = bb[a]
        if A[0] < 0 or A[1] < 0 or A[2] > W or A[3] > H: print('EDGE', a, [round(v, 2) for v in A])
        for c in ks[i + 1:]:
            C = bb[c]
            if A[0] < C[2] and C[0] < A[2] and A[1] < C[3] and C[1] < A[3]: print('OVL', a, c)
    P.SaveBoard(OUT, b)
    print('dsn', P.ExportSpecctraDSN(b, OUT.replace('.kicad_pcb', '.dsn')))

def finish():
    b = P.LoadBoard(OUT)
    print('ses', P.ImportSpecctraSES(b, OUT.replace('.kicad_pcb', '.ses')))
    for L in (P.B_Cu, P.F_Cu):
        z = P.ZONE(b); z.SetLayer(L); z.SetNet(b.FindNet('/GND')); z.SetZoneName('GND_' + b.GetLayerName(L))
        ol = z.Outline(); ol.NewOutline()
        for x, y in ((0.3, 0.3), (W - 0.3, 0.3), (W - 0.3, H - 0.3), (0.3, H - 0.3)): ol.Append(mm(x), mm(y))
        z.SetLocalClearance(mm(0.3)); z.SetMinThickness(mm(0.25)); z.SetThermalReliefGap(mm(0.3))
        z.SetThermalReliefSpokeWidth(mm(0.3)); z.SetPadConnection(P.ZONE_CONNECTION_FULL); b.Add(z)
    P.ZONE_FILLER(b).Fill(b.Zones()); P.SaveBoard(OUT, b); print('tracks', len(b.GetTracks()))

place() if STAGE == 'place' else finish()
