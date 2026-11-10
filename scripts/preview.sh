#!/usr/bin/env bash
# Fast staging preview of a Short: the real edit (captions, cards, HUD, speed spans, cuts, hook, replay)
# over a low-res, low-fps render of only the frames it shows, plus contact sheets of the frames that
# matter (every cut, every subs/cards/story-line mark, the hook, the payoff, the last second).
#   scripts/preview.sh <stunt> [rec.json]            -> work/preview_<name>/preview.mp4, sheets/, frames.txt
#   PREVIEW_FPS=15 PREVIEW_W=480 scripts/preview.sh one_in_a_million
#   EDIT_EXTRA='{"subsY":0.15}' scripts/preview.sh <stunt>       (try an edit change without touching the stunt)
# Iterate on previews; render full-res once (run.sh / resume.sh). Details: scripts/preview.py, docs/qa.md.
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/preview.py "$@"
