#!/bin/sh
# Assembles the static playground site (GitHub Pages, relay image): console + games (+ Motion One presentation).
# Needs a built games/dist (./project games build or: cd games && npm ci && node dev/build.js).
# Usage (repo root): sh scripts/site.sh <out-dir> [--no-hardware]
set -eu
OUT="${1:?Ausgabeordner fehlt}"
[ -f games/dist/index.html ] || { echo "games/dist fehlt: zuerst ./project games build" >&2; exit 1; }
rm -rf "$OUT"
mkdir -p "$OUT/games"
cp -r console/. "$OUT/"
cp -r games/dist/. "$OUT/games/"
if [ "${2:-}" != "--no-hardware" ] && [ -d hardware/motion-one/media/presentation ]; then
  mkdir -p "$OUT/hardware/motion-one/media"
  cp -r hardware/motion-one/media/presentation "$OUT/hardware/motion-one/media/presentation"
fi
touch "$OUT/.nojekyll"
echo "site: $OUT"
