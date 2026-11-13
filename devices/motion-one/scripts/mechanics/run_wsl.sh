#!/usr/bin/env bash
# Mechanik-Lauf im Tools-Container auf einer /tmp-Kopie (schnell, nicht /mnt/c). Aufruf in WSL:
#   run_wsl.sh <log> <timeout_s> <befehl im Container, Repo-Root /workspace>
# Beispiel: run_wsl.sh /tmp/mo/build.log 1800 "MO_VARIANTS=glatt MO_BATCH=1 python3 -u devices/motion-one/scripts/mechanics/build_enclosure.py"
LOG=$1; T=$2; shift 2
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "${MO_ROOT:-/tmp/mo}":/workspace -w /workspace disroop-motion-one-tools bash -c "timeout $T $*" > "$LOG" 2>&1
echo "rc=$?" >> "$LOG"
