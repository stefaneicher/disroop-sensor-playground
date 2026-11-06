#!/usr/bin/env bash
# Owned by the web agent. Called via ./project web <cmd>. Everything runs inside the devcontainer image.
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
IMAGE="${IMAGE:-thingy52-live-dev}"
if ! declare -F indev >/dev/null; then
  indev() {
    docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -w /workspace "$IMAGE" bash -c "$*"
  }
fi
WEB=bridge/web
PORT="${PORT:-8053}"

usage() {
  cat <<U
Usage: ./project web <command>

  unit         node --test unit tests (logic modules, simulator)
  smoke        mock server + headless Chromium: dashboard renders live values, no JS errors
  test         unit + smoke
  serve        mock server on http://localhost:$PORT (Ctrl+C to stop)
  screenshot   desktop + mobile screenshots to build/dashboard.png, build/dashboard-mobile.png
U
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  unit)       indev "node --test $WEB/test/" ;;
  smoke)      indev "node $WEB/dev/smoke.js" ;;
  test)       indev "node --test $WEB/test/ && node $WEB/dev/smoke.js" ;;
  serve)
    docker run --rm -it -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -w /workspace \
      -p "$PORT:$PORT" "$IMAGE" node $WEB/dev/mock-server.js --port "$PORT" --host 0.0.0.0 ;;
  screenshot) indev "mkdir -p build && node $WEB/dev/smoke.js --screenshot build/dashboard.png" ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
