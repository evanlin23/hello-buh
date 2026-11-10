# goat_horn: set brief (r1)

The premise is a height: a man knocked off a real mountain cliff into a real lake, 28 blocks down, then the same cliff
seen from a road 125 blocks away. So the site is chosen for its relief and water first, and the library pieces go
round it. Coordinates as in the bible: the oak trunk's north-west corner is (0,0,0) on the shelf, +x east, +z south.
the lake surface is y -28.

## Site
- **What we need:** a natural mountain spur with a shelf (20 x 16, meadow grass) ending in a sheer face 25-30 blocks
  above a lake that is 10+ deep at the cliff's foot, a gentle grassy slope on the lake's west shore for two cottages,
  and a long shore running east to a far ridge 150-200 blocks away. Biome: meadow or a meadow/stony-peaks edge (goats
  spawn on peaks and slopes, one wandering down to a meadow shelf is ordinary).
- **How to find it:** `sets.findShore(ctx)` returns banks with open water straight out, filter them for 20+ blocks of
  height within 6 blocks of the water (`scripts/scout.sh` on the movie branch reads relief, or scan a few candidates
  with `scripts/still.py` top-down). Then `sets.planSite(ctx, [{ name: 'cottage', dx: -42, dz: 26, facing: 'east' },
  { name: 'cottage', dx: -52, dz: 22, facing: 'east' }, { name: 'mine', dx: 190, dz: 95, facing: 'west' }], { reach:
  220 })` around that bank for the rest.
- **Fix-ups allowed on natural ground (not a clearing):** make the face sheer and a little overhanging where the ram
  line meets it (x -2..6, so Dad clears the stone as he falls), and dig the water under it to 10 deep (x -4..8, z
  4..14). Keep the rest of the cliff ragged. No `clearSet`, no flat pad except what `fit` makes under each cottage.

## The shelf and the oak (hand-built, ~20 commands)
- The shelf: natural ground, grass and flowers (`dress.flowers`, `dress.grass`), a mossy boulder at (-5,-3)
  (`dress.rocks`, the foreground of S03 and S11), stone outcrops behind it to the north, a few spruces at the back.
- **The big oak:** a 2x2 oak-log trunk at x 0..1, z 0..1, 13 high, with a broad oak-leaf canopy (radius 6, two lobes,
  a few branch logs) leaning out over the drop. Hand-built, not `dress.tree` (a vanilla `fancy_oak` has a 1x1 trunk:
  too thin to read as the thing the goat hits). Logs are in `#snaps_goat_horn`.
- The ram line: north to south at x 2.35, the goat's spot (2.35,0,-7), Dad's spot (2.35,0,-1), the lip at z 2. Keep it
  clear of flowers and grass (the charge and the step read on bare grass).
- **The switchback stairs:** stone-brick stairs, 3 flights cut into the west end of the face, from the shore at
  (-14,-28,8) to the shelf at (-7,0,-2), a fence rail on the outside, one lantern per landing. They must read as a path
  in S02's tilt.

## Library pieces
| piece | where | facing | variant | why |
|---|---|---|---|---|
| `cottage` (ours) | door (-42,-24,26) on the west-shore slope | east (toward the lake) | `palette: 'spruce'`, `garden: true`, `seed: 213` | S06-S08: the gate (anchor `gate`) where the donkey stands, the chimney smoke in S08's foreground |
| `cottage` (Ida's) | door (-52,-23,22), 12 blocks north-west of ours | east | `palette: 'plaster'`, `seed: 31` | S05: her doorway (anchor `door`), the item frame beside it |
| `mine` | portal (190,-5,95) on the far ridge | west (toward the lake) | default `depth` | the far mines: S06's background, S08's end of the road |

## Dressing
- `dress.frame(ctx, { x: -52, y: -22, z: 23 }, 'east', 'goat_horn')`: Ida's horn at eye height beside her door (item
  frames render with their item: check it reads in S05 at 4 blocks, phone size).
