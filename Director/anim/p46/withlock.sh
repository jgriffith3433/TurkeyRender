#!/bin/bash
# withlock.sh <cmd...>: wait for Director/gen/unity.lock without holding anything, take it, run, drop it.
cd /c/Projects/TKShock/Director
for i in $(seq 1 ${LOCKWAIT:-600}); do
  if ( set -o noclobber; echo "p46 $(date +%H:%M)" > gen/unity.lock ) 2>/dev/null; then
    "$@"; rc=$?
    grep -q '^p46' gen/unity.lock 2>/dev/null && rm -f gen/unity.lock
    exit $rc
  fi
  sleep 1
done
echo "lock busy: $(cat gen/unity.lock)"; exit 9
