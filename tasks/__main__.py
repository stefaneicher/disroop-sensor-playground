"""Entry point used by ./t:  python3 -m tasks <task> [options]"""
from invoke import Program

from . import ns

Program(namespace=ns, name="thingy52-live", binary="./t", version="1").run()
