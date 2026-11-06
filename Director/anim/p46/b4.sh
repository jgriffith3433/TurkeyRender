#!/bin/bash
cd /c/Projects/TKShock/Director
timeout 120 node mv.mjs build --fast 2>&1 | tail -7 | cut -c1-300
node mv.mjs frame 99.5 102.6 107.6 108.9 150.5 151.4 153.6 158.5 --w 640 --h 360 2>&1 | tail -3 | cut -c1-120
timeout 60 node mv.mjs motion 149.42 152.5 --every 4 --view side --cols 8 --file p46_hang.png 2>&1 | grep -E 'pops|feet|hipsTravel' | cut -c1-200
echo done $(date +%H:%M)
