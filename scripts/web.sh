#!/usr/bin/env bash
# Owned by the web agent. Called via ./project web <cmd>. Everything runs inside the devcontainer image.
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
IMAGE="${IMAGE:-thingy52-live-dev}"
if ! declare -F indev >/dev/null; then
  indev() {
    docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -v thingy52-live-cache:/opt/cache \
      -w /workspace "$IMAGE" bash -c "$*"
  }
fi
WEB=bridge/web
PORT="${PORT:-8053}"

# TypeScript build (src/*.ts -> static/js/*.js, generated, not committed). npm ci only when the lockfile changed.
BUILD="cd $WEB && export npm_config_cache=/opt/cache/npm npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false \
  && { [ node_modules/.package-lock.json -nt package-lock.json ] || npm ci --no-progress; } \
  && rm -rf static/js && npx --no-install tsc -p tsconfig.json && cd /workspace"
TYPECHECK="cd $WEB && node dev/gen-types.js --check && npx --no-install tsc -p tsconfig.test.json && cd /workspace"
UNIT="node --test $WEB/test/*.test.ts"
SMOKE="node $WEB/dev/smoke.js"

usage() {
  cat <<U
Usage: ./project web <command>

  build        compile src/*.ts -> static/js (npm ci first if needed); run before go build/embed
  types        regenerate src/telemetry.ts from docs/telemetry.schema.json
  typecheck    schema types up to date + tsc --noEmit (strict) over src, tests, dev
  unit         node --test unit tests (.ts via type stripping)
  smoke        build + mock server + headless Chromium: dashboard renders live values, no JS errors
  test         build + typecheck + unit + smoke
  serve        mock server on http://localhost:$PORT (Ctrl+C to stop)
  screenshot   desktop + mobile screenshots to build/dashboard.png, build/dashboard-mobile.png
U
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  build)      indev "$BUILD" ;;
  types)      indev "node $WEB/dev/gen-types.js" ;;
  typecheck)  indev "$BUILD && $TYPECHECK" ;;
  unit)       indev "$UNIT" ;;
  smoke)      indev "$BUILD && $SMOKE" ;;
  test)       indev "$BUILD && $TYPECHECK && $UNIT && $SMOKE" ;;
  serve)
    indev "$BUILD"
    docker run --rm -it -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -w /workspace \
      -p "$PORT:$PORT" "$IMAGE" node $WEB/dev/mock-server.js --port "$PORT" --host 0.0.0.0 ;;
  screenshot) indev "$BUILD && mkdir -p build && $SMOKE --screenshot build/dashboard.png" ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
