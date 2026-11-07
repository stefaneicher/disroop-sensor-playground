"""Entry point used by ./t:  python3 -m tasks <task> [options]"""
from invoke import Program

from . import ns

Program(namespace=ns, name="disroop-thingy-arcade", binary="./t", version="1").run()
