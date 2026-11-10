#!/usr/bin/env bash
# One command, no human: fetch -> local server -> bot does the stunt (retries until it lands)
# -> offline 60 fps render -> audio -> edit. Output: out/<name>.mp4
#   ./run.sh                       # water bucket clutch, default caption
#   STUNT=pearl_clutch ./run.sh          (any stunts/<name>.js; caption/song/drop come from its `edit`)
#   CAPTION="..." SONG=songs/x.mp3 ./run.sh   (overrides)
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
S=work/server
cp server.properties "$S/server.properties"
echo "eula=true" > "$S/eula.txt"   # Minecraft EULA (https://aka.ms/MinecraftEULA), accepted for this private server
python3 make_ops.py HelloBuh "$S/ops.json"
rm -rf "$S/world"                 # fresh world every run
rm -f "$S/console" && mkfifo "$S/console"
( cd "$S" && tail -f console | java -Xmx2G -jar server.jar nogui > ../server.log 2>&1 ) &
SERVER_PID=$!
# (timeout: writing to the console FIFO blocks forever if the server already exited)
stop_server() { timeout 5 sh -c "echo stop > '$S/console'" 2>/dev/null || true; sleep 3; pkill -f "tail -f console" 2>/dev/null || true; }
trap stop_server EXIT
for i in $(seq 1 90); do grep -q 'Done (' work/server.log 2>/dev/null && break; sleep 2; done
grep -q 'Done (' work/server.log || { echo "server did not start"; tail -20 work/server.log; exit 1; }

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
  echo "rec_check: blockers above. Rendering anyway (REC_CHECK_STRICT=1 stops here); fix them by re-recording."
elif [ "$rc" != 0 ]; then echo "rec_check could not run (exit $rc); rendering anyway"; fi

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
