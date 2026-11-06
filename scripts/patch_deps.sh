#!/usr/bin/env bash
# Two local fixes to pinned dependencies (applied on every npm install):
#  1. prismarine-viewer's mesher skips any block face whose neighbour is below y=0 (a pre-1.18
#     assumption), so worlds below y=0 render blank. We also build the set above y=0, but fix it.
#  2. mineflayer 4.26 sends use_item with rotation (0,0): the server turns the bot to look straight
#     ahead and the bucket raycasts horizontally. Newer mineflayer sends the real rotation.
set -euo pipefail
cd "$(dirname "$0")/.."
W=node_modules/prismarine-viewer/public/worker.js
sed -i 's/if(g\.position\.y<0)continue;/if(g.position.y<-64)continue;/; s/if(n\.position\.y<0)continue}/if(n.position.y<-64)continue}/' "$W"
I=node_modules/mineflayer/lib/plugins/inventory.js
sed -i "s|rotation: { x: 0, y: 0 }|rotation: { x: require('../conversions').toNotchianYaw(bot.entity.yaw), y: require('../conversions').toNotchianPitch(bot.entity.pitch) }|" "$I"
grep -q "position.y<-64" "$W" && grep -q "toNotchianYaw(bot.entity.yaw)" "$I" && echo "deps patched"
