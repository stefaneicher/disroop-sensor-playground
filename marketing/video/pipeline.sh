#!/usr/bin/env bash
# Builds the explainer video. Runs inside the video image from the repo root (/workspace), see scripts/video.sh.
# Needs the dashboard and games built first (./project web build, ./project tennis build).
# usage: VIDEO_LANG=en|de pipeline.sh [all|tts|record|render]
set -euo pipefail
export VIDEO_LANG="${VIDEO_LANG:-en}"
V=marketing/video; B=$V/build/$VIDEO_LANG; MD=$V/build/models; step="${1:-all}"
mkdir -p "$B" "$MD"
get() { [ -s "$MD/$1" ] || curl -fsSL -o "$MD/$1" "$2"; }
if [[ $VIDEO_LANG == de ]]; then
  [ -s "$MD/de-thorsten-low.onnx" ] || { curl -fsSL https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz | tar -xz -C "$MD" de-thorsten-low.onnx de-thorsten-low.onnx.json; }
else
  K=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
  get kokoro-v1.0.int8.onnx "$K/kokoro-v1.0.int8.onnx"; get voices-v1.0.bin "$K/voices-v1.0.bin"
fi

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
  python3 $V/rec.py explode "$S/$V/scene.html?mode=explode&lang={lang}" det scene:s6
  python3 $V/rec.py pcb     "$S/$V/scene.html?mode=pcb&lang={lang}" det 'scene:s7*0.42'
  python3 $V/rec.py bom     "$S/$V/scene.html?mode=bom&lang={lang}" det 'scene:s7*0.44'
  python3 $V/rec.py tennis  "$S/tennis/dist/?demo=1&nohint&cam=third" shim scene:s4 3
  python3 $V/rec.py ski     "$S/tennis/dist/ski/?demo=1&nohint&course=lauberhorn" shim scene:s5 6
fi

if [[ $step == all || $step == render ]]; then
  OUT=$(python3 $V/lang.py)
  python3 $V/audio.py
  python3 $V/render.py $(seq 0 $(( $(python3 -c "import json,sys;sys.path.insert(0,'$V');from lang import SCRIPT;print(len(json.load(open(SCRIPT))))") - 1 )))
  ls "$B"/scenes/s*.mp4 | sort -V | sed "s#^$B/#file '#; s#\$#'#" > "$B/scenes.txt"
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$B/scenes.txt" -c copy "$B/video.mp4"
  ffmpeg -y -loglevel error -i "$B/video.mp4" -i "$B/narration_mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$B/out.tmp.mp4"
  mv "$B/out.tmp.mp4" "$OUT"
  echo "-> $OUT"
fi
