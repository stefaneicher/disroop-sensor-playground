#!/usr/bin/env bash
# Relay server (relay/): phones as controllers. Called via ./project relay <cmd>. Go runs inside the devcontainer image.
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
IMAGE="${IMAGE:-disroop-sensor-playground-dev}"
if ! declare -F indev >/dev/null; then
  indev() {
    docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -v disroop-sensor-playground-cache:/opt/cache \
      -w /workspace "$IMAGE" bash -c "$*"
  }
fi
GOENV='export GOMODCACHE=/opt/cache/gomod GOFLAGS=-buildvcs=false; cd relay'
RELAY_IMAGE="${RELAY_IMAGE:-disroop-relay}"
PORT="${PORT:-8080}"

usage() {
  cat <<U
Usage: ./project relay <command>

  test     gofmt, go vet, staticcheck, go test -race, then smoke
  smoke    build games + site + relay, start it, headless Chromium: screen with QR, pad joins, frames arrive
  build    build/relay-linux and build/relay.exe
  image    Docker-Image $RELAY_IMAGE (Spiele + Handy-Pad + Server), aus relay/Dockerfile
  run      Image starten auf http://localhost:$PORT (Handys brauchen HTTPS: siehe relay/README.md)
U
}

GOTEST="$GOENV
      set -e
      unformatted=\$(gofmt -l .); if [ -n \"\$unformatted\" ]; then echo \"gofmt needed:\"; echo \"\$unformatted\"; exit 1; fi
      go vet ./...
      staticcheck ./...
      if command -v gcc >/dev/null; then CGO_ENABLED=1 go test -race -count=1 ./...; else go test -count=1 ./...; fi"
SMOKE="$GOENV
      set -e
      CGO_ENABLED=0 go build -trimpath -o ../build/relay-linux ./cmd/relay
      cd /workspace && sh scripts/site.sh build/site --no-hardware
      build/relay-linux -addr 127.0.0.1:8091 -static build/site & pid=\$!
      trap 'kill \$pid' EXIT
      for i in \$(seq 1 50); do curl -fsS http://127.0.0.1:8091/healthz >/dev/null 2>&1 && break; sleep 0.1; done
      node games/dev/relay-smoke.js --url http://127.0.0.1:8091 \${SHOTS:+--shots \$SHOTS}"

cmd="${1:-help}"; shift || true
case "$cmd" in
  test)  indev "$GOTEST"; "$ROOT/scripts/games.sh" build; indev "$SMOKE" ;;
  smoke) "$ROOT/scripts/games.sh" build; indev "$SMOKE" ;;
  build)
    mkdir -p "$ROOT/build"
    indev "$GOENV
      set -e
      GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -o ../build/relay-linux ./cmd/relay
      GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -o ../build/relay.exe ./cmd/relay"
    echo "built build/relay-linux and build/relay.exe" ;;
  image) docker build -f "$ROOT/relay/Dockerfile" -t "$RELAY_IMAGE" "$ROOT" ;;
  run)   docker run --rm -it -p "$PORT:8080" "$RELAY_IMAGE" ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
