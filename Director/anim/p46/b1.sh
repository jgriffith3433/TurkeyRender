#!/bin/bash
cd /c/Projects/TKShock/Director
s=$(date +%s)
timeout 150 node mv.mjs build 2>&1 | tail -12 | cut -c1-500
echo "build $(( $(date +%s)-s ))s"
node mv.mjs frame 93.5 96 97.7 98 99.3 101.9 104.6 105.8 107.6 109.3 150.5 151.4 153.5 --w 640 --h 360 2>&1 | tail -16 > anim/p46/frames.txt
echo "frames $(( $(date +%s)-s ))s"
