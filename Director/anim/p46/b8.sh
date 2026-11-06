#!/bin/bash
cd /c/Projects/TKShock/Director
step(){ n=$1; a=$2; b=$3; c=$4; ts=$(node -e "const r=[];for(let i=0;i<$c;i++)r.push(($a+($b-$a)*i/($c-1)).toFixed(3));console.log(r.join(' '))"); rm -rf anim/p46/$n; mkdir -p anim/p46/$n; node mv.mjs frame $ts --w 426 --h 240 2>&1 | grep -o 'f_[0-9.]*png' > anim/p46/$n.txt; for f in $(cat anim/p46/$n.txt); do cp captures/$f anim/p46/$n/; done; }
s=$(date +%s)
timeout 100 node mv.mjs build --fast 2>&1 | tail -2 | cut -c1-120
step hang 149.42 152.42 16
step fing 152.6 154.8 12
step ride 103.6 106.2 12
step bonk 107.3 108.5 8
step land 141.6 146.4 12
step over 148.3 149.38 8
echo "all $(( $(date +%s)-s ))s"
