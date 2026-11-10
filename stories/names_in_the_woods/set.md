# names_in_the_woods: set brief (r1)

The set is a hamlet on a slope at the east edge of a dark oak forest, with a meadow climbing west from the hamlet's
fence to the trees. The two shots that carry the story (S01 and its echo S11) look west from inside the gate, up the
meadow, at the treeline against the sunset: that view must be real terrain with relief, a black wall of dark oaks, and
nothing flat. Every piece follows `docs/building_guide.md`.

## Site
- **What to find:** a plains (or meadow) edge against a dark forest, with the ground rising **west** from the hamlet
  toward the forest: ~6-8 blocks of climb over the 30-block meadow, the forest continuing uphill beyond it. The sun
  sets in the west, so the forest must be west of the hamlet for S01/S04/S10/S11 to be backlit.
- **How:** `sets.planSite(ctx, layout, { reach: 200 })` over the hamlet layout below, scored with an extra term for the
  ground ~25-40 blocks west of the gate being 5-10 blocks higher than the gate and covered by trees. Natural dark
  forest next to plains is common; if the forest west of the best site isn't dark oak, plant
  `sets.dress.grove(ctx, { x: gate.x - 45, z: gate.z, r: 25, n: 40, kinds: ['dark_oak'], minR: 0 })` and a second
  ring north and south of it so the treeline runs the full width of S01's frame (z -20 to +20 from the gate).
- No `clearSet`, no flat clearing. Clear only the hamlet's own footprint (`sets.dress.clearTrees`) and leave the meadow
  as it is (grass, flowers, the odd boulder).
- Water: none needed; a stream in the far east fields is a bonus for S02's crane.

## Library pieces (gate at local (0,0); +x east, -x west, +z south)
| piece | where (dx, dz) | facing | variant | role |
|---|---|---|---|---|
| `cottage` (Mom's) | gate (10,-6), house north of it | south | `palette: 'plaster'`, `garden: true`, `bed: 'purple'`, `seed: 7` | S03, S06, S07; inside S08. Put a brewing stand (three splash potions in it) on the garden table by the door (Mom's job site: a cleric). Kitchen chest by the window (`window_in`) holding 1 splash potion of weakness and 1 golden apple. |
| `cottage` (TOMAS) | gate (14,6), south of the lane | north | `palette: 'oak'`, `garden: true`, `seed: 21` | empty: shutters closed, garden overgrown (`dress.grass` tall, no flowers), a composter by the door, sign TOMAS at the gate |
| `cottage` (GRETA) | gate (30,6) | north | `palette: 'birch'`, `seed: 22` | empty; a lectern by the door; sign GRETA; a cobweb in the door frame |
| `cottage` (OLD BEN) | gate (40,6) | north | `palette: 'spruce'`, `seed: 23` | empty; a barrel and a fishing rod in an item frame by the door; sign OLD BEN |
| `house2` x2 | (30,-14), (44,-12) | south | `palette: 'plaster'` | lived-in (HUGO, NELL), lanterns lit at dusk |
| `cottage` | (48,8) | north | `palette: 'stone'`, `seed: 24` | lived-in (PIA), sheep pen beside it |
| `well` | (24,0) | south | default | the lane's centre (S02, S09 background) |

- **The lane:** `sets.dress.path` from the gate (0,0) east to (52,0), w 3, with branches to every gate; lamps
  (`dress.lamp`, style post) every ~10 blocks along it.
- **The fence and gate:** `sets.dress.fence` along x=0 from z -22 to +22 (following the ground), with an oak fence gate
  at (0,0) and two lantern posts (`dress.lamp` h 3) at (0,-2) and (0,2). The fence is what S01's foreground is made of.
- **The meadow path:** `sets.dress.path` from (-1,0) to (-30,2), w 2, frayed; one lamp post at (-12,2) (S12's key
  light). Flowers and grass (`dress.flowers`, `dress.grass`) either side; two mossy boulders (`dress.rocks`) at
  (-8,-9) and (-20,10) for S10's depth.
- **Fields beyond the east end:** `dress.crops` (wheat, carrots) at x 55-80, so S02's crane sees farmland past the
  hamlet.

## Cast staging
- All villagers and zombie villagers summoned with `CustomName` and `CustomNameVisible:1b`, NoAI and silent except
  while an actor is walking (`K.actor`), persistent. Zombie villagers: `VillagerData` type plains, professions farmer
  (TOMAS), librarian (GRETA), fisherman (OLD BEN), cleric (ROSA); ROSA with `HandItems:[{id:"golden_apple",count:1},{}]`.
- Mom (villager, cleric) holds the golden apple in S06, S07, S10: `HandItems` on the villager (vanilla villagers
  show a held item over their crossed arms).
