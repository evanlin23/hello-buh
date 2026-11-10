#!/usr/bin/env bash
# One command, no human: fetch -> local server -> bot does the stunt (retries until it lands)
# -> offline 60 fps render -> audio -> edit. Output: out/<name>.mp4
#   ./run.sh                       # water bucket clutch, default caption
#   STUNT=pearl_clutch ./run.sh          (any stunts/<name>.js; caption/song/drop come from its `edit`)
#   CAPTION="..." SONG=songs/x.mp3 ./run.sh   (overrides)
#   RECORD_ONLY=1 STUNT=x ./run.sh       (just work/x.rec.json: render it on Actions with scripts/render_on_actions.sh x)
set -euo pipefail
cd "$(dirname "$0")"
STUNT=${STUNT:-water_clutch}
NAME=${NAME:-$STUNT}
FPS=${FPS:-60}
TRIES=${TRIES:-5}
mkdir -p work out

[ -d node_modules ] || npm ci --no-audit --no-fund
python3 scripts/fetch.py
VER=$(grep '^MC_VERSION=' versions.env | cut -d= -f2)
# renderer assets straight from this version's client jar (cached)
# (rebuilt whenever the asset scripts change, so new extractions - particles, animations - land)
if [ ! -f "work/assets/$VER/resolved.json" ] || [ renderer/build_assets.py -nt "work/assets/$VER/resolved.json" ] || [ renderer/prepare.js -nt "work/assets/$VER/resolved.json" ]; then
  python3 renderer/build_assets.py "$VER" && node renderer/prepare.js "$VER"
fi

# --- private local server (offline mode, 127.0.0.1 only; the bot is the only player) ---
# One server per box: every worktree's server listens on 127.0.0.1:25565, and worktrees often share work/server
# through a symlink. Two runs at once raced (2026-11-10): both deleted the world and the console FIFO, the second
# matched the first's 'Done (' and its bot connected to nothing, and an orphaned server kept the port. So: a box-wide
# lock held from here until this run's server has stopped (a run waits for it, SERVER_LOCK_WAIT seconds, default 1 h).
LOCK=/tmp/hellobuh-mc-25565.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "another run has the Minecraft server ($LOCK); waiting for it..."
  flock -w "${SERVER_LOCK_WAIT:-3600}" 9 || { echo "gave up waiting for the server lock"; exit 1; }
fi
S=work/server
cp server.properties "$S/server.properties"
echo "eula=true" > "$S/eula.txt"   # Minecraft EULA (https://aka.ms/MinecraftEULA), accepted for this private server
python3 make_ops.py HelloBuh,Milo "$S/ops.json"   # Milo: a stunt's botName (lib/harness.js)
rm -rf "$S/world"                 # fresh world every run
rm -f "$S/console" && mkfifo "$S/console"
# this run's own log (absolute path: in a worktree whose work/server is a symlink to the main checkout's, ../server.log
# landed in the main checkout's work/), with work/server.log pointing at it for the tools that read that name
SLOG=$PWD/work/server.$$.log; rm -f "$SLOG"
find work -maxdepth 1 -name 'server.*.log' -mmin +240 -delete 2>/dev/null || true
ln -sfn "server.$$.log" work/server.log
( cd "$S" && tail -f console | java -Xmx2G -jar server.jar nogui > "$SLOG" 2>&1 ) &
SERVER_PID=$!
# stop: 'stop' on the console (timeout: writing to the FIFO blocks forever if the server already exited), wait for
# this run's java to exit, then end this run's own `tail` only (a box-wide pkill ended other runs' consoles), and
# release the lock
stop_server() {
  timeout 5 sh -c "echo stop > '$S/console'" 2>/dev/null || true
  for _ in $(seq 1 30); do pgrep -P "$SERVER_PID" -f server.jar >/dev/null || break; sleep 1; done
  pkill -P "$SERVER_PID" -f server.jar 2>/dev/null || true
  pkill -P "$SERVER_PID" -f "tail -f console" 2>/dev/null || true
  flock -u 9 2>/dev/null || true
}
trap stop_server EXIT
for i in $(seq 1 90); do grep -q 'Done (' "$SLOG" 2>/dev/null && break; sleep 2; done
grep -q 'Done (' "$SLOG" || { echo "server did not start"; tail -20 "$SLOG"; exit 1; }

