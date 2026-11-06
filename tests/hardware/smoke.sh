#!/usr/bin/env bash
# Hardware smoke test: build/thingy.exe (Windows, via WSL interop) against a real Thingy:52 over BLE.
# Run from WSL in the repo root or anywhere:  tests/hardware/smoke.sh [--nfc] [--wait 600] [--port 8052] [--no-build]
# Details and results: docs/hardware-smoke.md
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ADDR="${THINGY_ADDR:-E3:58:08:1B:53:5F}"
PORT=8052
WAIT_TOTAL=600        # total time budget for finding the Thingy (s)
SCAN_SECS=15          # duration of one scan
SCAN_PAUSE=15         # pause between scans (s)
CONNECT_WAIT=120      # time budget for connected:true after start (s)
SONG_VOLUME="${SONG_VOLUME:-30}"
DO_BUILD=1
DO_NFC=0
DO_SHOT=1

usage() {
  cat <<U
Aufruf: tests/hardware/smoke.sh [Optionen]

  --nfc              zusätzlich NFC-Tag auf die App umschreiben (thingy.exe nfc, Backup zuerst, Readback)
  --wait SEK         Gesamtwartezeit für den Scan (Standard $WAIT_TOTAL)
  --scan-secs SEK    Dauer eines Scans (Standard $SCAN_SECS)
  --port PORT        HTTP-Port der Bridge (Standard $PORT)
  --no-build         thingy.exe nicht neu bauen
  --no-screenshot    keinen Chrome-Screenshot erstellen
Umgebung: THINGY_ADDR (Standard $ADDR), SONG_VOLUME (Standard $SONG_VOLUME)
U
}

while (($#)); do
  case "$1" in
    --nfc) DO_NFC=1 ;;
    --wait) WAIT_TOTAL="$2"; shift ;;
    --scan-secs) SCAN_SECS="$2"; shift ;;
    --port) PORT="$2"; shift ;;
    --no-build) DO_BUILD=0 ;;
    --no-screenshot) DO_SHOT=0 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
  shift
done

EXE=./build/thingy.exe
BASE="http://127.0.0.1:$PORT"
LOG=build/hw-smoke.log
BRIDGE_LOG=build/hw-bridge.log
STATE_JSON=build/hw-state.json
SHOT=build/hw-dashboard.png
CHECK="python3 tests/hardware/state_check.py"
CURL=curl.exe   # Linux curl cannot reach Windows localhost from WSL
mkdir -p build
: >"$LOG"
exec > >(tee -a "$LOG") 2>&1

PID=""
WINPID=""
declare -a RESULTS=()

log() { echo "$(date +%H:%M:%S)  $*"; }
result() { RESULTS+=("$(printf '%-5s %-10s %s' "$1" "$2" "$3")"); log "$1  $2: $3"; }
state() { $CURL -s --max-time 5 "$BASE/api/state"; }
field() { state | $CHECK get "$1" 2>/dev/null; }
post() { $CURL -s -o /dev/null -w '%{http_code}' --max-time 5 -X POST -H 'Content-Type: application/json' -d "$2" "$BASE$1"; }
# poll <seconds> <cmd…>: retry every second
poll() { local end=$((SECONDS + $1)); shift; while ((SECONDS < end)); do "$@" && return 0; sleep 1; done; "$@"; }
win_alive() { [[ -n "$WINPID" ]] && /mnt/c/Windows/System32/tasklist.exe /FI "PID eq $WINPID" /NH 2>/dev/null | grep -qi thingy; }
other_bridges() { /mnt/c/Windows/System32/tasklist.exe /FI "IMAGENAME eq thingy.exe" /NH 2>/dev/null | grep -i thingy | awk '{print $2}' | tr '\n' ' '; }

stop_bridge() {
  [[ -n "$PID" ]] || return 0
  log "Stoppe Bridge (PID $PID, Windows-PID ${WINPID:-?}) …"
  kill -INT "$PID" 2>/dev/null
  for _ in $(seq 10); do kill -0 "$PID" 2>/dev/null || break; sleep 0.5; done
  kill "$PID" 2>/dev/null
  wait "$PID" 2>/dev/null
  if win_alive; then
    log "Windows-Prozess $WINPID läuft noch – taskkill"
    /mnt/c/Windows/System32/taskkill.exe /PID "$WINPID" /F >/dev/null 2>&1
  fi
  PID=""; WINPID=""
}