- Difficulty Hard (the conversion is vanilla-certain; it happens off screen anyway).
- The potion in S13: `/summon item` at (-11, ground+0.2, 0) with `Item:{id:"splash_potion",components:{"potion_contents":{potion:"weakness"}}}`,
  `PickupDelay:0`, `Age:-32768` (never despawns), placed the line before so it is bobbing on S13's first frame.
- The throw (S15): the bot really throws the splash potion (`bot.activateItem` with slot 3 selected, aimed at ROSA's
  chest 5 blocks away): the splash colour and the swirl come from the recording (render.js already colours a thrown
  potion's splash from LevelEvent 2002). Make ROSA vulnerable for the throw only (no damage from weakness).

## What fills each establishing shot, out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 / S11 (from (3, 2.5, 0) looking west, FOV 32) | the fence, the gate and its two lantern posts, dark | the meadow rising 7 blocks, the path, two boulders, the lamp post at (-12,2) | the dark oak treeline across the whole frame width (z -12 to +12 at 33 blocks), the forest rising behind, the orange sky above; nothing else (no build visible west) |
| S02 (crane over the lane looking east) | the lane, the well, villagers with tags | seven cottages, gardens, lamps, the sheep pen | fields to x 80, then rolling hills; **the easter egg** on the far east hill; fog beyond |
| S05 (POV east-south-east down the lane) | the lane path | Mom; the three empty cottages receding, their signs, job blocks | the lane's far end, the stone cottage, fields |
| S10 (9 up behind the gate, looking west) | the gate lanterns, Milo small | the whole meadow, Mom on the path | the treeline and the low sun over it; the forest rising to the horizon |

## Easter egg (provisional: re-check against docs/world/canon.md when it lands)
The carpeted village of Light Sleeper on the far east hill, seen in S02's crane end: build a stand-in on a hill
~110-140 blocks east of the gate (4-5 small houses with red and orange carpet roofs, one post with a bell boxed in
white wool), small in the haze, never named. If canon lands with real coordinates, place this story's hamlet "one valley
west" of it instead and drop the stand-in.

## Engine needs
| need | status in the renderer (checked 2026-11-10) | estimate | decision |
|---|---|---|---|
| **Name tags over heads** (docs/engine_requests.md #7, queued) | Mostly there: render.js draws a custom-named mob's nameplate when `CustomNameVisible` (or under the crosshair) within 64 blocks (render.js ~2538, `nameTagTexture` in renderer/blockentities.js). Missing: the **player** nameplate over Milo in camera shots (S03, S14: other players always see it), and a check that the plate reads at S01's 30 blocks in backlight (it should draw full-bright, see-through, 0.025 blocks a pixel) | ~1 h (the player plate reuses the mob plate; then a still of S01 and S12) | build; update #7's status when it lands |
| **Held item on a villager** (CrossedArmsItemLayer: Mom holding the golden apple over her crossed arms) | Mobs' main-hand items are recorded (`extra.held`, harness ~516) and drawn in a humanoid `rightArm` (entities.js ~1155), so **zombie ROSA's apple already draws**; the villager model has a single crossed `arms` bone, so Mom's apple doesn't | ~1 h (CrossedArmsItemLayer: the item at T(0, 0.4, -0.4) under the arms bone, Rx(0.75)) | build |
| **The selected item's name above the hotbar** (Gui.renderSelectedItemName: "Splash Potion of Weakness" in S13, "Golden Apple" in S15; shows ~2 s after a slot change, fades) | not drawn by edit.py's HUD | ~1 h (edit.py: the item's display name in the hotbar font, 59 px above the hotbar's top in GUI pixels, fade over the last 10 ticks) | build; the narration says POTION and APPLE anyway, so the story reads without it |
| Egg throw and pop, splash potion throw and splash | thrown eggs and potions render (render.js THROWN, the splash colour) | 0 | verify on the shot sheet |
| Zombie villager outfits (plains, farmer/librarian/fisherman/cleric) | entities.js draws zombie_villager type and profession layers | 0 | verify the cleric robe on ROSA matches Mom's |
| Brewing stand with bottles, chest screen | block model; the chest screen GUI exists (engine_features.md) | 0 | verify |
| Dusk readability (backlog #1: dark scenes read black) | S11-S15 at 13400-13500 with the afterglow, the gate lanterns and the path lamp | stage around it | keep every dusk subject within 8 blocks of a lantern or against the bright west sky |

Total build ~3 h, as three separate under-2 h features (each tested by the rule-zero still diff). No lightning, no sun
disc needed (S01's sun is already below the treeline: the glow does the backlight).
