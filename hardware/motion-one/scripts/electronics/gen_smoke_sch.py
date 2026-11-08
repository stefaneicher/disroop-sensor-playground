"""Generate smoke-test schematic (AP2112K-3.3 LDO + caps + LED + connector) for KiCad 10."""
import copy, sys, uuid, os
sys.path.insert(0, os.path.dirname(__file__))
from sexpr import parse, dump, find, Q

LIB = '/usr/share/kicad/symbols/'
OUT = sys.argv[1]
U = lambda: Q(str(uuid.uuid4()))
_cache = {}

def libsym(lib, name):
    if lib not in _cache:
        _cache[lib] = parse(open(LIB + lib + '.kicad_sym').read())
    syms = {s[1]: s for s in find(_cache[lib], 'symbol')}
    s = copy.deepcopy(syms[name])
    ext = find(s, 'extends')
    if ext:
        parent = libsym(lib, ext[0][1])
        flat = [x for x in parent if not (isinstance(x, list) and x[0] in ('property', 'symbol'))]
        flat[1] = Q(name)
        flat += find(s, 'property')
        for sub in find(parent, 'symbol'):
            sub = copy.deepcopy(sub)
            sub[1] = Q(name + sub[1][len(parent[1][len(parent[1].split(':')[0]) + 1:] if ':' in parent[1] else parent[1]):])
            flat.append(sub)
        s = flat
    return s

def pins(sym):
    res = {}
    for sub in find(sym, 'symbol'):
        unit, style = sub[1].rsplit('_', 2)[-2:]
        if style == '2':
            continue
        for p in find(sub, 'pin'):
            at = find(p, 'at')[0]
            res[find(p, 'number')[0][1]] = (float(at[1]), float(at[2]))
    return res

root = U()
parts = [  # ref, lib, name, value, footprint, x, y
    ('J1', 'Connector_Generic', 'Conn_01x02', 'VIN_5V', 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical', 38.1, 76.2),
    ('C1', 'Device', 'C', '1uF', 'Capacitor_SMD:C_0603_1608Metric', 63.5, 76.2),
    ('U1', 'Regulator_Linear', 'AP2112K-3.3', 'AP2112K-3.3', 'Package_TO_SOT_SMD:SOT-23-5', 88.9, 76.2),
    ('C2', 'Device', 'C', '1uF', 'Capacitor_SMD:C_0603_1608Metric', 114.3, 76.2),
    ('R1', 'Device', 'R', '1k', 'Resistor_SMD:R_0603_1608Metric', 127.0, 76.2),
    ('D1', 'Device', 'LED', 'LED_green', 'LED_SMD:LED_0603_1608Metric', 139.7, 88.9),
    ('#FLG01', 'power', 'PWR_FLAG', 'PWR_FLAG', '', 50.8, 63.5),
    ('#FLG02', 'power', 'PWR_FLAG', 'PWR_FLAG', '', 50.8, 101.6),
]
nets = {  # label -> list of (ref, pin)
    'VIN': [('J1', '1'), ('C1', '1'), ('U1', '1'), ('U1', '3'), ('#FLG01', '1')],
    'GND': [('J1', '2'), ('C1', '2'), ('U1', '2'), ('C2', '2'), ('D1', '1'), ('#FLG02', '1')],
    '+3V3': [('U1', '5'), ('C2', '1'), ('R1', '1')],
    'LED_A': [('R1', '2'), ('D1', '2')],
}
noconn = [('U1', '4')]

libsyms, items, pinpos, symuuid = {}, [], {}, {}
for ref, lib, name, val, fp, x, y in parts:
    lid = lib + ':' + name
    if lid not in libsyms:
        s = libsym(lib, name); s[1] = Q(lid); libsyms[lid] = s
    s = libsyms[lid]
    su = U(); symuuid[ref] = su
    inst = ['symbol', ['lib_id', Q(lid)], ['at', x, y, 0], ['unit', 1], ['exclude_from_sim', 'no'],
            ['in_bom', 'yes'], ['on_board', 'yes'], ['dnp', 'no'], ['uuid', su]]
    for p in find(s, 'property'):
        if p[1].startswith(('ki_', 'Sim.')):
            continue  # library-only fields; copying them causes DRC parity warnings
        p = copy.deepcopy(p)
        at = find(p, 'at')[0]
        at[1], at[2] = round(x + float(at[1]), 4), round(y - float(at[2]), 4)
        if p[1] == 'Reference': p[2] = Q(ref)
        if p[1] == 'Value': p[2] = Q(val)
        if p[1] == 'Footprint': p[2] = Q(fp)
        inst.append(p)
    pp = pins(s)
    for num, (px, py) in pp.items():
        inst.append(['pin', Q(num), ['uuid', U()]])
        pinpos[(ref, num)] = (round(x + px, 4), round(y - py, 4))
    inst.append(['instances', ['project', Q('smoke'), ['path', Q('/' + root), ['reference', Q(ref)], ['unit', 1]]]])
    items.append(inst)

for net, members in nets.items():
    for m in members:
        x, y = pinpos[m]
        items.append(['label', Q(net), ['at', x, y, 0], ['fields_autoplaced', 'yes'],
                      ['effects', ['font', ['size', 1.27, 1.27]], ['justify', 'left', 'bottom']], ['uuid', U()]])
for m in noconn:
    x, y = pinpos[m]
    items.append(['no_connect', ['at', x, y], ['uuid', U()]])

sch = ['kicad_sch', ['version', 20250114], ['generator', Q('eeschema')], ['generator_version', Q('9.0')],
       ['uuid', root], ['paper', Q('A4')], ['lib_symbols'] + list(libsyms.values())] + items + \
      [['sheet_instances', ['path', Q('/'), ['page', Q('1')]]], ['embedded_fonts', 'no']]
open(OUT, 'w').write(dump(sch) + '\n')
import json
json.dump({k: str(v) for k, v in symuuid.items()}, open(OUT + '.uuids.json', 'w'), indent=1)
print('pins', pinpos)
