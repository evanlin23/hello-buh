# Building guide: sets that look designed

Owner, 2026-11-10: "our builds are not particularly good looking or creative, are there guidelines online about
good minecraft building we could look at?" and earlier the same day: "the sets are all so small, and in a
superflat, so when we watch it looks really bad and low effort."

This is the rulebook for any agent writing set code (`/fill`, `/setblock`, `/clone`, `/place`) for a HelloBuh story.
Every rule is concrete enough to apply while writing the commands. Sources and notes: `docs/research/building_research.md`.
House rules about sets in `docs/stories.md` still apply (full scale, natural terrain, depth in every shot).

What we build today, scored with the checklist at the bottom: `lib/story.js` `house()` is a 6x6 hollow box of
one plank, a flat slab lid, four log corners, two glass blocks a side and glowstone in the ceiling, on `clearSet`'s
129x129 flat grass. That scores about **2/10**: box shape, flat roof, flush walls, no foundation, no landscaping,
even dimensions (no centre for the door), and nothing behind it but a flat plain. Use it only for interiors seen
from inside, or replace it with the recipes below.

---

## 1. The top 15 rules

1. **Start from a good site, not a clearing.** Build into terrain that already has hills, trees or water (scout it,
   or `/place structure minecraft:village_plains`), and fit the build to the land. Don't flatten more than the
   footprint plus 2 blocks. `clearSet` is for emergencies, never the default.
2. **No box.** Every building is 2-4 volumes (a main mass plus wings, a porch, a tower, a lean-to), in an L, T or
   offset plan. Secondary volumes are 1/3-1/2 of the main one and at a different height.
3. **Odd dimensions.** Walls 5, 7, 9, 11, 13 long so doors, windows and roof peaks have a centre block. A gable
   roof over an odd width ends in a single ridge block; an even width leaves a flat 2-wide top.
4. **No flat wall plane wider than 5 blocks.** Break it with a frame: a log pillar every 3-5 blocks set 1 block
   proud of the wall (or flush corners plus proud mid-pillars), a horizontal beam of logs at each floor line, and
   windows recessed 1 block (glass panes in the back plane, which reads as a ~0.4 block recess on its own).
5. **Three depth layers on every facade:** the wall plane, the frame (pillars, beams, 0 to +1), and trim
   (stairs/slabs/trapdoors/fences, +0.5). Depth should look structural (a beam carries a floor, a buttress holds a
   wall, a sill sheds water), not random bumps.
6. **Roofs are pitched, made of stairs, and overhang.** 45 degrees (one stair up per block in) by default, steeper
   (2 up per block) for fantasy/nordic. Eaves overhang the walls by 1 block on every side, gables by 1. Never a flat
   slab lid on a house.
