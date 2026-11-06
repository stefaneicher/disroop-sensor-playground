"""Web dashboard (bridge/web): mock server, browser, screenshots, tests."""
from invoke import task

from ._lib import LIVE_PORT, MOCK_PORT, ROOT, open_browser, project, say, url


@task(help={"port": "Port des Mock-Servers"})
def serve(c, port=MOCK_PORT):
    """Dashboard mit Mock-Daten auf http://localhost:8053 (zum Entwickeln, Ctrl+C beendet)."""
    say(f"Dashboard: http://localhost:{port}")
    project(c, "web", "serve", env={"PORT": port})


@task(name="open", help={"port": "8052 = Bridge live, 8060 = Simulator, 8053 = Mock-Server"})
def open_(c, port=LIVE_PORT):
    """Öffnet das Dashboard im Windows-Browser."""
    open_browser(c, url(port) if port != MOCK_PORT else f"http://localhost:{port}/")


@task(help={"show": "Bilder danach öffnen"})
def screenshot(c, show=False):
    """Desktop- und Handy-Screenshot des Dashboards nach build/dashboard*.png."""
    project(c, "web", "screenshot")
    for name in ("dashboard.png", "dashboard-mobile.png"):
        say(f"🖼  build/{name}")
        if show:
            c.run(f"cmd.exe /c start \"\" \"$(wslpath -w {ROOT / 'build' / name})\"", hide=True, warn=True)


@task
def test(c):
    """Unit-Tests (node --test) + Smoke-Test mit headless Chromium."""
    project(c, "web", "test")
