"""disroop-thingy-arcade project CLI (Invoke). Start with ./t – see tasks/README.md."""
from invoke import Collection

from . import android, bridge, checks, demo, dev, hw, info, release, tennis, thingy, web

ns = Collection()
for t in (checks.setup, checks.doctor, demo.demo,
          dev.test, dev.build, dev.ci, dev.clean, dev.selftest,
          thingy.live, thingy.sim, thingy.scan, thingy.song, thingy.led, thingy.nfc,
          info.docs, info.status, release.release):
    ns.add_task(t)
for module in (bridge, web, tennis, android, hw):
    ns.add_collection(Collection.from_module(module))
