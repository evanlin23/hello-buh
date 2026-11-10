# scarecrow: set brief (r2)

r2: the 2x2 window with four shutters, the lantern post and the 1x1 gap at the scarecrow spot, the dark room for
night D, no village in frame, heights above the local ground, no fog. r2 polish + world: the canon place (Hushwell's
hill farm, y 90+), the boxed-bell easter egg, the lanterns, S02/S07/S08/S10 cameras. See reviews/r1-response.md.

Two library pieces on real ground: the `farmhouse` (Grandpa's farm: the fields with the scarecrow anchor, the porch,
the barn, the paddock) and a `cottage` (ours) on the slope just west of the field, its back wall facing the wheat.
The trail between them is the premise, so the yard between them must read as one clean green slope in S01 and S02.
Coordinates as in the bible: origin at the foot of my window's wall outside, +x east, +z south; every y is height
above the local ground at that x,z (the ground falls 2-4 blocks east from the cottage to the field).

## Site and biome (the honest part)
- **The place is canon: Hushwell's hill farm** (`hill_farm`, to claim; bible "The place and the day"), on the hillside
  south-west of Dog Hill. Origin about (-250, 95, -868), with Hushwell's plaza 95 blocks east and about 15 below.
  Build with `world.build(ctx, { story: 'scarecrow' })` once the claim and its `pieces` are in map.json. **No
  `planSite`, `findSite` or clearing** (the shared-world rule: lib/sets refuses them).
- **Why the height matters.** The biome is Hushwell's plains (0.8). On low plains ground a snow golem leaves **no**
  trail (it lays snow only below 0.8). Above y 80 the temperature falls with height (0.05 per 40 blocks, plus
  noise), so at y 90+ it is about 0.77-0.79 and the golem lays snow. It still never snows there (snowfall needs under
  0.15). **The whole yard and the trail must be at y 90 or higher.** Read it off the survey grid before claiming. If
  it's lower, slide the place west along the ridge (keeping the plaza east of the field for S08's easter egg).
- **Never fake the biome**: no `plainsBiome()` (it would be a no-op here anyway) and no `/fillbiome`.
- **Check it on the server once (2 min):** `/summon snow_golem` on the yard and let it walk 10 blocks. It must leave
  snow layers on the grass. If it doesn't, the yard is too low: move the place, not the story.
