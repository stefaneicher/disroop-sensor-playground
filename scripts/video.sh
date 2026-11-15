#!/usr/bin/env bash
# Called via ./project video <cmd>. Explainer video (marketing/video): records the games, dashboard and Motion One
# scenes in headless Chromium, narrates with Kokoro TTS and renders with ffmpeg - all inside the video image.
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
VIMAGE="disroop-sensor-playground-video"
invideo() {
  if ! docker image inspect "$VIMAGE" >/dev/null 2>&1 || [[ "${REBUILD:-0}" == 1 ]]; then
    docker build -t "$VIMAGE" "$ROOT/marketing/video" >&2
  fi
  docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e VOICE="${VOICE:-am_michael}" --shm-size=1g \
    -v "$ROOT":/workspace -w /workspace "$VIMAGE" bash -c "$*"
}

usage() {
  cat <<U
Usage: ./project video <command>

  build      everything: web + tennis build, narration, recording, render -> marketing/video/sensor-playground-explainer.mp4
  tts        narration only (Kokoro, VOICE=am_michael; text in marketing/video/script.json)
  record     record clips and stills (needs web + tennis build)
  render     audio mix + compositing + final mp4 from existing clips (fast, ~1-2 min)
  image      build the video image (REBUILD=1 forces)
  shell      shell in the video image
U
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  build)  "$ROOT/scripts/web.sh" build; "$ROOT/scripts/tennis.sh" build; invideo "marketing/video/pipeline.sh all" ;;
  tts|record|render) invideo "marketing/video/pipeline.sh $cmd" ;;
  image)  REBUILD=1 invideo true ;;
  shell)  docker run --rm -it -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$ROOT":/workspace -w /workspace "$VIMAGE" bash ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
