#!/bin/bash
cd /c/Projects/TKShock/Director
for t in 102.5 107.1 107.25 107.6 107.95 109.3; do echo "== $t"; timeout 20 node mv.mjs call bones "{\"t\":$t}" 2>&1 | grep -E 'person\.(Head|RightHand|Hips)'; done
