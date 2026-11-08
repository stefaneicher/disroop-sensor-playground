#!/usr/bin/env bash
# Motion One hardware tools image. Called via ./project hw <cmd>. Everything runs headless inside the container.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HW_IMAGE="disroop-motion-one-tools"
DIR="$ROOT/hardware/motion-one/docker"
FW_IMAGE="disroop-motion-one-fw"

build() { docker build -t "$HW_IMAGE" "$DIR"; }
inhw() {
  docker image inspect "$HW_IMAGE" >/dev/null 2>&1 || build >&2
  docker run --rm ${TTY:-} -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -w /workspace "$HW_IMAGE" "$@"
}

fwbuild() { docker build -t "$FW_IMAGE" "$DIR/firmware"; }
infw() {
  docker image inspect "$FW_IMAGE" >/dev/null 2>&1 || fwbuild >&2
  docker run --rm ${TTY:-} -u "$(id -u):$(id -g)" -v "$ROOT":/workspace -w /workspace "$FW_IMAGE" "$@"
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  image) build ;;
  smoke) inhw bash hardware/motion-one/docker/smoke.sh "${1:-devices/motion-one/logs/tools-smoke}" ;;
  sh)    TTY=-it inhw bash ;;
  run)   inhw bash -c "$*" ;;
  fw-image) fwbuild ;;
  fw)    infw bash -c "$*" ;;
  *) echo "Usage: ./project hw image|smoke [outdir]|sh|run <cmd>|fw-image|fw <cmd>"; [[ "$cmd" == help ]] ;;
esac
