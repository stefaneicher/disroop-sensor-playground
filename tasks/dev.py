"""Build, test and housekeeping - all delegated to ./project, i.e. run inside the devcontainer."""
from __future__ import annotations

from invoke import Exit, task

from ._lib import BUILD, HW_LOCK, ROOT, indev_command, project, say, sh

AREAS = ("bridge", "web", "android", "cli")
# Never delete: lock of a running hardware test and the NFC backups needed for `./t nfc --restore`.
KEEP = ("hw-lock", "nfc-backup")
SELFTEST = "python3 -B -m unittest discover -s tasks/tests -t . -v"


def areas_for(area: str | None) -> list[str]:
    if not area:
        return list(AREAS)
    if area not in AREAS:
        raise Exit(f"Unbekannter Bereich {area!r}. Erlaubt: {', '.join(AREAS)}", code=2)
    return [area]


@task(help={"local": "auf dem Host statt im Devcontainer laufen lassen"})
def selftest(c, local=False):
    """Unit-Tests dieses CLI (tasks/tests) – im Devcontainer."""
    sh(c, f"PYTHONPATH=.tools/py:. {SELFTEST}" if local else indev_command(SELFTEST))


@task(help={"area": "nur einen Bereich testen: bridge | web | android | cli"})
def test(c, area=None):
    """Alle Tests im Devcontainer (Go, Web, Android, CLI) – oder nur --area …"""
    for a in areas_for(area):
        say(f"\n🧪 Teste {a} …")
        selftest(c) if a == "cli" else project(c, a, "test")


@task
def build(c):
    """Baut alles im Devcontainer: build/thingy.exe, build/thingy-linux, build/thingylive-debug.apk."""
    project(c, "build")


@task
def ci(c):
    """Lokal genau das, was die CI macht: alle Tests, dann alle Builds."""
    test(c)
    build(c)


def removable(build_dir=BUILD) -> list:
    if not build_dir.exists():
        return []
    return sorted(p for p in build_dir.iterdir() if not p.name.startswith(KEEP))


@task(help={"tools": "auch .tools/ (lokales Invoke) löschen", "force": "trotz build/hw-lock löschen"})
def clean(c, tools=False, force=False):
    """Löscht Build-Artefakte in build/ (behält hw-lock und NFC-Backups)."""
    if HW_LOCK.exists() and not force:
        raise Exit("⚠️  build/hw-lock existiert – ein Hardware-Test braucht build/. Mit --force übersteuern.", code=3)
    for p in removable():
        say(f"🗑  {p.relative_to(ROOT)}")
        sh(c, f"rm -rf {p}", echo=False)
    if tools:
        sh(c, f"rm -rf {ROOT / '.tools'}")
    say("✅ sauber")