- **The ground** falls gently **east** from the cottage to the field (2-4 blocks over the 20-block yard), with the
  hill rising behind the cottage to the west and north (Dog Hill's ridge) and the slope running down east to
  Hushwell. The fit (`lib/sets/terrain.js`) gives the cottage a stone foundation on its downhill (east) side, which is
  what we want.
- `gamerule mobGriefing true` (default) if the golem is ever run live; `difficulty normal` (zombies can't break doors).

## Library pieces
| piece | where | facing | variant | changes after `place` |
|---|---|---|---|---|
| `cottage` | back (east) wall on x 0, the back window centred on z 0 | `west` (door and garden on the far side, back to the field) | `palette: 'spruce'`, `bed: 'red'` | **my window**: the back window over the bed (the piece's north-wall window at `facing: 'south'`, `sill(3, 2, r.pz0)`, which is over `bed`) is **2 wide x 2 high** (the piece's `sill` is w 2, h 2): it loses its glass panes and its outside slab sill, and **four spruce trapdoors** fill the opening (`open=true`: vertical, closed shutters). On "OPEN" (L09) all four go `open=false`, the lower pair `half=bottom` (flat at the bottom of the opening) and the upper pair `half=top` (flat at the top), leaving the opening clear. The opening's bottom must be 3 blocks above the outside grass (the foundation): check, and raise the cottage a block if the fit gives less (zombies must have no way in). Inside: the piece's hanging lantern and hearth `campfire` are lit for S05 (night B). For night D (S09-S11) take the lantern down and set the hearth `campfire[lit=false]`: the room is dark |
| `farmhouse` | piece origin (18, y, -17) so the scarecrow spot is (21, 0) | `south` (porch faces the field) | `palette: 'spruce'`, `crops: ['wheat', 'carrots', 'potatoes', 'beetroots']` | **remove the piece's hay scarecrow** (fence post, hay block, carved pumpkin and the two fence arms at local x 4..6, z 17: it stands over the water channel, where a snow golem would melt); the snow golem stands at local (3, 1, 17) = world (21, 0) instead, in the wheat west of the channel. **Fence gap:** remove the field's west fence at local x 1, z 16..18 (world (19, -1..1)). **Porch pumpkins:** four `carved_pumpkin[facing=south]` along the porch's front edge (local x 3, 5, 8, 10, y 1, z 10). **The spot:** a 1x1 coarse-dirt gap in the wheat at (21, 0), where the golem stands; a fence post with a lantern at (22, 1, 1) beside it (lit day and night: it reads in S01, S07, S08 and lights the empty gap in S10b). Leave the wheat ripe (age 7) and unharvested |

## Dressing
- **The trail** (morning shots): snow layers (`snow[layers=1]`) along a slightly wandering 1-2 wide line from (18, 0)
  to the patch at (6, -6), drawn as a golem would walk it (a gentle curve, not a ruler line); none on the farmland,
  wheat, dirt path or flowers (vanilla). Clear flowers off the line first (Mom mows the yard: short grass, flowers
  either side). **The patch**: 3x3 at (6, -6) with a few extra layers round it (ragged edge). S03 digs 2 blocks of it
  near (15, -2): set those layers after S01/S02 are recorded, or record S03 last among the mornings.
- **Rotten flesh** (S06): two dropped `rotten_flesh` items at (0.8, 0, 0.5) and (1.2, 0, -0.8), with `PickupDelay`
  32767 and `Age` low so they don't despawn during the take.
- **The yard**: `dress.grass` and `dress.flowers` either side of the trail (S04's foreground), a woodpile at the
  cottage's back corner, Grandpa's yard lantern on a fence post at (3, 1, -3), and a lantern hanging under the eave beside the window at
  (0.5, 5, 1.5). Together they put a lantern within 4 blocks of every face in S11 (STANDARDS 3.4). The scarecrow
  spot's lantern post is at (22, 1, 1). Keep every lantern 4+ blocks (Manhattan) from the trail and the patch: block
  light over 11 melts snow layers.
- **The farm**: four cows in the paddock; the porch lantern lit; the barn doors open.
- **Fill to the horizon** for each establishing shot (no fog in this story: haze and hills give the depth):
  - S01 (looking west from the wheat): fg the pumpkin's back and ripe wheat; mid the trail across the yard, the
    cottage's back wall and window; bg the hill rising behind the cottage, a `grove` of oak and birch 25-40 blocks
    west, hills to the horizon.
  - S02 (crane, key 1 (2, 20, 26) looking at (4, 0, -3)): fg the yard and the trail; mid the cottage, the farmhouse
    roof; bg the hillside, groves 30+ blocks north, Dog Hill's ridge. The scarecrow sits just past the right edge:
    check the sheet, no white body in frame before L06.
  - S07 (camera (33, 4, 6) looking at (23, 1, -5)): fg the south-east plot and its fence; mid Mom (16 blocks: check
    she reads at 300 px, FOV 40 if not), the porch, its pumpkins, the scarecrow and its lantern post small at frame
    left; bg the farmhouse front and roof, the hillside beyond.
  - S08 (camera (16.5, 1.6, 1.0) looking east at the pumpkin): bg the field falling away east and Hushwell far below,
    the boxed bell a white speck at frame right (the easter egg).
  - S11 (night, from the window down, then (8, 5, 8) looking at (2, 1, -4)): fg the moonlit grass; mid the wall, the
    window, the zombies, the golem on its patch, the yard and eave lanterns; bg the cottage roof and the hill line
    under the moon. (The field and the porch are off this frame.)
- **Hushwell** is the seed's generated village plus its canon stamps (`world.build` puts the boxed bell back): nothing
  to build for it here.

## The easter egg
`boxed_bell` (canon cameo, since day 1400): Hushwell's bell boxed in white wool, a white speck in the plaza 95 blocks
east and 15 below, at S08's frame right under the horizon. `world.build` builds it (Hushwell's stamp). Check on the
S08 sheet that it shows (a few pixels is enough: it's an easter egg). If the hill hides the plaza, it's the one
thing to re-aim. (r1's nitwit egg is dropped: canon has him gone from Fernbank's day 520.)

## Cast staging
- **The golem**: `snow_golem` with its pumpkin (default `Pumpkin: 1b`). Mornings: NoAI at (21, 0) facing west.
  Night (S11): either **live** (AI on, three zombies summoned at the wall with AI on, the bot in survival at the
  window 3 blocks up, the golem summoned at the patch: it targets them and throws by itself; vanilla knockback does
  the shoving) or **staged** (golem NoAI at the patch facing the wall, `K.every` summoning a `snowball` with `Motion`
  aimed at a zombie about once a second, with the golem's shoot sound; the knockback is vanilla on impact). Try live
  first (it's the truth); keep the staged version if the zombies wander. Either way the zombies must stay within a
  few blocks of the wall and the golem must stay on the patch for S11's 3.5 s.
  The golem throws only from S11's first frame: in S10 (POV, yaw pinned east) no golem, snowball or puff may show
  (with a live golem, summon it at the patch on S11's cut; staged, start the throws at S11).
- **Mom**: villager, plains farmer, NoAI, on the porch at (25, -8) facing south-west (S07).
- **Milo in camera shots**: S05 the player actor sitting on the bed (`sit` pose), facing into the room; S11 the bot
  (or actor) standing in the window, head and shoulders above the opening's bottom.

## Engine needs
| need | status |
|---|---|
| snow golem with its carved pumpkin head | the model is in `renderer/entity_models.json` (`snow_golem`, materials default + `snow_golem_pumpkin`): **check one frame** that the pumpkin draws (S01's back of the head, S08's face) |
| snow layers on grass, wheat, farmland, carved pumpkins, spruce trapdoors (open and flat), lanterns | blocks: render (check the snow layer reads white and thin at 300 px in S01) |
| thrown snowballs | render (`THROWN` in render.js, the item sprite) |
| **snowball hit puffs** (vanilla: a snowball breaking sends 8 `item` particles of the snowball sprite, `Snowball.handleEntityEvent(3)`) | **missing.** `renderer/particles.js` already has `item_break` (BreakingItemParticle, the same particle class): add a `snowball_hit` type, 8 particles with the snowball texture at the impact point, added with zero speed (only the small random spread `Particle`'s constructor gives), fired from a mark at each impact (the harness sees the snowball entity vanish: mark its last position). **~45 min: build it** (it's the reveal's readability: each hit has to read). Gate it on the new mark so old recordings render the same |
| snowballs in flight | render (`THROWN` in render.js): confirm on S11's shot sheet before the render, with the puffs |
| a snowball hit on a zombie | knockback only (snowballs do zombies no damage): the puff and the shove carry each hit. Don't add a red flash or hurt sound unless vanilla plays one for a 0-damage hit (check in game first) |
| dropped items bob and spin (rotten flesh) | render (`item`) |
| player `sit` on the bed | `sit` pose (docs/engine_features.md) |
| zombie arms up | render (zombies hold their arms out) |

No warden, no lightning, no GUI screens. Nothing here needs more than the snowball puffs.

## Look
- Mornings 1000, clear, `look: 'auto'` (the dawn-warm grade): the trail must be the brightest white in S01/S02; keep
  bloom low enough that the snow layer doesn't blow out into the grass.
- Night 18000, full moon: the night grade; the porch lantern and the corner lantern are the only warm lights. Every
  S11 subject within 14 blocks of the lens. Fog: none needed (`look.fog: false`).
