#!/bin/bash
cd /c/Projects/TKShock/Director
step(){ n=$1; a=$2; b=$3; c=$4; ts=$(node -e "const r=[];for(let i=0;i<$c;i++)r.push(($a+($b-$a)*i/($c-1)).toFixed(3));console.log(r.join(' '))"); node mv.mjs frame $ts --w 426 --h 240 2>&1 | grep -o 'f_[0-9.]*png' > anim/p46/$n.txt; mkdir -p anim/p46/$n; for f in $(cat anim/p46/$n.txt); do cp captures/$f anim/p46/$n/; done; }
s=$(date +%s)
step bite 101.9 102.9 12
step bonk 107.05 108.5 12
step fing 153.1 154.9 12
echo "stepped $(( $(date +%s)-s ))s"
