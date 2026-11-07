"""Guided one-shot demo: check, build, real Thingy if reachable, otherwise the simulator."""
from __future__ import annotations

from invoke import Exit, task

from . import thingy
from ._lib import HW_LOCK, LIVE_PORT, SIM_PORT, ensure_exe, exe_command, say
from .checks import format_checks, run_checks

TALKING_POINTS = """
🎬 Was zeigen?
  1. Terminal: Live-Anzeige – Temperatur, Druck, Feuchte, Luft (eCO₂/TVOC), Farbe, Lage, Schritte, Lautstärke
  2. Thingy schütteln / drehen → Lage und Beschleunigung ändern sich sofort (Terminal und Browser)
  3. Knopf drücken → Anzeige «Knopf» im Dashboard
  4. Im Dashboard «Lied abspielen» → Refrain mit LED-Farben pro Ton
  5. In einem zweiten Terminal:  ./t led --color blau   ·   ./t song --volume 40
  6. Handy an den Thingy halten (NFC) → die App «Thingy Arcade» öffnet sich (nach ./t nfc)
  7. Sprachen im Projekt: Go (Bridge), JavaScript (Dashboard), Kotlin (App), Python (dieses CLI), Bash
Beenden: Ctrl+C
"""


def thingy_reachable(c) -> bool:
    if HW_LOCK.exists():
        say("⚠️  build/hw-lock existiert – nehme den Simulator.")
        return False
    say("🔎 Suche den Thingy (8 s) …")
    res = c.run(exe_command("scan", timeout="8s"), hide=True, warn=True)
    found = res.exited == 0 and "thingy" in res.stdout.lower()
    say("✅ Thingy gefunden" if found else "ℹ️  Kein Thingy gefunden (schläft? Knopf drücken) – nehme den Simulator.")
    return found


@task(help={"sim": "direkt den Simulator nehmen", "build": "thingy.exe neu bauen", "port": "Port (Standard 8052 live / 8060 sim)"})
def demo(c, sim=False, build=False, port=0):
    """Geführte Demo: Doctor → Build → Thingy da? live : Simulator → Browser auf → Spickzettel."""
    checks = run_checks(c)
    say(format_checks(checks))
    if not checks[0].ok:
        raise Exit("❌ Docker wird zum Bauen gebraucht – siehe Tipp oben.", code=1)
    ensure_exe(c, rebuild=build)
    use_live = not sim and thingy_reachable(c)
    say(TALKING_POINTS)
    if use_live:
        thingy.live(c, port=port or LIVE_PORT)
    else:
        thingy.sim(c, port=port or SIM_PORT)
