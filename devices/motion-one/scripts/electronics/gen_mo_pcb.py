"""Motion One V1 PCB: Platzierung aus mo_design.py, 4 Lagen, Rand, Antennen-Keepout, DSN-Export (Stufe 'place')
bzw. SES-Import + GND-Zonen + Fuellung (Stufe 'finish')."""
import json, os, sys, pcbnew as P
sys.path.insert(0, os.path.dirname(__file__))
import mo_design as D
mm, FPL = P.FromMM, '/usr/share/kicad/footprints/'
LOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../electronics/kicad/motion-one/motion-one.pretty')
STAGE, OUT = sys.argv[1], sys.argv[2]
W, H, R = 70.0, 25.0, 2.0
NX, NY, STRIP = 10.0, 5.0, 1.5  # r3 Mechanik-Forderungen 4 und 6
STRIP_EXC = {'SW1'}  # Hebel muss ueber Kante y_if=25 (pcb y=0) ragen
KO_X = D.MCX + 5.6  # Antennenbereich Modul (Footprint y 5.6..9.1 -> x nach Rotation 90)

def place():
    uu = json.load(open(OUT.replace('.kicad_pcb', '.kicad_sch') + '.uuids.json'))
    b = P.NewBoard(OUT); b.SetCopperLayerCount(4)
    nets = {}
    def net(n):
        if n not in nets:
            x = P.NETINFO_ITEM(b, n); b.Add(x); nets[n] = x
        return nets[n]
    pin2net = {(r, p): '/' + n for n, m in D.N.items() for r, p in m}
    for ref, (sl, sn, val, fpid, lcsc, x, y, rot) in D.P.items():
        if not fpid: continue
        lib, name = fpid.split(':')
        fp = P.FootprintLoad(LOC if lib == 'motion-one' else FPL + lib + '.pretty', name)
        fp.SetReference(ref); fp.SetValue(val); fp.SetFPIDAsString(fpid)
        fp.SetPath(P.KIID_PATH('/' + uu['uuid'][ref])); fp.SetSheetfile('motion-one.kicad_sch'); fp.SetSheetname('Root')
        for fname in ('Datasheet', 'Description'):
            f = fp.GetField(fname)
            if f is None:
                f = P.PCB_FIELD(fp, fp.GetNextFieldOrdinal(), fname); fp.Add(f)
            f.SetText(uu['props'][ref].get(fname, '')); f.SetVisible(False)
        fp.Reference().SetLayer(P.F_Fab); fp.Reference().SetTextSize(P.VECTOR2I(mm(0.5), mm(0.5))); fp.Reference().SetTextThickness(mm(0.08))
        if lcsc:
            f = P.PCB_FIELD(fp, fp.GetNextFieldOrdinal(), 'LCSC'); f.SetText(lcsc); f.SetVisible(False); fp.Add(f)
        b.Add(fp); fp.SetPosition(P.VECTOR2I(mm(x), mm(y))); fp.SetOrientationDegrees(rot)
        for p in fp.Pads():
            num = p.GetNumber()
            if not num: continue
            key = (ref, 'SH') if ref == 'J1' and num.startswith('S') else (ref, num)
            if key in pin2net: p.SetNet(net(pin2net[key]))
            elif ref + '.' + key[1] not in uu['pinname']: p.SetNetCode(0)
            else:
                pn = uu['pinname'][ref + '.' + key[1]].replace('/', '{slash}')
                p.SetNet(net('unconnected-(%s-%s-Pad%s)' % (ref, pn, num)))
    # Umriss mit Eckradien
    def seg(a, c):
        s = P.PCB_SHAPE(b); s.SetShape(P.SHAPE_T_SEGMENT); s.SetLayer(P.Edge_Cuts); s.SetWidth(mm(0.1))
        s.SetStart(P.VECTOR2I(mm(a[0]), mm(a[1]))); s.SetEnd(P.VECTOR2I(mm(c[0]), mm(c[1]))); b.Add(s)
    def arc(c, st, mid, en):
        s = P.PCB_SHAPE(b); s.SetShape(P.SHAPE_T_ARC); s.SetLayer(P.Edge_Cuts); s.SetWidth(mm(0.1))
        s.SetArcGeometry(*[P.VECTOR2I(mm(a), mm(b_)) for a, b_ in (st, mid, en)]); b.Add(s)
    k = R * (1 - 0.70710678)
    # r3: Ausklinkungen fuer Schraubdome (Griffende x 0..NX, y 0..NY und H-NY..H), Kopfende Ecken R2
    seg((NX, 0), (W - R, 0)); seg((W, R), (W, H - R)); seg((W - R, H), (NX, H))
    seg((NX, H), (NX, H - NY)); seg((NX, H - NY), (0, H - NY)); seg((0, H - NY), (0, NY)); seg((0, NY), (NX, NY)); seg((NX, NY), (NX, 0))
    arc(None, (W - R, 0), (W - k, k), (W, R)); arc(None, (W, H - R), (W - k, H - k), (W - R, H))
    # Antennen-Keepout (alle Kupferlagen): keine Leiterbahnen, Vias, Flaechen
    z = P.ZONE(b); z.SetIsRuleArea(True); z.SetLayerSet(P.LSET.AllCuMask(4))
    z.SetDoNotAllowTracks(True); z.SetDoNotAllowVias(True); z.SetDoNotAllowZoneFills(True); z.SetDoNotAllowPads(False)
    z.SetDoNotAllowFootprints(False); z.SetZoneName('ANT_KEEPOUT')
    ol = z.Outline(); ol.NewOutline()
    for x, y in ((KO_X, -0.5), (W + 0.5, -0.5), (W + 0.5, H + 0.5), (KO_X, H + 0.5)): ol.Append(mm(x), mm(y))
    b.Add(z)
    bb = {}
    for fp in b.GetFootprints():
        c = fp.GetCourtyard(P.F_CrtYd)
        if c.OutlineCount():
            r = c.BBox(); bb[fp.GetReference()] = [P.ToMM(v) for v in (r.GetX(), r.GetY(), r.GetRight(), r.GetBottom())]
    ks = sorted(bb)
    for i, a in enumerate(ks):
        A = bb[a]
        if A[0] < 0 or A[1] < 0 or A[2] > W or A[3] > H: print('EDGE', a, [round(v, 2) for v in A])
        if a not in STRIP_EXC and (A[1] < STRIP or A[3] > H - STRIP): print('STRIP', a, [round(v, 2) for v in A])
        if A[0] < NX + 0.5 and (A[1] < NY + 0.5 or A[3] > H - NY - 0.5): print('NOTCH', a, [round(v, 2) for v in A])
        for c in ks[i + 1:]:
            C = bb[c]
            if A[0] < C[2] and C[0] < A[2] and A[1] < C[3] and C[1] < A[3]:
                print('OVL', a, [round(v, 2) for v in A], c, [round(v, 2) for v in C])
    P.SaveBoard(OUT, b)
    print('dsn', P.ExportSpecctraDSN(b, OUT.replace('.kicad_pcb', '.dsn')))

