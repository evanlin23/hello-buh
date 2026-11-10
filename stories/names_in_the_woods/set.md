# names_in_the_woods: set brief (r2)

The set is a hamlet on a slope at the east edge of a dark oak forest, with a meadow climbing west from the hamlet's
fence to the trees. The shots that carry the story (S01 and its echo S11) look west from just inside the gate, up the
meadow, at zombies 14-16 blocks out with the black treeline behind them against the sunset. That view must be real
terrain with relief. Every piece follows `docs/building_guide.md`.

## Site
- **What to find:** a plains (or meadow) edge against a dark forest, with the ground rising **west** from the hamlet:
  ~6-8 blocks of climb over the 30-block meadow, the forest rising beyond it. The sun sets in the west, so the forest
  must be west of the hamlet.
- **How:** `sets.planSite(ctx, layout, { reach: 200 })` over the layout below, plus a score term for the ground 25-40
  blocks west of the gate being 5-10 blocks higher and wooded. If that forest isn't dark oak, plant
  `sets.dress.grove(ctx, { x: gate.x - 45, z: gate.z, r: 25, n: 40, kinds: ['dark_oak'] })` and rings north and south,
  so the treeline fills S01's frame width.
- No `clearSet`, no flat clearing. Clear only the hamlet's footprint (`sets.dress.clearTrees`). Leave the meadow natural
  (grass, flowers, two boulders).

