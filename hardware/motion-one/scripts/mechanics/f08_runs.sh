#!/bin/bash
# F-08 Messlaeufe einzeln, je 1200 s Timeout
cd /workspace
L=hardware/motion-one/logs/f08
run() { n=$1; shift
  rm -rf /tmp/f08_$n; s=$(date +%s)
  env MO_OUT=/tmp/f08_$n MO_CACHE=/tmp/mo_cache MO_NOEXPORT=1 "$@" timeout 1200 python3 -u hardware/motion-one/scripts/mechanics/build_enclosure.py > $L/run_$n.log 2>&1
  rc=$?; e=$(( $(date +%s) - s ))
  cp /tmp/f08_$n/f08_vol.json $L/vol_$n.json 2>/dev/null
  echo "$n rc=$rc wall=${e}s"; }
run ctrl
run a_nproc3 MO_NPROC=3
run b_occpar MO_OCCPAR=1
run c_batch MO_BATCH=1
run d_fuzzy MO_FUZZY=1e-4
