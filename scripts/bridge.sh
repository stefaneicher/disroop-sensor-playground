#!/usr/bin/env bash
# Owned by the bridge agent. Called via ./project bridge <cmd> (needs `indev` from ./project).
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
EXE="$ROOT/build/thingy.exe"

# Go env for every container run: module cache on the persistent cache volume.
GOENV='export GOMODCACHE=/opt/cache/gomod GOFLAGS=-buildvcs=false; cd bridge'

# shared/chorus.json is the single source of the song; go:embed needs a copy inside the module (gitignored).
sync_chorus() { cp "$ROOT/shared/chorus.json" "$ROOT/bridge/internal/song/chorus.json"; }
# The embedded dashboard is TypeScript; compile it to bridge/web/static/js before go test/build.
build_web() { "$ROOT/scripts/web.sh" build; }
# Tennis is embedded under /tennis/: build it into bridge/internal/tennisapp/dist.
build_tennis() { "$ROOT/scripts/tennis.sh" build; }

usage() {
  cat <<U
Usage: ./project bridge <command> [args]

  test            gofmt, go vet, staticcheck, go test (-race), then smoke
  build           build/thingy.exe (Windows) and build/thingy-linux
  smoke           start build/thingy-linux --sim in the container and check the HTTP API
  run [args]      build and start thingy.exe on Windows (terminal + web on :8052)
  run tennis [--sim]  same, starts Tennis and opens http://127.0.0.1:8052/tennis/
  scan            list Thingys in range
  song [args]     connect and play the chorus once
  nfc [--restore] write the Android app record to the NFC tag (backup in build/nfc-backup.hex)
U
}

do_test() {
  sync_chorus
  build_web
  build_tennis
  indev "$GOENV
    set -e
    unformatted=\$(gofmt -l .); if [ -n \"\$unformatted\" ]; then echo \"gofmt needed:\"; echo \"\$unformatted\"; exit 1; fi
    go vet ./...
    GOOS=windows go vet ./...
    staticcheck ./...
    GOOS=windows staticcheck ./...
    if command -v gcc >/dev/null; then CGO_ENABLED=1 go test -race -count=1 ./...; else go test -count=1 ./...; fi"
  do_build
  do_smoke
}

do_build() {
  sync_chorus
  build_web
  build_tennis
  mkdir -p "$ROOT/build"
  indev "$GOENV
    set -e
    GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -o ../build/thingy.exe ./cmd/thingy
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -o ../build/thingy-linux ./cmd/thingy"
  echo "built build/thingy.exe and build/thingy-linux"
}

do_smoke() {
  [[ -x "$ROOT/build/thingy-linux" ]] || do_build
  indev "bash bridge/scripts/smoke.sh build/thingy-linux"
}

# Runs the Windows exe through WSL interop from the repo root (relative paths like build/ resolve there).
win_exe() { do_build; cd "$ROOT"; exec "$EXE" "$@"; }

cmd="${1:-help}"; shift || true
case "$cmd" in
  test)  do_test ;;
  build) do_build ;;
  smoke) do_smoke ;;
  run)   win_exe "$@" ;;
  scan|song|nfc) win_exe "$cmd" "$@" ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
