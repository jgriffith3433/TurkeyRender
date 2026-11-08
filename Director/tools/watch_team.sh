#!/bin/bash
# Quiet team watch: wakes after 20 minutes, or sooner if Unity's heartbeat stops for 6 minutes or Unity disappears.
cd /c/Projects/TKShock/Director
end=$(( $(date +%s) + 1200 )); why=""
while [ "$(date +%s)" -lt "$end" ]; do
  sleep 60
  age=$(( $(date +%s) - $(stat -c %Y heartbeat.json) ))
  up=$(powershell -NoProfile -Command "[bool](Get-Process Unity -EA 0 | ? MainWindowTitle -like 'TKShock*')")
  [ "$up" != "True" ] && { why="Unity is gone"; break; }
  [ "$age" -gt 360 ] && { why="heartbeat stale ${age}s"; break; }
done
echo "${why:-ok}"; date +%H:%M; echo "lock: $(cat gen/unity.lock 2>/dev/null)"; ls -t /c/Users/jgrif/AppData/Local/Temp/Unity/Editor/Crashes | head -1
ls -la ../Assets/Scenes/MusicVideo.unity 2>/dev/null | awk '{print "scene MB", int($5/1000000)}'
head -3 compile-errors.txt 2>/dev/null | cut -c1-150
grep -c '^- \[x\]' ROADMAP-SYSTEM.md
