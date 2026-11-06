"""GitHub release with thingy.exe and the APK."""
from __future__ import annotations

import re

from invoke import Exit, task

from ._lib import APK, EXE, ROOT, project, say, sh

ASSETS = (EXE, APK)


def release_command(version: str) -> str:
    if not re.fullmatch(r"v?\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?", version):
        raise Exit(f"Version {version!r} ungültig – Format: 1.2.3 oder v1.2.3", code=2)
    tag = version if version.startswith("v") else f"v{version}"
    files = " ".join(str(p.relative_to(ROOT)) for p in ASSETS)
    return f'gh release create {tag} {files} --title "thingy52-live {tag}" --generate-notes'


@task(help={"version": "z. B. 0.1.0", "dry_run": "nur zeigen, was passieren würde (Standard) – echt: --no-dry-run",
            "skip_build": "nicht neu bauen"})
def release(c, version, dry_run=True, skip_build=False):
    """GitHub-Release mit thingy.exe und APK. Standard ist ein Probelauf; echt mit --no-dry-run."""
    cmd = release_command(version)
    if dry_run:
        say(f"🧪 Probelauf – würde bauen und ausführen:\n   ./project build\n   {cmd}\nEcht: ./t release {version} --no-dry-run")
        return
    if not skip_build:
        project(c, "build")
    missing = [str(p.relative_to(ROOT)) for p in ASSETS if not p.exists()]
    if missing:
        raise Exit(f"❌ Fehlt: {', '.join(missing)}", code=1)
    sh(c, cmd)