summary() {
  local rc=0
  stop_bridge
  echo
  echo "=== Hardware-Smoke-Test $(date '+%Y-%m-%d %H:%M') ==="
  for r in "${RESULTS[@]}"; do echo "$r"; [[ "$r" == FAIL* ]] && rc=1; done
  ((${#RESULTS[@]})) || rc=1
  if [[ -f "$BRIDGE_LOG" ]]; then echo; echo "--- Bridge-Log ($BRIDGE_LOG) ---"; cat "$BRIDGE_LOG"; fi
  echo
  echo "Ergebnis: $([[ $rc == 0 ]] && echo PASS || echo FAIL)  (Log: $LOG)"
  return $rc
}
trap 'summary; exit $?' EXIT
trap 'exit 130' INT TERM

# --- lock: another agent/user is using the Thingy (only one BLE central possible) -----------------
LOCK=build/hw-lock
LOCK_WAIT="${LOCK_WAIT:-3600}"
if [[ -e "$LOCK" ]]; then
  lock_end=$((SECONDS + LOCK_WAIT))
  while [[ -e "$LOCK" ]] && ((SECONDS < lock_end)); do
    log "$LOCK existiert – Thingy wird anderweitig benutzt, warte 60 s …"; sleep 60
  done
  [[ -e "$LOCK" ]] && { result FAIL lock "$LOCK nach ${LOCK_WAIT}s noch vorhanden"; exit 1; }
  log "$LOCK entfernt – baue frisch."
  touch -d '2000-01-01' "$EXE" 2>/dev/null   # force a fresh build of the other agent's changes
fi

# --- 0. build -------------------------------------------------------------------------------------
if ((DO_BUILD)); then
  if [[ ! -x "$EXE" ]] || [[ -n "$(find bridge shared -type f -newer "$EXE" ! -name chorus.json -print -quit 2>/dev/null)" ]]; then
    log "Baue thingy.exe (./project bridge build) …"
    if ./project bridge build >build/hw-build.log 2>&1; then
      result PASS build "build/thingy.exe neu gebaut"
    elif [[ -x "$EXE" ]]; then
      result WARN build "Build fehlgeschlagen (build/hw-build.log), nutze vorhandene exe"
    else
      result FAIL build "Build fehlgeschlagen, keine exe (build/hw-build.log)"; exit 1
    fi
  else
    log "thingy.exe ist aktuell."
  fi
fi
[[ -x "$EXE" ]] || { result FAIL build "$EXE fehlt"; exit 1; }
log "thingy.exe vom $(date -r "$EXE" '+%Y-%m-%d %H:%M:%S')"

# --- a. scan --------------------------------------------------------------------------------------
found=""
deadline=$((SECONDS + WAIT_TOTAL))
attempt=0
while :; do
  attempt=$((attempt + 1))
  others="$(other_bridges)"
  [[ -n "$others" ]] && log "Hinweis: thingy.exe läuft bereits (Windows-PID $others) – ein verbundenes Thingy advertised nicht."
  out="$(timeout $((SCAN_SECS + 20)) "$EXE" scan --timeout "${SCAN_SECS}s" 2>&1)"
  if line="$(grep -i "$ADDR" <<<"$out")"; then found="$line"; break; fi
  ((SECONDS >= deadline)) && break
  log "Scan $attempt: $ADDR nicht gefunden. Thingy schläft? Taste drücken. (noch $((deadline - SECONDS)) s)"
  [[ -n "$out" ]] && sed 's/^/    /' <<<"$out"
  sleep "$SCAN_PAUSE"
done
if [[ -z "$found" ]]; then
  result FAIL scan "$ADDR nach $attempt Scans / ${WAIT_TOTAL}s nicht gefunden (Thingy schläft?)"
  exit 1
fi
result PASS scan "$(echo "$found" | tr -s ' ') (Versuch $attempt)"

# --- b. bridge start + BLE connection -------------------------------------------------------------
if $CURL -s --max-time 2 "$BASE/healthz" >/dev/null 2>&1; then
  result FAIL start "Port $PORT ist schon belegt (andere Bridge?)"; exit 1
fi
"$EXE" --no-tui --port "$PORT" --addr "$ADDR" >"$BRIDGE_LOG" 2>&1 &
PID=$!
log "Bridge gestartet (WSL-PID $PID), Log $BRIDGE_LOG"
healthy() { [[ "$($CURL -s --max-time 2 "$BASE/healthz")" == ok* ]]; }
if ! poll 30 healthy; then result FAIL start "/healthz nicht erreichbar nach 30 s"; exit 1; fi
WINPID="$(/mnt/c/Windows/System32/netstat.exe -ano 2>/dev/null | tr -d '\r' | awk -v p=":$PORT" '$2 ~ p"$" && $4 == "LISTENING" {print $5; exit}')"
connected() { [[ "$(field connected)" == true && "$(field device.source)" == ble ]]; }
t0=$SECONDS
if ! poll "$CONNECT_WAIT" connected; then
  result FAIL connect "kein connected:true/source ble nach ${CONNECT_WAIT}s: $(state | head -c 200)"; exit 1
fi
result PASS connect "healthz ok, connected:true, source ble nach $((SECONDS - t0)) s (Windows-PID ${WINPID:-?})"

# --- c. plausibility ------------------------------------------------------------------------------
eco2_ready() { [[ "$(field environment.eco2_ppm)" =~ ^[0-9.]+$ ]] && [[ "$(field environment.temperature_c)" != null ]] \
  && [[ "$(field sound.level_dbfs)" != null ]] && [[ "$(field device.battery_pct)" != null ]]; }
t0=$SECONDS
poll 60 eco2_ready || log "eCO2/Werte nach 60 s noch null"
log "Werte vollständig nach $((SECONDS - t0)) s"
state >"$STATE_JSON"
if checks="$($CHECK plausible <"$STATE_JSON")"; then
  result PASS values "alle Werte plausibel"
else
  result FAIL values "$(grep '^FAIL' <<<"$checks" | tr -s ' ' | paste -sd ';' -)"
fi
sed 's/^/    /' <<<"$checks"

state >build/hw-state-a.json; sleep 2; state >build/hw-state-b.json
if ch="$($CHECK changed build/hw-state-a.json build/hw-state-b.json)"; then
  result PASS live "$ch"
else
  result FAIL live "$ch"
fi
rm -f build/hw-state-a.json build/hw-state-b.json

# --- d. SSE ---------------------------------------------------------------------------------------
n="$($CURL -sN --max-time 3 "$BASE/api/stream" | grep -c '^event: telemetry')"
if ((n >= 5)); then result PASS sse "$n telemetry-Events in 3 s"; else result FAIL sse "nur $n telemetry-Events in 3 s (soll ≥ 5)"; fi

# --- e. song --------------------------------------------------------------------------------------
code="$(post /api/song "{\"action\":\"play\",\"volume\":$SONG_VOLUME}")"
playing() { [[ "$(field sound.song.playing)" == "$1" ]]; }
if [[ "$code" != 202 ]]; then
  result FAIL song "POST play → $code"
elif ! poll 5 playing true; then
  result FAIL song "playing wird nicht true"
else
  i1="$(field sound.song.note_index)"
  advanced() { local i; i="$(field sound.song.note_index)"; [[ "$i" =~ ^[0-9]+$ && "$i" != "$i1" ]] && i2="$i"; }
  i2=""
  if ! poll 6 advanced; then
    result FAIL song "note_index bleibt bei $i1"
  else
    code="$(post /api/song '{"action":"stop"}')"
    if [[ "$code" == 202 ]] && poll 5 playing false; then
      result PASS song "play 202 → playing true, note_index $i1 → $i2, stop → playing false"
    else
      result FAIL song "stop → $code, playing=$(field sound.song.playing)"
    fi
  fi
fi
post /api/song '{"action":"stop"}' >/dev/null

# --- f. LED ---------------------------------------------------------------------------------------
led_is() { [[ "$(field ui.led | tr -d ' ')" == "$1" ]]; }
code="$(post /api/led '{"r":255,"g":0,"b":0}')"
if [[ "$code" != 204 ]]; then
  result FAIL led "POST rot → $code"
elif ! poll 3 led_is '{"r":255,"g":0,"b":0}'; then
  result FAIL led "ui.led nach rot: $(field ui.led)"
else
  sleep 1
  code="$(post /api/led '{"r":0,"g":0,"b":0}')"
  if [[ "$code" == 204 ]] && poll 3 led_is '{"r":0,"g":0,"b":0}'; then
    result PASS led "rot 204 → ui.led {255,0,0}, aus 204 → {0,0,0}"
  else
    result FAIL led "aus → $code, ui.led $(field ui.led)"
  fi
fi

# --- g. web ---------------------------------------------------------------------------------------
html="$($CURL -s --max-time 5 "$BASE/")"
if grep -qi '<html' <<<"$html"; then result PASS web "GET / liefert HTML ($(wc -c <<<"$html") B)"; else result FAIL web "GET / ohne HTML"; fi
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
if ((DO_SHOT)) && [[ -x "$CHROME" ]]; then
  rm -f "$SHOT"
  profile=build/hw-chrome-profile
  timeout 90 "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$(wslpath -w "$ROOT/$profile")" \
    --screenshot="$(wslpath -w "$ROOT")\\build\\hw-dashboard.png" --window-size=1280,1300 --virtual-time-budget=8000 \
    "http://127.0.0.1:$PORT/" >/dev/null 2>&1
  rm -rf "$profile"
  if [[ -s "$SHOT" ]]; then result PASS screenshot "$SHOT"; else result WARN screenshot "kein Screenshot erzeugt"; fi
fi
state >"$STATE_JSON"
log "Snapshot gespeichert: $STATE_JSON"

# --- NFC (opt-in, verändert das Gerät) ------------------------------------------------------------
if ((DO_NFC)); then
  stop_bridge
  if ! "$EXE" help 2>&1 | grep -q '^ *nfc'; then
    result FAIL nfc "thingy.exe kennt den Befehl nfc nicht"
  else
    sleep 3
    out="$(timeout 180 "$EXE" nfc --addr "$ADDR" 2>&1)"; rc=$?
    sed 's/^/    /' <<<"$out"
    if ((rc == 0)) && grep -q 'NFC geschrieben und geprüft' <<<"$out" && [[ -s build/nfc-backup.hex ]]; then
      result PASS nfc "AAR geschrieben + Readback ok, Backup build/nfc-backup.hex ($(($(tr -d '\n' <build/nfc-backup.hex | wc -c) / 2)) B)"
    else
      result FAIL nfc "rc=$rc, siehe Log"
    fi
  fi
fi