7. **Roof contrasts the walls.** Dark roof over light walls (or the reverse), from a different material family.
   Trim the gable edges and the ridge with a third block (a different wood, or the stone's wall/slab). Upside-down
   stairs under the eaves.
8. **Foundation 1-3 blocks of stone, down to the terrain.** Nothing floats and no dirt shows under a wall. On a
   slope the foundation steps down on the low side (fill every column down until it hits ground). The base layer
   is the darkest, roughest block of the palette.
9. **Palette 60/30/10, 3-5 blocks.** 60% primary (walls), 30% secondary (frame and roof), 10% accent (door, trim,
   flowers, lanterns). Pick from one style table below. Never more than two wood types on one building.
10. **Texture inside a colour, not across colours.** Big surfaces (walls over 5x5, roofs, paths, foundations) mix
    2-4 close blocks of the same shade (e.g. 60% stone_bricks, 25% cracked, 15% mossy), clustered, darker at the
    base, corners and openings, lighter up high. No checkerboards, no horizontal stripes, no random splatter.
11. **Scale for the camera and the player.** The player is 1.8 tall and a door is 2: storeys are 4-5 blocks floor
    to floor, ceilings 3-4 inside, a cottage footprint at least 7x9, a hall 11x17+, and the focal building of a set
    at least 25% taller than anything around it. A set fills the frame out to the fog (render distance 12 = 192
    blocks), not a 30-block patch.
12. **Landscape everything you touched.** Paths of dirt_path + coarse_dirt + gravel edges that curve (no straight
    run over 7 blocks except roads inside a town), flowers and bushes against walls, trees (`/place feature`) in
    clumps of 2-3 at different sizes, boulders, a fence or wall line, water if the site has it. Terrain gets texture
    too (coarse_dirt, podzol, moss, rooted_dirt patches under trees and on paths).
13. **Detail last, and densest at the focal point.** Shell, then roof, then depth, then details: shutters
    (trapdoors), window boxes (trapdoor + flower pot / azalea), lanterns on chains, fence-post railings, barrels,
    hay, a chimney with a campfire on top. Detail density rises toward the door the camera looks at.
14. **Light for mood.** Warm light sources inside and at doors (lantern, hanging lantern on `iron_chain`, campfire,
    shroomlight hidden behind trapdoors) so windows glow at dusk; no bare glowstone or torch-spam; dark gaps
    between lights so the frame has shape. Shoot exteriors at golden hour (time 12000-13000, 23000-0) or night.
15. **Variety with one palette; asymmetry with balance.** In a settlement, every house shares the style table but
    differs in size, footprint, roof direction and height, and one detail (a porch, a balcony, a dormer, a chimney).
    Organic layout along the terrain around one focal point (a well, a tower, a big tree, the meeting point). Mirror
    only the parts that should be formal (a gate, a temple front); never a whole village of copies.

---

## 2. Mechanical recipes (what to emit)

Coordinates below are relative to the build's origin; `A(dx, dy, dz)` is the set kit's offset helper.

### 2.1 Footprint
- Choose a main mass `W x D` with W, D odd, W >= 7, D >= 9. Add one or two wings: width `W2 = 2*floor(W/4)+1`
  (odd, about half), attached off-centre (not on the middle axis), height 1 storey less or 1 more.
- Before building, sample ground height at the 4 corners and the centre (bot `blockAt` scan down, or
  `execute if block`). If they differ by more than 4, either step the building (split-level) or move it.
- Floor level = the highest sampled ground + 1 on the uphill side (so the floor never digs into a hill more than 1).

### 2.2 Foundation (follows the terrain)
```
for every column (x, z) of footprint + 1 ring:
  /fill A(x, floorY-1, z) A(x, floorY-8, z) <foundation_block> replace #minecraft:replaceable
/fill A(x0-1, floorY-1, z0-1) A(x1+1, floorY-1, z1+1) <foundation_trim> (stairs/slab ring, or the darker stone)
```
`#minecraft:replaceable` covers air, water, short_grass, ferns, vines and snow layers (not flowers: clear those first
with `replace #minecraft:flowers` -> air), so the foundation stops on solid ground and the visible part is exactly
what the slope exposes. One ring wider than the walls makes a plinth.

### 2.3 Walls with a frame (the default facade)
For a wall from `a` to `b` (inclusive, odd length L) at height `h`:
1. Fill the wall plane with the primary block (mixed per rule 10 if L x h > 25).
2. Corner posts: logs, full height (axis=y), 1 block proud is optional, flush is fine at corners.
3. Mid pillars: log every `p` blocks where `p` is 4 when L is 9, 13, 17 and 3 when L is 7, 11, 15 (pillars land on
   odd steps so bays are equal). Set them 1 block proud for stone styles, flush for timber framing.
4. Beam at each floor line and at the top plate: logs with `axis=x` or `axis=z` along the wall, 1 proud on upper
   floors (jetty: the upper storey overhangs the lower by 1, upside-down stairs underneath).
5. Windows: centred in each bay, 1 wide x 2 high (cottage) or 3 wide x 2-3 high (hall), glass_pane in the plane
   1 block behind the wall face (so the recess casts a shadow); sill = upside-down stair or slab below, trapdoor
   shutters (open, facing out) either side, a trapdoor or stair "brow" above.
6. Door: centred in its bay, recessed 1, framed by stairs/slabs, a lantern beside it, a path leading to it.

### 2.4 Gable roof (stairs, overhang, trim)
For a roof over a W-wide (odd) span running along z, eave height `e`:
```
for i in 0..(W+1)/2:            # one course per step in from the eave
  y = e + i
  left  x = x0 - 1 + i  -> <roof>_stairs[facing=east]  from z0-1 to z1+1
  right x = x1 + 1 - i  -> <roof>_stairs[facing=west]  from z0-1 to z1+1
ridge (last course, single x): <roof>_slab[type=bottom] or the full block, from z0-1 to z1+1
under the eaves: <roof>_stairs[half=top] facing in, along both long sides (soffit)
gable ends (z0 and z1): fill the triangle with the secondary/primary wall; frame its edge with stairs of a
  different wood (barge board); vertical log or a small window in the gable centre
```
- The overhang is the `-1` / `+1`: 1 block past every wall. Add a second course of eave (slab below the first
  stair) on halls for a 2-block overhang.
- Steeper roof: two stair courses per step (stairs then full block), or slab-stair alternation for a softer pitch.
- Vary: cross gables where a wing meets the main mass (wing roof ridge 1-2 lower), a dormer (3-wide mini gable) on
  long roofs, a chimney (cobble/brick, 1x1 or 2x1, 2 blocks above the ridge, campfire on top for smoke).
- Placed stairs auto-connect into corners only through block updates: place them with `/setblock` in a normal
  order (not `strict`), or set `shape=inner_left/outer_right` explicitly at hip corners.

### 2.5 Interiors (only for rooms the camera enters)
- Ceiling 3-4 blocks (not 2), exposed beams across it every 3-4 blocks.
- Floor: mixed planks or the stone mix; rugs (carpet) under furniture.
- Furniture from blocks: stairs + trapdoor sides = chair, fence + pressure plate/carpet = table, barrels and
  bookshelves along walls, a hearth (campfire in a stone surround) as the room's light and focal point.
- Light: 2-3 warm sources at different heights (hanging lantern, candles on a table, the hearth), not a ceiling grid.

### 2.6 Landscaping pass (after every building)
- Path from each door to the nearest road: `dirt_path` centre, edges randomly `coarse_dirt`/`gravel`/`podzol`
  (30%), width 2-3, curving (change direction at most every 5-7 blocks).
- Against each wall: a 1-block strip of flowers/bushes (`bush`, `rose_bush`, `peony`, `lilac`, `azalea`,
  `flowering_azalea`, `sweet_berry_bush`, `fern`, `short_grass`) on 50-70% of the length, gaps elsewhere.
- Trees: `/place feature minecraft:oak|fancy_oak|birch|spruce|pine|dark_oak|cherry|azalea_tree` in clumps of 2-3,
  at least one big one (`fancy_oak`, `mega_spruce`, `dark_oak`) per frame for silhouette. Placed leaves need
  `[persistent=true]` or they decay.
- Rocks: `/place feature minecraft:forest_rock` or hand-made 2-3 block boulders of stone + andesite + cobblestone
  + mossy_cobblestone.
- Fences/walls: a fence line or low `cobblestone_wall` around a garden or along a road edge, broken by a gate.
- Field and life: farmland with crops (wheat, carrots), hay bales, a well, a cart (barrel + fence), animals.
- Water: if the site has a river or pond, make banks irregular (coarse_dirt, gravel, clay, mud), seagrass and
  lily pads; a bridge or dock is a cheap focal point.

### 2.7 Weathering (stone and old wood)
- Base, corners, sills and the area under windows get the darker/rougher variant (cracked, mossy, cobble); upper
  wall and ridges stay clean. Do it in clusters that radiate from those points, never as a uniform random mix.
- Vines/moss_carpet/glow_lichen on the shaded side and near water. Broken (missing) blocks only on ruins.

---

## 3. Style palettes (block IDs, vanilla 1.21.11)

Each table is 60/30/10. "Mix" = blocks to scatter into the primary surface (rule 10).
Check new IDs against the server once: in 1.21.9 `chain` became `iron_chain`, and 1.21.5 added `bush`,
`leaf_litter`, `wildflowers`, `firefly_bush`.

### Medieval / rustic (default for village stories)
| role | blocks |
|---|---|
| foundation | `cobblestone`, mix `mossy_cobblestone`, `andesite`, `stone`; trim `cobblestone_stairs`/`_slab` |
| walls (60%) | timber frame: `stripped_spruce_log`/`spruce_log` frame, infill `white_terracotta` or `calcite` or `mud_bricks` (daub), or `oak_planks` |
| frame/beams | `spruce_log`, `dark_oak_log` (one dark wood per build) |
| roof (30%) | `spruce_stairs`/`spruce_slab`, or `dark_oak_stairs`; gable trim `oak_stairs` or `stripped_spruce_log` |
| accent (10%) | `spruce_trapdoor` shutters, `lantern`, `iron_chain`, `barrel`, `hay_block`, `flower_pot` + `potted_red_tulip`, `oak_fence` |
| paths | `dirt_path`, `coarse_dirt`, `gravel`, town square `cobblestone` + `stone_bricks` + `andesite` |

### Stone keep / castle
| role | blocks |
|---|---|
| foundation | `cobbled_deepslate`, `deepslate_bricks`, `tuff` |
| walls | `stone_bricks` 55%, `cracked_stone_bricks` 15%, `mossy_stone_bricks` 10% (low), `andesite` 10%, `stone` 10% |
| frame | `polished_andesite` or `deepslate_brick_wall` buttresses, `dark_oak_log` beams |
| roof | `deepslate_tile_stairs`, `dark_oak_stairs`; spires `deepslate_tiles` |
| accent | `lantern`, `iron_bars`, `dark_oak_trapdoor`, `red_banner` (renders), `polished_blackstone_button` |

### Nordic / viking
| role | blocks |
|---|---|
| foundation | `cobblestone`, `stone`, `mossy_cobblestone` |
| walls | `spruce_planks`, `stripped_spruce_log` horizontal (axis x/z) for log-cabin walls |
| frame | `spruce_log`, `dark_oak_log` |
| roof (steep, 2:1) | `spruce_stairs` or sod: `moss_block`/`grass_block` with `dark_oak_stairs` edges; crossed gable ends of `stripped_dark_oak_log` |
| accent | `campfire`, `lantern`, `white_wool`/`light_gray_wool` hides, `hay_block`, `spruce_fence` |
| ground | `podzol`, `coarse_dirt`, `snow` layers, `spruce`/`pine` trees |

### Japanese
| role | blocks |
|---|---|
| foundation | `stone_bricks` or `polished_andesite` on a raised platform (1-2 blocks), `andesite_wall` posts |
| walls | `white_concrete` or `calcite` or `birch_planks` (paper screens), panels framed by the frame wood |
| frame | `dark_oak_log`/`stripped_dark_oak_log` (darker than the walls) |
| roof | `deepslate_tile_stairs` or `dark_oak_stairs`, wide eaves (2 blocks), corners lifted with an extra stair; ridge `deepslate_tile_slab` |
| accent | `cherry_planks`/`cherry_trapdoor` (small doses), `bamboo_fence`, `lantern`, `red_terracotta` for torii/shrine |
| ground | `gravel` raked yard, `moss_block`, `cherry` trees, `bamboo`, `water` + `lily_pad`, stepping `smooth_stone_slab` |

### Desert
| role | blocks |
|---|---|
| foundation | `sandstone`, `smooth_sandstone` |
| walls | `smooth_sandstone` 60%, `sandstone` 25%, `cut_sandstone` 15%; or `packed_mud`/`mud_bricks` for adobe |
| frame | `cut_sandstone` bands, `stripped_jungle_log` or `stripped_acacia_log` poles (vigas) sticking out 1 block |
| roof | flat is right here: `smooth_sandstone_slab` with a 1-block parapet of `sandstone_wall`; domes of `orange_terracotta`/`white_terracotta` |
| accent | `orange_terracotta`, `cyan_terracotta`, `terracotta`, `white_wool` awnings, `lantern`, `dead_bush`, `cactus`, `decorated_pot` (check it renders first) |
| ground | `sand`, `smooth_sandstone` paths, `red_sand`, `coarse_dirt` |

### Fantasy / storybook
| role | blocks |
|---|---|
| foundation | `cobblestone` + `mossy_cobblestone` + `andesite`, rounded with walls/stairs |
| walls | `white_terracotta` or `calcite` plaster over `stone_bricks` lower floor; `oak_planks` upper |
| frame | `dark_oak_log`, curved jetties (each storey overhangs by 1) |
| roof (steep, curved: alternate stair/slab courses) | `dark_prismarine_stairs`, `purple_terracotta`, `crimson_stairs`, `warped_stairs` or `deepslate_tile_stairs`; ridge `amethyst_block` or `copper` variants for a rich look |
| accent | `lantern`/`soul_lantern`, `amethyst_cluster`, `flowering_azalea_leaves[persistent=true]`, `glow_lichen`, `mushroom_stem` + `red_mushroom_block` |

### Dark / haunted (pale garden, swamps, night stories)
| role | blocks |
|---|---|
| foundation | `cobbled_deepslate`, `mud`, `mossy_cobblestone` |
| walls | `pale_oak_planks` or `dark_oak_planks`, `tuff_bricks` |
| frame | `pale_oak_log` or `dark_oak_log` |
| roof | `dark_oak_stairs`, `deepslate_tile_stairs`, broken in places |
| accent | `soul_lantern`, `cobweb`, `pale_hanging_moss`, `pale_moss_carpet`, `creaking_heart` (the block), `iron_bars` |

### Plains village (vanilla, `village_plains`)
oak_planks/oak_log/stripped_oak_log, cobblestone foundations, oak/spruce stair roofs, white and yellow wool
details, dirt_path roads. Use it as a base and upgrade it (section 5).

---

## 4. Building for the camera

- **Silhouette first.** A set must read when it is pure black against the sky: varied roof heights, a tower or a
  big tree breaking the skyline, chimneys. Test with a still at dusk (`DAY_TIME=13000`) or `LOOK` off.
- **Value contrast.** Dark roofs over light walls, a light path through dark grass, a lit doorway in a dark facade.
  Where the action is, put the highest contrast and the most detail.
- **Three planes in every shot.** Foreground (a fence post, leaves, a lantern, a barrel within 2-6 blocks of the
  camera), middle ground (the action and the building), background (more roofs, a hill, trees, a tower) out to the
  fog. Build the background even when it is only shells: 20-60 blocks away nobody sees inside.
- **Build toward the shot list.** Read the story's shot list first; for each camera, place something in front, the
  subject at 1/3 of the frame, and a landmark behind. A wide establishing shot needs the focal building plus
  2-3 other buildings and terrain in frame.
- **Depth of field likes layers.** The look's `dof` blurs near and far; a set with a near prop and a far skyline
  shows it, a flat plain hides it.
- **Light the night.** Lit windows (lantern inside, glass_pane in front), lanterns on posts every 8-12 blocks of
  road, a campfire glow. Leave dark between them.
- **Avoid in frame:** cut terrain walls, floating blocks, chunk-edge holes, half-built backs of buildings (the
  camera might turn), and identical copies side by side.
- **Renderer limits** (`renderer/blockentities.js`): signs, hanging signs, chests, beds, bells, banners, skulls and
  shulker boxes draw. Decorated pots, lectern and enchanting books, conduits and item displays may not: render one
  still before relying on them.

### Camera-readability checklist (every planned shot, from a `./hb still` at the Short's size; docs/look.md)
1. **Subject big enough:** medium >= 45 % of the game view's height, close face >= 25 %, wide >= 12 % (the game view
   is only 53 % of the phone screen).
