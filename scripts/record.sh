#!/usr/bin/env bash
# The first half of run.sh: fetch -> local server -> the bot performs the stunt (retried until it lands)
# -> work/<name>.rec.json. No Shorts render or edit: for movie scenes (docs/movie_engine.md), which are
# rendered at 16:9 by scripts/longform.py. Only one server per container: check `ps` for server.jar first.
#   STUNT=movie_reel ./scripts/record.sh
#   KEEP_WORLD=1 STUNT=movie_below ./scripts/record.sh   (the same world as the last run)
set -euo pipefail
cd "$(dirname "$0")/.."
STUNT=${STUNT:?STUNT=<name>}
NAME=${NAME:-$STUNT}
TRIES=${TRIES:-3}
mkdir -p work

[ -d node_modules ] || npm ci --no-audit --no-fund
python3 scripts/fetch.py
VER=$(grep '^MC_VERSION=' versions.env | cut -d= -f2)
if [ ! -f "work/assets/$VER/resolved.json" ] || [ renderer/build_assets.py -nt "work/assets/$VER/resolved.json" ] || [ renderer/prepare.js -nt "work/assets/$VER/resolved.json" ]; then
  python3 renderer/build_assets.py "$VER" && node renderer/prepare.js "$VER"
fi

S=work/server
cp server.properties "$S/server.properties"
echo "eula=true" > "$S/eula.txt"   # Minecraft EULA (https://aka.ms/MinecraftEULA), accepted for this private server
python3 make_ops.py HelloBuh,Milo,Buh "$S/ops.json"   # Milo/Buh: a stunt's botName (lib/harness.js)
# fresh world every run; KEEP_WORLD=1 keeps it (movie scenes that share one set: build it once, docs/movie_engine.md)
[ "${KEEP_WORLD:-0}" = 1 ] || rm -rf "$S/world"
rm -f "$S/console" && mkfifo "$S/console"
( cd "$S" && tail -f console | java -Xmx2G -jar server.jar nogui > ../server.log 2>&1 ) &
stop_server() { timeout 5 sh -c "echo stop > '$S/console'" 2>/dev/null || true; sleep 3; pkill -f "tail -f console" 2>/dev/null || true; }
trap stop_server EXIT
for i in $(seq 1 90); do grep -q 'Done (' work/server.log 2>/dev/null && break; sleep 2; done
grep -q 'Done (' work/server.log || { echo "server did not start"; tail -20 work/server.log; exit 1; }

REC=work/$NAME.rec.json
BOT_TIMEOUT=${BOT_TIMEOUT:-$(node -e "process.stdout.write(String(require('./stunts/'+process.argv[1]).botTimeout||180))" "$STUNT")}
ok=0
for t in $(seq 1 "$TRIES"); do
  echo "attempt $t"
  STAMP=$(mktemp); sleep 1
  if STUNT=$STUNT RECORD=$REC timeout "$BOT_TIMEOUT" node bot.js && [ "$REC" -nt "$STAMP" ]; then ok=1; rm -f "$STAMP"; break; fi
  rm -f "$STAMP"
done
[ "$ok" = 1 ] || { echo "stunt failed $TRIES times"; exit 1; }
echo "recorded $REC"
