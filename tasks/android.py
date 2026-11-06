"""Android app (ch.disroop.thingylive): build, tests, install."""
from __future__ import annotations

import glob
import shutil

from invoke import Exit, task

from ._lib import APK, ROOT, project, say, sh

ADB_GLOBS = ("/mnt/c/Users/*/AppData/Local/Android/Sdk/platform-tools/adb.exe",
             "/mnt/c/Program Files*/Android/*/platform-tools/adb.exe")
SIDELOAD = """So kommt die App aufs Handy ohne adb:
  1. build/thingylive-debug.apk aufs Handy kopieren (USB, Mail, Google Drive …)
  2. Datei antippen → «Installation aus unbekannten Quellen» erlauben → Installieren"""


def find_adb() -> str | None:
    """adb.exe on Windows (sees USB devices); adb in WSL/the container usually does not."""
    found = shutil.which("adb.exe")
    if found:
        return found
    matches = [m for g in ADB_GLOBS for m in sorted(glob.glob(g))]
    return matches[0] if matches else None


@task
def build(c):
    """Baut die Debug-APK nach build/thingylive-debug.apk."""
    project(c, "android", "build")


@task
def test(c):
    """Unit-Tests (Decoder, Simulator) + Android-Lint."""
    project(c, "android", "test")


@task(help={"install": "per adb.exe auf das per USB verbundene Handy installieren", "build": "APK vorher bauen"})
def apk(c, install=False, build=False):
    """Zeigt den Pfad der APK – mit --install direkt aufs Handy (adb.exe unter Windows)."""
    if build or not APK.exists():
        project(c, "android", "build")
    say(f"📦 {APK.relative_to(ROOT)}  ({APK.stat().st_size / 1e6:.1f} MB)")
    if not install:
        return
    adb = find_adb()
    if not adb:
        raise Exit("❌ adb.exe nicht gefunden (Android-SDK-Platform-Tools unter Windows).\n" + SIDELOAD, code=1)
    sh(c, f'"{adb}" install -r "$(wslpath -w {APK})"')
