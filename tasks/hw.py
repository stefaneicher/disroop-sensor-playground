"""Hardware tests against the real Thingy:52."""
from invoke import Exit, task

from ._lib import ROOT, check_hw_lock, sh

SMOKE = ROOT / "tests" / "hardware" / "smoke.sh"


@task(help={"nfc": "zusätzlich den NFC-Tag umschreiben und zurücklesen", "no_build": "thingy.exe nicht neu bauen",
            "force": "build/hw-lock ignorieren"})
def smoke(c, nfc=False, no_build=False, force=False):
    """Hardware-Smoke-Test: Scan, Verbinden, Live-Werte, Lied, Dashboard (Port 8052)."""
    if not SMOKE.exists():
        raise Exit("tests/hardware/smoke.sh fehlt noch – der Hardware-Smoke-Test ist noch nicht eingecheckt.", code=1)
    check_hw_lock(force)
    flags = " ".join(f for f, on in (("--nfc", nfc), ("--no-build", no_build)) if on)
    sh(c, f"bash tests/hardware/smoke.sh {flags}".rstrip())
