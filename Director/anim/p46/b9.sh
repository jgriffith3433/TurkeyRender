#!/bin/bash
cd /c/Projects/TKShock/Director
step(){ n=$1; a=$2; b=$3; c=$4; ts=$(node -e "const r=[];for(let i=0;i<$c;i++)r.push(($a+($b-$a)*i/($c-1)).toFixed(3));console.log(r.join(' '))"); rm -rf anim/p46/$n; mkdir -p anim/p46/$n; node mv.mjs frame $ts --w 426 --h 240 2>&1 | grep -o 'f_[0-9.]*png' > anim/p46/$n.txt; for f in $(cat anim/p46/$n.txt); do cp captures/$f anim/p46/$n/; done; }
s=$(date +%s)
timeout 100 node mv.mjs build --fast > anim/p46/build9.log 2>&1; head -6 anim/p46/build9.log | cut -c1-300
step hang 150.2 152.4 8
step fing 153.1 154.9 8
step over 148.7 149.38 4
step wall 98.9 100.2 8
step peck 97.5 98.85 8
echo "all $(( $(date +%s)-s ))s"