2. **Subject separates from what is directly behind it:** a different value (luma gap >= 0.15) or colour family; no
   brown villager against spruce, no Steve against grey stone, no golem on sand, no dark mob on a dark wall
   (`scripts/cast_contrast.py` lists the clashes).
3. **Three planes:** something within 2-6 blocks of the camera, the action, and a landmark or skyline behind.
4. **One focal point:** the brightest, most detailed, highest-contrast thing in frame is where the line's subject is.
5. **Silhouette against the sky** for establishing shots (roofline, tower, big tree), readable at dusk.
6. **Light on faces:** by day out of tree and roof shade; at night a lantern/campfire within 4 blocks (torch 3) on the
   camera's side. `python3 scripts/look_stats.py still.png [--night]` passes (subject luma 0.35-0.70 day, >= 0.25 night).
7. **Clear lower band:** nothing that matters between 0.62 and 0.80 of the game view's height (the captions sit at 0.70).
8. **No set edge in frame:** no cut terrain, chunk holes, unbuilt backs or flat plain to the fog in any planned camera.

---

## 5. Using vanilla structures as the base

Vanilla structures are part of the game, so placing them in our world is ordinary gameplay (no file to license or
commit). They are the fastest way to a lived-in set; then upgrade them.
```
/place structure minecraft:village_plains ~ ~ ~        # needs a valid biome at the spot (plains/meadow)
/place structure minecraft:village_taiga|village_snowy|village_desert|village_savanna
/place jigsaw minecraft:village/plains/town_centers minecraft:bottom 6 ~ ~ ~   # a village grown from one centre, any biome
/place template minecraft:village/plains/houses/plains_small_house_1 ~ ~ ~ clockwise_90   # one piece, exact spot
/place structure minecraft:pillager_outpost | ruined_portal | trail_ruins | igloo | ...
/place feature minecraft:fancy_oak ~ ~ ~                 # trees, rocks (forest_rock), flower patches
```
- `/place jigsaw <pool> <target> <max_depth 1-20> [pos]`; `<target>` for village centres is `minecraft:bottom`.
- `/place template <id> [pos] [rotation] [mirror] [integrity] [seed] [strict]`: `integrity 0.85` + a seed gives a
  ruined version of any piece.
