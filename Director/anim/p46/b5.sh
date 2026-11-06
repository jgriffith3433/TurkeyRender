#!/bin/bash
cd /c/Projects/TKShock/Director
s=$(date +%s)
timeout 120 node mv.mjs build --fast 2>&1 | tail -7 | cut -c1-300
echo "build $(( $(date +%s)-s ))s"
node mv.mjs frame 99.5 102.6 107.4 107.8 108.9 151.4 153.6 154.7 158.5 --w 640 --h 360 2>&1 | tail -2 | cut -c1-120
D=anim/p46/f5; mkdir -p $D; for t in 0099.500 0102.600 0107.400 0107.800 0108.900 0151.400 0153.600 0154.700 0158.500; do cp captures/f_$t.png $D/; done
echo "frames $(( $(date +%s)-s ))s"
