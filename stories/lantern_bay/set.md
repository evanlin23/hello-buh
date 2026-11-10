# lantern_bay: set brief (r2)

The set is the premise: a real bay at night, a road of light on its floor running out from a dock, and the dark around
it. Two builds: the **near end** (the shore, the cottage, the dock, the headland lighthouse, the first ~140 blocks of
the line) and the **far end** (the line's last ~60 blocks and the shipwreck). Every piece follows
`docs/building_guide.md`; natural terrain only, no clearing, no superflat.

## Site
- **Near end:** `sets.findShore(ctx)` for the dock: a bank with open water straight out to the **west** (the line
  runs out toward the sunset in S08, and the moon sits frame left in S01). Choose a shore where:
  - the floor shelves from ~4 water blocks deep at the dock's T-head to 13 deep by ~40 blocks out, then stays 11-13
    deep for at least 180 blocks (sand and gravel; patch it with `fill` where a trench or a hill breaks it). Light drops
    1 a block in water, so a floor lantern lights 14 blocks: at 13 deep the whole column over the road is lit;
  - a headland or rocky arm for the lighthouse at about (-80,-20): about 18 deg north of due west from the T-head, so
    it stays in frame right in every shot looking out to sea (`planSite` with the lighthouse and cottage footprints);
  - the bank rises 5-8 blocks behind the landing (the cottage sits above the dock and looks down on it: S02).
  A warm or lukewarm ocean reads bluer than cold (the renderer's water fog follows the biome); avoid frozen and cold.
- **Far end:** a stretch of ocean 13 deep with open sand, at least 64 blocks from the near-end set (or a separate
  `findShore`-free ocean site 600+ blocks out if the build can reach it). It needs nothing above water: every shot there
  is underwater.

## Library pieces
| piece | variant | facing | where | anchors used |
|---|---|---|---|---|
| `dock` | `length` to reach 4-deep water (~20), `depth` per the site | facing west (out over the water), `y` the bank | landing at (0,0), T-head at (-20,0) | `end` (Grandma, S01/S04/S09), `walk` (S02), `moor` (the empty mooring: no boat; add the fence post, lead knot and the `MAE` sign), `shack`, `approach` |
| `lighthouse` | default `height`, red stripe | door facing the bay | on the headland ~(-80,-20) | `light` (lit at night: it is a sea lantern room), `shots.wide` for checks |
| `cottage` | `palette: 'spruce'`, garden on | facing west (its west window looks down on the dock) | on the bank ~(14,-6) | `window_in` (S02: the over-the-shoulder camera behind Milo sitting on the bed under the window; the one-room cottage, no upstairs), `bed` |
| vanilla `shipwreck` | upright, not beached (`/place structure minecraft:shipwreck`) | bow facing east (toward home) | bow at (-630,0), 12 blocks past lantern #300 (-618,0) | none: read the deck height after placing; put the chest by hand 4 blocks aft of the bow |

## Dressing
- **The lantern line:** `lantern[waterlogged=true]` on the floor every 2 blocks along z=0: #1 at (-20,0), #300 at
  (-618,0). Build the near end out to x=-200 (90 lanterns) so S01 and S10 never see it stop before the fog (or use
  `stunt.fogSea` low over the far water). Build the far end from x=-570 to #300 at x=-618. For S03b and S05 (earlier
  nights) take the last lanterns away so the end sits at about x=-580.
  Each sits on sand or gravel; clear kelp off the line itself but leave seagrass and kelp 2-4 blocks to the sides so the
  light has something to land on (S07).
- **The mooring:** an oak fence post on the T-head's south side, a lead knot on it (summon a `leash_knot` or a fence
  with a lead from a NoAI boat removed: the knot alone), a **big** oak sign on the post facing the dock walk: `MAE` on line 2 in glow ink (it must read in S04 at 2 blocks
  and in S08 at 1.5 blocks; if one sign is too small, hang a second, so the name reads at 300 px).
  No boat anywhere at the dock.
