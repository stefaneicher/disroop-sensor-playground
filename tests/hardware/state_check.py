#!/usr/bin/env python3
"""JSON helpers for tests/hardware/smoke.sh (reads /api/state snapshots).

  state_check.py get <dotted.path>          < state.json   → prints the value (JSON for objects, "null" if missing)
  state_check.py plausible                  < state.json   → one line per check, exit 1 if any check fails
  state_check.py changed <a.json> <b.json>                 → exit 0 if motion and mic values changed between samples
"""
import json
import math
import sys


def get(d, path):
    for key in path.split("."):
        if not isinstance(d, dict) or key not in d:
            return None
        d = d[key]
    return d


def fmt(v):
    if v is None or isinstance(v, bool):
        return json.dumps(v)
    return f"{v:.2f}" if isinstance(v, float) else str(v)


def vec3(v, keys=("x", "y", "z")):
    if not isinstance(v, dict) or any(not isinstance(v.get(k), (int, float)) for k in keys):
        return None
    return [float(v[k]) for k in keys]


def plausible(s):
    checks = []

    def rng(name, value, lo, hi, unit=""):
        ok = isinstance(value, (int, float)) and lo <= value <= hi
        checks.append((ok, name, f"{fmt(value)}{unit}", f"{lo}..{hi}{unit}"))

    def present(name, value, shown):
        checks.append((value is not None, name, shown, "vorhanden"))

    checks.append((s.get("connected") is True, "connected", fmt(s.get("connected")), "true"))
    checks.append((get(s, "device.source") == "ble", "source", fmt(get(s, "device.source")), "ble"))
    acc = vec3(get(s, "motion.accel_g"))
    rng("|accel|", math.sqrt(sum(a * a for a in acc)) if acc else None, 0.8, 1.2, " g")
    gyro = vec3(get(s, "motion.gyro_dps"))
    present("gyro", gyro, fmt(gyro and [round(g, 2) for g in gyro]) + " °/s")
    comp = vec3(get(s, "motion.compass_ut"))
    present("compass", comp, fmt(comp and [round(c, 1) for c in comp]) + " µT")
    rng("heading", get(s, "motion.heading_deg"), 0, 360, " °")
    rng("temperature", get(s, "environment.temperature_c"), 5, 45, " °C")
    rng("humidity", get(s, "environment.humidity_pct"), 5, 95, " %")
    rng("pressure", get(s, "environment.pressure_hpa"), 850, 1100, " hPa")
    rng("eCO2", get(s, "environment.eco2_ppm"), 400, 65535, " ppm")
    rng("battery", get(s, "device.battery_pct"), 1, 100, " %")
    rng("mic level", get(s, "sound.level_dbfs"), -100, 0, " dBFS")
    rssi = get(s, "device.rssi")
    present("rssi", rssi, fmt(rssi) + " dBm")

    for ok, name, value, want in checks:
        print(f"{'OK  ' if ok else 'FAIL'} {name:<12} {value:<28} (soll {want})")
    return 0 if all(c[0] for c in checks) else 1


def changed(a, b):
    motion = [get(a, k) != get(b, k) for k in ("motion.accel_g", "motion.gyro_dps", "motion.compass_ut", "motion.quaternion")]
    mic = get(a, "sound.level_dbfs") != get(b, "sound.level_dbfs")
    print(f"motion geändert: {any(motion)} ({sum(motion)}/4 Felder), mic geändert: {mic}, "
          f"ts {get(a, 'ts')} → {get(b, 'ts')}")
    return 0 if any(motion) and mic else 1


def main(argv):
    if len(argv) >= 2 and argv[0] == "get":
        v = get(json.load(sys.stdin), argv[1])
        print(v if isinstance(v, str) else json.dumps(v))
        return 0
    if argv == ["plausible"]:
        return plausible(json.load(sys.stdin))
    if len(argv) == 3 and argv[0] == "changed":
        with open(argv[1]) as fa, open(argv[2]) as fb:
            return changed(json.load(fa), json.load(fb))
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
