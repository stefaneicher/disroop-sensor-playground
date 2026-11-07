import tempfile
import unittest
from pathlib import Path
from unittest import mock

from invoke import Exit, MockContext, Result

from tasks import _lib
from tasks.dev import areas_for, removable
from tasks.info import progress_rows, summarize_progress
from tasks.release import release_command


class ParseColorTest(unittest.TestCase):
    def test_names_hex_and_triplets(self):
        cases = {"rot": (255, 0, 0), "Gruen": (0, 255, 0), "grün": (0, 255, 0), "aus": (0, 0, 0),
                 "#ff8000": (255, 128, 0), "0a0B0c": (10, 11, 12), "1, 2,3": (1, 2, 3)}
        for value, rgb in cases.items():
            with self.subTest(value=value):
                self.assertEqual(_lib.parse_color(value), rgb)

    def test_rejects_unknown_and_out_of_range(self):
        for value in ("pink", "#12345", "256,0,0", ""):
            with self.subTest(value=value), self.assertRaises(Exit):
                _lib.parse_color(value)


class ExeCommandTest(unittest.TestCase):
    def test_flags(self):
        self.assertEqual(_lib.exe_command(sim=True, port=8061, no_tui=False, addr=None),
                         "build/thingy.exe --sim --port 8061")
        self.assertEqual(_lib.exe_command("nfc", restore=True), "build/thingy.exe nfc --restore")
        self.assertEqual(_lib.exe_command("scan", timeout="5s"), "build/thingy.exe scan --timeout 5s")


class HttpTest(unittest.TestCase):
    def test_post_json_and_status(self):
        c = MockContext(run=Result(stdout="\n204"), repeat=True)
        self.assertEqual(_lib.http(c, "POST", "http://127.0.0.1:8052/api/led", {"r": 1, "g": 2, "b": 3}), (204, ""))
        cmd = c.run.call_args[0][0]
        self.assertTrue(cmd.startswith("curl.exe "))
        self.assertIn("""-d '{"r":1,"g":2,"b":3}'""", cmd)
        self.assertTrue(cmd.endswith(" http://127.0.0.1:8052/api/led"))

    def test_nobody_listening(self):
        c = MockContext(run=Result(exited=7), repeat=True)
        self.assertEqual(_lib.http(c, "GET", "http://127.0.0.1:1/"), (0, ""))

    def test_port_in_use(self):
        for code, used in ((0, True), (22, True), (7, False), (28, False), (127, False)):
            with self.subTest(code=code):
                self.assertEqual(_lib.port_in_use(MockContext(run=Result(exited=code), repeat=True), 8052), used)


class HwLockTest(unittest.TestCase):
    def test_lock_aborts_unless_forced(self):
        with tempfile.TemporaryDirectory(dir=_lib.ROOT / "tasks" / "tests") as d:
            lock = Path(d) / "hw-lock"
            with mock.patch.object(_lib, "HW_LOCK", lock):
                _lib.check_hw_lock(force=False)
                lock.write_text("hwsmoke")
                with self.assertRaises(Exit) as err:
                    _lib.check_hw_lock(force=False)
                self.assertIn("hwsmoke", str(err.exception.message))
                _lib.check_hw_lock(force=True)


class IndevTest(unittest.TestCase):
    def test_runs_in_devcontainer_image(self):
        cmd = _lib.indev_command("python3 -V")
        self.assertIn(f" {_lib.IMAGE} bash -c 'python3 -V'", cmd)
        self.assertIn(":/workspace -w /workspace", cmd)


class ReleaseTest(unittest.TestCase):
    def test_command(self):
        self.assertEqual(release_command("0.1.0"),
                         'gh release create v0.1.0 build/thingy.exe build/thingylive-debug.apk '
                         '--title "thingy52-live v0.1.0" --generate-notes')
        self.assertIn(" v1.2.3-rc.1 ", release_command("v1.2.3-rc.1"))

    def test_rejects_bad_version(self):
        for v in ("1.2", "latest", "v1.2.3; rm -rf /"):
            with self.subTest(v=v), self.assertRaises(Exit):
                release_command(v)


class ProgressTest(unittest.TestCase):
    TABLE = """| # | Meilenstein | Status | Notiz |
|---|---|---|---|
| 0 | Repo | ✅ | x |
| 7 | Bridge | 🔄 | y |
| 10 | Hardware | ⬜ | |
"""

    def test_rows_and_summary(self):
        self.assertEqual(progress_rows(self.TABLE), [("0", "Repo", "✅"), ("7", "Bridge", "🔄"), ("10", "Hardware", "⬜")])
        summary = summarize_progress(self.TABLE)
        self.assertIn("✅ 1 · 🔄 1 · ⬜ 1", summary)
        self.assertIn("Bridge", summary)
        self.assertNotIn("Repo", summary)


class DevTest(unittest.TestCase):
    def test_areas(self):
        self.assertEqual(areas_for(None), ["bridge", "web", "tennis", "android", "cli"])
        self.assertEqual(areas_for("web"), ["web"])
        with self.assertRaises(Exit):
            areas_for("ios")

    def test_clean_keeps_lock_and_nfc_backups(self):
        with tempfile.TemporaryDirectory(dir=_lib.ROOT / "tasks" / "tests") as d:
            for name in ("thingy.exe", "hw-lock", "nfc-backup.hex", "nfc-backup-sim.hex", "dashboard.png"):
                (Path(d) / name).write_text("x")
            self.assertEqual([p.name for p in removable(Path(d))], ["dashboard.png", "thingy.exe"])


class RequirementsTest(unittest.TestCase):
    def test_devcontainer_pins_same_invoke(self):
        pin = (_lib.ROOT / "tasks" / "requirements.txt").read_text().strip()
        self.assertIn(pin, (_lib.ROOT / ".devcontainer" / "Dockerfile").read_text())


if __name__ == "__main__":
    unittest.main()
