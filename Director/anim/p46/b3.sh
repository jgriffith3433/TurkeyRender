#!/bin/bash
cd /c/Projects/TKShock/Director
timeout 170 node mv.mjs build 2>&1 | tail -8 | cut -c1-300
node mv.mjs call bones '{"t":151.2}' 2>&1 | grep -E 'person\.(Head|LeftHand|RightHand|Hips)' > anim/p46/bones.txt
node mv.mjs frame 102.5 107.6 108.5 150.4 151.3 153.6 147.2 --w 640 --h 360 2>&1 | tail -9 > anim/p46/frames.txt
echo done $(date +%H:%M)
