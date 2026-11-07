#!/usr/bin/env bash
# Finish a run.sh that a container restart killed after the recording was saved: render only the
# frames still missing (RESUME=1 keeps the ones on disk), then audio, the replay/slow-mo pass and
# the edit, as run.sh does. No server, no re-record.
#   scripts/resume.sh <name> [stunt]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; STUNT=${2:-$NAME}; FPS=${FPS:-60}
REC=work/$NAME.rec.json
[ -f "$REC" ] || { echo "no $REC: re-run STUNT=$STUNT ./run.sh"; exit 1; }
RESUME=1 python3 scripts/render_needed.py "$STUNT" "$REC" "work/$NAME.frames" "$FPS"
python3 audio.py "$REC" "work/$NAME.wav"
if node -e "const e=require('./stunts/'+process.argv[1]).edit||{};process.exit(e.replay||e.slowmo?0:1)" "$STUNT"; then python3 scripts/render_replay.py "$NAME" "$STUNT"; fi
STUNT=$STUNT bash scripts/reedit.sh "$NAME" "out/$NAME.mp4"
