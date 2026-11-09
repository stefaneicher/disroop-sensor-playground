"""Reproduzierbare flache Motion-One-Schaltpläne mit Funktionsblöcken und internen Leitungen."""
import copy, sys, uuid, os, math, heapq
sys.path.insert(0, os.path.dirname(__file__))
from sexpr import parse, dump, find, Q

LIB = '/usr/share/kicad/symbols/'
import importlib
D = importlib.import_module(os.environ.get('MO_DESIGN', 'mo_design'))  # r4: auch ui_design (Bedienplatine)
PROJ = getattr(D, 'PROJ', 'motion-one')
LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), getattr(D, 'SYMLIB', '../../electronics/kicad/motion-one/motion-one.kicad_sym'))
OUT = sys.argv[1]
UUID_NS = uuid.uuid5(uuid.NAMESPACE_URL, 'https://disroop.example/motion-one/schematic-generator/v1')
U = lambda key: Q(str(uuid.uuid5(UUID_NS, PROJ + ':' + key)))
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
            res[find(p, 'number')[0][1]] = (float(at[1]), float(at[2]), find(p, 'name')[0][1], float(at[3]))
    return res

def find_deep(node, key):
    if isinstance(node, list):
        for child in node:
            if isinstance(child, list):
                if child and child[0] == key:
                    yield child
                yield from find_deep(child, key)

prior_root, prior_symuuid = None, {}
if os.path.exists(OUT):
    prior = parse(open(OUT).read())
    prior_root_node = next((x for x in prior if isinstance(x, list) and x[0] == 'uuid'), None)
    if prior_root_node:
        prior_root = prior_root_node[1]
    for item in prior:
        if not (isinstance(item, list) and item[0] == 'symbol' and find(item, 'instances')):
            continue
        ref = next(find_deep(find(item, 'instances')[0], 'reference'))[1]
        su = find(item, 'uuid')[0][1]
        prior_symuuid[ref] = su