## Library pieces (gate at local (0,0); +x east, -x west, +z south)
| piece | where (dx, dz) | facing | variant | role |
|---|---|---|---|---|
| `cottage` (Mom's) | gate (10,-6), house north of it | south | `palette: 'plaster'`, `garden: true`, `bed: 'purple'`, `seed: 7` | S03 (the crane lands on its gate), S06; inside S04 and S08. Brewing stand with three splash potions on the garden table by the door (her cleric job site). Trapdoor shutters on the west window (they close in S04). Kitchen chest by the window: 1 Splash Potion of Weakness, 1 golden apple (S08). |
| `cottage` (TOMAS) | gate (14,6), south of the lane | north | `palette: 'oak'`, `seed: 21` | empty: shutters closed, garden overgrown (`dress.grass` tall, no flowers), a composter by the door, sign TOMAS |
| `cottage` (GRETA) | gate (30,6) | north | `palette: 'birch'`, `seed: 22` | empty; a lectern; sign GRETA; a cobweb in the door |
| `cottage` (OLD BEN) | gate (40,6) | north | `palette: 'spruce'`, `seed: 23` | empty; a barrel, a fishing rod in an item frame; sign OLD BEN |
| `house2` x2 | (30,-14), (44,-12) | south | `palette: 'plaster'` | lived-in (HUGO, NELL) |
| `cottage` | (48,8) | north | `palette: 'stone'`, `seed: 24` | lived-in (PIA), a sheep pen beside it |
| `well` | (24,0) | south | default | the lane's centre (S03, S09 background) |

- **The lane:** `sets.dress.path` from the gate east to (52,0), w 3, with branches to every gate. Lamps every ~10 blocks.
- **The fence and gate:** `sets.dress.fence` along x=0 from z -22 to +22, an oak fence gate at (0,0), lantern posts
  (`dress.lamp` h 3) at (0,-2) and (0,2), always lit.
- **The meadow path:** `sets.dress.path` from (-1,0) to (-30,2), w 2, frayed. **One lamp post at (-15,2)**: the key
  light on the zombies' faces in S01 and S11, and on ROSA in S12-S15. Flowers and grass either side, boulders
  (`dress.rocks`) at (-8,-9) and (-20,10).
- **Fields beyond the east end:** `dress.crops` (wheat, carrots) at x 55-80, for S03's crane.

## Cast staging
- Every villager and zombie villager: `CustomName`, `CustomNameVisible:1b`, persistent, silent. They are NoAI except
  while staged as actors (`K.actor`, walking). Zombie villagers: type plains, professions farmer (TOMAS), librarian
  (GRETA), fisherman (OLD BEN), cleric (ROSA). The zombies have their arms raised in every shot (the zombie pose), which
  is the default for a zombie with a target.
- Mom (cleric villager) holds the golden apple in S06, S07 and S10 (`HandItems`; vanilla villagers show a held item
  over their crossed arms). In S06 a bottle leaves the brewing stand on "SPLASH POTION" (a block-state change to
  `has_bottle_2=false`): she has taken it.
- ROSA: `HandItems:[{id:"golden_apple"},{id:"splash_potion",components:{potion_contents:{potion:"weakness"}}}]`. On
  "DROPPED" (S13) clear her off hand and summon the potion item at her left hand with a small forward motion, so it
  falls and lands at (-13.5,0), `PickupDelay:10`.
- The zombies stop and stare: at the fence in S02 (3 blocks beyond Mom), at the lamp post from S13 (ROSA at (-16,0),
  the three at x -20 to -22). Staged actors.
- Difficulty Hard. Kill chickens every tick in S09 (an egg can hatch one).
- The throw (S15): the bot really throws the splash potion on "Potion" (`bot.activateItem`, slot 3, aimed at ROSA's
  chest 3.5 blocks away). Then it selects slot 2 on "APPLE". The splash colour and swirl come from the recording
  (render.js colours a thrown potion's splash from LevelEvent 2002). No damage to ROSA.

## What fills each establishing shot, out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 / S11 (from (2, 2.0, 0) looking west, FOV 50) | the gate's top rail | the zombies 14-16 blocks out on the rising path, arms raised, the lamp post at (-15,2) on their faces, tags in the upper third | the dark oak treeline across the width at ~32 blocks, the forest rising behind, the orange sky; no build visible west |
| S03 (crane from 14 up over x 4 looking east, down to Mom's gate) | the lane, villagers with tags | seven cottages, the well, gardens, lamps, the sheep pen | fields to x 80, hills, **the easter egg** on the far east hill, fog |
| S05 (WS POV from (4,0), east-south-east down the lane) | the lane | Mom 8 blocks away; the three empty cottages receding, signs and job blocks | the lane's far end, the stone cottage, fields |
| S10 (9 up behind the gate, looking west) | the gate lanterns, Milo small | the meadow, Mom from (-22,1) to the trees | the treeline with the low sun over it |

## Easter egg (provisional: re-check against docs/world/canon.md when it lands)
The carpeted village of Light Sleeper on the far east hill, seen at the start of S03's crane. Build a stand-in on a
hill ~110-140 blocks east of the gate: 4-5 small houses with red and orange carpet roofs and a post with a bell boxed in
white wool, small in the haze, never named. If canon lands with real coordinates, place this hamlet "one valley west"
of it and drop the stand-in.

## Engine needs
| need | status (checked 2026-11-10) | estimate | decision |
|---|---|---|---|
| **Name tags over heads** (docs/engine_requests.md #7, queued) | Mostly there: render.js draws a custom-named mob's nameplate with `CustomNameVisible` (or under the crosshair) within 64 blocks (render.js ~2538; `nameTagTexture` in renderer/blockentities.js). Missing: the **player** nameplate over Milo in camera shots (S14), and a still of S01 to check the plates read at 14-16 blocks at dusk | ~1 h | build; update #7's status when it lands |
| **Held item on a villager** (CrossedArmsItemLayer: Mom's apple) and **a mob's off-hand item** (ROSA's potion, S11-S13) | Mob main-hand items are recorded (`extra.held`, harness ~516) and drawn in a humanoid `rightArm` (entities.js ~1155), so ROSA's apple already draws. The villager model has one crossed `arms` bone, so Mom's apple doesn't. Mob off hands aren't recorded (equipment[1] is read for players only) | ~1.5 h (CrossedArmsItemLayer under the arms bone; record equipment[1] for mobs and mirror the item group onto `leftArm`) | build |
| **The selected item's name above the hotbar** (Gui.renderSelectedItemName: "Splash Potion of Weakness" in S13, "Golden Apple" in S15; ~2 s after a slot change, fading) | not drawn by edit.py's HUD | ~1 h (edit.py: the display name in the hotbar font above the hotbar, fade over the last 10 ticks) | build. The narration says POTION and APPLE, so the story reads without it. |
| Egg throw and pop, splash potion throw and splash | rendered (render.js THROWN, the splash colour) | 0 | verify on the shot sheet |
| Zombie villager outfits (plains farmer, librarian, fisherman, cleric) | entities.js draws type and profession layers | 0 | verify ROSA's robe matches Mom's |
| Brewing stand bottles, trapdoor shutters, chest screen | block models; the chest screen GUI exists | 0 | verify |
| Dusk readability (backlog #1: dark scenes read black) | S11-S15 at 13400-13500 | stage around it | every dusk subject within 3 blocks of the path lamp or a lantern, or against the bright west sky |

Total ~3.5 h, as three separate features each under 2 h, each tested by the rule-zero still diff. No lightning and no
sun disc needed.
