#!/usr/bin/env bash
# Re-run only the edit step of run.sh on frames already rendered (work/<name>.frames, .rec.json, .wav):
#   scripts/reedit.sh <name> [out.mp4]
#   EDIT_EXTRA='{"punch":["splash5"],"cards":[["splash5","NO WAY"]]}' scripts/reedit.sh one_in_a_million /tmp/x.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; STUNT=${STUNT:-$NAME}; FPS=${FPS:-60}; OUT=${2:-out/$NAME.mp4}
mapfile -t EDIT_ARGS < <(node scripts/edit_args.js "$STUNT")
python3 edit.py --frames "work/$NAME.frames/f%05d.png" --fps "$FPS" --out_fps "$FPS" \
  --timeline "work/$NAME.rec.json" --audio "work/$NAME.wav" "${EDIT_ARGS[@]}" --out "$OUT"
