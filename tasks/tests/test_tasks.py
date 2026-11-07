import unittest
from unittest import mock

from invoke import Exit, MockContext, Result

from tasks import ns, tennis, thingy
from tasks.checks import Check, format_checks
from tasks.release import release

EXPECTED = {
    "setup", "doctor", "demo", "test", "build", "ci", "clean", "selftest",
    "live", "sim", "scan", "song", "led", "nfc", "docs", "status", "release",
    "bridge.build", "bridge.test", "bridge.smoke",
    "web.serve", "web.open", "web.screenshot", "web.test",
    "tennis.play", "tennis.open", "tennis.build", "tennis.test", "tennis.screenshot",
    "android.build", "android.test", "android.apk", "hw.smoke",
}


def ctx(**results):
    return MockContext(run=Result(**results), repeat=True)


def commands(c):
    return [call[0][0] for call in c.run.call_args_list]


class CollectionTest(unittest.TestCase):
    def test_all_tasks_present_with_german_help(self):
        names = set(ns.task_names)
        self.assertEqual(EXPECTED - names, set())
        for name in names:
            with self.subTest(task=name):
                self.assertTrue((ns[name].__doc__ or "").strip(), f"{name} ohne Hilfetext")


class LedTest(unittest.TestCase):
    def test_posts_rgb_json_to_bridge(self):
        c = ctx(stdout="\n204")
        thingy.led(c, color="blau", port=8061)
        cmd = commands(c)[-1]
        self.assertIn("""'{"r":0,"g":0,"b":255}'""", cmd)
        self.assertIn("http://127.0.0.1:8061/api/led", cmd)

    def test_hint_when_no_bridge(self):
        with self.assertRaises(Exit) as err:
            thingy.led(ctx(exited=7), color="rot")
        self.assertIn("./t live", err.exception.message)

    def test_not_connected(self):
        with self.assertRaises(Exit) as err:
            thingy.led(ctx(stdout='{"error":"not connected"}\n503'), color="rot")
        self.assertIn("nicht verbunden", err.exception.message)


class TennisTest(unittest.TestCase):
    def test_play_command_starts_the_tennis_bridge(self):
        self.assertEqual(tennis.play_command(True, 8060), "build/thingy.exe tennis --sim --port 8060")
        self.assertEqual(tennis.play_command(False, 8052, no_browser=True),
                         "build/thingy.exe tennis --port 8052 --no-browser")

    def test_play_only_opens_the_game_when_a_bridge_runs(self):
        c = ctx(exited=0)
        with mock.patch.object(tennis, "ensure_exe"), mock.patch.object(tennis, "run_bridge") as run:
            tennis.play(c, sim=True)
        run.assert_not_called()
        self.assertIn("http://127.0.0.1:8060/tennis/", commands(c)[-1])


class SongTest(unittest.TestCase):
    def test_uses_running_bridge(self):
        c = ctx(stdout="\n202")
        thingy.song(c, volume=40)
        self.assertIn("""'{"action":"play","volume":40}'""", commands(c)[-1])

    def test_stop(self):
        c = ctx(stdout="\n202")
        thingy.song(c, stop=True)
        self.assertIn("""'{"action":"stop"}'""", commands(c)[-1])

    def test_rejects_volume(self):
        with self.assertRaises(Exit):
            thingy.song(ctx(), volume=101)


class HwLockTasksTest(unittest.TestCase):
    def test_device_tasks_respect_lock(self):
        with mock.patch("tasks._lib.HW_LOCK") as lock:
            lock.exists.return_value = True
            lock.read_text.return_value = "hwsmoke"
            for fn in (thingy.scan, thingy.nfc, thingy.live):
                with self.subTest(task=fn.name), self.assertRaises(Exit) as err:
                    fn(ctx())
                self.assertEqual(err.exception.code, 3)


class ReleaseTaskTest(unittest.TestCase):
    def test_dry_run_is_default_and_runs_nothing(self):
        c = ctx()
        release(c, "0.2.0")
        self.assertEqual(commands(c), [])


class DoctorFormatTest(unittest.TestCase):
    def test_icons_and_hints(self):
        out = format_checks([Check("Docker", True), Check("Image", False, hint="./t setup"),
                             Check("Chrome", False, critical=False)])
        self.assertIn("✅ Docker", out)
        self.assertIn("❌ Image", out)
        self.assertIn("→ ./t setup", out)
        self.assertIn("⚠️ Chrome", out)


if __name__ == "__main__":
    unittest.main()