# --- the stunt, retried until it lands ---
REC=work/$NAME.rec.json
# a long multi-set stunt (stunt.botTimeout, seconds) can need more than the default 3 minutes per try
BOT_TIMEOUT=${BOT_TIMEOUT:-$(node -e "process.stdout.write(String(require('./stunts/'+process.argv[1]).botTimeout||180))" "$STUNT")}
ok=0
for t in $(seq 1 "$TRIES"); do
  echo "attempt $t"
  # a success has to have written a NEW recording: a silent exit 0 once re-rendered yesterday's (worker 3)
  STAMP=$(mktemp); sleep 1
  if STUNT=$STUNT RECORD=$REC timeout "$BOT_TIMEOUT" node bot.js && [ "$REC" -nt "$STAMP" ]; then ok=1; rm -f "$STAMP"; break; fi
  rm -f "$STAMP"
done
[ "$ok" = 1 ] || { echo "stunt failed $TRIES times"; exit 1; }
stop_server; trap - EXIT
# --- the recording check, before the slow render (scripts/rec_check.py: cut glitches, held shots, the ending,
# camera turns, the set, vanilla speeds). Blockers mean re-record; REC_CHECK_STRICT=1 stops here on one.
rc=0; python3 scripts/rec_check.py "$STUNT" "$REC" || rc=$?
if [ "$rc" = 1 ]; then
  if [ "${REC_CHECK_STRICT:-0}" = 1 ]; then echo "rec_check: blockers, not rendering (REC_CHECK_STRICT=1). Fix the stunt and re-record."; exit 1; fi
  echo "rec_check: blockers above. Fix them by re-recording (REC_CHECK_STRICT=1 stops here)."
elif [ "$rc" != 0 ]; then
  # exit 2: a check couldn't run (no node_modules, a stunt that won't load...): the report says which
  if [ "${REC_CHECK_STRICT:-0}" = 1 ]; then echo "rec_check: a check did not run (exit $rc), not rendering (REC_CHECK_STRICT=1)."; exit 1; fi
  echo "rec_check could not run every check (exit $rc); rendering anyway"
fi
# RECORD_ONLY=1: stop at the recording, after its check (render it on Actions: scripts/render_on_actions.sh,
# docs/worker.md). Before, RECORD_ONLY exited ahead of rec_check, so the Actions route never printed the report.
[ "${RECORD_ONLY:-0}" = 1 ] && { echo "recorded $REC"; exit 0; }

# --- render, audio, edit ---
rm -rf "work/$NAME.frames"
node render.js "$REC" "work/$NAME.frames" "$FPS" 1080 1011
python3 audio.py "$REC" "work/$NAME.wav"
# instant replay (edit.replay): a second, third-person pass over the payoff window (scripts/render_replay.py)
# (and real in-between frames for edit.slowmo spans)
if node -e "const e=require('./stunts/'+process.argv[1]).edit||{};process.exit(e.replay||e.slowmo?0:1)" "$STUNT"; then python3 scripts/render_replay.py "$NAME" "$STUNT"; fi
mapfile -t EDIT_ARGS < <(node scripts/edit_args.js "$STUNT")   # caption, song, drop, countdown... from stunts/<name>.js
python3 edit.py --frames "work/$NAME.frames/f%05d.png" --fps "$FPS" --out_fps "$FPS" \
  --timeline "$REC" --audio "work/$NAME.wav" "${EDIT_ARGS[@]}" --out "out/$NAME.mp4"
