#!/usr/bin/env bash
# Two renders of the same frames side by side, each labelled: side_by_side.sh left.mp4 "left label" right.mp4 "right label" out.mp4
# Keeps 30 fps and the left file's sound.
set -e
F="C\\:/Windows/Fonts/arial.ttf"
ffmpeg -y -loglevel error -i "$1" -i "$3" -filter_complex \
"[0:v]drawtext=fontfile='$F':text='$2':x=24:y=24:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[a];\
[1:v]drawtext=fontfile='$F':text='$4':x=24:y=24:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[b];\
[a][b]hstack=inputs=2[v]" -map "[v]" -map 0:a? -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 -shortest "$5"
echo "$5"