root = prior_root or U('root')
LAYOUTS = {
    'motion-one': ('A2', [
        ('USB-C / Laden', 35.56, 38.10, {
            'J1': (45.72, 114.30), 'U2': (96.52, 114.30), 'U3': (149.86, 114.30),
            'R1': (81.28, 76.20), 'R2': (93.98, 76.20), 'R3': (185.42, 120.65),
            'R4': (134.62, 76.20), 'R5': (149.86, 76.20), 'R6': (215.90, 102.87),
            'TH1': (175.26, 118.11), 'D5': (190.50, 106.68), 'J2': (124.46, 170.18),
            'C1': (96.52, 149.86), 'C2': (170.18, 149.86),
            '#FLG01': (180.34, 180.34), '#FLG02': (55.88, 180.34),
        }),
        ('Akku-Schutz / Power-Path / 3V3', 203.20, 38.10, {
            'U4': (228.60, 114.30), 'Q3': (279.40, 114.30), 'R7': (220.98, 76.20),
            'R8': (241.30, 76.20),             'C3': (261.62, 76.20), 'Q1': (220.98, 165.10),
            'Q2': (266.70, 165.10), 'SW1': (330.20, 45.72), 'D1': (208.28, 149.86),
            'U5': (309.88, 165.10), 'C4': (340.36, 165.10), 'C5': (360.68, 185.42),
            'C6': (381.00, 185.42), 'C7': (340.36, 92.71), 'C8': (360.68, 92.71),
            '#FLG03': (220.98, 190.50), '#FLG04': (248.92, 96.52), '#FLG05': (279.40, 200.66),
        }),
        ('BLE-Modul / IMU / Debug / Akkumessung', 386.08, 38.10, {
            'U6': (365.76, 139.70), 'U1': (467.36, 139.70), 'Y1': (406.40, 76.20),
            'C9': (386.08, 76.20), 'C10': (426.72, 76.20), 'C11': (355.60, 208.28),
            'C12': (375.92, 208.28), 'C13': (396.24, 208.28), 'C14': (426.72, 208.28),
            'R9': (535.94, 96.52), 'R10': (535.94, 121.92), 'R11': (535.94, 147.32),
            'R12': (558.80, 96.52), 'R13': (558.80, 121.92), 'R14': (558.80, 147.32),
            'Q4': (472.44, 208.28), 'Q5': (497.84, 208.28), 'J4': (535.94, 241.30),
            'SW2': (467.36, 241.30), 'TP1': (414.02, 243.84), 'TP2': (436.88, 243.84),
        }),
        ('Motor / Summer-Treiber', 35.56, 269.24, {
            'J3': (55.88, 320.04), 'BZ1': (115.57, 320.04), 'D2': (120.65, 302.26),
            'D3': (35.56, 322.58), 'Q6': (160.02, 335.28), 'Q7': (60.96, 327.66),
            'R15': (130.81, 326.39), 'R16': (142.24, 339.09), 'R17': (45.72, 331.47),
        }),
        ('RGB / Erweiterungsanschluss', 279.40, 269.24, {
            'D4': (320.04, 320.04), 'R18': (289.56, 289.56), 'R19': (320.04, 289.56),
            'R20': (350.52, 289.56), 'J5': (419.10, 325.12), 'TP5': (396.24, 284.48),
            'TP6': (436.88, 284.48), 'H1': (480.06, 289.56), 'H2': (510.54, 289.56),
        }),
    ]),
    'motion-one-ui': ('A4', [
        ('Stick / ESD / Anschluss', 90.17, 30.48, {
            'SW1': (144.78, 124.46), 'U2': (190.50, 144.78), 'J1': (238.76, 134.62),
            'R1': (76.20, 114.30), 'R2': (101.60, 104.14), 'R3': (101.60, 127.00),
            'R4': (203.20, 154.94), 'H1': (269.24, 114.30), 'H2': (269.24, 137.16),
        }),
        ('Touch-Sensor', 149.86, 50.80, {
            'U1': (165.10, 73.66), 'C1': (185.42, 73.66), 'R5': (185.42, 100.33),
            'E1': (223.52, 96.52),
        }),
    ]),
}
paper, blocks = LAYOUTS.get(PROJ, ('A2', []))
placement, headings = {}, []
for title, tx, ty, positions in blocks:
    headings.append((title, tx, ty))
    for ref, pos in positions.items():
        if ref in placement:
            raise ValueError('Referenz mehrfach in Layout: ' + ref)
        placement[ref] = pos
if blocks and set(placement) != set(D.P):
    raise ValueError('Layout-Referenzen fehlen/unerwartet: fehlt=%s extra=%s' %
                     (sorted(set(D.P) - set(placement)), sorted(set(placement) - set(D.P))))
parts = []
order = ['U1'] + [r for r in D.P if r != 'U1']
for r in order:
    lib, name, val, fp, lcsc, *_ = D.P[r]
    x, y = placement.get(r, (50.8, 76.2))
    parts.append((r, lib, name, val, fp, x, y, lcsc))
