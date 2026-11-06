#!/bin/bash
cd /c/Projects/TKShock/Director
node mv.mjs call bones '{"t":107.6}' 2>&1 | grep -i -A3 -E '"hips"|"head"' | head -12 > anim/p46/bones.txt
timeout 150 node mv.mjs build 2>&1 | tail -10 | cut -c1-400
node mv.mjs call bones '{"t":107.6}' 2>&1 | head -30 | cut -c1-200 > anim/p46/bones.txt
node mv.mjs frame 95.6 96.5 98.1 102.56 107.6 150.3 151.2 153.3 154.7 147 149 --w 640 --h 360 2>&1 | tail -14 > anim/p46/frames.txt
echo done $(date +%H:%M)
