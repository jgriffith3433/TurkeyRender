#!/usr/bin/env bash
# board_tests.sh: 5-second tests of the hero shots for J (the new loop: J watches a 5 s test and says yes or no).
#   bash Director/tools/board_tests.sh [name ...]      names from TESTS below; none = all
# Each test is one mv render at 24 fps, 854x480, from the board's shot starts (storyboard/shots.json via cut.json), remixed with the
# current sound (tools/remix.mjs) and stripped (tools/review_strips.mjs) into videos/hawkespunch/tests/<name>/.
set -u
cd "$(dirname "$0")/../.." || exit 1
V=Director/videos/hawkespunch
mkdir -p "$V/tests"
# name  from(s)  to(s)         board shots
TESTS=(
  "punch    64.25  69.25   p01 p02 p03: wind-up, impact frame, through the ceiling"
  "s05_ring 103.25 108.25  s05 (+ the head of s06): the ring blast, both wakes"
  "s06_boo  106.25 111.25  s06 s07: BOO, the flinch punch, the crater from orbit"
  "s10_catch 122.75 127.75 s10: brace, the Jupiter catch, the slide"
  "s12_atlas 131.75 136.75 s12 s13: the Atlas wind-up with the Earth, People live there"
  "s14_setback 139.25 144.25 s14: the careful set-down"
)
want=("$@")
for row in "${TESTS[@]}"; do
  set -- $row; name=$1; from=$2; to=$3
  if [ ${#want[@]} -gt 0 ] && ! printf '%s\n' "${want[@]}" | grep -qx "$name"; then continue; fi
  out="$V/tests/$name"; mkdir -p "$out"
  echo "== $name  $from-$to s"
  node Director/mv.mjs --video hawkespunch render --from "$from" --to "$to" --fps 24 --w 854 --h 480 --out "$PWD/$out/$name.mp4" > "$out/render.log" 2>&1 || { echo "render failed: see $out/render.log"; tail -n 5 "$out/render.log"; continue; }
  [ -f "$out/$name.mp4" ] || { f=$(ls -t "$V"/output/*.mp4 2>/dev/null | head -1); [ -n "$f" ] && cp "$f" "$out/$name.mp4"; }
  [ -f "$out/$name.mp4" ] || { echo "no output file"; continue; }
  node Director/tools/remix.mjs hawkespunch "$out/$name.mp4" --from "$from" --out "$out/$name-mix.mp4" 2>&1 | tail -n 1
  node Director/tools/review_strips.mjs --video "$out/$name-mix.mp4" --start "$from" --cuts --out "$out/strips" 2>&1 | tail -n 1
done