nets = {k: v for k, v in D.N.items()}
noconn = D.NC
libsyms, items, pinpos, pinjustify, symuuid, pinangle = {}, [], {}, {}, {}, {}
pinname, props = {}, {}
for ref, lib, name, val, fp, x, y, lcsc in parts:
    lid = lib + ':' + name
    if lid not in libsyms:
        s = libsym(lib, name)
        s[1] = Q(lid); libsyms[lid] = s
    s = libsyms[lid]
    su = Q(str(prior_symuuid[ref])) if ref in prior_symuuid else U('symbol:' + ref)
    symuuid[ref] = su
    nobom = ref.startswith(('TP', 'H')) or ref == 'J4'
    inst = ['symbol', ['lib_id', Q(lid)], ['at', x, y, 0], ['unit', 1], ['exclude_from_sim', 'no'],
            ['in_bom', 'no' if nobom else 'yes'], ['on_board', 'yes'], ['dnp', 'no'], ['uuid', su]]
    for p in find(s, 'property'):
        if p[1].startswith(('ki_', 'Sim.')):
            continue  # library-only fields; copying them causes DRC parity warnings
        p = copy.deepcopy(p)
        at = find(p, 'at')[0]
        at[1], at[2] = round(x + float(at[1]), 4), round(y - float(at[2]), 4)
        if PROJ == 'motion-one-ui' and ref == 'SW1' and p[1] == 'Reference':
            at[1], at[2], at[3] = 165.1, 95.25, 0
        if PROJ == 'motion-one-ui' and ref == 'SW1' and p[1] == 'Value':
            at[1], at[2] = 144.78, 153.67
        if PROJ == 'motion-one' and ref == 'U6' and p[1] == 'Value':
            at[1], at[2] = 365.76, 170.18
        if PROJ == 'motion-one' and ref == 'TH1' and p[1] == 'Reference':
            at[1], at[2], at[3] = 170.18, 132.08, 0
        if PROJ == 'motion-one' and ref == 'TH1' and p[1] == 'Value':
            at[1], at[2], at[3] = 170.18, 135.89, 0
        if PROJ == 'motion-one' and ref == 'R3' and p[1] == 'Reference':
            at[1], at[2], at[3] = 190.50, 132.08, 0
        if PROJ == 'motion-one' and ref == 'R3' and p[1] == 'Value':
            at[1], at[2], at[3] = 190.50, 135.89, 0
        if p[1] in ('Reference', 'Value'):
            effects = find(p, 'effects')
            font = find(effects[0], 'font') if effects else []
            size = find(font[0], 'size') if font else []
            if size:
                size[0][1] = max(float(size[0][1]), 1.8)
                size[0][2] = max(float(size[0][2]), 1.8)
        if p[1] == 'Reference': p[2] = Q(ref)
        if p[1] == 'Value': p[2] = Q(val)
        if p[1] == 'Footprint': p[2] = Q(fp)
        inst.append(p)
    if lcsc:
        inst.append(['property', Q('LCSC'), Q(lcsc), ['at', x, y, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]])
    props[ref] = {p[1]: p[2] for p in find(inst, 'property')}
    pp = pins(s)
    for num, (px, py, pnm, pang) in pp.items():
        pinname[ref + '.' + num] = pnm
        inst.append(['pin', Q(num), ['uuid', U('pin:%s:%s' % (ref, num))]])
        pinpos[(ref, num)] = (round(x + px, 4), round(y - py, 4))
        pinangle[(ref, num)] = pang
        if int(pang) % 360 == 0:
            pinjustify[(ref, num)] = ['right', 'bottom']
        elif int(pang) % 360 == 180:
            pinjustify[(ref, num)] = ['left', 'bottom']
        elif py > 0:
            pinjustify[(ref, num)] = ['left', 'bottom']
        else:
            pinjustify[(ref, num)] = ['left', 'top']
    inst.append(['instances', ['project', Q(PROJ), ['path', Q('/' + root), ['reference', Q(ref)], ['unit', 1]]]])
    items.append(inst)

# ---- r4 klassische Darstellung: Leitungen im Block, Power-Symbole, Labels nur zwischen Blöcken ----
POWER_NETS = {'motion-one': ['GND', '3V3', 'VBAT', 'VBUS', 'VSW'],
              'motion-one-ui': ['GND', '3V3']}.get(PROJ, ['GND'])
block_of = {ref: title for title, _, _, pos in blocks for ref in pos}
label_occupied_by_net = {}
EXTRA_BLOCK = set()
G = 1.27

def _cells_line(p, q):
    x1, y1 = int(round(p[0] / G)), int(round(p[1] / G))
    x2, y2 = int(round(q[0] / G)), int(round(q[1] / G))
    n = max(abs(x2 - x1), abs(y2 - y1))
    dx = (x2 > x1) - (x2 < x1); dy = (y2 > y1) - (y2 < y1)
    return {(x1 + dx * i, y1 + dy * i) for i in range(n + 1)}

