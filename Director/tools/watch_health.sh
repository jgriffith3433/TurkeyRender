#!/bin/bash
# Quiet health watch: wakes after 25 minutes, or sooner if Unity's heartbeat stops for over 6 minutes, Unity disappears, or memory runs out.
cd /c/Projects/TKShock
end=$(( $(date +%s) + 1500 )); low=0; why=""
while [ "$(date +%s)" -lt "$end" ]; do
  sleep 45
  h=$(powershell -NoProfile -Command "\$o=Get-CimInstance Win32_OperatingSystem; \$p=Get-Process Unity -ErrorAction SilentlyContinue | Where-Object MainWindowTitle -like 'TKShock*'; [string][int](\$o.FreePhysicalMemory/1024) + ' ' + [string](\$p -ne \$null)")
  mem=${h%% *}; up=${h##* }
  age=$(( $(date +%s) - $(stat -c %Y Director/heartbeat.json) ))
  if [ "$mem" -lt 400 ] 2>/dev/null; then low=$((low+1)); else low=0; fi
  [ "$low" -ge 4 ] && { why="low memory: $h"; break; }
  [ "$up" != "True" ] && { why="Unity is gone"; break; }
  [ "$age" -gt 360 ] && { why="heartbeat stale ${age}s"; break; }
done
echo "${why:-ok}"; date +%H:%M; echo "health: $h, heartbeat age ${age}s"; echo "unity lock: $(cat Director/gen/unity.lock 2>/dev/null)"; echo "inbox: $(ls Director/inbox | wc -l)"
ls -t Director/acts Director/output/parts 2>/dev/null | head -6 | tr '\n' ' '; echo
cat Director/compile-errors.txt 2>/dev/null | head -2 | cut -c1-140
