#!/bin/bash
# bash person_stress.sh <blend in gen/person_work> <out dir> <tag> [poses]: the stress poses as contact sheets, s_<pose>.png in out dir
W=/c/Projects/TKShock/Director/gen/person_work; cd "$W"
timeout 280 "/c/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P ../../tools/person_poses.py -- "$(cygpath -w "$W")" "$1" "$(cygpath -w "$2")" "${4:-all}" "$3" 2>&1 | grep -E "POKE|Traceback|Error:" | cut -c1-260
cd "$2"; for p in rest bend crawl arch headdown twist reach; do [ -f "$3_${p}_0.png" ] && /c/ffmpeg/bin/ffmpeg -v error -y -i "$3_${p}_0.png" -i "$3_${p}_1.png" -i "$3_${p}_2.png" -i "$3_${p}_3.png" -i "$3_${p}_4.png" -i "$3_${p}_5.png" -i "$3_${p}_6.png" -i "$3_${p}_7.png" -filter_complex "xstack=inputs=8:grid=4x2" "s_$3_$p.png"; done
