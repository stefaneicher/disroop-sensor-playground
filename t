#!/usr/bin/env bash
# Project CLI (Python Invoke, tasks/). Installs Invoke project-locally into .tools/py on first use – nothing system-wide.
#   ./t            list all tasks        ./t <task> --help   help for one task
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS="$ROOT/.tools/py"
REQ="$ROOT/tasks/requirements.txt"
STAMP="$TOOLS/.requirements.sha256"

want="$(sha256sum "$REQ" | cut -d' ' -f1)"
if [[ "$(cat "$STAMP" 2>/dev/null)" != "$want" ]]; then
  echo "📦 Installiere Invoke nach .tools/py (einmalig) …" >&2
  rm -rf "$TOOLS"
  python3 -m pip install --quiet --disable-pip-version-check --target "$TOOLS" -r "$REQ" >&2
  echo "$want" >"$STAMP"
fi

export PYTHONPATH="$TOOLS:$ROOT${PYTHONPATH:+:$PYTHONPATH}" PYTHONUTF8=1 PYTHONDONTWRITEBYTECODE=1
cd "$ROOT"
if (($# == 0)); then
  cat <<H
🛰  disroop-thingy-arcade – Projekt-CLI
   Schnellstart:  ./t doctor   ·   ./t demo   ·   ./t sim   ·   ./t live
   Hilfe zu einem Befehl:  ./t <befehl> --help

H
  exec python3 -m tasks --list
fi
exec python3 -m tasks "$@"