def _box(x0, y0, x1, y1):
    return {(i, j) for i in range(int(math.floor(min(x0, x1) / G)), int(math.ceil(max(x0, x1) / G)) + 1)
            for j in range(int(math.floor(min(y0, y1) / G)), int(math.ceil(max(y0, y1) / G)) + 1)}

def pin_dir(m):
    a = math.radians(pinangle[m])
    return int(round(-math.cos(a))), int(round(math.sin(a)))

def add_wire(net, p, q, key):
    if p == q:
        return
    items.append(['wire', ['pts', ['xy', p[0], p[1]], ['xy', q[0], q[1]]],
                  ['stroke', ['width', 0], ['type', 'default']], ['uuid', U('w:' + key)]])
    label_occupied_by_net.setdefault(net, set()).update(_cells_line(p, q))
    all_wires.append((net, p, q))

import copy as _cp0
POWER_LIB = []
all_wires = []
# Power-Symbole (power local: Netzname bleibt /<NETZ>, Parität unverändert)
for lid, base in (('mo_power:GND_L', 'GND'), ('mo_power:VCC_L', '+3V3')):
    s = libsym('power', base)
    for i, x in enumerate(s):
        if isinstance(x, list) and x and x[0] == 'power':
            s[i] = ['power', 'local']
    nm = lid.split(':')[1]
    for sub in find(s, 'symbol'):
        sub[1] = Q(nm + sub[1].strip('"')[len(base):])
    s[1] = Q(lid)
    libsyms[lid] = s
    _pl = _cp0.deepcopy(s); _pl[1] = Q(nm); POWER_LIB.append(_pl)
pwr_n = 0
_flagged = set()
power_rot = {'GND': {(0, 1): 0, (0, -1): 180, (1, 0): 90, (-1, 0): 270},
             'SUP': {(0, -1): 0, (0, 1): 180, (-1, 0): 90, (1, 0): 270}}
