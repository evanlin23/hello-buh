# nine_thousand_torches: set brief (r2)

r2: six thousand torches, a whole-box swap for the flashback, the strip and corner for S12-S13, Jonah in player moves
only, and the chat line `<Jonah> see you tomorrow` (reviews/r1-response.md).

The premise is one picture: a whole village with a torch on every block. It has to read as a real village on real
ground, edge to edge, from the air (S01) and from a kid's knee height (S02-S04), so the set is a generated vanilla
plains village on natural terrain, dressed by script, plus one library piece (Jonah's cottage) for the flashback.

## Site
- **The canonical place** (docs/world/canon.md): Larkfield (`larkfield`, to claim; bible "World"), on the north road
  west of Dog Hill, the meeting point about (-275, 80, -935). Not the seed's nearest plains village: that is Saltmouth,
  Milo's village at 16. A vanilla plains village placed once at Larkfield's canonical spot with `sets.vanilla(ctx,
  'village_plains', { x, z, mobs: 'freeze' })` and recorded in map.json (no scout, no `planSite`, no `/locate`), then
  `world.build(ctx, { story: 'nine_thousand_torches' })`. Read the ground off the survey grid before claiming: we
  want a gentle slope (5-8 blocks of fall across it) so S01's crane sees roofs stepping down and S04 has a rise at the
  north edge; slide the spot along the north road if it's flat, keeping Dog Hill east-south-east on S01's skyline and
  clear of the ruined portal at (-315, -892). Larkfield sits behind the ridge west of Dog Hill: check Dog on the Hill's
  west-facing stills show none of it.
- **Needs from the site:** a forest (dark oak or oak, dense) 20-30 blocks off the north edge (S04, S10); hills on the
  east horizon for the sunrise (S01, S14-S15); 10-14 houses; a meeting point with the bell, well and hay piles; at
  least one farm (its log borders take torches, its farmland doesn't). If the forest is thin, `sets.dress.grove(ctx,
  { kinds: ['dark_oak'], r: 14, n: 12 })` along the north edge.
- **The box:** about 78 x 78 blocks round the meeting point (x -39..38, z -39..38 from the bell; ~6,100 columns). Fit
  it to the real village so the count lands in range (below).

## Library pieces
| piece | variant | facing | where | when |
|---|---|---|---|---|
| `cottage` (Jonah's house) | `palette: 'birch'`, `garden: true`, `seed` fixed | east, toward the street | the west end of the main street, about (-38, 4), its door **14 blocks** west of our door (S08 sees it from our doorstep) | **flashback only** (S05-S08) |

Our house is the **largest vanilla plains house** in the village (check on the placed village that its room is at least 7 x 7
inside; if none is, use the library `cottage` interior or `room` as ours) (vanilla rooms are small: S09 needs a room the POV
can see), on the north side of the main street at about (-24, 6), door facing south, with a bed under a window
looking north-west over the village toward the forest (S10: the kid stands on the bed to see over the sill). The
**door spot** is the grass block one east of its doorstep. Across the street is the house of S12-S13, with a 1-wide
grass strip along its east side (bible: Places). Add a chest against its west wall (`/setblock` with the
Items NBT: diamond_sword, iron_helmet, iron_chestplate, iron_leggings, iron_boots, red_bed, shield, filled_map,
fishing_rod, bread x16, bucket).

## Dressing: the 6,000 torches (`sets.dress.torches`, new, ~1 h)
A new dressing helper in `lib/sets/dress.js` (the 40-commands-a-tick batcher already there):
1. Read the top block of every column in the box (`execute positioned over motion_blocking_no_leaves`, or the
   recorded chunk data). Also walk fence and wall posts and roof ridges (logs, planks, full blocks on the roofline).
2. Place `torch` on top only where vanilla would let it stand: a sturdy top face (full blocks: grass, dirt, stone,
   cobble, planks, logs, hay, top slabs) or a centre post (fences, walls). **Skip** dirt_path, farmland, bottom slabs,
   stairs, leaves, glass, water and crops. Short grass and ferns are replaceable (a player's torch goes straight
   over them), so set the torch in their place; flowers Jonah would have broken first, so clear them to air and torch
   the block. `/setblock` doesn't check survival, so this whitelist is what keeps every torch legal: a torch on a
   stair or path would be un-vanilla (minecraft-audit).
3. **Count and log** every placement. The story says six thousand: the total in the box must be **6,000-6,300**.
   Widen or narrow the box by a row or two to land in range; log the final number in the recording log and in this
   file's build notes.
4. Keep the village's own wall torches and lamp posts as generated.
5. Return the list of placed positions by region, so the patch swaps below can remove and restore them fast.
Leave unlit: the strip and row of S12-S13 and the door spot (placed during the scene). Also the street fence by
Jonah's plot gets a torch on every post (S11 foreground).
Cost: ~6,200 commands at 40 per tick = ~155 ticks (~8 s) in setup. Light: 6,000 emitters; check `renderer/light.js`
handles it in reasonable time on one frame before recording (it propagates block light per chunk: should be fine;
measure on the shot sheet).

## Scene swaps (one recording, the scenes in story order)
The flashback (S05-S08) needs the village with **none** of the story's torches and with Jonah's cottage standing. A, C
and D need every torch and no cottage. One stray story torch in a B frame breaks the premise, and S05 and S08 see
much of the box, so **swap the whole box, not a patch** (continuity fix 3):
- **Setup:** raise the limit (`/gamerule commandModificationBlockLimit 2000000`; the box is ~78 x 78 x 40 = ~243k
  blocks). Build the **B state** (the village as generated plus Jonah's cottage, `sets.place` with the terrain fit, two
  chests of coal and sticks and a crafting table by its door) and `/clone` the box to stash B, far below the world's
  surface or 300+ blocks away in loaded, force-loaded chunks. Then build the **A state** in place: the cottage
  removed, its footprint coarse dirt, every torch placed (`sets.dress.torches`), the strip and the door spot left
  unlit. `/clone` it to stash A.
- **Cut S04 → S05 (`during`):** `/clone` stash B over the box (`replace`, one command, 1-2 ticks). S05's first frame
  lands after it (the cut waits).
- **Cut S08 → S09 (`during`):** `/clone` stash A back over the box. One command, done before S09's first frame, so the
  S10 window view can't race a restore.
- Before recording, check both stashes once with the shot sheet: a B frame with zero story torches, an A frame with
  the full count.
- **The growing row (S12):** the row's strip part is placed except its last 2-3 blocks before S12. During S12, Jonah's
  actor stands just round the house's front corner (out of POV sight but for his arm) and really places torches
  (`placeBlock`) on the next blocks round the corner on 'GROWING' and a beat later, his arm swinging into frame at the
  corner edge each time. Pin Jonah at block (-22, 9) facing east (bible: Places) and test the frame on the shot sheet so
  only his sleeve clears the corner; nudge him a block west if his body shows. The cut S12 → S13 is a ~7 s time skip (bible): before S13's first frame, script the row
  along the house front and across the street (skipping the dirt path) up to **one block short of the door spot**,
  and stand Jonah crouched (sneak) at the doorstep holding exactly one torch (`/item replace entity Jonah
  weapon.mainhand with torch 1`).
- **S13:** the follow camera rounds the corner with the kid; on 'MY door' Jonah is in frame, crouched at the doorstep,
  9 blocks ahead.
- **The last torch (S14):** Jonah, crouched, places his one torch on the door spot on 'LAST' (a real placement: the
  swing and the block are in the recording; his hand is empty after), stands (sneak off), turns to the kid, and on
  'WAVED' swings his arm twice. Player moves only: no kneel or wave pose.
- **S06 (the nightly habit, in B):** Jonah crouches and places a torch on the door spot on 'TORCH', stands, turns to
  the kid; on 'TOMORROW' the bot chats `see you tomorrow` (a real chat message: the harness/overlay shows `<Jonah> see
  you tomorrow`); after the line, his bot quits ("Jonah left the game"). **At the cut into S07, clear the chat overlay (an
  `syschat_clear` mark) and remove the S06 torch from the door spot**, so neither carries over Jonah in S07-S08. Reconnect the Jonah bot before S07 (offline
  auth, same name, same skin) and repeat the join for S07; the join message happens off screen during the S06 → S07
  cut, so hide `joined the game` lines from the overlay. Pick the S06 torch up (remove it) before the B stash is
  re-cloned, or clone over it.

## What fills each establishing shot out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 (EWS dawn crane, looking east) | west roofs' ridge torches and fence posts passing under the lens | the whole box (~78 x 78): thousands of torches, dark path and field lines threading them, the bell and well near centre | the dark forest ring, the east hills against the pale dawn band, Dog Hill's top at frame right with the dog on it (the easter egg) |
| S03 (meeting point, FULL on the golem) | out-of-focus torches on the grass at the lens | the golem among the torches, the well | houses, more torches, the forest |
| S04 (north edge, POV) | the last torch rows, a clean line | open unlit grass rising | the dark oak forest, hills against the blue dawn sky |
| S05 (flashback crane, ends 7 blocks from Jonah at `full`, looking west) | the cottage's garden fence and gate lanterns | Jonah head to foot at his gate; two villagers walking on the street | the west hills and the golden sky |
| S11 (the plot, S05's angle, wide) | the street fence, a torch on every post | the bare 9 x 9 coarse-dirt footprint, a torch on every block | the west hills, the same skyline as S05 |
| S14 (our door, the S06 axis, looking north) | the kid on the path at frame right | Jonah crouched at our doorstep, the last torch on the door spot | our house, the lit roofs behind, gold light raking from the right (the sun out of frame) |

## The easter egg
Canon cameo `dog_on_hill` (since day 3400; Pip beside him at night from 4300): the pale dog with the red collar sitting
on Dog Hill's top, about 80 blocks east-south-east of the meeting point and ~30 blocks above the village, a speck on
the east skyline against the dawn band at S01's frame right (at 23000 it is still night on the hill, so Pip sits
beside him). In **S01 only**: no other shot looks east. Nothing to build: `world.build` puts Dog Hill's stamps back
(map.json `stories.nine_thousand_torches.cameos`). Never the subject, never named. Check the hill clears the top edge
of S01's frame on a still; if it doesn't, ease the crane's pitch a few degrees at key 1.

## The narrator and Jonah on screen
- Narrator: `stunt.self = { model: 'villager', eye: 0.81, extra: { baby: true, type: 'plains', profession: 'none' } }`,
  `hud: false`, `hideHand: true`. The baby model exists (`renderer/entities.js` `poseBaby`); check that `self` passes
  `extra.baby` through to it (render.js `selfAt`) and that the plains robe draws. POV eye 0.81 (a baby villager's
  eye: 1.62 x 0.5).
- The chest screen in POV (S09): the recording bot opens the chest (`bot.openContainer`), the harness marks the
  `container` window with every slot, and `edit.py` draws the vanilla chest screen (exists). The lower half shows the
  bot's own inventory: keep it **empty** (a villager has nothing).
- Jonah: one actor bot (`M.actors(ctx, ['Jonah'])`), default Steve skin in `stunt.cast`. **Player moves only** (sneak,
  arm swings, real placements); no `kneel` or `wave` pose. Torch in main hand via `M.give` (exactly one in S13-S14).

## Engine features this story needs (docs/engine_features.md, checked 2026-11-10)
| need | status | plan |
|---|---|---|
| A player vanishing when he quits (S06, S15) | **exists.** The harness records entities per tick from `bot.entities`; when the actor bot quits (`b.quit()`; `quitActors` in lib/movie.js), the server removes the entity and it stops being recorded, so the renderer draws nothing from that tick. Vanilla has no fade: an instant vanish is correct. | quit Jonah's bot at the end of L06 (S06) and on L15's first word; reconnect it between S06 and S07 |
| `<Jonah> see you tomorrow` and "Jonah left the game" in chat | **partly exists.** `scripts/retention.py` `chat_img` draws vanilla chat history lines (the translucent background, the game font) and the input box, from `--chat` entries keyed to timeline events, but only as typed player chat, in grey (220,220,220). No system-message colour, and the harness doesn't record system chat. | **build (~1 h, under 2 h):** (1) harness: while recording, on `messagestr` matching `/^(\w+) left the game$/` mark `syschat` { text, color: 'yellow' }, and on a player chat from an actor mark `syschat` { text: '<Jonah> see you tomorrow', color: 'white' } (skip `joined the game`); (2) edit.py/retention.py: draw `syschat` marks as a chat history line with no input box, in vanilla yellow (ChatFormatting.YELLOW, #FFFF55), held 10 s then faded like `ChatComponent` (we cut long before); (3) the caption track: a story.json `reveal.caption` card in yellow during the hold. Off unless a `syschat` mark exists (rule zero). |
| Player name tags over Jonah | **missing.** render.js draws nameplates only for custom-named mobs (`extra.name`); vanilla always draws other players' names (within 64 blocks; while sneaking, drawn dimmer and not seen through walls, never hidden). The harness already records `extra.user` and `extra.sneak`. | **build (~30 min):** a player entity with `extra.user` gets `nameTag = user`, `nameY` 1.8 + 0.5 (1.5 + 0.5 crouched), drawn at reduced opacity while `extra.sneak` is set, so Jonah's name still reads crouched in S13-S14. Gate it (a stunt flag `playerNames: true` or `rec.engine >= 3`) so published Shorts with actors render unchanged. Without it, minecraft-audit flags a player with no name over him. |
| Torch flame and smoke particles | **check.** Vanilla `TorchBlock.animateTick`: one smoke and one flame particle at the flame each client tick. render.js spawns `smoke` for other sources; torches likely draw no flame particles. | **build if missing (~1 h)**, only for torches within ~16 blocks of the camera (6,000 at once would swamp the frame and vanilla's own particle range limits it), gated by `rec.engine` as campfire smoke was. Nice to have, not a blocker: bloom carries the glow at distance. |
| 6,000 block-light emitters | **check.** `renderer/light.js` / `world.js` give torches light 14 and propagate per chunk. | render one S01 frame on the shot sheet and time it before recording |
| Baby villager as `self` | exists (`poseBaby`, `stunt.self`) | check `extra.baby` reaches the self model |
| Chest screen with contents | exists (`container_png`) | |
| sneak, arm swing, torch held, real block placement | exist (recorded sneak flag, `swing`, `M.give`, `placeBlock`) | |
| Torch placement by script | **new dressing helper** (`sets.dress.torches`, ~1 h, above) | build |
| Cottage swap in and out | exists (`/clone`, `M` clone helper in lib/movie.js; `sets.place`) | |

## Lighting and look
- `look: 'auto'` (the grade follows the time of day): dawn (23000-23742; in S14-S15 the camera looks north, so the sun is out of frame and its light rakes from the right) and the flashback's golden hour to dusk
  (11600-12600). Bloom matters: it's what makes thousands of torches read as a field of light in S01. Check S01 at
  300 px wide: the box must read as "covered", not "noise".
- Villagers stay in bed at dawn (none on the streets in A/C/D): the empty, lit streets are part of the eerie read. In
  B (S05) two villagers walk the street: the flashback cue.
- Sound: wind, the torches' silence, birds starting at sunrise; a torch place sound on each new torch in S06, S12 and S14;
  nothing on Jonah's vanish (vanilla has none); the score drops out before L15 and the payoff hit lands on the vanish.
