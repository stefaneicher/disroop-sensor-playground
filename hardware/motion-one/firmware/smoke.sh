#!/usr/bin/env bash
# Firmware-Smoke (PROMPT_1 §5.3/§9). Laeuft im Image disroop-motion-one-fw:
#   ./project hw fw "bash hardware/motion-one/firmware/smoke.sh [outdir]"
# 1. alle Host-Unit-Tests (gcc + Unity)  2. Zephyr-App fuer Board motion_one  3. Images + SHA-256
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
FW="$(pwd)"
OUT="$(cd ../../.. && pwd)/${1:-devices/motion-one/logs/fw-v1}"
mkdir -p "$OUT"
rc=0

{
  echo "date: $(date -Iseconds)"
  echo "gcc: $(gcc --version | head -1)"
  echo "cmake: $(cmake --version | head -1)"
  echo "west: $(west --version)"
  echo "zephyr: $(tr '\n' ' ' < "$ZEPHYR_BASE/VERSION")"
  echo "sdk: $(cat "$ZEPHYR_SDK_INSTALL_DIR/sdk_version")"
  echo "unity: $(grep -E 'define UNITY_VERSION_(MAJOR|MINOR|BUILD)' "$UNITY_DIR/src/unity.h" | awk '{print $3}' | paste -sd.)"
} > "$OUT/versions.txt" 2>&1

echo "== Host-Unit-Tests"
make -s clean && make test > "$OUT/unit-tests.log" 2>&1 || rc=1
grep -E "^(==|[0-9]+ Tests)" "$OUT/unit-tests.log"
grep -E "^[0-9]+ Tests" "$OUT/unit-tests.log" | grep -vq " 0 Failures" && rc=1
echo "Summe: $(grep -E '^[0-9]+ Tests' "$OUT/unit-tests.log" | awk '{t+=$1; f+=$3} END {print t" Tests, "f" Failures"}')"

echo "== Zephyr-App motion_one"
bash "$FW/build-app.sh" > "$OUT/app-build.log" 2>&1 || rc=1
grep -E "warning|error:|FLASH:|RAM:" "$OUT/app-build.log"
grep -q "warning:" "$OUT/app-build.log" && { echo "Warnungen im App-Build"; rc=1; }
Z="$FW/build/app/zephyr"
if [[ -f "$Z/zephyr.uf2" && -f "$Z/zephyr.hex" ]]; then
  cp "$Z/zephyr.uf2" "$Z/zephyr.hex" "$Z/zephyr.elf" "$Z/zephyr.bin" "$OUT/"
  (cd "$OUT" && sha256sum zephyr.uf2 zephyr.hex zephyr.bin zephyr.elf > zephyr.sha256 && ls -l zephyr.* >> zephyr.sha256)
  file "$OUT/zephyr.elf" >> "$OUT/zephyr.sha256"
  echo "hex-start: $(head -2 "$OUT/zephyr.hex" | tr '\n' ' ')" >> "$OUT/zephyr.sha256"
  cat "$OUT/zephyr.sha256"
else
  echo "zephyr.uf2/hex fehlt"; rc=1
fi
echo "smoke rc=$rc"
exit $rc