for net in POWER_NETS:
    for m in sorted(nets.get(net, [])):
        x, y = pinpos[m]
        d = pin_dir(m)
        stub = 1.27
        ex, ey = round(x + d[0] * stub, 4), round(y + d[1] * stub, 4)
        add_wire(net, (x, y), (ex, ey), 'pwrstub:%s.%s' % m)
        pwr_n += 1
        ref = '#PWR%03d' % pwr_n
        kind = 'GND' if net == 'GND' else 'SUP'
        rot = power_rot[kind][d]
        lid = 'mo_power:GND_L' if kind == 'GND' else 'mo_power:VCC_L'
        tl = len(net) * 1.1 + 1.0
        vx, vy = ex + d[0] * (3.6 + (tl / 2 if d[0] else 0)), ey + d[1] * (4.4 if d[1] else 0)
        if d[0] == 0:
            vy = ey + d[1] * 4.6
        fang = 0 if rot in (0, 180) else 90
        if rot in (90, 270):
            fang = rot  # Feldwinkel relativ: ergibt waagrechten Text
        inst = ['symbol', ['lib_id', Q(lid)], ['at', ex, ey, rot], ['unit', 1], ['exclude_from_sim', 'no'],
                ['in_bom', 'no'], ['on_board', 'yes'], ['dnp', 'no'], ['uuid', U('pwr:%s:%s.%s' % (net, m[0], m[1]))],
                ['property', Q('Reference'), Q(ref), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['property', Q('Value'), Q(net), ['at', round(vx, 3), round(vy, 3), fang],
                 ['effects', ['font', ['size', 1.27, 1.27]]] + ([['hide', 'yes']] if kind == 'GND' else [])],
                ['property', Q('Footprint'), Q(''), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['property', Q('Datasheet'), Q(''), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['pin', Q('1'), ['uuid', U('pwrpin:%s:%s.%s' % (net, m[0], m[1]))]],
                ['instances', ['project', Q(PROJ), ['path', Q('/' + root), ['reference', Q(ref)], ['unit', 1]]]]]
        items.append(inst)
        if PROJ == 'motion-one-ui' and net not in _flagged:
            _flagged.add(net)
            if 'power:PWR_FLAG' not in libsyms:
                libsyms['power:PWR_FLAG'] = libsym('power', 'PWR_FLAG'); libsyms['power:PWR_FLAG'][1] = Q('power:PWR_FLAG')
            fr = '#FLG%02d' % (90 + len(_flagged))
            items.append(['symbol', ['lib_id', Q('power:PWR_FLAG')], ['at', ex, ey, 90 if d[1] else 0], ['unit', 1], ['exclude_from_sim', 'no'],
                ['in_bom', 'no'], ['on_board', 'no'], ['dnp', 'no'], ['uuid', U('flg:%s' % net)],
                ['property', Q('Reference'), Q(fr), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['property', Q('Value'), Q('PWR_FLAG'), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['property', Q('Footprint'), Q(''), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['property', Q('Datasheet'), Q(''), ['at', ex, ey, 0], ['effects', ['font', ['size', 1.27, 1.27]], ['hide', 'yes']]],
                ['pin', Q('1'), ['uuid', U('flgpin:%s' % net)]],
                ['instances', ['project', Q(PROJ), ['path', Q('/' + root), ['reference', Q(fr)], ['unit', 1]]]]])
        gx, gy = ex + d[0] * 2.6, ey + d[1] * 2.6
        EXTRA_BLOCK.update(_box(ex - 1.3, ey - 1.3, gx + 1.3, gy + 1.3))
        if kind != 'GND':
            EXTRA_BLOCK.update(_box(vx - tl / 2, vy - 0.8, vx + tl / 2, vy + 0.8))

LABEL_SPIN = {(1, 0): (0, 'left'), (-1, 0): (180, 'right'), (0, -1): (90, 'left'), (0, 1): (270, 'right')}
n_labels = 0
def add_label(net, m, stub):
    global n_labels
    x, y = pinpos[m]
    d = pin_dir(m)
    ex, ey = round(x + d[0] * stub, 4), round(y + d[1] * stub, 4)
    add_wire(net, (x, y), (ex, ey), 'lstub:%s.%s' % m)
    ang, just = LABEL_SPIN[d]
    items.append(['label', Q(net), ['at', ex, ey, ang], ['fields_autoplaced', 'yes'],
                  ['effects', ['font', ['size', 1.27, 1.27]], ['justify', just, 'bottom']],
                  ['uuid', U('label:%s:%s' % m)]])
    n_labels += 1
    tl = len(net) * 1.15 + 1.3
    EXTRA_BLOCK.update(_box(ex, ey, ex + d[0] * tl + (0 if d[0] else 0.01), ey + d[1] * tl) if d[1] or d[0] else set())
    if d[0]:
        EXTRA_BLOCK.update(_box(ex + 0.5 * d[0], ey - 1.6, ex + d[0] * tl, ey))
    else:
        EXTRA_BLOCK.update(_box(ex - 1.6, ey + 0.5 * d[1], ex, ey + d[1] * tl))

# Gruppen je Netz und Block
groups = []  # (net, block, members)
for net, members in nets.items():
    if net in POWER_NETS:
        continue
    by_block = {}
    for m in members:
        by_block.setdefault(block_of.get(m[0], '?'), []).append(m)
    for blk, ms in by_block.items():
        groups.append((net, blk, sorted(ms), len(by_block) > 1))

def _anchor_key(m):
    return (not m[0].startswith(('U', 'J')), m)
labelled = set()
label_groups = []
for net, blk, ms, inter in groups:
    if inter:
        a = sorted(ms, key=_anchor_key)[0]
        add_label(net, a, 7.62 if len(ms) > 1 else 2.54)
        labelled.add(a)
        label_groups.append((net, blk))

GRID = 1.27
MIN_WIRE_STUB_STEPS = 4
MAX_WIRE_STUB_STEPS = 24
SYMBOL_MARGIN = 1.27
symbol_points = {}
for (ref, _), (x, y) in pinpos.items():
    symbol_points.setdefault(ref, []).append((x, y))
symbol_boxes = {
    ref: (math.floor((min(x for x, _ in pts) - SYMBOL_MARGIN) / GRID),
          math.ceil((max(x for x, _ in pts) + SYMBOL_MARGIN) / GRID),
          math.floor((min(y for _, y in pts) - SYMBOL_MARGIN) / GRID),
          math.ceil((max(y for _, y in pts) + SYMBOL_MARGIN) / GRID))
    for ref, pts in symbol_points.items()
}

def _grid_coord(value):
    coord = int(round(value / GRID))
    if abs(coord * GRID - value) > 0.02:
        raise ValueError('Pin liegt nicht auf dem 1.27-mm-Routingraster: %.4f mm' % value)
    return coord

def _box_cells(box):
    return {(x, y) for x in range(box[0], box[1] + 1)
            for y in range(box[2], box[3] + 1)}

_symbol_cells = {ref: _box_cells(box) for ref, box in symbol_boxes.items()}


def _astar(start, goal, blocked, occupied, bounds):
    min_x, max_x, min_y, max_y = bounds
    dirs = ((1, 0), (0, 1), (-1, 0), (0, -1))
    initial = (start[0], start[1], 4)
    queue = [(abs(start[0] - goal[0]) + abs(start[1] - goal[1]), 0.0, initial)]
    best, previous = {initial: 0.0}, {}
    final = None
    while queue:
        _, cost, state = heapq.heappop(queue)
        if cost != best.get(state):
            continue
        x, y, old_dir = state
        if (x, y) == goal:
            final = state
            break
        for direction, (dx, dy) in enumerate(dirs):
            point = (x + dx, y + dy)
            if not (min_x <= point[0] <= max_x and min_y <= point[1] <= max_y):
                continue
            if point in blocked and point != goal:
                continue
            next_state = (point[0], point[1], direction)
            next_cost = (cost + 1.0 + (0.25 if old_dir not in (4, direction) else 0.0)
                         + (1000.0 if point in occupied and point != goal else 0.0))
            if next_cost >= best.get(next_state, float('inf')):
                continue
            best[next_state], previous[next_state] = next_cost, state
            heuristic = abs(point[0] - goal[0]) + abs(point[1] - goal[1])
            heapq.heappush(queue, (next_cost + heuristic, next_cost, next_state))
    if final is None:
        return None
    path = [(final[0], final[1])]
    while final != initial:
        final = previous[final]
        path.append((final[0], final[1]))
    return list(reversed(path))

def _simplify_grid_path(path):
    if len(path) < 3:
        return path
    simplified = [path[0]]
    for index in range(1, len(path) - 1):
        a, b, c = simplified[-1], path[index], path[index + 1]
        if a[0] == b[0] == c[0] or a[1] == b[1] == c[1]:
            continue
        simplified.append(b)
    simplified.append(path[-1])
    return simplified

_wire_occupied_by_net = label_occupied_by_net

def _route(net, a, b):
    x1, y1 = pinpos[a]; x2, y2 = pinpos[b]
    pa = (_grid_coord(x1), _grid_coord(y1)); pb = (_grid_coord(x2), _grid_coord(y2))
    da, db = pin_dir(a), pin_dir(b)
    def esc(ref, p, d):
        for k in range(2, 30):
            q = (p[0] + d[0] * k, p[1] + d[1] * k)
            if q not in _symbol_cells.get(ref, set()):
                return k, q
        return None
    ra, rb = esc(a[0], pa, da), esc(b[0], pb, db)
    if not ra or not rb:
        return None
    (ka, ea), (kb, eb) = ra, rb
    corr = set()
    for p, d, k in ((pa, da, ka), (pb, db, kb)):
        corr.update((p[0] + d[0] * i, p[1] + d[1] * i) for i in range(k + 1))
    blocked = set().union(*_symbol_cells.values()) | EXTRA_BLOCK
    blocked -= corr
    foreign = {c for (mm, c) in _pin_cells.items() if net_by_member.get(mm) != net}
    if corr & foreign:
        return None
    blocked |= foreign
    occupied = set()
    for on, cells in _wire_occupied_by_net.items():
        if on != net:
            occupied |= cells
    if corr & occupied:
        return None
    blocked |= {c for c in occupied}  # keine Überlagerung/Kreuzung mit Fremdnetzen
    # Kreuzungen erlauben (aber teuer): nur Zellen, die nicht Endpunkte sind
    m = 60
    bounds = (min(pa[0], pb[0]) - m, max(pa[0], pb[0]) + m, min(pa[1], pb[1]) - m, max(pa[1], pb[1]) + m)
    path = _astar(ea, eb, blocked, set(), bounds)
    if path is None:
        return None
    gp = _simplify_grid_path([pa] + [(pa[0] + da[0] * i, pa[1] + da[1] * i) for i in range(1, ka)] + path +
                             [(pb[0] + db[0] * i, pb[1] + db[1] * i) for i in range(kb - 1, 0, -1)] + [pb])
    return [(round(x * G, 4), round(y * G, 4)) for x, y in gp]

net_by_member = {mm: n for n, ms_ in nets.items() for mm in ms_}
_pin_cells = {mm: (_grid_coord(p[0]), _grid_coord(p[1])) for mm, p in pinpos.items()}
import copy as _cp
forced = set()
while True:
    _snap = (len(items), len(all_wires), _cp.deepcopy(label_occupied_by_net), set(EXTRA_BLOCK), set(labelled), n_labels)
    for net, blk, ms, inter in groups:
        if (net, blk) in forced:
            for mm in ms:
                if mm not in labelled:
                    add_label(net, mm, 2.54); labelled.add(mm)
    route_fail = []
    n_route = 0
    for net, blk, ms, inter in sorted(groups, key=lambda g: (len(g[2]), g[0])):
        if len(ms) < 2 or (net, blk) in forced:
            continue
        done = [ms[0]]; todo = ms[1:]
        while todo:
            _, a, b = min(((abs(pinpos[a][0] - pinpos[b][0]) + abs(pinpos[a][1] - pinpos[b][1]), a, b)
                           for a in done for b in todo))
            r = _route(net, a, b)
            if r is None:
                route_fail.append((net, blk))
            else:
                for i, (p, q) in enumerate(zip(r, r[1:])):
                    add_wire(net, p, q, 'r:%s:%s.%s-%s.%s:%d' % (net, a[0], a[1], b[0], b[1], i))
                n_route += 1
            done.append(b); todo.remove(b)
    if not route_fail:
        break
    forced |= set(route_fail)
    del items[_snap[0]:]; del all_wires[_snap[1]:]
    label_occupied_by_net.clear(); label_occupied_by_net.update(_snap[2])
    EXTRA_BLOCK.clear(); EXTRA_BLOCK.update(_snap[3]); labelled = set(_snap[4]); n_labels = _snap[5]
_named = {net_by_member.get(mm) for mm in labelled}
for net, blk, ms, inter in groups:
    if net not in _named and net not in POWER_NETS:
        _cand = sorted(ms, key=lambda mm: (pinpos[mm][0], pinpos[mm][1]))
        add_label(net, _cand[-1], 2.54); labelled.add(_cand[-1]); _named.add(net)
print('forced label groups', sorted(forced), file=sys.stderr)
print('routed', n_route, file=sys.stderr)

# Verbindungspunkte
from collections import Counter
cnt = Counter()
pinpts = set(pinpos.values())
for net, p, q in all_wires:
    cnt[(net, p)] += 1; cnt[(net, q)] += 1
for (net, p), c in list(cnt.items()):
    extra = 1 if p in pinpts else 0
    for n2, a, b in all_wires:
        if n2 == net and p not in (a, b) and min(a[0], b[0]) <= p[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= p[1] <= max(a[1], b[1]):
            extra += 2
    if c + extra >= 3:
        items.append(['junction', ['at', p[0], p[1]], ['diameter', 0], ['color', 0, 0, 0, 0], ['uuid', U('j:%s:%s:%s' % (net, p[0], p[1]))]])

# Blockrahmen
for title, tx, ty, positions in blocks:
    pts = [pinpos[k] for k in pinpos if k[0] in positions]
    x0 = min(p[0] for p in pts) - 15.24; x1 = max(p[0] for p in pts) + 15.24
    y0 = min(p[1] for p in pts) - 15.24; y1 = max(p[1] for p in pts) + 12.7
    items.append(['rectangle', ['start', round(x0, 2), round(y0, 2)], ['end', round(x1, 2), round(y1, 2)],
                  ['stroke', ['width', 0.3], ['type', 'dash']], ['fill', ['type', 'none']], ['uuid', U('frame:' + title)]])
    items.append(['text', Q(title), ['at', round(x0 + 1.27, 2), round(y0 + 3.0, 2), 0],
                  ['effects', ['font', ['size', 2.54, 2.54], ['bold', 'yes']], ['justify', 'left']], ['uuid', U('heading:' + title)]])
print('labels', n_labels, 'wires', len(all_wires), 'power', pwr_n, file=sys.stderr)


if PROJ == 'motion-one-ui':
    items.append(['text', Q('SW1: X=2; Y=5; Taster=a/c; 3V3=3/4; GND=1,6-10,b,d'),
                  ['at', 25.4, 195.58, 0], ['effects', ['font', ['size', 1.52, 1.52]],
                                            ['justify', 'left']], ['uuid', U('ui-switch-pin-note')]])
for m in noconn:
    x, y = pinpos[m]
    items.append(['no_connect', ['at', x, y], ['uuid', U('no-connect:%s:%s' % m)]])

title = {'motion-one': 'Disroop Motion One - Hauptplatine, Schaltplan r4',
         'motion-one-ui': 'Disroop Motion One - Bedienplatine, Schaltplan r4'}.get(PROJ, 'Disroop Motion One - Schaltplan r4')
sch = ['kicad_sch', ['version', 20250114], ['generator', Q('eeschema')], ['generator_version', Q('9.0')],
       ['uuid', root], ['paper', Q(paper)], ['title_block', ['title', Q(title)], ['date', Q('2026-11-09')], ['rev', Q('r4')], ['company', Q('Disroop')]], ['lib_symbols'] + list(libsyms.values())] + items + \
      [['sheet_instances', ['path', Q('/'), ['page', Q('1')]]], ['embedded_fonts', 'no']]
open(OUT, 'w').write(dump(sch) + '\n')
import json
json.dump({'uuid': {k: str(v) for k, v in symuuid.items()}, 'pinname': pinname, 'props': props}, open(OUT + '.uuids.json', 'w'), indent=1)
_pd = os.path.dirname(os.path.abspath(OUT))
open(os.path.join(_pd, 'mo_power.kicad_sym'), 'w').write(dump(['kicad_symbol_lib', ['version', 20241209], ['generator', Q('gen_mo_sch')]] + POWER_LIB) + '\n')
_slt = os.path.join(_pd, 'sym-lib-table')
if os.path.exists(_slt) and 'mo_power' not in open(_slt).read():
    t = open(_slt).read().rstrip().rstrip(')')
    open(_slt, 'w').write(t + '  (lib (name "mo_power")(type "KiCad")(uri "${KIPRJMOD}/mo_power.kicad_sym")(options "")(descr "lokale Power-Symbole"))\n)\n')
print('parts', len(parts), 'labels', sum(map(len, nets.values())))
