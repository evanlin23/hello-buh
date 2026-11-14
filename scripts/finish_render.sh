#!/usr/bin/env bash
# The steps of run.sh after the picture: audio, the instant replay / real slow-mo frames (edit.replay,
# edit.slowmo), and the edit. Needs work/<name>.rec.json and work/<name>.frames/f%05d.png (all of them).
# Used by .github/workflows/render-slices.yml once the slices are joined; works locally too.
#   scripts/finish_render.sh <name> [stunt]        -> out/<name>.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=${1:?usage: scripts/finish_render.sh <name> [stunt]}
STUNT=${2:-${STUNT:-$NAME}}
FPS=${FPS:-60}
REC=work/$NAME.rec.json
[ -f "$REC" ] || { echo "no $REC"; exit 1; }
mkdir -p out
python3 audio.py "$REC" "work/$NAME.wav"
if node -e "const e=require('./stunts/'+process.argv[1]).edit||{};process.exit(e.replay||e.slowmo?0:1)" "$STUNT"; then python3 scripts/render_replay.py "$NAME" "$STUNT"; fi
mapfile -t EDIT_ARGS < <(node scripts/edit_args.js "$STUNT")
python3 edit.py --frames "work/$NAME.frames/f%05d.png" --fps "$FPS" --out_fps "$FPS" \
  --timeline "$REC" --audio "work/$NAME.wav" "${EDIT_ARGS[@]}" --out "out/$NAME.mp4"
# the live formats only (stunts/live_*.js with a `live` block; a Short has none, so this never runs for one): the
# countdown and counter bands (scripts/live_overlay.py, docs/livestream.md)
if node -e "process.exit(require('./stunts/'+process.argv[1]).live?0:1)" "$STUNT"; then
  python3 scripts/live_overlay.py "$STUNT" --video "out/$NAME.mp4" --rec "$REC"
fi
