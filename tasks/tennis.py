"""Thingy Tennis (tennis/): play with the Thingy as racket, build, test, screenshot."""
from __future__ import annotations

from invoke import Exit, task

from ._lib import LIVE_PORT, SIM_PORT, check_hw_lock, ensure_exe, exe_command, open_browser, port_in_use, project, run_bridge, say, url

FORCE_HELP = "build/hw-lock ignorieren (anderer Agent benutzt den Thingy)"


def play_command(sim: bool, port: int, no_browser: bool = False, no_tui: bool = False) -> str:
    """thingy.exe tennis … – the bridge itself opens /tennis/ in the default browser."""
    return exe_command("tennis", sim=sim, port=port, no_browser=no_browser, no_tui=no_tui)


@task(help={"sim": "ohne Hardware: Simulator schwingt den Schläger", "port": "HTTP-Port (Standard 8052, mit --sim 8060)",
            "no_browser": "Browser nicht öffnen", "no_tui": "nur Meldungen statt Live-Anzeige",
            "build": "thingy.exe vorher neu bauen", "force": FORCE_HELP})
def play(c, sim=False, port=None, no_browser=False, no_tui=False, build=False, force=False):
    """Startet die Bridge und öffnet Thingy Tennis im Browser (Thingy = Schläger, --sim ohne Hardware)."""
    port = int(port or (SIM_PORT if sim else LIVE_PORT))
    if not sim:
        check_hw_lock(force)
    ensure_exe(c, rebuild=build)
    if port_in_use(c, port):
        say(f"ℹ️  Auf Port {port} läuft schon eine Bridge – öffne nur das Spiel.")
        open_browser(c, url(port, "/tennis/"))
        return
    run_bridge(c, play_command(sim, port, no_browser, no_tui), port, browser=False)


@task(name="open", help={"port": "8052 = Bridge live, 8060 = Simulator"})
def open_(c, port=LIVE_PORT):
    """Öffnet Thingy Tennis einer laufenden Bridge im Windows-Browser."""
    if not port_in_use(c, int(port)):
        raise Exit(f"❌ Keine Bridge auf Port {port} – zuerst ./t tennis.play (oder --sim).", code=1)
    open_browser(c, url(int(port), "/tennis/"))


@task
def build(c):
    """Baut tennis/dist (tsc + three.js lokal) und kopiert es für thingy.exe nach bridge/internal/tennisapp/dist."""
    project(c, "tennis", "build")


@task
def test(c):
    """Typecheck, Unit-Tests des Spielkerns und Smoke-Test mit headless Chromium."""
    project(c, "tennis", "test")


@task
def screenshot(c):
    """Screenshot einer Demo-Rally nach docs/img/tennis.png."""
    project(c, "tennis", "screenshot")
    say("🖼  docs/img/tennis.png")
