#!/usr/bin/env bash
# Restore the third-party files (Minecraft jars + extracted renderer assets, vanilla sounds, Mixkit sfx, music
# cache) from the PRIVATE repo evanlin23/hello-buh-assets instead of downloading them from Mojang/Mixkit/etc.
# Its paths mirror this repo's, so this is an overlay: files already here are kept (never overwritten).
#
#     scripts/assets_restore.sh [assets-dir]     # default: ../hello-buh-assets (cloned shallow if missing)
#
# A session needs the repo attached (add_repo evanlin23/hello-buh-assets). Without access this prints a note and
# exits 0: the normal fetchers (scripts/fetch.py, fetch_sfx.py, fetch_music.py) still work from the original hosts.
# Never commit these files here: this repo is public (they are gitignored: work/, songs/, sfx/mixkit/*/).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$HERE/../hello-buh-assets}"
if ! git -C "$SRC" rev-parse HEAD >/dev/null 2>&1; then
  git clone -q --depth 1 https://github.com/evanlin23/hello-buh-assets "$SRC" 2>/dev/null \
    || { echo "assets_restore: no access to evanlin23/hello-buh-assets; use scripts/fetch*.py"; exit 0; }
fi
n=0
while IFS= read -r -d '' f; do
  rel="${f#"$SRC"/}"
  dst="$HERE/$rel"
  [ -e "$dst" ] && continue
  mkdir -p "$(dirname "$dst")"
  ln "$f" "$dst" 2>/dev/null || cp "$f" "$dst"   # a hard link costs no disk (same filesystem)
  n=$((n + 1))
done < <(find "$SRC" -path "$SRC/.git" -prune -o -type f ! -name README.md -print0)
echo "assets_restore: $n files restored from $SRC"
