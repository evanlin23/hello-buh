#!/usr/bin/env bash
# One command for a movie scene (docs/movie_engine.md, "Shots an agent can trust"): record it, lint it (renderer/lint.js:
# the cameras, the framing, the 180-degree line, dead stretches, beats too small to see) and make its shot sheet.
#   ./scripts/scene.sh movie_below                 (KEEP_WORLD=1 / TRIES= pass through to scripts/record.sh)
#   NO_RECORD=1 ./scripts/scene.sh movie_below     (re-check an existing recording after editing only its shots)
# Fix every PROBLEM the lint prints and look at the sheet before the full render (python3 scripts/longform.py render).
set -euo pipefail
cd "$(dirname "$0")/.."
S=${1:?usage: scripts/scene.sh <stunt>}
[ "${NO_RECORD:-0}" = 1 ] || STUNT=$S ./scripts/record.sh
REC=work/$S.rec.json
echo "--- lint"
LINT=1 node render.js "$REC" && lint=0 || lint=$?
echo "--- shot sheet"
python3 scripts/shot_sheet.py "$REC" "work/$S.shots.jpg"
[ "$lint" = 0 ] && echo "lint clean: render it" || echo "lint found problems: fix them first (or say why they're fine)"
