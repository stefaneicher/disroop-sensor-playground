"""Shared helpers for the project CLI: paths, devcontainer delegation, Windows interop, HTTP via curl.exe."""
from __future__ import annotations

import json
import os
import re
import shlex
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from invoke import Exit

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
EXE = BUILD / "thingy.exe"
APK = BUILD / "disroop-thingy-arcade-debug.apk"
HW_LOCK = BUILD / "hw-lock"
IMAGE = "disroop-thingy-arcade-dev"
REPO_URL = "https://github.com/stefaneicher/disroop-thingy-arcade"

LIVE_PORT = 8052
SIM_PORT = 8060
MOCK_PORT = 8053

# curl.exe runs on Windows: thingy.exe listens on Windows' 127.0.0.1, which Linux curl in WSL cannot reach.
CURL = "curl.exe"
# curl exit codes meaning "nobody listens": 7 refused, 28 timeout (Windows retries refused SYNs), 127 no curl.exe
CURL_NOBODY = (7, 28, 127)
CHROME_PATHS = (
    Path("/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"),
    Path("/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
)

COLORS = {
    "rot": (255, 0, 0), "red": (255, 0, 0),
    "gruen": (0, 255, 0), "grün": (0, 255, 0), "green": (0, 255, 0),
    "blau": (0, 0, 255), "blue": (0, 0, 255),
    "gelb": (255, 255, 0), "yellow": (255, 255, 0),
    "weiss": (255, 255, 255), "white": (255, 255, 255),
    "violett": (255, 0, 255), "lila": (255, 0, 255),
    "tuerkis": (0, 255, 255), "türkis": (0, 255, 255),
    "orange": (255, 96, 0),
    "aus": (0, 0, 0), "off": (0, 0, 0), "schwarz": (0, 0, 0),
}


def say(msg: str = "") -> None:
    print(msg, flush=True)


def sh(c, cmd: str, **kw):
    """Run a command (cwd = repo root, set by ./t), echoed; with a pty when interactive (docker -it, colours)."""
    kw.setdefault("pty", sys.stdout.isatty())
    kw.setdefault("echo", True)
    return c.run(cmd, **kw)


def project(c, *args: str, env: dict | None = None, **kw):
    """Delegate to ./project (builds and tests always run inside the devcontainer image)."""
    prefix = "".join(f"{k}={shlex.quote(str(v))} " for k, v in (env or {}).items())
    return sh(c, prefix + "./project " + " ".join(args), **kw)


def indev_command(cmd: str) -> str:
    """Same container invocation as indev() in ./project, for commands ./project has no verb for."""
    return (f"docker run --rm -u {os.getuid()}:{os.getgid()} -e HOME=/tmp -v {shlex.quote(str(ROOT))}:/workspace "
            f"-w /workspace {IMAGE} bash -c {shlex.quote(cmd)}")


def exe_command(command: str = "", **flags) -> str:
    """Command line for build/thingy.exe; True -> --flag, False/None -> omitted, else --flag value."""
    parts = ["build/thingy.exe"]
    if command:
        parts.append(command)
    for name, value in flags.items():
        if value is None or value is False:
            continue
        opt = "--" + name.replace("_", "-")
        parts.append(opt if value is True else f"{opt} {shlex.quote(str(value))}")
    return " ".join(parts)


def ensure_exe(c, rebuild: bool = False) -> None:
    if rebuild or not EXE.exists():
        say("🔨 Baue thingy.exe im Devcontainer …")
        project(c, "bridge", "build")


def check_hw_lock(force: bool) -> None:
    """Only one BLE central can talk to the Thingy: respect build/hw-lock of other users/agents."""
    if not HW_LOCK.exists():
        return
    owner = HW_LOCK.read_text(encoding="utf-8", errors="replace").strip() or "?"
    msg = f"⚠️  build/hw-lock existiert (belegt von: {owner}) – der Thingy wird gerade anderweitig benutzt."
    if force:
        say(msg + " --force gesetzt, mache trotzdem weiter.")
        return
    raise Exit(msg + "\n   Warten, bis die Datei weg ist, oder mit --force übersteuern.", code=3)


def url(port: int, path: str = "/") -> str:
    return f"http://127.0.0.1:{port}{path}"


def http(c, method: str, address: str, payload: dict | None = None) -> tuple[int, str]:
    """HTTP request via curl.exe; returns (status, body). Status 0 = nobody listening."""
    cmd = f"{CURL} -s -m 5 -X {method} -w '\\n%{{http_code}}'"
    if payload is not None:
        cmd += " -H 'Content-Type: application/json' -d " + shlex.quote(json.dumps(payload, separators=(",", ":")))
    res = c.run(f"{cmd} {address}", hide=True, warn=True, echo=False)
    if res.exited != 0:
        return 0, ""
    body, _, code = res.stdout.rpartition("\n")
    return (int(code) if code.strip().isdigit() else 0), body


def port_in_use(c, port: int) -> bool:
    res = c.run(f"{CURL} -s -o NUL -m 2 {url(port, '/healthz')}", hide=True, warn=True, echo=False)
    return res.exited not in CURL_NOBODY


def wait_for_http(c, address: str, timeout: float = 30, interval: float = 1) -> bool:
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if http(c, "GET", address)[0] == 200:
            return True
        time.sleep(interval)
    return False


def open_browser(c, address: str) -> None:
    say(f"🌐 Öffne {address}")
    c.run(f'cmd.exe /c start "" "{address}"', hide=True, warn=True, echo=False)


def chrome_path() -> Path | None:
    return next((p for p in CHROME_PATHS if p.exists()), None)


def parse_color(value: str) -> tuple[int, int, int]:
    """'rot', '#ff8800', 'ff8800' or '255,128,0' -> (r, g, b)."""
    v = value.strip().lower()
    if v in COLORS:
        return COLORS[v]
    if m := re.fullmatch(r"#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})", v):
        return tuple(int(x, 16) for x in m.groups())  # type: ignore[return-value]
    if m := re.fullmatch(r"(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})", v):
        rgb = tuple(int(x) for x in m.groups())
        if all(0 <= x <= 255 for x in rgb):
            return rgb  # type: ignore[return-value]
    names = ", ".join(k for k in COLORS if k.isascii())
    raise Exit(f"Unbekannte Farbe {value!r}. Erlaubt: {names}, #rrggbb oder r,g,b", code=2)


def run_bridge(c, cmd: str, port: int, browser: bool = True) -> int:
    """Run thingy.exe in the foreground (its TUI keeps the terminal) and open the dashboard once it answers."""
    say(f"▶️  {cmd}   (beenden mit Ctrl+C)")
    proc = subprocess.Popen(shlex.split(cmd), cwd=ROOT)
    try:
        if browser and wait_for_http(c, url(port, "/healthz"), timeout=30):
            open_browser(c, url(port))
        return proc.wait()
    except KeyboardInterrupt:
        return stop_process(proc)


def stop_process(proc: subprocess.Popen) -> int:
    proc.send_signal(signal.SIGINT)
    try:
        return proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        return proc.wait()


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""
    hint: str = ""
    critical: bool = True
