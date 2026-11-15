#!/usr/bin/env bash
# Builds the explainer video. Runs inside the video image from the repo root (/workspace), see scripts/video.sh.
# Needs the dashboard and games built first (./project web build, ./project tennis build).
# usage: pipeline.sh [all|tts|record|render]
set -euo pipefail
V=marketing/video; B=$V/build; step="${1:-all}"
mkdir -p "$B/models"
M=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s "$B/models/kokoro-v1.0.int8.onnx" ] || curl -fsSL -o "$B/models/kokoro-v1.0.int8.onnx" "$M/kokoro-v1.0.int8.onnx"
[ -s "$B/models/voices-v1.0.bin" ]       || curl -fsSL -o "$B/models/voices-v1.0.bin" "$M/voices-v1.0.bin"

if [[ $step == all || $step == tts ]]; then python3 $V/tts.py; fi

if [[ $step == all || $step == record ]]; then
  python3 $V/bom.py
  python3 -m http.server 8099 --bind 127.0.0.1 >/dev/null 2>&1 & HTTP=$!
  node bridge/web/dev/mock-server.js --port 8053 >/dev/null 2>&1 & MOCK=$!
  trap 'kill $HTTP $MOCK 2>/dev/null || true' EXIT
  sleep 2
  S=http://127.0.0.1:8099
  python3 $V/rec.py home "$S/index.html" still 0
  python3 $V/rec.py sls  "$S/devices/motion-one/media/presentation/GEHAEUSE_FERTIGUNG_SLS_2026-11-08.html" still 0
  python3 $V/rec.py dash    "http://127.0.0.1:8053/" rt scene:s3 2
  python3 $V/rec.py explode "$S/$V/scene.html?mode=explode" det scene:s6
  python3 $V/rec.py pcb     "$S/$V/scene.html?mode=pcb" det 'scene:s7*0.42'
  python3 $V/rec.py bom     "$S/$V/scene.html?mode=bom" det 'scene:s7*0.44'
  python3 $V/rec.py tennis  "$S/tennis/dist/?demo=1&nohint&cam=third" shim scene:s4 3
  python3 $V/rec.py ski     "$S/tennis/dist/ski/?demo=1&nohint&course=lauberhorn" shim scene:s5 6
fi

if [[ $step == all || $step == render ]]; then
  python3 $V/audio.py
  python3 $V/render.py $(seq 0 $(( $(python3 -c "import json;print(len(json.load(open('$V/script.json'))))") - 1 )))
  ls "$B"/scenes/s*.mp4 | sort -V | sed "s#^$B/#file '#; s#\$#'#" > "$B/scenes.txt"
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$B/scenes.txt" -c copy "$B/video.mp4"
  ffmpeg -y -loglevel error -i "$B/video.mp4" -i "$B/narration_mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$V/out.tmp.mp4"
  mv "$V/out.tmp.mp4" "$V/sensor-playground-explainer.mp4"
  echo "-> $V/sensor-playground-explainer.mp4"
fi
