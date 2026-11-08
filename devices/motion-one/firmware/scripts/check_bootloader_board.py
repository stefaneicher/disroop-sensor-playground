#!/usr/bin/env python3
"""Gleicht die Adafruit-Bootloader-Board-Definition (bootloader/motion_one/board.h) gegen
electronics/PINOUT_V1.json ab. Exit 0 nur wenn: RGB-Status-LED = LED_R/G/B, LED aktiv low,
DFU-Taster = BTN mit internem Pull-up, kein zweiter (OTA-)Taster auf fremdem Pin, keine UART-Pins (Q-02)."""
import json, re, sys, pathlib

FW = pathlib.Path(__file__).resolve().parents[1]
pinout = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else FW.parent / "electronics/PINOUT_V1.json"
board = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else FW / "bootloader/motion_one/board.h"
errs = []
if not board.exists():
    print(f"FAIL {board} fehlt"); print("bootloader-pincheck FAIL"); sys.exit(1)
data = json.loads(pinout.read_text())
pins = {}
for p in data["pins"]:
    m = re.match(r"P([01])\.(\d+)", p["gpio"])
    if m:
        pins[p["signal"]] = (int(m[1]), int(m[2]))
func = {p["signal"]: p["function"].lower() for p in data["pins"]}
text = re.sub(r"//.*|/\*.*?\*/", "", board.read_text(), flags=re.S)
defs = {m[1]: m[2].strip() for m in re.finditer(r"^[ \t]*#define[ \t]+(\w+)[ \t]+(.+?)[ \t]*$", text, re.M)}

def pin(name):
    v = defs.get(name)
    m = v and re.fullmatch(r"PINNUM\(\s*(\d)\s*,\s*(\d+)\s*\)", v)
    return (int(m[1]), int(m[2])) if m else None

for macro, sig in (("LED_RGB_RED_PIN", "LED_R"), ("LED_RGB_GREEN_PIN", "LED_G"),
                   ("LED_RGB_BLUE_PIN", "LED_B"), ("LED_PRIMARY_PIN", "LED_R"), ("BUTTON_DFU", "BTN")):
    got = pin(macro)
    if got != pins.get(sig):
        errs.append(f"{macro}: board.h {got} != PINOUT {sig} {pins.get(sig)}")
if "aktiv low" in func.get("LED_R", "") and defs.get("LED_STATE_ON") != "0":
    errs.append("LED_STATE_ON muss 0 sein (aktiv low)")
if defs.get("LEDS_NUMBER") != "1" or "LED_SECONDARY_PIN" in defs:
    errs.append("genau eine Primaer-LED (RGB), keine Sekundaer-LED")
if "pull-up" in func.get("BTN", "") and defs.get("BUTTON_PULL") != "NRF_GPIO_PIN_PULLUP":
    errs.append("BUTTON_PULL muss NRF_GPIO_PIN_PULLUP sein")
if "BUTTON_DFU_OTA" in defs:
    errs.append("BUTTON_DFU_OTA definiert, V1 hat nur einen Taster")
if any(re.search(r"UART|_TX_PIN|_RX_PIN", k) for k in defs):
    errs.append("UART-Definition vorhanden (Q-02: kein UART)")
used = {v for k in defs if (v := pin(k))}
own = set(pins.values())
for k in defs:
    if (v := pin(k)) and v not in own:
        errs.append(f"{k}: Pin P{v[0]}.{v[1]} nicht im PINOUT")
print(f"PINOUT {pinout.name} revision {data.get('revision')}: board.h {len(used)} Pins geprueft")
for e in errs:
    print("FAIL", e)
print("bootloader-pincheck", "FAIL" if errs else "PASS")
sys.exit(1 if errs else 0)
