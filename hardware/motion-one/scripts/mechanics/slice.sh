#!/usr/bin/env bash
# Slice Motion One: Bambu Studio CLI, P2S 0.4, 0.20mm Standard, Generic PETG, Stuetzen an (Baumstuetzen, nur innen noetig).
set -uo pipefail
D=hardware/motion-one; BBL=/opt/bambu-studio/resources/profiles/BBL; OUT=$D/mechanics/print/slice; mkdir -p "$OUT"
python3 $D/scripts/mechanics/make_filament_petg.py "$OUT/petg.json"
python3 - "$OUT/process.json" <<'PY'
import json,sys
B="/opt/bambu-studio/resources/profiles/BBL/process/"
p=json.load(open(B+"0.20mm Standard @BBL P2S.json"))
p.update({"enable_support":"1","support_type":"tree(auto)","support_threshold_angle":"40","wall_loops":"3","sparse_infill_density":"20%"})
json.dump(p,open(sys.argv[1],"w"),indent=2)
PY
run() { name=$1; shift
  bambu-studio --slice 0 --arrange 1 --orient 0 \
    --load-settings "$BBL/machine/Bambu Lab P2S 0.4 nozzle.json;$OUT/process.json" \
    --load-filaments "$OUT/petg.json" --outputdir "$OUT/$name" --export-3mf "$name.gcode.3mf" "$@" > "$OUT/$name.log" 2>&1
  echo "$name rc=$?"; }
P=$D/mechanics/print
run motion-one_gehaeuse $P/oberschale.3mf $P/unterschale_glatt.3mf $P/tastenkappe.3mf $P/lichtleiter.3mf
run toleranzkoerper $P/toleranzkoerper.3mf
