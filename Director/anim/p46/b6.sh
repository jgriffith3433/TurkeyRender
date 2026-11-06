#!/bin/bash
cd /c/Projects/TKShock/Director
s=$(date +%s)
timeout 100 node mv.mjs build --fast 2>&1 | tail -3 | cut -c1-200
for c in "bite 101.9 103.0" "bonk 107.0 108.3" "fing 153.0 154.9"; do set -- $c
 timeout 70 node mv.mjs render --from $2 --to $3 --w 640 --h 360 --fps 30 --out C:/Projects/TKShock/Director/anim/p46/$1.mp4 --wait 2>&1 | tail -1 | cut -c1-100
 echo "$1 $(( $(date +%s)-s ))s"
done
