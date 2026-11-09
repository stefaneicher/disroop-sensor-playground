"""Kanonischer Netzlistenvergleich (Bauteile, Werte, Footprints, Netz-Pin-Mitgliedschaft)."""
import sys, xml.etree.ElementTree as ET
def canon(path):
    r = ET.parse(path).getroot()
    comps = {}
    for c in r.iter('comp'):
        ref = c.get('ref')
        if ref.startswith('#'):
            continue
        comps[ref] = (c.findtext('value'), c.findtext('footprint'))
    nets = {}
    for n in r.iter('net'):
        pins = frozenset((p.get('ref'), p.get('pin')) for p in n.iter('node') if not p.get('ref').startswith('#'))
        if pins:
            nets[n.get('name')] = pins
    return comps, nets
a, b = canon(sys.argv[1]), canon(sys.argv[2])
ok = True
if a[0] != b[0]:
    ok = False; print('BAUTEILE DIFF', set(a[0].items()) ^ set(b[0].items()))
sa, sb = set(a[1].values()), set(b[1].values())
if sa != sb:
    ok = False; print('NETZ-MITGLIEDSCHAFT DIFF', len(sa ^ sb))
names = {k for k in a[1] if a[1][k] != b[1].get(k)}
if names:
    ok = False; print('NETZNAMEN-ABWEICHUNG', sorted(names)[:20])
print('MATCH' if ok else 'MISMATCH', len(a[0]), 'Bauteile', len(a[1]), 'Netze')
sys.exit(0 if ok else 1)