def gnd_plane(b, n, layers):
    for L in layers:
        z = P.ZONE(b); z.SetLayer(L); z.SetNet(n); z.SetZoneName('GND_' + b.GetLayerName(L))
        ol = z.Outline(); ol.NewOutline()
        for x, y in ((0.3, 0.3), (KO_X - 0.3, 0.3), (KO_X - 0.3, H - 0.3), (0.3, H - 0.3)): ol.Append(mm(x), mm(y))
        z.SetLocalClearance(mm(0.25)); z.SetMinThickness(mm(0.2)); z.SetThermalReliefGap(mm(0.25))
        z.SetThermalReliefSpokeWidth(mm(0.3)); z.SetPadConnection(P.ZONE_CONNECTION_FULL if L != P.In1_Cu else P.ZONE_CONNECTION_THERMAL); z.SetAssignedPriority(0 if L == P.In1_Cu else 1); b.Add(z)

def finish():
    b = P.LoadBoard(OUT)
    print('ses', P.ImportSpecctraSES(b, OUT.replace('.kicad_pcb', '.ses')))
    gnd_plane(b, b.FindNet('/GND'), [P.In1_Cu, P.F_Cu, P.B_Cu, P.In2_Cu])
    # GND-Stitching-Vias im Raster, nur wo frei (DRC prueft)
    P.ZONE_FILLER(b).Fill(b.Zones())
    # Vias ohne Verbindung (Freerouting-Reste) entfernen und neu fuellen
    ends = {}
    for t in b.GetTracks():
        if t.Type() != P.PCB_VIA_T:
            for p in (t.GetStart(), t.GetEnd()): ends.setdefault((p.x, p.y, t.GetNetCode()), 0); ends[(p.x, p.y, t.GetNetCode())] += 1
    rm = 0
    for t in list(b.GetTracks()):
        if t.Type() == P.PCB_VIA_T and ends.get((t.GetPosition().x, t.GetPosition().y, t.GetNetCode()), 0) == 0:
            b.Remove(t); rm += 1
    print('removed vias', rm)
    P.ZONE_FILLER(b).Fill(b.Zones())
    P.SaveBoard(OUT, b)
    print('tracks', len(b.GetTracks()))

place() if STAGE == 'place' else finish()
