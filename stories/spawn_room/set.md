# spawn_room: set brief

The set has to sell two images at phone size: a cottage on a hill in a ring of **floating trees**, and a bedroom that
can hold twelve people. Both are built big on real terrain (owner, 2026-11-10: "the sets are all so small").

## Site
- A real hill above a river valley with a village in it (`scripts/scout.sh` on the movie branch, or a generated plains
  village with a hill beside it). Oak and birch forest on the hill. Mountains on the far side of the valley for depth.
- `/setworldspawn` on the bedside block (see the bible). Set the spawn-radius gamerule to 0 (its name changed in
  1.21.9+: check `/gamerule` on 1.21.11) so every join and respawn lands on that one block, as the story says.
- **The far ridge** (S11): a different-looking place 1,000+ blocks away (stony peaks, a river canyon) so "three days"
  reads as somewhere else. One shot only: scout it, don't build it.

## The cottage (on the hilltop)
- Two rooms and a hall, cobble base, spruce frame, a steep dark-oak roof, a chimney (campfire smoke). Front door faces
  east down the hill path.
- **Bedroom** 9 x 9 inside, 4 high, so twelve players fit (players push each other: they'll spread over the floor):
  red bed on the north wall, head west; the bare-plank bedside block south of it (the spawn); carpet runner from the
  bedroom door stopping one short of it; chest, lantern on the west wall, a big window (2 x 3 glass panes) in the east
  wall looking at the floating trees; a few personal things (an item frame with a map on the wall, a
  flower pot on the windowsill: check both render; paintings don't).
- **Kitchen** 7 x 9: table, two chairs, a cartography table, shelves (bookshelves, barrels), a lantern, a window.

## Floating trees (the key picture)
- 40+ oaks and birches within 25 blocks of the cottage, every one missing its bottom 1-3 logs (canopy and upper trunk
  hanging over grass), at varied heights. No logs on the ground (players pick them up) and no leaf decay (the leaves
  are still attached to logs, so vanilla keeps them).
- Beyond 25 blocks the forest is whole, so the ring reads as "near our house".
- Keep 13 whole oaks in the ring for S03 (1) and S15 (12) to be punched on camera.

## The village (valley floor, 70-100 blocks from the cottage)
- 10-12 buildings, a market street, fields, a river with a bridge. **Grandpa's stall**: an open-front cartographer's
  stall facing the street: counter, a cartography table, the back wall with 8 item frames (2 rows of 4) each holding a
  compass. The stall faces the street so that from the camera (S08) the hill and the cottage are visible up the slope
  past the stall's corner, in the direction the needles point.

## The strangers
- Players with the vanilla default skins. Names chosen so the join lines read well and don't hint: Noor, Zuri, Efe,
  Sunny, Ari, Makena, plus six ordinary-sounding names (Theo, Mila, Jonas, Priya, Leo, Ana) wearing Steve, Alex and Kai
  skins. Never use a real person's name or a known creator's name.
- 1-2 strangers in each montage shot; 12 in S14-S15.

## Effects and engine status
| need | status |
|---|---|
| other players (the strangers) on screen | the renderer draws `player` entities (Steve). **Engine ask:** each player's default skin from its UUID (vanilla `DefaultPlayerSkin.get(uuid)`: 9 skins, wide/slim), or a per-name skin map. Without it all strangers are Steve, which still works but loses "a different stranger each time" |
| staging 12 joins | **Build ask:** 12 extra mineflayer clients that connect one after another (real joins: real "joined the game" lines and a real spawn on the block), then walk out and dig logs (`bot.dig`). Alternative: 1.21.9+ `mannequin` entities posed as players (renderer: map `mannequin` to the player model) plus the chat lines from `edit.py --chat` |
| the chat lines | `edit.py --chat` draws vanilla chat input; the join lines are system messages in yellow (#FFFF55): check it can draw a system line, or extend it |
| compass needle in hand and in item frames | **Engine ask:** the item model is `range_dispatch` on the `compass` property (32 textures); the renderer must pick the texture from the angle between the holder (or frame) and the world spawn. Without it every needle shows the same frame and the clue is lost (S08, S11-S13 depend on it) |
| floating trees, logs breaking | blocks and dig cracks render (`K.dig` for vanilla dig speed by hand) |
| a cake | renders (block) |
| zombie outside the window | renders |
| campfire smoke, lanterns | render |

## Staging notes
- The appearing is vanilla: a joining player just *is* there (no effect). Cut on the join tick, not before.
- S05's zombie is the visible cause of Kai's first-night death: the death itself is off screen (implied by the
  respawn and the empty hands); the zombie must be in frame through the window.
- Strangers never speak or type, except the join messages, which the game prints.
- Music: a quiet NCS bed (-31 LUFS) under the voice; out under S14 so the joins play in room tone.