- `dress.path` from our gate along the lake's south shore and up the far slope to the mine portal, `w: 3`, `dress.lamp`
  every ~16 blocks (one at (109,-20,70) for S13's foreground).
- A lane between the two cottages with a fence and flowers (S05's foreground).
- `dress.grove` of spruce and birch on the slopes behind the cottages and along the far shore, `dress.rocks` on the
  shore, reeds (sugar cane) and seagrass in the west shallows (S02's foreground).
- The donkey: summoned with `ChestedHorse:1b`, `Tame:1b`, NoAI, at the gate (S06-S07), then staged walking beside Dad
  (S08, S13).

## What fills each establishing shot out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 (over the lake, looking north-west at the cliff) | the oak's outer leaves | the shelf, the goat, Dad, the sheer face | the stone outcrops and peaks behind the shelf, sky, the lake at the bottom of frame |
| S02 (west shore, looking north-east) | reeds, the nitwit knee-deep (easter egg) | the splash, the cliff foot, the stairs | the stairs climbing to the oak on the skyline |
| S06 (north of our gate, looking south-east) | gate lanterns, fence | the donkey, Dad | across the lake: the shore road, the far ridge, the mine portal |
| S08 (above our cottage, looking east) | our roof and chimney smoke | Dad and the donkey on the shore road, the lake | the cliff and the oak at frame left, the road climbing to the far ridge and the mine |
| S09 (crane rising to behind the goat, looking south at the oak) | the goat's back and horns | Milo at Dad's spot | the lake and the empty road below |
| S13 (the far road, looking west) | the road edge, a lamp post | Dad and the donkey | 125 blocks off: the cliff with the oak on its top (render distance 12+ chunks, no fog) |

## The easter egg
The village nitwit (story_nitwit) in his green coat, knee-deep in the west shallows at (-18,-28,13), facing the cliff,
NoAI, S02 frame left. Provisional: re-check against docs/world/canon.md when it lands.

## Engine needs
| need | status | estimate | plan |
|---|---|---|---|
| **goat model** | **missing**: no `goat` in `renderer/entity_models.json` and no pose function in `renderer/entities.js` (render.js already has its height 1.3 and shadow 0.7) | ~1.5 h | **build it** (under 2 h): GoatModel's body layer from the client (body, head with the beard, left and right horns as separate parts, four legs, texture `entity/goat/goat`), quadruped walk like the cow's. The horns must hide one by one from `extra.leftHorn` / `extra.rightHorn` (Goat `DATA_HAS_LEFT_HORN` / `DATA_HAS_RIGHT_HORN`, read in `lib/harness.js` `onEntities`, a staged `ctx.mark('pose', { ids, leftHorn: false })` for S11). Test on `scripts/pose_fixture.js` (add a goat) and the rule-zero pixel check. |
| **goat ram animation** | missing | ~45 min | build with the model: GoatModel's `setupAnim` lowers the head by `getRammingXHeadRot()` (head xRot up to ~0.9 rad over the 20-tick lower, from entity events 58 START_RAM / 59 STOP_RAM), a staged `ram` flag (`ctx.mark('pose', { ids, ram: true })`) plus 2-3 front-hoof stamps, the charge itself is the goat moved by `K.actor` at ram speed (~0.6 blocks a tick) with a fast gallop. If the pair overruns 2 h: stage the tell as a head-pitch override only and log the rest in docs/engine_requests.md. |
| the ram knockback and the fall | staged | (stunt work) | Dad is a player actor moved on a ballistic arc by the stunt (launch ~1.2 blocks a tick south, 0.45 up, gravity 0.08, drag 0.98: he clears the face and lands ~7 blocks out), the splash particle (`renderer/particles.js` `splash`, count 40) on the water tick |
| donkey chests (ChestedHorse) | **check**: the horse/donkey model is drawn, the chests layer probably not | ~30 min | add the two chest boxes to `HORSE_PARTS` from `DonkeyModel` when `extra.chest` is set (harness: `DATA_ID_CHEST`). Fallback: a saddle and a barrel on a cart is worse, build it. |
| item name above the hotbar ("Goat Horn" on select) | **check** edit.py's HUD: no selected-item-name toast found | ~45 min | vanilla `Gui.renderSelectedItemName` (white, 2 s with a 0.5 s fade, above the hotbar). Under 2 h: build it. The big GOAT HORN caption carries the reveal either way. |
| the horn blown | renders | | `use` pose (ArmPose.TOOT_HORN) in `renderer/poses.js` for S12 (a camera shot, so no first-person horn animation needed) |
| Dad waving, Milo looking at the horn | render | | `wave`, `look_item` poses |
| item frame with a goat horn, the dropped horn item, the map in hand | render | | `dress.frame`, dropped items, `extra.held` |
| sounds: goat prepare-ram, ram impact, horn break, the goat horn call ("Ponder"), splash | **check** `scripts/onscreen_sfx.py` has goat events | ~20 min | add the vanilla `entity.goat.prepare_ram`, `entity.goat.ram_impact`, `entity.goat.horn_break`, `item.goat_horn.sound.0` to its map from the marks |
| render distance for S13 (the cliff at 125 blocks) | check | | 12+ chunks for the S13 recording, no fog |

## Staging notes
- Every mob is NoAI and staged: the goat (ram, step back, peering), the donkey, Ida, the nitwit. The goat's ram must be
  the same in S03 and S11 (same speed, same tell length) so the rewatch compares them.
- S01 starts with the charge already going (`K.preroll`). The fall from the lip to the water is ~2.4 s: S01 holds to
  the splash only if L01 runs long, otherwise S02 opens on the splash.
- S10's step: `K.ctl('right', true)` for 4 ticks on "STEPPED" (one block east), the goat passing within a block of the
  lens, the camera turns with it.
- S11: the horn pops off on the impact tick (the drop item spawned at the trunk's north face with a small hop), the
  goat's left horn hidden on the same tick, the goat steps back 1 block.
- S13: the horn's call is on the audio from S12's "BLASTED" through the hold (the vanilla call is ~7 s). Dad stops on
  "TURNED" and the body turn takes ~8 ticks, the wave starts on "AROUND". End under 1 s later.