- A placed village is random each time: place it once while scouting, record the coordinates and the world seed,
  and reuse that world (`scripts/scout.sh`), or place it with a fixed seed world and a fixed position.
- Upgrade pass on a vanilla village (it scores ~4/10 out of the box): replace its flat dirt-path grid edges with
  textured paths, add foundations under the houses that float on slopes, add eaves/overhangs and shutters to the
  focal house, landscape gardens and fences, add lanterns, add 1-2 bigger custom buildings (a tavern, a tower)
  as the focal point, and plant big trees between houses.
- Don't extract the `.nbt` files from the game jar into this repo: they are Mojang's files and the repo is public.
  Refer to them by ID; the server already has them.

Free building files we could commit: see `docs/research/building_research.md` section 4. In short, almost nothing
online is clearly CC0; write our own generators (this guide) instead.

---

## 6. What to avoid

- One-block-type boxes (all oak_planks, all cobblestone).
- Flat roofs on anything but desert/modern builds; roofs without overhang; roofs of the wall's material.
- Floating builds, dirt or air under a wall, a foundation that stops above the slope.
- Perfect symmetry everywhere, identical houses in a row, a grid layout of a village.
- Too-small scale: 2-high ceilings, 5x5 houses, a 30-block set on a 129-block flat plain.
- Even widths (no centre door, flat 2-wide ridges).
- Splatter textures (random 33/33/33 mixes), checkerboards, stripes of alternating blocks.
- Bare glowstone/torch grids, sea lanterns in a medieval build, an evenly lit scene with no shadows.
- More than 2 woods per building; colours from different style tables (acacia trim on a nordic hall).
- Straight paths, lone lollipop trees, flowers in a perfect line, untouched grass right up to the wall.
- Cut terrain faces in frame (a sliced hill), gravel/sand left hanging (run `clearHanging`).
- Building only the side the camera sees in the first shot: later shots turn around.

