"""Generate routed smoke-test PCB (2 layers, GND zone on B.Cu) with the KiCad 10 pcbnew API."""
import json, os, sys, pcbnew as P
sys.path.insert(0, os.path.dirname(__file__))
from sexpr import parse, find

OUT, UUIDS = sys.argv[1], sys.argv[2]
FPL = '/usr/share/kicad/footprints/'
mm = P.FromMM
uu = json.load(open(UUIDS))
sch = parse(open(UUIDS.replace('.uuids.json', '')).read())
props = {}
for sy in find(sch, 'symbol'):
    d = {p[1]: p[2] for p in find(sy, 'property')}
    props[d['Reference']] = d
b = P.NewBoard(OUT)
nets = {}
def net(name):
    if name not in nets:
        n = P.NETINFO_ITEM(b, name); b.Add(n); nets[name] = n
    return nets[name]

# ref: (lib, fp, value, x, y, rot, {pad: net})
parts = {
    'J1': ('Connector_PinHeader_2.54mm', 'PinHeader_1x02_P2.54mm_Vertical', 'VIN_5V', 5, 9.05, 0, {'1': '/VIN', '2': '/GND'}),
    'C1': ('Capacitor_SMD', 'C_0603_1608Metric', '1uF', 12, 9.825, 270, {'1': '/VIN', '2': '/GND'}),
    'U1': ('Package_TO_SOT_SMD', 'SOT-23-5', 'AP2112K-3.3', 20, 10, 0, {'1': '/VIN', '2': '/GND', '3': '/VIN', '4': 'unconnected-(U1-NC-Pad4)', '5': '/+3V3'}),
    'C2': ('Capacitor_SMD', 'C_0603_1608Metric', '1uF', 26, 9.825, 270, {'1': '/+3V3', '2': '/GND'}),
    'R1': ('Resistor_SMD', 'R_0603_1608Metric', '1k', 30, 9.875, 270, {'1': '/+3V3', '2': '/LED_A'}),
    'D1': ('LED_SMD', 'LED_0603_1608Metric', 'LED_green', 30, 13.5, 90, {'1': '/GND', '2': '/LED_A'}),
}
pad = {}
for ref, (lib, name, val, x, y, rot, pn) in parts.items():
    fp = P.FootprintLoad(FPL + lib + '.pretty', name)
    fp.SetReference(ref); fp.SetValue(val)
    fp.SetFPIDAsString(lib + ':' + name)
    fp.SetPath(P.KIID_PATH('/' + uu[ref]))
    fp.SetSheetfile('smoke.kicad_sch'); fp.SetSheetname('Root')
    for fname in ('Datasheet', 'Description'):
        f = fp.GetField(fname)
        if f is None:
            f = P.PCB_FIELD(fp, fp.GetNextFieldOrdinal() if hasattr(fp, 'GetNextFieldOrdinal') else 0, fname); fp.Add(f)
        f.SetText(props[ref].get(fname, '')); f.SetVisible(False)
    b.Add(fp)
    fp.SetPosition(P.VECTOR2I(mm(x), mm(y))); fp.SetOrientationDegrees(rot)
    for p in fp.Pads():
        p.SetNet(net(pn[p.GetNumber()]))
        pad[(ref, p.GetNumber())] = (P.ToMM(p.GetPosition().x), P.ToMM(p.GetPosition().y))
print({k: (round(v[0], 3), round(v[1], 3)) for k, v in pad.items()})

def trk(pts, n, w=0.3, layer=P.F_Cu):
    for a, c in zip(pts, pts[1:]):
        t = P.PCB_TRACK(b); t.SetStart(P.VECTOR2I(mm(a[0]), mm(a[1]))); t.SetEnd(P.VECTOR2I(mm(c[0]), mm(c[1])))
        t.SetWidth(mm(w)); t.SetLayer(layer); t.SetNet(net(n)); b.Add(t)
def via(pt, n):
    v = P.PCB_VIA(b); v.SetPosition(P.VECTOR2I(mm(pt[0]), mm(pt[1]))); v.SetDrill(mm(0.3)); v.SetWidth(mm(0.6))
    v.SetNet(net(n)); b.Add(v)

V, G, O, L = '/VIN', '/GND', '/+3V3', '/LED_A'
trk([pad['J1', '1'], pad['C1', '1'], pad['U1', '1']], V, 0.5)
u3 = pad['U1', '3']
trk([u3, (u3[0], 12.5)], V); via((u3[0], 12.5), V)
trk([(u3[0], 12.5), (15.5, 12.5), (15.5, 9.05)], V, 0.3, P.B_Cu); via((15.5, 9.05), V)
for ref, vp in (('C1', (12, 12)), ('C2', (26, 12)), ('U1', (17.2, 10)), ('D1', (30, 15.8))):
    p = pad[ref, '1' if ref == 'D1' else '2']
    trk([p, vp], G, 0.4); via(vp, G)
trk([pad['U1', '5'], pad['C2', '1'], pad['R1', '1']], O, 0.4)
trk([pad['R1', '2'], pad['D1', '2']], L, 0.3)

edge = [(0, 4), (36, 4), (36, 18), (0, 18), (0, 4)]
for a, c in zip(edge, edge[1:]):
    s = P.PCB_SHAPE(b); s.SetShape(P.SHAPE_T_SEGMENT); s.SetLayer(P.Edge_Cuts); s.SetWidth(mm(0.1))
    s.SetStart(P.VECTOR2I(mm(a[0]), mm(a[1]))); s.SetEnd(P.VECTOR2I(mm(c[0]), mm(c[1]))); b.Add(s)
z = P.ZONE(b); z.SetLayer(P.B_Cu); z.SetNet(net(G))
ol = z.Outline(); ol.NewOutline()
for x, y in edge[:-1]:
    ol.Append(mm(x + 0.3 if x == 0 else x - 0.3), mm(y + 0.3 if y == 4 else y - 0.3))
z.SetLocalClearance(mm(0.3)); z.SetMinThickness(mm(0.25)); b.Add(z)
P.ZONE_FILLER(b).Fill(b.Zones())
P.SaveBoard(OUT, b)
b2 = P.LoadBoard(OUT)
print('reload: footprints', len(b2.GetFootprints()), 'tracks', len(b2.GetTracks()), 'zones', len(b2.Zones()), 'nets', b2.GetNetCount())
