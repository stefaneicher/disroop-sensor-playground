#!/usr/bin/env bash
# Firmware-Smoke-Test (PROMPT_1 §5.3). Laeuft im Image disroop-motion-one-fw:
#   ./project hw fw "bash devices/motion-one/firmware/smoke.sh [outdir]"
# 1. Host-Unit-Tests thingy_codec (gcc + Unity)  2. Zephyr-Beispiel fuer nRF52 bauen
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
FW="$(pwd)"
OUT="$(cd ../../.. && pwd)/${1:-devices/motion-one/logs/fw-smoke}"
BOARD="${BOARD:-nrf52840dk/nrf52840}"
SAMPLE="${SAMPLE:-samples/bluetooth/peripheral}"
mkdir -p "$OUT"
rc=0

{
  echo "date: $(date -Iseconds)"
  echo "gcc: $(gcc --version | head -1)"
  echo "cmake: $(cmake --version | head -1)"
  echo "west: $(west --version)"
  echo "zephyr: $(cat "$ZEPHYR_BASE/VERSION" | tr '\n' ' ')"
  echo "sdk: $(cat "$ZEPHYR_SDK_INSTALL_DIR/sdk_version")"
  echo "arm-zephyr-eabi-gcc: $("$ZEPHYR_SDK_INSTALL_DIR"/gnu/arm-zephyr-eabi/bin/arm-zephyr-eabi-gcc --version 2>/dev/null | head -1 || find "$ZEPHYR_SDK_INSTALL_DIR" -name arm-zephyr-eabi-gcc -type f | head -1)"
  echo "unity: $(grep -E 'define UNITY_VERSION_(MAJOR|MINOR|BUILD)' "$UNITY_DIR/src/unity.h" | awk '{print $3}' | paste -sd.)"
} > "$OUT/versions.txt" 2>&1

echo "== Host-Unit-Tests"
make -s clean && make test > "$OUT/unit-tests.log" 2>&1 || rc=1
cat "$OUT/unit-tests.log"
grep -q "^0 Failures" <(grep -o "[0-9]* Failures" "$OUT/unit-tests.log") || rc=1

echo "== Zephyr-Build $SAMPLE fuer $BOARD"
BDIR="$FW/build/zephyr-smoke"
rm -rf "$BDIR"
west build -p always -b "$BOARD" -d "$BDIR" "$ZEPHYR_BASE/$SAMPLE" -- -DUSER_CACHE_DIR="$FW/build/zephyr-cache" > "$OUT/zephyr-build.log" 2>&1 || rc=1
tail -20 "$OUT/zephyr-build.log"
if [[ -f "$BDIR/zephyr/zephyr.hex" ]]; then
  cp "$BDIR/zephyr/zephyr.hex" "$BDIR/zephyr/zephyr.elf" "$OUT/"
  (cd "$OUT" && sha256sum zephyr.hex zephyr.elf > zephyr.sha256 && ls -l zephyr.hex zephyr.elf >> zephyr.sha256)
  file "$OUT/zephyr.elf" >> "$OUT/zephyr.sha256"
  cat "$OUT/zephyr.sha256"
else
  echo "zephyr.hex fehlt"; rc=1
fi
echo "smoke rc=$rc"
exit $rc
