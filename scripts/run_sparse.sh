#!/usr/bin/env bash
# run.sh for time-lapse Shorts (edit.speed spans): the same fetch -> server -> bot -> audio -> edit,
# but it renders only the frames the edit keeps (scripts/render_needed.py), so a 3x span costs a third.
#   STUNT=lapse_castle ./scripts/run_sparse.sh
set -euo pipefail
cd "$(dirname "$0")/.."
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
ok=0
for t in $(seq 1 "$TRIES"); do
  echo "attempt $t"
  if STUNT=$STUNT RECORD=$REC timeout 180 node bot.js; then ok=1; break; fi
done
[ "$ok" = 1 ] || { echo "stunt failed $TRIES times"; exit 1; }
stop_server; trap - EXIT

# --- render, audio, edit ---

python3 scripts/render_needed.py "$STUNT" "$REC" "work/$NAME.frames" "$FPS"
python3 audio.py "$REC" "work/$NAME.wav"
mapfile -t EDIT_ARGS < <(node scripts/edit_args.js "$STUNT")   # caption, song, drop, countdown... from stunts/<name>.js
python3 edit.py --frames "work/$NAME.frames/f%05d.png" --fps "$FPS" --out_fps "$FPS" \
  --timeline "$REC" --audio "work/$NAME.wav" "${EDIT_ARGS[@]}" --out "out/$NAME.mp4"
