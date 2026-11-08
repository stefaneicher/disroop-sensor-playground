"""Compare ngspice smoke results with hand formulas (< 1 %)."""
import math, re, sys
L = 'hardware/motion-one/logs/pcb-smoke/'
def val(f, pat):
    return float(re.search(pat + r'\s*=\s*([-+0-9.eE]+)', open(L + f).read()).group(1))
rows = [
    ('Teiler Vout [V]', 5 * 4.7e3 / (10e3 + 4.7e3), val('spice_divider.log', r'v\(out\)')),
    ('RC fc [Hz]', 1 / (2 * math.pi * 1e3 * 100e-9), val('spice_rc.log', r'\nfc')),
    ('RC t63 [s]', 1e3 * 100e-9, val('spice_rc.log', r'\nt63')),
]
ok = True
for n, h, s in rows:
    d = abs(s - h) / h * 100; ok &= d < 1
    print(f'{n}: Hand {h:.6g}, SPICE {s:.6g}, Abw {d:.4f} % {"PASS" if d < 1 else "FAIL"}')
sys.exit(0 if ok else 1)
