#!/usr/bin/env bash
# Games (games/: Tennis, Ski, input). Called via ./project games <cmd> (alias: tennis). Everything runs inside the devcontainer image.
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
IMAGE="${IMAGE:-disroop-sensor-playground-dev}"
if ! declare -F indev >/dev/null; then
  indev() {
    docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -v disroop-sensor-playground-cache:/opt/cache \
      -w /workspace "$IMAGE" bash -c "$*"
  }
fi
EMBED=hardware/thingy-bridge/internal/tennisapp/dist

# tsc (src -> dist/js) + static + vendored three.js -> games/dist, then copied into the Go embed folder.
BUILD="cd games && export npm_config_cache=/opt/cache/npm npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false \
  && { [ node_modules/.package-lock.json -nt package-lock.json ] || npm ci --no-progress; } \
  && node dev/build.js && cd /workspace \
  && find $EMBED -mindepth 1 ! -name .keep -exec rm -rf {} + && cp -r games/dist/. $EMBED/"
TYPECHECK="cd games && npx --no-install tsc -p tsconfig.test.json && cd /workspace"
UNIT="node --test games/test/*.test.ts"
SMOKE="node games/dev/smoke.js && node games/dev/ski-smoke.js"

usage() {
  cat <<U
Usage: ./project games <command>   (alias: ./project tennis)

  build        games/dist (tsc + static + vendored three.js), copied to $EMBED for the bridge
  typecheck    tsc --noEmit (strict) over src, tests, dev
  unit         node --test unit tests of the game core (.ts via type stripping)
  smoke        build + headless Chromium (software WebGL): scene renders, demo rally runs, no JS errors
  test         build + typecheck + unit + smoke
  screenshot   docs/img/tennis.png and docs/img/ski-*.png (1280×720)
U
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  build)      indev "$BUILD" ;;
  typecheck)  indev "$BUILD && $TYPECHECK" ;;
  unit)       indev "$UNIT" ;;
  smoke)      indev "$BUILD && $SMOKE" ;;
  test)       indev "$BUILD && $TYPECHECK && $UNIT && $SMOKE" ;;
  screenshot) indev "$BUILD && node games/dev/smoke.js --screenshot docs/img/tennis.png && node games/dev/ski-smoke.js --shots docs/img" ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
