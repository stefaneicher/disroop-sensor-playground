#!/usr/bin/env python3
"""Gleicht electronics/PINOUT_V1.json gegen boards/.../motion_one-pins.dtsi ab.
Jede DTS-Pinzeile traegt '/* PINOUT:<SIGNAL> */'. Exit 0 nur, wenn alle GPIO-Signale aus dem
PINOUT genau einmal getaggt sind, Port/Pin stimmen und Polaritaet/Pull passen."""
import json, re, sys, pathlib

FW = pathlib.Path(__file__).resolve().parents[1]
pinout = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else FW.parent / "electronics/PINOUT_V1.json"
dtsi = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else FW / "boards/disroop/motion_one/motion_one-pins.dtsi"
# Signale ohne GPIO-Funktion in der App (Hardwarefunktion, siehe dtsi-Kopf)
NON_GPIO = {"XL1", "XL2", "NRESET", "VBUS", "USB_DM", "USB_DP", "SWDIO", "SWCLK"}

data = json.loads(pinout.read_text())
want, ain = {}, {}
for p in data["pins"]:
    m = re.match(r"P([01])\.(\d+)(?:/AIN(\d))?$", p["gpio"])
    if p["signal"] in NON_GPIO:
        continue
    if not m:
        sys.exit(f"FAIL unbekanntes GPIO-Format {p['signal']}: {p['gpio']}")
    want[p["signal"]] = (int(m[1]), int(m[2]))
    if m[3] is not None:
        ain[p["signal"]] = int(m[3])

errs, seen = [], {}
for no, line in enumerate(dtsi.read_text().splitlines(), 1):
    t = re.search(r"PINOUT:(\w+)", line)
    if not t:
        continue
    sig = t[1]
    if sig in seen:
        errs.append(f"{sig}: doppelt getaggt (Zeile {seen[sig]} und {no})")
    seen[sig] = no
    if sig not in want:
        errs.append(f"{sig}: nicht in PINOUT (Zeile {no})"); continue
    m = re.search(r"NRF_PSEL\(\w+,\s*(\d+),\s*(\d+)\)", line) or re.search(r"&gpio(\d)\s+(\d+)", line)
    a = re.search(r"NRF_SAADC_AIN(\d)", line)
    if m:
        got = (int(m[1]), int(m[2]))
        if got != want[sig]:
            errs.append(f"{sig}: DTS P{got[0]}.{got[1]} != PINOUT P{want[sig][0]}.{want[sig][1]} (Zeile {no})")
    elif a:
        if ain.get(sig) != int(a[1]):
            errs.append(f"{sig}: DTS AIN{a[1]} != PINOUT AIN{ain.get(sig)} (Zeile {no})")
    else:
        errs.append(f"{sig}: kein Pin in Zeile {no}")
for sig in sorted(set(want) - set(seen)):
    errs.append(f"{sig}: im PINOUT, aber nicht in DTS")

text = dtsi.read_text()
func = {p["signal"]: p["function"].lower() for p in data["pins"]}
# Polaritaet/Pull aus PINOUT-Funktionstext
for led in ("LED_R", "LED_G", "LED_B"):
    if "aktiv low" in func.get(led, "") or any("led aktiv low" in n.lower() for n in data.get("notes", [])):
        if text.count("PWM_POLARITY_INVERTED") < 3 or "nordic,invert" not in text:
            errs.append(f"{led}: aktiv low, DTS nicht invertiert"); break
if "pull-up" in func.get("BTN", "") and not re.search(r"GPIO_PULL_UP \| GPIO_ACTIVE_LOW\)>;\s*/\* PINOUT:BTN", text):
    errs.append("BTN: interner Pull-up/aktiv low fehlt")
if "aktiv low" in func.get("IMU_CS", "") and not re.search(r"cs-gpios.*GPIO_ACTIVE_LOW.*PINOUT:IMU_CS", text):
    errs.append("IMU_CS: nicht aktiv low")
if "spi-max-frequency = <8000000>" not in text:
    errs.append("SPI nicht 8 MHz")
m = re.search(r"VBAT\s*\*\s*(\d+)k/\((\d+)k\+(\d+)k\)", " ".join(data.get("notes", [])))
if m:
    num, den = int(m[2]) + int(m[3]), int(m[1])
    dn = re.search(r"vbat-divider-num = <(\d+)>", text); dd = re.search(r"vbat-divider-den = <(\d+)>", text)
    if not (dn and dd and int(dn[1]) * den == int(dd[1]) * num):
        errs.append(f"VBAT-Teiler != {num}/{den}")

print(f"PINOUT {pinout.name} revision {data.get('revision')}: {len(want)} GPIO-Signale, {len(seen)} DTS-Tags")
for e in errs:
    print("FAIL", e)
print("pincheck", "FAIL" if errs else "PASS")
sys.exit(1 if errs else 0)
