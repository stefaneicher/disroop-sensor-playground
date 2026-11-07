#!/usr/bin/env bash
# End-to-end smoke test of the bridge in simulator mode. Runs inside the devcontainer from the repo root:
#   bash bridge/scripts/smoke.sh build/thingy-linux
set -euo pipefail
BIN="${1:-build/thingy-linux}"
PORT="${PORT:-8052}"
BASE="http://127.0.0.1:$PORT"
LOG="build/smoke-bridge.log"

# poll <tries> <cmd…>: retry every 0.2 s (generous budgets – the machine may be under load).
poll() { local n=$1; shift; for _ in $(seq "$n"); do "$@" && return 0; sleep 0.2; done; return 1; }
state() { curl -fs "$BASE/api/state"; }
fail() { echo "bridge smoke: FAILED - $*" >&2; echo "--- bridge log ---" >&2; cat "$LOG" >&2 || true; exit 1; }
ok() { echo "  ok  $*"; }

"$BIN" --sim --no-tui --port "$PORT" >"$LOG" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT

poll 150 curl -fs "$BASE/healthz" -o /dev/null || fail "/healthz not reachable within 30 s"
[[ "$(curl -fs "$BASE/healthz")" == "ok" ]] || fail "/healthz"
ok "/healthz"

live() { state | jq -e '.connected and .environment.temperature_c != null and .motion.accel_g != null' >/dev/null; }
poll 150 live || fail "no live sim values within 30 s: $(state)"
STATE="$(state)"
echo "$STATE" | jq -e --slurpfile schema docs/telemetry.schema.json '
  ($schema[0]) as $s | . as $d
  | all($s.required[]; . as $k | $d | has($k))
  and all($s.properties | to_entries[] | select(.value.required); .key as $k | all(.value.required[]; . as $r | $d[$k] | has($r)))
  and .device.source == "sim" and (.motion.accel_g.z > 0.9)
  and .sound.mic_enabled == false and .sound.level_dbfs == null' >/dev/null \
  || fail "/api/state misses schema keys or live values: $STATE"
ok "/api/state has all schema keys, source sim, live values, mic off"

mic() { curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d "$1" "$BASE/api/mic"; }
[[ "$(mic '{"enabled":true}')" == 202 ]] || fail "POST /api/mic on"
level() { state | jq -e "$1" >/dev/null; }
poll 50 level '.sound.mic_enabled and .sound.level_dbfs != null' || fail "no sound level after mic on: $(state)"
[[ "$(mic '{"enabled":false}')" == 202 ]] || fail "POST /api/mic off"
poll 50 level '(.sound.mic_enabled | not) and .sound.level_dbfs == null' || fail "sound level still set after mic off: $(state)"
[[ "$(mic '{"enabled":"yes"}')" == 400 ]] || fail "POST /api/mic with bad body not rejected"
ok "POST /api/mic on/off/400"

# The sim changes values every 100 ms; 10 Hz throttle → ≤ 31 events in 3 s. Lower bound kept low for loaded machines.
N="$(curl -sN --max-time 3 "$BASE/api/stream" | grep -c '^event: telemetry' || true)"
(( N >= 3 && N <= 32 )) || fail "SSE delivered $N telemetry events in 3 s (want 3..32)"
ok "SSE: $N telemetry events in 3 s"

code="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"action":"play","volume":0}' "$BASE/api/song")"
[[ "$code" == 202 ]] || fail "POST /api/song play → $code"
playing() { [[ "$(state | jq -r .sound.song.playing)" == "$1" ]]; }
poll 50 playing true || fail "song not playing"
code="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"action":"stop"}' "$BASE/api/song")"
[[ "$code" == 202 ]] || fail "POST /api/song stop → $code"
poll 50 playing false || fail "song still playing after stop"
ok "POST /api/song play/stop"

code="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"r":255,"g":16,"b":0}' "$BASE/api/led")"
[[ "$code" == 204 ]] || fail "POST /api/led → $code"
ok "POST /api/led"

ct="$(curl -fsI "$BASE/" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')"
[[ "$ct" == text/html* ]] || fail "/ content type $ct"
ok "/ serves the dashboard"

beep() { curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d "$1" "$BASE/api/beep"; }
[[ "$(beep '{"kind":"hit"}')" == 204 ]] || fail "POST /api/beep hit"
sleep 0.2
[[ "$(beep '{"kind":"boing"}')" == 400 ]] || fail "POST /api/beep with unknown kind not rejected"
ok "POST /api/beep 204/400"

curl -fs "$BASE/tennis/" | grep -q 'Thingy Tennis' || fail "/tennis/ does not serve the game"
[[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/tennis/vendor/three/three.module.js")" == 200 ]] || fail "/tennis/ vendored three.js missing"
ok "/tennis/ serves the game with vendored three.js"

if command -v node >/dev/null; then
  node tennis/dev/motion-rate.js "ws://127.0.0.1:$PORT/api/motion" 3 50 || fail "/api/motion below 50 Hz"
  ok "WebSocket /api/motion ≥ 50 Hz"
fi
if [[ -f tennis/dev/smoke.js ]] && command -v node >/dev/null; then
  node tennis/dev/smoke.js --url "$BASE/tennis/" --expect-sim || fail "tennis smoke against the bridge"
  ok "tennis smoke (headless Chromium, SIM badge, motion in the browser) against the bridge"
fi

if [[ -f bridge/web/dev/smoke.js ]] && command -v node >/dev/null; then
  node bridge/web/dev/smoke.js --url "$BASE/" || fail "web dashboard smoke against the bridge"
  ok "web dashboard smoke (headless Chromium) against the bridge"
fi

kill -INT "$PID"
exited() { ! kill -0 "$PID" 2>/dev/null; }
poll 75 exited || fail "no clean shutdown on SIGINT within 15 s"
trap - EXIT
ok "clean shutdown on Ctrl+C"
echo "bridge smoke: OK"
