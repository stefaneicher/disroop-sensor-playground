#!/usr/bin/env bash
# Baut den Adafruit nRF52 Bootloader 0.11.0 mit eigener Board-Definition motion_one
# (firmware/bootloader/motion_one, Pins aus PINOUT_V1.json). Im Image disroop-motion-one-fw:
#   ./project hw fw "bash devices/motion-one/firmware/build-bootloader.sh [DEBUG=1]"
# DEBUG=1: Log ueber SEGGER RTT (SWD), kein UART (Q-02). Nichts wird geflasht.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
FW="$(pwd)"
TAG=0.11.0
SHA=c67f0bcf0fa8e841426335b1bbde91cda6ca1f50
SRC="$FW/build/bootloader-src"
if [[ ! -f "$SRC/Makefile" ]]; then
  rm -rf "$SRC"
  git clone -q --depth 1 --branch "$TAG" https://github.com/adafruit/Adafruit_nRF52_Bootloader "$SRC"
  # nur die direkt benoetigten Submodule, nicht rekursiv (tinyusb-Untermodule waeren > 2 GB)
  git -C "$SRC" submodule update -q --init --depth 1 lib/tinyusb lib/nrfx lib/uf2 lib/tinycrypt
fi
[[ "$(git -C "$SRC" rev-parse HEAD)" == "$SHA" ]] || { echo "Bootloader-Quelle != $TAG ($SHA)"; exit 1; }
rm -rf "$SRC/src/boards/motion_one" && cp -r "$FW/bootloader/motion_one" "$SRC/src/boards/motion_one"
# Toolchain: Debian gcc-arm-none-eabi + newlib-nano (im Image), wie im Upstream-Projekt
arm-none-eabi-gcc --version | head -1
cd "$SRC"
make BOARD=motion_one clean >/dev/null
# Ziele ohne adafruit-nrfutil (.zip): ELF, HEX ohne SD, Update-UF2, HEX mit S140 6.1.1
OUT=_build/build-motion_one
NAME="motion_one_bootloader-$TAG"
make -j4 BOARD=motion_one CROSS_COMPILE=arm-none-eabi- PYTHON=python3 GIT_VERSION=$TAG "$@" \
  "$OUT/$NAME.out" "$OUT/${NAME}_nosd.hex" "$OUT/update-${NAME}_nosd.uf2" "$OUT/${NAME}_s140_6.1.1.hex"
ls -l "$OUT"/*.hex "$OUT"/*.uf2 "$OUT"/*.out
