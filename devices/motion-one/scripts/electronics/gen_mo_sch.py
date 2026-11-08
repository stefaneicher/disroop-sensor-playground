"""Motion One V1 Schaltplan (flach, Netz-Labels an jedem Pin) aus mo_design.py erzeugen."""
import copy, sys, uuid, os
sys.path.insert(0, os.path.dirname(__file__))
from sexpr import parse, dump, find, Q

LIB = '/usr/share/kicad/symbols/'
import importlib
D = importlib.import_module(os.environ.get('MO_DESIGN', 'mo_design'))  # r4: auch ui_design (Bedienplatine)
PROJ = getattr(D, 'PROJ', 'motion-one')
LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), getattr(D, 'SYMLIB', '../../electronics/kicad/motion-one/motion-one.kicad_sym'))
OUT = sys.argv[1]
U = lambda: Q(str(uuid.uuid4()))
_cache = {}

def libsym(lib, name):
    if lib not in _cache:
        _cache[lib] = parse(open(LOCAL if lib == getattr(D, 'LOCALLIB', 'motion-one') else LIB + lib + '.kicad_sym').read())
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
            res[find(p, 'number')[0][1]] = (float(at[1]), float(at[2]), find(p, 'name')[0][1])
    return res

root = U()
order = ['U1'] + [r for r in D.P if r != 'U1']
parts, cx, cy = [], 0, 0
for r in order:
    lib, name, val, fp, lcsc, *_ = D.P[r]
    if r == 'U1':
        x, y = 50.8, 76.2
    else:
        x, y = 101.6 + 33.02 * cx, 30.48 + 30.48 * cy
        cx += 1
        if cx == 9: cx, cy = 0, cy + 1
    parts.append((r, lib, name, val, fp, x, y, lcsc))
nets = {k: v for k, v in D.N.items()}
noconn = D.NC
libsyms, items, pinpos, symuuid = {}, [], {}, {}
pinname, props = {}, {}
for ref, lib, name, val, fp, x, y, lcsc in parts:
    lid = lib + ':' + name
    if lid not in libsyms:
        s = libsym(lib, name); s[1] = Q(lid); libsyms[lid] = s
    s = libsyms[lid]
    su = U(); symuuid[ref] = su
    nobom = ref.startswith(('TP', 'H')) or ref == 'J4'
    inst = ['symbol', ['lib_id', Q(lid)], ['at', x, y, 0], ['unit', 1], ['exclude_from_sim', 'no'],
            ['in_bom', 'no' if nobom else 'yes'], ['on_board', 'yes'], ['dnp', 'no'], ['uuid', su]]
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
    if lcsc:
        inst.append(['property', Q('LCSC'), Q(lcsc), ['at', x, y, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]])
    props[ref] = {p[1]: p[2] for p in find(inst, 'property')}
    pp = pins(s)
    for num, (px, py, pnm) in pp.items():
        pinname[ref + '.' + num] = pnm
        inst.append(['pin', Q(num), ['uuid', U()]])
        pinpos[(ref, num)] = (round(x + px, 4), round(y - py, 4))
    inst.append(['instances', ['project', Q(PROJ), ['path', Q('/' + root), ['reference', Q(ref)], ['unit', 1]]]])
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
       ['uuid', root], ['paper', Q('A2')], ['lib_symbols'] + list(libsyms.values())] + items + \
      [['sheet_instances', ['path', Q('/'), ['page', Q('1')]]], ['embedded_fonts', 'no']]
open(OUT, 'w').write(dump(sch) + '\n')
import json
json.dump({'uuid': {k: str(v) for k, v in symuuid.items()}, 'pinname': pinname, 'props': props}, open(OUT + '.uuids.json', 'w'), indent=1)
print('parts', len(parts), 'labels', sum(map(len, nets.values())))
