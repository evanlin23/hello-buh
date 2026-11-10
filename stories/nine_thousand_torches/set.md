# nine_thousand_torches: set brief (r1)

The premise is one picture: a whole village with a torch on every block. It has to read as a real village on real
ground, edge to edge, from the air (S01) and from a kid's knee height (S02-S04), so the set is a generated vanilla
plains village on natural terrain, dressed by script, plus one library piece (Milo's cottage) for the flashback.

## Site
- **A real generated plains village**, not a library layout: `STUNT=scout_village ./scripts/record.sh` records the
  nearest plains village on the fixed seed (centre (-304, -384), as the Good Boy pilot did), then
  `scripts/still.py` top-down plus a grid to plan positions. If its ground is too flat for depth, `sets.vanilla(ctx,
  'village_plains', { x, z, mobs: 'freeze' })` at a `sets.planSite` centre with relief: we want a village on a gentle
  slope (5-8 blocks of fall across it) so S01's crane sees roofs stepping down and S04 has a rise at the north edge.
- **Needs from the site:** a forest (dark oak or oak, dense) 20-30 blocks off the north edge (S04, S10); hills on the
  east horizon for the sunrise (S01, S14-S15); 10-14 houses; a meeting point with the bell, well and hay piles; at
  least one farm (its log borders take torches, its farmland doesn't). If the forest is thin, `sets.dress.grove(ctx,
  { kinds: ['dark_oak'], r: 14, n: 12 })` along the north edge.
- **The box:** about 95 x 95 blocks round the meeting point (x -48..47, z -48..47 from the bell; 9,025 columns). Fit it
  to the real village so the count lands in range (below).

## Library pieces
| piece | variant | facing | where | when |
|---|---|---|---|---|
| `cottage` (Milo's house) | `palette: 'birch'`, `garden: true`, `seed` fixed | east, toward the street | the west end of the main street, ~38 blocks from the bell, its door 12-15 blocks down the street from our door (S08 sees it from our doorstep) | **flashback only** (S05-S08) |

Our house is a **vanilla plains house** already in the village, on the main street, door facing south, with a window
looking north-west over the village toward the forest (S10). Add a chest against its west wall (`/setblock` with the
Items NBT: diamond_sword, iron_helmet, iron_chestplate, iron_leggings, iron_boots, red_bed, shield, filled_map,
fishing_rod, bread x16, bucket, torch x64).

## Dressing: the 9,000 torches (`sets.dress.torches`, new, ~1 h)
A new dressing helper in `lib/sets/dress.js` (the 40-commands-a-tick batcher already there):
1. Read the top block of every column in the box (`execute positioned over motion_blocking_no_leaves`, or the
   recorded chunk data). Also walk fence and wall posts and roof ridges (logs, planks, full blocks on the roofline).
2. Place `torch` on top only where vanilla would let it stand: a sturdy top face (full blocks: grass, dirt, stone,
   cobble, planks, logs, hay, top slabs) or a centre post (fences, walls). **Skip** dirt_path, farmland, bottom slabs,
   stairs, leaves, glass, water and crops. Short grass and ferns are replaceable (a player's torch goes straight
   over them), so set the torch in their place; flowers Milo would have broken first, so clear them to air and torch
   the block. `/setblock` doesn't check survival, so this whitelist is what keeps every torch legal: a torch on a
   stair or path would be un-vanilla (minecraft-audit).
3. **Count and log** every placement. The story says nine thousand: the total in the box must be **9,000-9,400**.
   Widen or narrow the box by a row or two to land in range; log the final number in the recording log and in this
   file's build notes.
4. Keep the village's own wall torches and lamp posts as generated.
5. Return the list of placed positions by region, so the patch swaps below can remove and restore them fast.
Cost: ~9,200 commands at 40 per tick = ~230 ticks (~12 s) in setup. Light: 9,000 emitters; check `renderer/light.js`
handles it in reasonable time on one frame before recording (it propagates block light per chunk: should be fine;
measure on the shot sheet).

## Scene swaps (one recording, the scenes in story order)
The flashback (S05-S08) needs the village without the story torches and with Milo's cottage standing; scenes A, C and D
need the torches and no cottage. The recording runs in line order, so:
- **Setup:** place the cottage once (`sets.place`, with the terrain fit), then `/clone` it (the house box) to a stash
  far below or 200+ blocks away; clear the plot (air, then grass at the plot's floor), torch the box (the plot gets
  its 9 x 9 square).
- **Cut S04 → S05 (`during`):** the flashback patch only: the area S05-S08 can see (~45 x 30 blocks: Milo's plot, the
  street, our door, the meeting point's edge). `/fill <box> air replace torch` over the patch box (in slices under the
  32,768 limit; 1-2 ticks), then `/clone` the cottage back from the stash (`replace`, 1 tick). S05 is a camera shot;
  its first frame must land after both (the cut waits for them).
- **Cut S08 → S09 (`during` and during S09):** clone the cottage away again, re-grass the plot, re-place the patch's
  torches from the saved list (~1,500 commands at 40 a tick = ~38 ticks, ~1.9 s). S09 is inside our house behind the
  chest screen; the window view S10 looks at must be done by S10's first frame. Order the restore so the window's
  sightline is first.
- **The growing row (S12):** before S12, remove the ~30 torches of the row and the last torch at our door. During S12
  re-place them one at a time at the row's far end every ~8 ticks (`setblock` on the line's ticks), with Milo's actor
  just behind the far house corner swinging (`swing`) on each, his arm visible on the last. S13 follows as the row
  completes round the corner ahead of the kid (place the rest before the camera clears the corner).
- **The last torch (S14):** Milo's actor kneels (`M.pose(ctx, 'Milo', 'kneel')`), places a real torch with the
  mineflayer `placeBlock` on the grass east of the doorstep on 'LAST' (a real placement: the swing and the block in
  the recording), stands, `wave` on 'WAVED'.

## What fills each establishing shot out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 (EWS dawn crane, looking east) | west roofs' ridge torches and fence posts passing under the lens | the whole box: thousands of torches, dark path and field lines threading them, the bell and well near centre | the dark forest ring, the east hills against the pale dawn band |
| S03 (meeting point, FULL on the golem) | out-of-focus torches on the grass at the lens | the golem among the torches, the well with **the nitwit egg on its roof** | houses, more torches, the forest |
| S04 (north edge, POV) | the last torch rows, a clean line | open unlit grass rising | the dark oak forest, hills fading into the dawn haze |
| S05 (flashback crane) | hay bales and fences at the meeting point | Milo at his birch cottage, its lit windows | the village roofs, the sunset sky over the west hills |
| S11 (the plot, high) | the street's torch-topped fence | the bare 9 x 9 square of torches | neighbour houses' ridge torches, the forest |
| S14 (our door, reverse) | the kid on the path | Milo kneeling at our doorstep, the last torch | our house, the lit roofs behind, the sun's edge over the east hill at frame right |

## The easter egg
**The nitwit in his green coat** (story_nitwit) standing on the well's roof among the torches, deadpan, in S03's
background: a frozen (NoAI) villager, profession nitwit, plains type, summoned on the roof's top slab or full block
(stand him on a full block). Big enough to read at 300 px as "a villager standing on a roof"; nobody comments on it.
**Provisional: re-check against docs/world/canon.md when it lands.** World placement in story.json `world`: a plains
village on the river road, a valley south of the carpeted village (Light Sleeper).

## The narrator and Milo on screen
- Narrator: `stunt.self = { model: 'villager', eye: 0.81, extra: { baby: true, type: 'plains', profession: 'none' } }`,
  `hud: false`, `hideHand: true`. The baby model exists (`renderer/entities.js` `poseBaby`); check that `self` passes
  `extra.baby` through to it (render.js `selfAt`) and that the plains robe draws. POV eye 0.81 (a baby villager's
  eye: 1.62 x 0.5).
- The chest screen in POV (S09): the recording bot opens the chest (`bot.openContainer`), the harness marks the
  `container` window with every slot, and `edit.py` draws the vanilla chest screen (exists). The lower half shows the
  bot's own inventory: keep it **empty** (a villager has nothing).
- Milo: one actor bot (`M.actors(ctx, ['Milo'])`), default Steve skin in `stunt.cast`. Poses `kneel` and `wave`
  exist. Torch in main hand via `M.give`.

## Engine features this story needs (docs/engine_features.md, checked 2026-11-10)
| need | status | plan |
|---|---|---|
| A player vanishing when he quits | **exists.** The harness records entities per tick from `bot.entities`; when the actor bot quits (`b.quit()`; `quitActors` in lib/movie.js), the server removes the entity and it stops being recorded, so the renderer draws nothing from that tick. Vanilla has no fade: an instant vanish is correct. | quit Milo's bot on L15's first word (the line mark) |
| "Milo left the game" in chat | **partly exists.** `scripts/retention.py` `chat_img` draws vanilla chat history lines (the translucent background, the game font) and the input box, from `--chat` entries keyed to timeline events, but only as typed player chat, in grey (220,220,220). No system-message colour, and the harness doesn't record system chat. | **build (~1 h, under 2 h):** (1) harness: on `messagestr` matching `/^(\w+) (left\|joined) the game$/` while recording, `mark('syschat', { text, color: 'yellow' })`; (2) edit.py/retention.py: draw `syschat` marks as a chat history line with no input box, in vanilla yellow (ChatFormatting.YELLOW, #FFFF55), held 10 s then faded like `ChatComponent` (we cut long before); (3) the caption track: a story.json `reveal.caption` card in yellow during the hold. Off unless a `syschat` mark exists (rule zero). |
| Player name tags over Milo | **missing.** render.js draws nameplates only for custom-named mobs (`extra.name`); vanilla always draws other players' names (within 64 blocks, hidden while sneaking). The harness already records `extra.user` and `extra.sneak`. | **build (~30 min):** a player entity with `extra.user` and not sneaking gets `nameTag = user`, `nameY` 1.8 + 0.5. Gate it (a stunt flag `playerNames: true` or `rec.engine >= 3`) so published Shorts with actors render unchanged. Without it, minecraft-audit flags a player with no name over him. |
| Torch flame and smoke particles | **check.** Vanilla `TorchBlock.animateTick`: one smoke and one flame particle at the flame each client tick. render.js spawns `smoke` for other sources; torches likely draw no flame particles. | **build if missing (~1 h)**, only for torches within ~16 blocks of the camera (9,000 at once would swamp the frame and vanilla's own particle range limits it), gated by `rec.engine` as campfire smoke was. Nice to have, not a blocker: bloom carries the glow at distance. |
| 9,000 block-light emitters | **check.** `renderer/light.js` / `world.js` give torches light 14 and propagate per chunk. | render one S01 frame on the shot sheet and time it before recording |
| Baby villager as `self` | exists (`poseBaby`, `stunt.self`) | check `extra.baby` reaches the self model |
| Chest screen with contents | exists (`container_png`) | |
| kneel, wave poses; torch held | exist (`renderer/poses.js`; `M.give`) | |
| Torch placement by script | **new dressing helper** (`sets.dress.torches`, ~1 h, above) | build |
| Cottage swap in and out | exists (`/clone`, `M` clone helper in lib/movie.js; `sets.place`) | |

## Lighting and look
- `look: 'auto'` (the grade follows the time of day): dawn (23000-23850) and the flashback's golden hour to dusk
  (11600-12600). Bloom matters: it's what makes thousands of torches read as a field of light in S01. Check S01 at
  300 px wide: the box must read as "covered", not "noise".
- Villagers stay in bed at dawn (none on the streets in A/C/D): the empty, lit streets are part of the eerie read.
- Sound: wind, the torches' silence, birds starting at sunrise; a torch place sound on each new torch in S12 and S14;
  nothing on Milo's vanish (vanilla has none); the score drops out before L15 and the payoff hit lands on the vanish.
