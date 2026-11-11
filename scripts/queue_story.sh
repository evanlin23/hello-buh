#!/usr/bin/env bash
# Queue a cinematic story Short for rendering on GitHub Actions (.github/workflows/render-story.yml): packs the
# recording into renders/<story>/, writes renders/story_job.json, commits. Push to start; when it's done the run commits
# renders/out/<stunt>.mp4 and renders/story_result.json back to the branch (git pull to fetch it).
#   STUNT=story_dog_hill ./scripts/record.sh && ./scripts/queue_story.sh dog_hill && git push
set -euo pipefail
cd "$(dirname "$0")/.."
SD=${1:?usage: scripts/queue_story.sh <story>}
ST=$(python3 -c "import json;print(json.load(open('stories/$SD/story.json'))['stunt'])")
mkdir -p "renders/$SD"
gzip -9 -c "work/$ST.rec.json" > "renders/$SD/$ST.rec.json.gz"
rm -f renders/story_result.json
python3 -c "import json,time;json.dump({'story':'$SD','queued':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},open('renders/story_job.json','w'),indent=1)"
git add -f "renders/$SD" renders/story_job.json
git rm -q --cached --ignore-unmatch renders/story_result.json
git commit -qm "render queue: story $SD" && echo "queued $SD: push to render on Actions"
