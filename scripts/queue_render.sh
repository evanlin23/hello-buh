#!/usr/bin/env bash
# Queue an AI-dilemma Short for rendering on GitHub Actions (.github/workflows/render-movie.yml): packs the recording
# (gzipped) and the cut voice clips into renders/<ep>/, writes renders/job.json, commits. Push the branch to start it;
# the finished MP4 is the run's "short" artifact. Record first (./scripts/scene.sh <stunt>).
#   ./scripts/queue_render.sh thin_ice && git push
set -euo pipefail
cd "$(dirname "$0")/.."
EP=${1:?usage: scripts/queue_render.sh <episode>}
ST=$(python3 -c "import json;print(json.load(open('episodes/$EP/episode.json'))['stunt'])")
mkdir -p "renders/$EP/vox"
gzip -9 -c "work/$ST.rec.json" > "renders/$EP/$ST.rec.json.gz"
for f in work/$EP/vox/*.wav; do case "$f" in *_orig.wav) ;; *) cp "$f" "renders/$EP/vox/" ;; esac; done
python3 -c "import json,time;json.dump({'episode':'$EP','queued':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},open('renders/job.json','w'),indent=1)"
git add "renders/$EP" renders/job.json
git commit -qm "render queue: $EP" && echo "queued $EP: push to render on Actions"