- **The dock:** the piece's lamps lit; a coiled rope (a few chains), crates and a barrel by the shack; one fishing rod
  in an item frame on the shack wall (Grandpa's: never mentioned).
- **The cottage:** the bedroom window lit from inside (a lantern), so in S10 the window shines far behind the swimmers.
- **The shore:** sand and gravel beach either side of the landing, a few boulders (`dress.rocks`), grass and flowers
  up the bank, a `grove` of spruce and oak behind the cottage and on the headland.
- **The far end:** sand floor with seagrass, kelp forests 10+ blocks either side of the line (they turn into black
  shapes past the light), a few magma-free rocks. **The For Mae chest:** `setblock` a chest on the wreck's deck 4
  blocks aft of the bow (16 from #300: light 0 until lantern 301 goes on the bow) with `{CustomName:'"For Mae"', Items:[{Slot:13b, id:"minecraft:heart_of_the_sea", count:1}]}`
  (check that the harness's container mark carries the custom title through `contTitle`).
- **The drowned:** summoned NoAI, persistent, each with a trident in the main hand (`HandItems`/`equipment`), floating
  at the fringe at light 3-5 (S05: 6-8 blocks past the end; tonight: 15+ blocks past #300, beyond the wreck), drifting slowly with `K.actor`. Never inside the light.

## What fills each establishing shot out to the fog (fg / mid / bg)
| shot | fg | mid | bg (to the fog) |
|---|---|---|---|
| S01 (EWS, night 20500, crane down the dock ending 12 behind Grandma, pitched down 25 deg) | the dock rail and a lit dock lamp, low right | Grandma walking out onto the T-head; the lantern line glowing on the floor out to sea | the line running into the dark fog at centre; the lighthouse frame right, lit; the moon low in the west, left of centre |
| S02 (over Milo's shoulder, FOV 30) | Milo's shoulder, the window frame | the dock 20 blocks downhill, Grandma stepping off the T-head | the line on the water, the lighthouse frame right, the headland's trees |
| S04 (POV, morning) | the dock planks and rail | Grandma, the mooring post with the MAE sign | the calm bay, the first lanterns faint under the shallows, the lighthouse, **the nitwit on a 1-deep rock at (-34,-12), right of centre** (the easter egg) |
| S07 (underwater WS looking back east) | two lanterns, seagrass, kelp | the bright road running back to the shallows | black water both sides, one drowned silhouette at the edge frame left; the underwater fog |
| S08 (dusk, low behind the mooring) | the mooring post, lead knot and the MAE sign | the line glowing under the water, straight out | the setting sun on the horizon exactly where the line points; the headland and lighthouse frame right |
| S10 (EWS crane over the bay, night) | the T-head and its lamp at the bottom edge on frame 1, then dark water | the two swimmers on the glowing line | the glow running ahead into the dark, the moon low in the west, the lighthouse frame right |

## The easter egg
The village nitwit (story_nitwit's green coat) stands on a 1-deep rock in the shallows at (-34,-12), facing the sea,
in S04 only, right of centre in the middle ground. A NoAI villager, profession nitwit. **Provisional:
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
| Underwater lantern light (`lantern[waterlogged=true]`, light dropping 1 a block through water) | `renderer/light.js` handles water and `models.js` draws waterlogged blocks with water: should work. **Verify** with one still of a waterlogged lantern on sand, from above water and from underwater | 20 min | check first |
| Water rendering from above at night (the lit floor visible through 4-13 blocks of water from the dock and the crane) | the renderer draws the water's top surface only (translucent), so the floor shows; **verify** S01's look | 20 min | check; tune bloom/grade, not the water |
| Underwater view (fog, colour, muffled sound) for camera shots, not just POV | `render.js` sets `cam.underwater` from the camera's block: check that movie-engine camera shots (S03b, S07, S11) get it too | 30 min | check; fix if only POV gets it |
| **Breath bar (air bubbles) in the HUD** | **missing**: `edit.py` `hud_png` draws hearts, hunger, hotbar, XP, no air. Needs the harness to record `bot.oxygenLevel` per tick (or on change) as a mark, and `hud_png` to draw `gui/sprites/hud/air` / `air_bursting` (and `air_empty` where the jar has it) right-aligned above the hunger bar, only while below 300 / underwater (vanilla `Gui.renderAirLevel`) | 1.5 h | **build** (under 2 h); the dive and the noon scene use it |
| **Player swim pose** (sprint-swimming underwater, Pose.SWIMMING: the body horizontal, arms stroking) for Grandma | **missing**: `renderer/poses.js` has no `swim`; data only (`root.rot` -PI/2 plus an arm stroke on `c.age`, from `PlayerModel`/`HumanoidModel.setupAnim`'s swimAmount branch); or record `metadata[6] === 3` (SWIMMING) in the harness for player actors that really swim | 45 min | **build** (under 2 h). Without it, stage her upright (treading water) and never show a sprint-swim on camera |
| **Trident in a drowned's hand** | **likely missing**: the 1.21.4+ trident item model is `minecraft:special` (type `trident`) in hand, which `renderer/specialitems.js` doesn't handle (beds, chests, shulkers, heads, banners only): the held trident may draw as nothing. Add the `TridentModel` (from `TridentModel.createLayer`, texture `entity/trident`) as a special piece | 1-1.5 h | **build** (under 2 h); fallback: the flat `item/trident` sprite (its GUI model) in hand, acceptable at the fringe of the light |
| Drowned model (body + `drowned_outer_layer`) | the zombie-family pose code covers drowned; **verify** the outer layer draws | 15 min | check |
| Chest screen with a custom title ("For Mae") and a Heart of the Sea (critic should-fix: check it renders) | exists (`container_png`, harness `container` mark with `title`); **verify** `contTitle` passes a custom name through and `CONTAINER_TITLES` doesn't map it away; the GUI title is small: the caption track carries FOR MAE | 15 min | check |
| A player tossing an item to another (S09) | a dropped item entity renders; the bot picks it up | none | stage it |
| Lighthouse light, dock lamps, cottage window | real light sources in the library pieces | none | |

Log the three builds (breath bar, swim pose, trident in hand) in `docs/engine_requests.md` when the build starts
(not done here: this brief only touches `stories/lantern_bay/`).

## Staging notes
- Grandma is a player actor (`K.actor`), moved per tick; underwater shots keep her within 10 blocks of the lens.
- The POV dive (S10b): the bot really swims down (sneak/down key in water) so the breath bar is real; or stage the air
  value with marks if the build records it.
- The noon flashback (S05, S07) and S03b are at the far end with the line's end moved (place/remove the last lanterns
  per scene). Tonight's end, #300, is 12 blocks short of the bow, so the wreck is dim and the deck dark until S12.
- S03b: a drowned at the new edge of the light swims at Grandma on "SPRINTS" (`K.actor`, 2 blocks toward her), and she
  sprint-swims out frame left. The camera looks south (sea frame right).
- S11: Grandma calm, no drowned within 15 blocks; she points over her own shoulder, west, at the dim bow.
- Night is time 20500 in every night shot (the moon low in the west, in frame).
- The lantern placement (S03b, S12) is a real block place on the beat word, with the light spreading the same frame.
- Every drowned is NoAI and persistent; none ever crosses into the light.