---

## 7. Score a build 0-10

Give one point for each line that is true. A set needs **7+** before recording; the focal building needs 8+.

| # | check |
|---|---|
| 1 | Site: natural terrain or a placed structure, no visible flat cleared plain or cut hill in any shot |
| 2 | Shape: 2+ volumes, L/T/offset plan, odd dimensions, not a box |
| 3 | Walls: no flat plane over 5 wide; a frame (pillars/beams) and recessed windows with sills/shutters |
| 4 | Roof: pitched stairs, 1+ overhang all round, contrasting material, trimmed gables/ridge |
| 5 | Foundation: stone base down to the terrain on every side, nothing floating |
| 6 | Palette: one style table, 3-5 blocks at ~60/30/10, large surfaces textured in clusters |
| 7 | Scale: storeys 4-5, focal building 25%+ taller than neighbours, the set fills the frame to the fog |
| 8 | Landscaping: curved textured paths, plants against walls, tree clumps, rocks/fences/water |
| 9 | Detail and light: lanterns, shutters, barrels, chimney etc., densest at the focal point; warm lit windows |
| 10 | Camera: foreground, middle and background in each planned shot; a readable silhouette against the sky |

A reviewer (short-review / minecraft-audit) quotes the score and the missing lines when it calls a set "low effort".
