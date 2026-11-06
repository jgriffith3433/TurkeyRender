#!/bin/bash
# Waits until an agent produces something new or heavy.lock goes stale, or 12 minutes pass, then prints the state.
cd /c/Projects/TKShock
state() {
  ls --time-style=+%H:%M -l Director/gen/rigged/Person.fbx Director/gen/turkey/*.fbx Director/gen/turkey/README* Director/gen/props/*.fbx Director/gen/props/README* Director/REVIEW.md Director/output/TKShock-v[5-9]*.mp4 2>/dev/null | grep -v '.video.mp4' | awk '{print $6,$5,$7}'
}
a=$(state); end=$(( $(date +%s) + 720 ))
while [ "$(date +%s)" -lt "$end" ]; do
  sleep 20
  [ "$(state)" != "$a" ] && { echo CHANGED; break; }
done
date +%H:%M
state
echo "lock: $(cat Director/gen/heavy.lock 2>/dev/null)"
for d in person_work turkey props; do echo "$d: $(find Director/gen/$d -type f 2>/dev/null | wc -l) files, newest: $(find Director/gen/$d -type f -printf '%T@ %f\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)"; done
ls -t Director/acts | head -2 | tr '\n' ' '; echo
cat Director/compile-errors.txt 2>/dev/null | head -2 | cut -c1-140
powershell -NoProfile -Command "\$o=Get-CimInstance Win32_OperatingSystem; 'free RAM MB ' + [int](\$o.FreePhysicalMemory/1024); (Get-Process Unity -ErrorAction SilentlyContinue | Where-Object MainWindowTitle -like 'TKShock*' | ForEach-Object { 'Unity responding ' + \$_.Responding })"
