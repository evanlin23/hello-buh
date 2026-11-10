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
# renders/slices/<name>.rec.json.gz and the job at renders/slices.json, then force-pushes it to its OWN render branch:
# render/<name>, or, if this session may only push its own prefix (claude/...), <prefix>/render-<name>. Your working
# branch is never pushed or written: the run commits the Short back to the render branch, and pushing to your branch
# while it renders can't break anything. RENDER_BRANCH still picks a branch, but never your current branch (it becomes
# <branch>-render-<name>). The branch used is kept in work/<name>.render_branch for --fetch/--wait, which also look at
# render/<name> and <prefix>/render-<name>. Commit other uncommitted changes (edit.py, render.js...) first: only those
# three folders are carried over. The finished Short comes back on the render branch (renders/out/<name>.mp4 +
# renders/result.json), so fetching needs only git; it's also the run's "short" artifact.
# Env: SLICES (16, at most 32; cut to equal estimated render time), FPS (60), RENDER_BRANCH, REMOTE (origin),
# PICTURE_KEY / REUSE_RUN (set by `hb render --reuse`: re-run only the edit on a finished run's frames).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE=${REMOTE:-origin}

# the render branches to look in, most likely first: RENDER_BRANCH, the one the queue used, render/<name>, <prefix>/render-<name>
candidates () {
  local name=$1 cur prefix
  cur=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true); prefix=${cur%%/*}
  { [ -n "${RENDER_BRANCH:-}" ] && echo "$RENDER_BRANCH"
    [ -f "work/$name.render_branch" ] && cat "work/$name.render_branch"
    echo "render/$name"
    [ -n "$prefix" ] && [ "$prefix" != "$cur" ] && echo "$prefix/render-$name"; } | awk 'NF && !seen[$0]++'
}
fetch () {
  local name=$1 branch="" b
  for b in $(candidates "$name"); do
    if git ls-remote --exit-code --heads "$REMOTE" "$b" >/dev/null 2>&1; then branch=$b; break; fi
  done
  [ -n "$branch" ] || { echo "no render branch for $name on $REMOTE (looked for: $(candidates "$name" | tr '\n' ' '))"; return 2; }
  git fetch -q "$REMOTE" "$branch" || { echo "could not fetch $branch from $REMOTE"; return 2; }
  local res
  if ! res=$(git show FETCH_HEAD:renders/result.json 2>/dev/null); then echo "$branch: still rendering"; return 3; fi
  # the result must be THIS job's: a working branch (or HEAD) that carried an older renders/result.json handed it to
  # every later queue, and --wait took the old Short as new. The run copies slices.json's "queued" stamp into its
  # result; the queue commit (the last one touching renders/slices.json) must be the one this box queued, if it did
  local job qc want
  job=$(git show FETCH_HEAD:renders/slices.json 2>/dev/null || echo '{}')
  if ! python3 -c "import json,sys;r,j=json.loads(sys.argv[1]),json.loads(sys.argv[2]);sys.exit(0 if r.get('queued') and r.get('queued')==j.get('queued') else 1)" "$res" "$job"; then
    echo "$branch: stale result (renders/result.json is from an older job than renders/slices.json: an inherited file): still rendering"; return 3
  fi
  qc=$(git log -1 --format=%H FETCH_HEAD -- renders/slices.json)
  want=$(cat "work/$name.render_queued" 2>/dev/null || true)
  if [ -n "$want" ] && [ "$want" != "$qc" ] && git cat-file -e "$want" 2>/dev/null && ! git merge-base --is-ancestor "$want" FETCH_HEAD 2>/dev/null; then
    echo "$branch: a result from another queue (job $qc, this box queued $want): still rendering"; return 3
  fi
  local status run
  status=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['status'])" "$res")
  run=$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('run',''))" "$res")
  if [ "$status" != done ]; then echo "$branch: $status ($run)"; return 1; fi
  mkdir -p out
  git show "FETCH_HEAD:renders/out/$name.mp4" > "out/$name.mp4"
  # which code made it, for publish.js: the commit the run rendered (the last one that queued renders/slices.json),
  # with the stunt/lib/stories as recorded; it stays reachable on $branch
  local rc
  rc=$(git log -1 --format=%H FETCH_HEAD -- renders/slices.json)
  python3 - "out/$name.render.json" "$rc" "$branch" "$run" "out/$name.mp4" <<'EOF'
import hashlib, json, sys
p, commit, branch, run, mp4 = sys.argv[1:]
json.dump({"commit": commit, "branch": branch, "run": run, "sha256": hashlib.sha256(open(mp4, "rb").read()).hexdigest()}, open(p, "w"), indent=1)
EOF
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
CUR=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)
BRANCH=${RENDER_BRANCH:-render/$NAME}
# never the working branch: the run commits the finished Short back to the branch it was queued on
if [ "$BRANCH" = "$CUR" ]; then BRANCH="$CUR-render-$NAME"; echo "RENDER_BRANCH is your working branch: using $BRANCH instead (Actions would write to it)"; fi
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
cp scripts/render_slices.py scripts/render_cost.py scripts/finish_render.sh "$WT/scripts/"
rm -rf "$WT/renders/slices" "$WT/renders/out" "$WT/renders/result.json"
mkdir -p "$WT/renders/slices"
gzip -9 -c "$REC" > "$WT/renders/slices/$NAME.rec.json.gz"
SRC=$(git rev-parse --short HEAD)
# PICTURE_KEY (hb render): what decides the frames; REUSE_RUN: a finished run with the same key whose frames (seg-*
# artifacts) the workflow reuses, re-running only the edit (render_slices.py plan checks they still exist)
python3 - "$WT/renders/slices.json" "$NAME" "$STUNT" "${SLICES:-16}" "${FPS:-60}" "$SRC" "${PICTURE_KEY:-}" "${REUSE_RUN:-}" <<'EOF'
import json, sys, time
p, name, stunt, slices, fps, src, key, reuse = sys.argv[1:]
j = {"name": name, "stunt": stunt, "slices": int(slices), "fps": int(fps), "source": src,
     "queued": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
if key:
    j["picture_key"] = key
if reuse:
    j["reuse_run"] = reuse
json.dump(j, open(p, "w"), indent=1)
EOF
(
  cd "$WT"
  git add -A stunts lib stories .github scripts
  # drop a result/Short inherited from HEAD (a branch that once rendered): --fetch would take it as this job's
  git rm -rq --cached --ignore-unmatch renders/result.json renders/out >/dev/null
  git add -f renders/slices.json "renders/slices/$NAME.rec.json.gz"
  git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo hellobuh)}" -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo hellobuh@users.noreply.github.com)}" \
    commit -qm "render-slices: $NAME ($STUNT) from $SRC"
  if ! git push -qf "$REMOTE" "HEAD:refs/heads/$BRANCH" 2>"$WT.push.err"; then
    # a session that may only push its own prefix (claude/...): the same render branch under that prefix
    prefix=${CUR%%/*}
    if [ -z "${RENDER_BRANCH:-}" ] && [ -n "$prefix" ] && [ "$prefix" != "$CUR" ] && git push -qf "$REMOTE" "HEAD:refs/heads/$prefix/render-$NAME"; then
      echo "render/$NAME was refused ($(head -c 200 "$WT.push.err" | tr '\n' ' ')): queued on $prefix/render-$NAME"
      echo "$prefix/render-$NAME" > "$WT.branch"
    else cat "$WT.push.err" >&2; rm -f "$WT.push.err"; exit 1; fi
  fi
  rm -f "$WT.push.err"
  git rev-parse HEAD > "$WT.queued"
)
[ -f "$WT.branch" ] && { BRANCH=$(cat "$WT.branch"); rm -f "$WT.branch"; }
mkdir -p work && echo "$BRANCH" > "work/$NAME.render_branch"
[ -f "$WT.queued" ] && { mv "$WT.queued" "work/$NAME.render_queued"; }
echo "queued $NAME on $BRANCH ($(du -h "$WT/renders/slices/$NAME.rec.json.gz" | cut -f1) recording). Actions renders it in ${SLICES:-16} slices;"
echo "get it with: scripts/render_on_actions.sh --wait $NAME"
