#!/usr/bin/env bash
# One command, no human: fetch -> local server -> bot does the stunt (retries until it lands)
# -> offline 60 fps render -> audio -> edit. Output: out/<name>.mp4
#   ./run.sh                       # water bucket clutch, default caption
#   CAPTION="mlg water 💀" ./run.sh
set -euo pipefail
cd "$(dirname "$0")"
NAME=${NAME:-water_clutch}
CAPTION=${CAPTION:-"water bucket clutch 💀"}
FPS=${FPS:-60}
TRIES=${TRIES:-5}
mkdir -p work out

[ -d node_modules ] || npm ci --no-audit --no-fund
python3 scripts/fetch.py
VER=$(grep '^MC_VERSION=' versions.env | cut -d= -f2)
# renderer assets straight from this version's client jar (cached)
[ -f "work/assets/$VER/resolved.json" ] || { python3 renderer/build_assets.py "$VER" && node renderer/prepare.js "$VER"; }

# --- private local server (offline mode, 127.0.0.1 only; the bot is the only player) ---
S=work/server
cp server.properties "$S/server.properties"
echo "eula=true" > "$S/eula.txt"   # Minecraft EULA (https://aka.ms/MinecraftEULA), accepted for this private server
python3 make_ops.py HelloBuh "$S/ops.json"
rm -rf "$S/world"                 # fresh world every run
rm -f "$S/console" && mkfifo "$S/console"
( cd "$S" && tail -f console | java -Xmx2G -jar server.jar nogui > ../server.log 2>&1 ) &
SERVER_PID=$!
stop_server() { echo stop > "$S/console" 2>/dev/null || true; sleep 3; pkill -f "tail -f console" 2>/dev/null || true; }
trap stop_server EXIT
for i in $(seq 1 90); do grep -q 'Done (' work/server.log 2>/dev/null && break; sleep 2; done
grep -q 'Done (' work/server.log || { echo "server did not start"; tail -20 work/server.log; exit 1; }

# --- the stunt, retried until it lands ---
REC=work/$NAME.rec.json
ok=0
for t in $(seq 1 "$TRIES"); do
  echo "attempt $t"
  if TIMELINE=work/$NAME.timeline.json RECORD=$REC timeout 120 node bot.js; then ok=1; break; fi
done
[ "$ok" = 1 ] || { echo "stunt failed $TRIES times"; exit 1; }
stop_server; trap - EXIT

# --- render, audio, edit ---
rm -rf "work/$NAME.frames"
node render.js "$REC" "work/$NAME.frames" "$FPS" 1080 1011
python3 audio.py "$REC" "work/$NAME.wav"
python3 edit.py --frames "work/$NAME.frames/f%05d.png" --fps "$FPS" --out_fps "$FPS" \
  --caption "$CAPTION" --timeline "$REC" --audio "work/$NAME.wav" --start 1.2 --out "out/$NAME.mp4"
