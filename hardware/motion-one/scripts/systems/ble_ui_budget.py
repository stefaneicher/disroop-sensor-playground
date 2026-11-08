#!/usr/bin/env python3
"""BLE-Last der Bedienplatinen-Characteristic EF680380 (ADR systems/ADR-0002).
Quellen: docs/protocol.md (Spielmodus 200 Notif./s stabil, 400/s Abbruch),
firmware ADR-0004 (Stick 50 ms aktiv / 500 ms Ruhe, Touch 30 ms entprellt, Spam > 10 Flanken/s gesperrt)."""
import struct

PAYLOAD = 8                      # B, Layout ADR-0002
ATT_HDR = 3                      # B, ATT Notify-Header
STICK_ACTIVE_MS, STICK_IDLE_MS = 50, 500
TOUCH_MAX_PER_S = 10             # danach Sperre (Firmware)
GAME_NOTIF = 200                 # Quaternion + Raw bei 100 Hz

stick_max = 1000 / STICK_ACTIVE_MS
stick_idle = 1000 / STICK_IDLE_MS
cap = 20                         # Entscheid: Gesamtdeckel UI-Ext pro s
worst = min(cap, stick_max + TOUCH_MAX_PER_S)
print(f"payload {PAYLOAD} B <= 20 B (MTU 23): {PAYLOAD + ATT_HDR <= 23}")
print(f"stick max {stick_max:.0f}/s, ruhe max {stick_idle:.0f}/s (nur bei Aenderung)")
print(f"UI-Ext worst case {worst:.0f}/s = {worst * PAYLOAD} B/s Nutzdaten")
print(f"Spielmodus Summe {GAME_NOTIF + worst:.0f}/s ({(GAME_NOTIF + worst) / GAME_NOTIF * 100 - 100:.0f} % ueber 200/s-Grenze)")
print(f"Spielmodus-Deckel 10/s -> Summe {GAME_NOTIF + 10}/s")
print(f"Latenz Stick worst {STICK_ACTIVE_MS} ms Abtastung + Ruhe-Aufwachen {STICK_IDLE_MS} ms")
# Layout-Selbsttest
pkt = struct.pack('<BBbbHH', 1, 0b10011, -100, 100, 0xFFFF, 0)
assert len(pkt) == PAYLOAD and pkt.hex() == '01139c64ffff0000', pkt.hex()
print("layout example", pkt.hex())
