# lantern_bay: set brief (r1)

The set is the premise: a real bay at night, a road of light on its floor running out from a dock, and the dark around
it. Two builds: the **near end** (the shore, the cottage, the dock, the headland lighthouse, the first ~140 blocks of
the line) and the **far end** (the line's last ~60 blocks and the shipwreck). Every piece follows
`docs/building_guide.md`; natural terrain only, no clearing, no superflat.

## Site
- **Near end:** `sets.findShore(ctx)` for the dock: a bank with open water straight out to the **west** (the line
  runs out toward the sunset in S08, and the moon sits frame left in S01). Choose a shore where:
  - the floor shelves from ~4 water blocks deep at the dock's T-head to 13 deep by ~40 blocks out, then stays 11-13
    deep for at least 100 blocks (sand and gravel; patch it with `fill` where a trench or a hill breaks it, never
    deeper than 13: the "whole water column is lit" rule in the bible needs it);
  - a headland or a rocky arm 40-60 blocks north of the dock for the lighthouse (`planSite` with the lighthouse and
    cottage footprints);
  - the bank rises 5-8 blocks behind the landing (the cottage sits above the dock and looks down on it: S02).
  A warm or lukewarm ocean reads bluer than cold (the renderer's water fog follows the biome); avoid frozen and cold.
- **Far end:** a stretch of ocean 13 deep with open sand, at least 64 blocks from the near-end set (or a separate
  `findShore`-free ocean site 600+ blocks out if the build can reach it). It needs nothing above water: every shot there
  is underwater.

## Library pieces
| piece | variant | facing | where | anchors used |
|---|---|---|---|---|
| `dock` | `length` to reach 4-deep water (~20), `depth` per the site | facing west (out over the water), `y` the bank | landing at (0,0), T-head at (-20,0) | `end` (Grandma, S01/S04/S09), `walk` (S02), `moor` (the empty mooring: no boat; add the fence post, lead knot and the `MAE` sign), `shack`, `approach` |
| `lighthouse` | default `height`, red stripe | door facing the bay | on the headland ~(-30,-55) | `light` (lit at night: it is a sea lantern room), `shots.wide` for checks |
| `cottage` | `palette: 'spruce'`, garden on | facing west (the bedroom window toward the dock) | on the bank ~(14,-6) | `window_in` (S02's POV eye: sitting on the bed by the window), `bed` |
| vanilla `shipwreck` | upright, not beached (`/place structure minecraft:shipwreck`) | bow facing east (toward home, so the line arrives at the bow) | far end | none: read the deck height after placing; put the chest by hand |

## Dressing
- **The lantern line:** `lantern[waterlogged=true]` on the floor every 2 blocks along z=0, from (-20,0) out to x=-140
  at the near end (70 lanterns: S01's widest shot sees ~60 before the fog), and from x=-560 to x=-600 at the far end.
  Each sits on sand or gravel; clear kelp off the line itself but leave seagrass and kelp 2-4 blocks to the sides so the
  light has something to land on (S07).
- **The mooring:** an oak fence post on the T-head's south side, a lead knot on it (summon a `leash_knot` or a fence
  with a lead from a NoAI boat removed: the knot alone), an oak sign on the post facing the dock walk: `MAE` on line 2.
  No boat anywhere at the dock.
- **The dock:** the piece's lamps lit; a coiled rope (a few chains), crates and a barrel by the shack; one fishing rod
  in an item frame on the shack wall (Grandpa's: never mentioned).
- **The cottage:** the bedroom window lit from inside (a lantern), so in S10 the window shines far behind the swimmers.
- **The shore:** sand and gravel beach either side of the landing, a few boulders (`dress.rocks`), grass and flowers
  up the bank, a `grove` of spruce and oak behind the cottage and on the headland.
- **The far end:** sand floor with seagrass, kelp forests 10+ blocks either side of the line (they turn into black
  shapes past the light), a few magma-free rocks. **The For Mae chest:** `setblock` a chest on the wreck's deck 2
  blocks aft of the bow with `{CustomName:'"For Mae"', Items:[{Slot:13b, id:"minecraft:heart_of_the_sea", count:1}]}`
  (check that the harness's container mark carries the custom title through `contTitle`).
- **The drowned:** summoned NoAI, persistent, each with a trident in the main hand (`HandItems`/`equipment`), floating
  8-10 blocks into the black at light level 2-4 (the fringe), drifting slowly with `K.actor`. Never inside the light.

## What fills each establishing shot out to the fog (fg / mid / bg)
| shot | fg | mid | bg (to the fog) |
|---|---|---|---|
| S01 (EWS, night, crane over the dock looking west) | the dock rail and a lit dock lamp, low right | Grandma on the T-head; the lantern line glowing on the floor from the dock out to sea | the line shrinking into the dark fog at centre; the lighthouse on the headland frame right, its lantern room lit; stars, half moon high left |
| S02 (POV from the bedroom) | the window frame, the foot of the bed | the dock 20 blocks downhill, Grandma walking it | the line on the water, the lighthouse frame right, the headland's trees |
| S04 (POV, morning) | the dock planks and rail | Grandma, the mooring post with the MAE sign | the calm bay, the first lanterns faint under the shallows, the lighthouse, **the nitwit knee-deep in the shallows frame right** (the easter egg) |
| S07 (underwater EWS looking back east) | two lanterns, seagrass, kelp | the bright road running back to the shallows | black water both sides, one drowned silhouette at the edge frame left; the underwater fog |
| S08 (dusk, low behind the mooring) | the mooring post, lead knot and the MAE sign | the line glowing under the water, straight out | the setting sun on the horizon exactly where the line points; the headland and lighthouse frame right |
| S10 (EWS crane over the bay, night) | dark water | the two swimmers on the glowing line | the dock and the lit cottage window far behind, the lighthouse, the glow ending ahead in the dark |

## The easter egg
The village nitwit (story_nitwit's green coat) stands knee-deep in the shallows 6 blocks north of the dock's foot,
facing the sea, in S04 only, frame right in the middle ground. A NoAI villager, profession nitwit. **Provisional:
re-check against docs/world/canon.md when it lands.**

## Lighting and look
- `look: 'auto'` (the grade follows the time of day); night scenes need the line to read on a phone in the first 2 s:
  check S01 at 300 px. If the lantern road reads thin from 9 blocks up, lower the crane or add bloom (`look.bloom`).
- Underwater: vanilla water fog (24 blocks), the biome's water fog colour; `look.underwater` exposure lift if the deep
  reads pure black at noon (S05 must read "black past the end", not "black everywhere": the lanterns and the near sand
  must show).
- The drowned must read at the fringe of the light: light 2-4 on them, the trident's prongs catching it.

## Engine features this story needs (docs/engine_features.md)
| need | status | estimate | plan |
|---|---|---|---|
| Underwater lantern light (`lantern[waterlogged=true]`, light spreading through water, 2 a block) | `renderer/light.js` dampens water by 1 (vanilla) and `models.js` draws waterlogged blocks with water: should work. **Verify** with one still of a waterlogged lantern on sand, from above water and from underwater | 20 min | check first |
| Water rendering from above at night (the lit floor visible through 4-13 blocks of water from the dock and the crane) | the renderer draws the water's top surface only (translucent), so the floor shows; **verify** S01's look | 20 min | check; tune bloom/grade, not the water |
| Underwater view (fog, colour, muffled sound) for camera shots, not just POV | `render.js` sets `cam.underwater` from the camera's block: check that movie-engine camera shots (S03b, S07, S11) get it too | 30 min | check; fix if only POV gets it |
| **Breath bar (air bubbles) in the HUD** | **missing**: `edit.py` `hud_png` draws hearts, hunger, hotbar, XP, no air. Needs the harness to record `bot.oxygenLevel` per tick (or on change) as a mark, and `hud_png` to draw `gui/sprites/hud/air` / `air_bursting` (and `air_empty` where the jar has it) right-aligned above the hunger bar, only while below 300 / underwater (vanilla `Gui.renderAirLevel`) | 1.5 h | **build** (under 2 h); the dive and the noon scene use it |
| **Player swim pose** (sprint-swimming underwater, Pose.SWIMMING: the body horizontal, arms stroking) for Grandma | **missing**: `renderer/poses.js` has no `swim`; data only (`root.rot` -PI/2 plus an arm stroke on `c.age`, from `PlayerModel`/`HumanoidModel.setupAnim`'s swimAmount branch); or record `metadata[6] === 3` (SWIMMING) in the harness for player actors that really swim | 45 min | **build** (under 2 h). Without it, stage her upright (treading water) and never show a sprint-swim on camera |
| **Trident in a drowned's hand** | **likely missing**: the 1.21.4+ trident item model is `minecraft:special` (type `trident`) in hand, which `renderer/specialitems.js` doesn't handle (beds, chests, shulkers, heads, banners only): the held trident may draw as nothing. Add the `TridentModel` (from `TridentModel.createLayer`, texture `entity/trident`) as a special piece | 1-1.5 h | **build** (under 2 h); fallback: the flat `item/trident` sprite (its GUI model) in hand, acceptable at the fringe of the light |
| Drowned model (body + `drowned_outer_layer`) | the zombie-family pose code covers drowned; **verify** the outer layer draws | 15 min | check |
| Chest screen with a custom title ("For Mae") and a Heart of the Sea | exists (`container_png`, harness `container` mark with `title`); **verify** `contTitle` passes a custom name through and `CONTAINER_TITLES` doesn't map it away; the GUI title is small: the caption track carries FOR MAE | 15 min | check |
| A player tossing an item to another (S09) | a dropped item entity renders; the bot picks it up | none | stage it |
| Lighthouse light, dock lamps, cottage window | real light sources in the library pieces | none | |

Log the three builds (breath bar, swim pose, trident in hand) in `docs/engine_requests.md` when the build starts
(not done here: this brief only touches `stories/lantern_bay/`).

## Staging notes
- Grandma is a player actor (`K.actor`), moved per tick; underwater shots keep her within 10 blocks of the lens.
- The POV dive (S10b): the bot really swims down (sneak/down key in water) so the breath bar is real; or stage the air
  value with marks if the build records it.
- The noon flashback (S05-S07) and S03b are at the far end with the line's end moved (place/remove the last lanterns
  per scene); tonight's end is 2 blocks short of the bow.
- The lantern placement (S03b, S12) is a real block place on the beat word, with the light spreading the same frame.
- Every drowned is NoAI and persistent; none ever crosses into the light.
