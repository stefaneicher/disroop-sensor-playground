"""Talk to the Thingy:52: live dashboard, simulator, scan, song, LED, NFC (thingy.exe on Windows via WSL interop)."""
from __future__ import annotations

from invoke import Exit, task

from ._lib import LIVE_PORT, SIM_PORT, check_hw_lock, ensure_exe, exe_command, http, parse_color, port_in_use, run_bridge, say, sh, url

PORT_HELP = "HTTP-Port des Dashboards"
FORCE_HELP = "build/hw-lock ignorieren (anderer Agent benutzt den Thingy)"


def _require_free(c, port: int) -> None:
    if port_in_use(c, port):
        raise Exit(f"❌ Port {port} ist belegt – läuft schon eine Bridge? Anderen Port wählen: --port …", code=1)


@task(help={"port": PORT_HELP, "addr": "Bluetooth-Adresse (leer = erster Thingy)", "no_browser": "Browser nicht öffnen",
            "no_tui": "nur Meldungen statt Live-Anzeige", "build": "thingy.exe vorher neu bauen", "force": FORCE_HELP})
def live(c, port=LIVE_PORT, addr="", no_browser=False, no_tui=False, build=False, force=False):
    """Echter Thingy: Live-Anzeige im Terminal + Web-Dashboard (öffnet den Browser)."""
    check_hw_lock(force)
    ensure_exe(c, rebuild=build)
    _require_free(c, port)
    run_bridge(c, exe_command(port=port, addr=addr or None, no_tui=no_tui), port, browser=not no_browser)


@task(help={"port": PORT_HELP, "no_browser": "Browser nicht öffnen", "no_tui": "nur Meldungen statt Live-Anzeige",
            "build": "thingy.exe vorher neu bauen"})
def sim(c, port=SIM_PORT, no_browser=False, no_tui=False, build=False):
    """Simulator ohne Hardware: gleiche Anzeige und gleiches Dashboard mit erfundenen Werten."""
    ensure_exe(c, rebuild=build)
    _require_free(c, port)
    run_bridge(c, exe_command(sim=True, port=port, no_tui=no_tui), port, browser=not no_browser)


@task(help={"timeout": "Suchdauer, z. B. 10s", "force": FORCE_HELP})
def scan(c, timeout="10s", force=False):
    """Sucht Thingys in Reichweite und zeigt Adresse und Signalstärke."""
    check_hw_lock(force)
    ensure_exe(c)
    sh(c, exe_command("scan", timeout=timeout), pty=False)


@task(help={"volume": "Lautstärke 0..100", "stop": "laufendes Lied stoppen", "port": "Port einer laufenden Bridge",
            "force": FORCE_HELP})
def song(c, volume=60, stop=False, port=LIVE_PORT, force=False):
    """Spielt den Refrain auf dem Thingy – über die laufende Bridge, sonst direkt per BLE."""
    if not 0 <= int(volume) <= 100:
        raise Exit("--volume muss 0..100 sein", code=2)
    payload = {"action": "stop"} if stop else {"action": "play", "volume": int(volume)}
    status, body = http(c, "POST", url(port, "/api/song"), payload)
    if status:
        _report(status, body, "⏹ Lied gestoppt" if stop else "🎵 Lied läuft")
        return
    if stop:
        raise Exit(f"❌ Keine Bridge auf Port {port} – nichts zu stoppen.", code=1)
    check_hw_lock(force)
    ensure_exe(c)
    sh(c, exe_command("song", volume=volume))


@task(help={"color": "rot|gruen|blau|gelb|weiss|violett|tuerkis|orange|aus, #rrggbb oder r,g,b", "port": "Port der laufenden Bridge"})
def led(c, color="gruen", port=LIVE_PORT):
    """Setzt die LED-Farbe über die laufende Bridge (./t live oder ./t sim --port …)."""
    r, g, b = parse_color(color)
    status, body = http(c, "POST", url(port, "/api/led"), {"r": r, "g": g, "b": b})
    if not status:
        raise Exit(f"❌ Keine Bridge auf Port {port}. Zuerst ./t live starten (oder ./t sim und --port {SIM_PORT}).", code=1)
    _report(status, body, f"💡 LED = {color} ({r},{g},{b})")


def _report(status: int, body: str, success: str) -> None:
    if 200 <= status < 300:
        say(f"✅ {success}")
    elif status == 503:
        raise Exit("❌ Bridge läuft, aber der Thingy ist (noch) nicht verbunden – Knopf drücken oder schütteln.", code=1)
    else:
        raise Exit(f"❌ HTTP {status}: {body.strip()}", code=1)


@task(help={"restore": "Backup (build/nfc-backup.hex) zurückschreiben", "force": FORCE_HELP})
def nfc(c, restore=False, force=False):
    """Schreibt den NFC-Tag so um, dass das Handy die App öffnet (Backup zuerst) – oder --restore."""
    check_hw_lock(force)
    ensure_exe(c)
    sh(c, exe_command("nfc", restore=restore))
