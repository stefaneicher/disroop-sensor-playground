#!/usr/bin/env bash
# Smoke-Test Slice: Bambu Studio CLI, P2S 0.4, 0.20mm Standard, PLA Basic. Arg1: Modell (3mf|stl), Arg2: Ausgabeordner
set -uo pipefail
BBL=/opt/bambu-studio/resources/profiles/BBL
IN="$1"; OUT="$2"; mkdir -p "$OUT"
bambu-studio --version 2>/dev/null | head -1 || true
xvfb-run -a true 2>/dev/null; true
bambu-studio --slice 0 --arrange 1 --orient 0 \
  --load-settings "$BBL/machine/Bambu Lab P2S 0.4 nozzle.json;$BBL/process/0.20mm Standard @BBL P2S.json" \
  --load-filaments "$BBL/filament/Bambu PLA Basic @BBL P2S.json" \
  --outputdir "$OUT" --export-3mf out.gcode.3mf "$IN"
echo "rc=$?"
ls -la "$OUT"
