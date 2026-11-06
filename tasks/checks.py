"""setup and doctor: is everything in place for building and the demo?"""
from __future__ import annotations

from invoke import Exit, task

from ._lib import APK, EXE, HW_LOCK, IMAGE, LIVE_PORT, ROOT, Check, chrome_path, ensure_exe, exe_command, port_in_use, project, say, sh

DOCKER_HINT = "wsl.exe -d Ubuntu -u root -- systemctl restart docker"


def _ok(c, cmd: str) -> bool:
    return c.run(cmd, hide=True, warn=True, echo=False).exited == 0


def check_docker(c) -> Check:
    ok = _ok(c, "docker info")
    return Check("Docker-Daemon läuft", ok, hint="" if ok else f"Docker neu starten: {DOCKER_HINT}")


def check_image(c) -> Check:
    ok = _ok(c, f"docker image inspect {IMAGE}")
    return Check(f"Devcontainer-Image {IMAGE}", ok, hint="" if ok else "./t setup")


def check_file(name: str, path, hint: str, critical: bool = True) -> Check:
    ok = path.exists()
    detail = f"{path.stat().st_size / 1e6:.1f} MB" if ok else "fehlt"
    return Check(name, ok, detail, "" if ok else hint, critical)


def check_port(c, port: int = LIVE_PORT) -> Check:
    free = not port_in_use(c, port)
    return Check(f"Port {port} frei", free, "" if free else "belegt", "" if free else "läuft schon eine Bridge? (./t status)", False)


def check_chrome() -> Check:
    path = chrome_path()
    return Check("Chrome installiert", path is not None, str(path or ""), "" if path else "Dashboard geht auch mit Edge", False)


def check_interop(c) -> Check:
    ok = _ok(c, "cmd.exe /c ver")
    return Check("Windows-Interop (cmd.exe)", ok, hint="" if ok else "WSL-Interop aktivieren (/etc/wsl.conf)")


def check_hw_free() -> Check:
    free = not HW_LOCK.exists()
    return Check("Thingy frei (kein build/hw-lock)", free, "" if free else HW_LOCK.read_text().strip(), "" if free else "anderer Agent testet gerade", False)


def check_git(c) -> Check:
    res = c.run(f"git -C {ROOT} status --porcelain", hide=True, warn=True, echo=False)
    changes = len([line for line in res.stdout.splitlines() if line.strip()]) if res.exited == 0 else -1
    return Check("Git-Arbeitskopie sauber", changes == 0, f"{changes} Änderungen" if changes > 0 else "", "", False)


def run_checks(c) -> list[Check]:
    return [
        check_docker(c),
        check_image(c),
        check_interop(c),
        check_file("thingy.exe gebaut", EXE, "./t bridge.build"),
        check_file("Android-APK gebaut", APK, "./t android.build", critical=False),
        check_port(c),
        check_chrome(),
        check_hw_free(),
        check_git(c),
    ]


def format_checks(checks: list[Check]) -> str:
    width = max(len(ch.name) for ch in checks)
    lines = []
    for ch in checks:
        icon = "✅" if ch.ok else ("❌" if ch.critical else "⚠️")
        line = f"{icon} {ch.name.ljust(width)}  {ch.detail}".rstrip()
        if ch.hint:
            line += f"   → {ch.hint}"
        lines.append(line)
    return "\n".join(lines)


@task
def doctor(c):
    """Prüft die Umgebung (Docker, Image, exe, APK, Port 8052, Chrome, Git) und zeigt ✅/❌ mit Tipps."""
    checks = run_checks(c)
    say(format_checks(checks))
    failed = [ch for ch in checks if not ch.ok and ch.critical]
    if failed:
        raise Exit(f"\n{len(failed)} kritische Probleme – Tipps oben (→).", code=1)
    say("\nAlles bereit. 🎉")


@task(help={"rebuild": "Image neu bauen, auch wenn es schon existiert", "ble": "zusätzlich 5 s nach Thingys suchen"})
def setup(c, rebuild=False, ble=False):
    """Erstes Einrichten: Docker prüfen, Devcontainer-Image und thingy.exe bauen, optional BLE-Scan."""
    docker = check_docker(c)
    if not docker.ok:
        raise Exit(f"❌ Docker läuft nicht. {docker.hint}", code=1)
    if rebuild or not check_image(c).ok:
        project(c, "image")
    ensure_exe(c, rebuild=rebuild)
    if ble and HW_LOCK.exists():
        say("⚠️  build/hw-lock existiert – BLE-Scan übersprungen.")
    elif ble:
        sh(c, exe_command("scan", timeout="5s"), warn=True)
    say("✅ Setup fertig. Weiter mit: ./t demo")
