#!/usr/bin/env bash
# r5: Parametervarianten (LIP_D0, GROOVE_CLR) parallel bauen. Aufruf in WSL: variants.sh <Repo-Pfad> NAME:D0:CLR ...
# Jede Variante bekommt /tmp/mo_<NAME> (Kopie von devices/ aus dem Repo), Build-Log /tmp/mo_<NAME>/build.log
REPO=$1; shift
for v in "$@"; do
  IFS=: read -r n d c <<< "$v"
  [ -n "$n" ] || continue
  W=/tmp/mo_$n
  rm -rf "$W"; mkdir -p "$W"
  mkdir -p "$W/devices"; cp -r "$REPO/devices/motion-one" "$W/devices/motion-one"
  cp "$REPO/devices/motion-one/scripts/mechanics/run_wsl.sh" "$W/"
  sed -i -E "s/^LIP_D0 = [0-9.]+/LIP_D0 = $d/; s/^GROOVE_CLR = [0-9.]+/GROOVE_CLR = $c/" "$W/devices/motion-one/scripts/mechanics/params.py"
  grep -E '^(LIP_D0|GROOVE_CLR)' "$W/devices/motion-one/scripts/mechanics/params.py" | cut -c1-30
  (MO_ROOT=$W setsid nohup bash "$W/run_wsl.sh" "$W/build.log" 2400 "env MO_VARIANTS=glatt MO_BATCH=1 python3 -u devices/motion-one/scripts/mechanics/build_enclosure.py" > /dev/null 2>&1 &)
done
