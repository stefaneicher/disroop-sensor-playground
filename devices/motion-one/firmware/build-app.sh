#!/usr/bin/env bash
# Baut die Zephyr-App fuer Board motion_one. Im Image disroop-motion-one-fw:
#   ./project hw fw "bash devices/motion-one/firmware/build-app.sh"
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
FW="$(pwd)"
west build -p always -b motion_one -d "$FW/build/app" "$FW/app" -o=-j4 -- \
  -DBOARD_ROOT="$FW" -DDTS_ROOT="$FW/app" -DUSER_CACHE_DIR="$FW/build/zephyr-cache"
