#!/bin/bash
cd /c/Projects/TKShock/Director
timeout 100 node mv.mjs build --fast > anim/p46/build10.log 2>&1; grep -c '"shots"' anim/p46/build10.log
node mv.mjs frame 149.2 149.38 --w 426 --h 240 2>&1 | tail -1 >/dev/null; cp captures/f_0149.200.png captures/f_0149.380.png anim/p46/
timeout 75 node mv.mjs motioncheck 91 111 --every 0.2 --on person --checks joint --budget 30 2>&1 | tail -4 | cut -c1-200
cp captures/motioncheck-report.md anim/p46/mc1.md 2>/dev/null
