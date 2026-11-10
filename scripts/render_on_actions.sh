#!/usr/bin/env bash
# Render a recording on GitHub Actions in parallel slices (.github/workflows/render-slices.yml, docs/worker.md):
# ~10 min for a 45 s Short instead of ~25 here, and the container's hourly restart can't kill it.
#
#   RECORD_ONLY=1 STUNT=<name> ./run.sh                record only (no local render)
#   scripts/render_on_actions.sh <name> [stunt]       queue work/<name>.rec.json
#   scripts/render_on_actions.sh --fetch <name>       get out/<name>.mp4 back if the run is done (exit 3: not yet)
#   scripts/render_on_actions.sh --wait <name>        ...polling every minute, up to WAIT_MIN (default 60) minutes
#
# Queueing commits, on top of your HEAD in a throwaway worktree: your working copies of stunts/, lib/ and stories/
# (uncommitted edits included, so the edit uses the stunt exactly as recorded), the gzipped recording at
# renders/slices/<name>.rec.json.gz and the job at renders/slices.json, then force-pushes it to render/<name>
# (RENDER_BRANCH to change it). That push starts the workflow. Commit other uncommitted changes (edit.py, render.js...)
# first: only those three folders are carried over. The finished Short comes back on the same branch
# (renders/out/<name>.mp4 + renders/result.json), so fetching needs only git; it's also the run's "short" artifact.
# Env: SLICES (12), FPS (60), RENDER_BRANCH (render/<name>), REMOTE (origin).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE=${REMOTE:-origin}

fetch () {
  local name=$1 branch=${RENDER_BRANCH:-render/$1}
  git fetch -q "$REMOTE" "$branch" || { echo "no branch $branch on $REMOTE"; return 2; }
  local res
  if ! res=$(git show FETCH_HEAD:renders/result.json 2>/dev/null); then echo "$branch: still rendering"; return 3; fi
  local status run
  status=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['status'])" "$res")
  run=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('run',''))" "$res")
  if [ "$status" != done ]; then echo "$branch: $status ($run)"; return 1; fi
  mkdir -p out
  git show "FETCH_HEAD:renders/out/$name.mp4" > "out/$name.mp4"
  echo "out/$name.mp4 ($(du -h "out/$name.mp4" | cut -f1)) from $run"
}

case "${1:-}" in
  --fetch) fetch "${2:?usage: $0 --fetch <name>}"; exit $? ;;
  --wait)
    NAME=${2:?usage: $0 --wait <name>}
    for i in $(seq 1 "${WAIT_MIN:-60}"); do
      rc=0; fetch "$NAME" || rc=$?
      [ "$rc" = 3 ] || exit "$rc"
      sleep 60
    done
    echo "gave up after ${WAIT_MIN:-60} min"; exit 3 ;;
  ''|-h|--help) sed -n '2,17p' "$0"; exit 0 ;;
esac

NAME=$1
STUNT=${2:-${STUNT:-$NAME}}
REC=work/$NAME.rec.json
BRANCH=${RENDER_BRANCH:-render/$NAME}
[ -f "$REC" ] || { echo "no $REC: record it first"; exit 1; }
[ -f "stunts/$STUNT.js" ] || { echo "no stunts/$STUNT.js"; exit 1; }
node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).poses.length || process.exit(1)" "$REC" || { echo "$REC has no poses"; exit 1; }

WT=$(mktemp -d "${TMPDIR:-/tmp}/hb-render-XXXXXX")
cleanup () { git worktree remove --force "$WT" 2>/dev/null || rm -rf "$WT"; }
trap cleanup EXIT
git worktree add -q --detach "$WT" HEAD
# the working copies (uncommitted edits too) of what the render and the edit read; the workflow itself, so a HEAD
# from before it existed still runs it
for d in stunts lib stories; do [ -d "$d" ] && cp -a "$d/." "$WT/$d/"; done
mkdir -p "$WT/.github/workflows" "$WT/.github/actions" "$WT/scripts"
cp .github/workflows/render-slices.yml "$WT/.github/workflows/"
cp -a .github/actions/render-setup "$WT/.github/actions/"
cp scripts/render_slices.py scripts/finish_render.sh "$WT/scripts/"
rm -rf "$WT/renders/slices" "$WT/renders/out" "$WT/renders/result.json"
mkdir -p "$WT/renders/slices"
gzip -9 -c "$REC" > "$WT/renders/slices/$NAME.rec.json.gz"
SRC=$(git rev-parse --short HEAD)
python3 - "$WT/renders/slices.json" "$NAME" "$STUNT" "${SLICES:-12}" "${FPS:-60}" "$SRC" <<'EOF'
import json, sys, time
p, name, stunt, slices, fps, src = sys.argv[1:]
json.dump({"name": name, "stunt": stunt, "slices": int(slices), "fps": int(fps), "source": src,
           "queued": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, open(p, "w"), indent=1)
EOF
(
  cd "$WT"
  git add -A stunts lib stories .github scripts
  git add -f renders/slices.json "renders/slices/$NAME.rec.json.gz"
  git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo hellobuh)}" -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo hellobuh@users.noreply.github.com)}" \
    commit -qm "render-slices: $NAME ($STUNT) from $SRC"
  git push -qf "$REMOTE" "HEAD:refs/heads/$BRANCH"
)
echo "queued $NAME on $BRANCH ($(du -h "$WT/renders/slices/$NAME.rec.json.gz" | cut -f1) recording). Actions renders it in ${SLICES:-12} slices;"
echo "get it with: scripts/render_on_actions.sh --wait $NAME"
