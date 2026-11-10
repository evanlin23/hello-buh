#!/usr/bin/env bash
# Location scout for movie scenes (stunts/scout.js): which `near: [x, z]` gives a biome that looks right.
#   SCOUT_BIOMES=minecraft:plains,minecraft:forest ./scripts/scout.sh
# Prints one line per (start, biome), greenest and least snowy first. Needs the server free (one per container).
set -uo pipefail
cd "$(dirname "$0")/.."
STUNT=scout TRIES=1 BOT_TIMEOUT=1800 ./scripts/record.sh > work/scout.log 2>&1
grep -o 'SCOUT {.*}' work/scout.log | sed 's/^SCOUT //' | python3 -c "
import json, sys
rows = [json.loads(l) for l in sys.stdin if l.strip()]
ok = [r for r in rows if r.get('found')]
ok.sort(key=lambda r: (r['cold'] > 5, r.get('flat', 99) > 6, -(r['green'] - r['water'] / 2)))
for r in ok: print(f\"near: [{r['near'][0]}, {r['near'][1]}]  {r['biome']:<24} at {r['found']}  flat {r.get('flat')}  green {r['green']}%  cold {r['cold']}%  water {r['water']}%  y {r['y']}  ({', '.join(r['top'])})\")
for r in rows:
    if not r.get('found'): print('not found:', r)
"
