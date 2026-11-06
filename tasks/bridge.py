"""Go bridge (thingy.exe): build, tests, smoke test against the simulator."""
from invoke import task

from ._lib import project


@task
def build(c):
    """Baut build/thingy.exe (Windows) und build/thingy-linux im Devcontainer."""
    project(c, "bridge", "build")


@task
def test(c):
    """gofmt, go vet, staticcheck, go test -race, Smoke-Test."""
    project(c, "bridge", "test")


@task
def smoke(c):
    """Smoke-Test: thingy-linux --sim im Container, prüft die HTTP-API."""
    project(c, "bridge", "smoke")
