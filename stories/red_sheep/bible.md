# red_sheep: continuity bible (r3, 2026-11-11)

## World
- **Place:** Ravenford (canonical: `ravenford` in docs/world/map.json): the pasture inside the log palisade with its
  own fence gate in the east palisade, the east gate, Dad's house, and the birch woods east of the ford.
- **Day:** 2100. A new Ravenford family: a shepherd **Dad** and his **kid** (the narrator). Not Buh, not Grandpa.
  Nobody says "Buh" (there's no reason to: he isn't in it).
- **New canon facts** (add to canon.md when this is made):
  - from about day 1950 Ravenford's flock is dyed blue (an evoker alarm);
  - an evoker lives in the birch woods east of the ford (where it came from is never said; a raider left over from
    the raids is the fan theory, helped by the outpost on S06's horizon);
  - the kid's lamb is lost (or not: the Short cuts before we know).
- **Never:** name the evoker; explain the dye; say "wololo" in a line (it is only the sound).

## The mechanic (vanilla Java 1.21, exactly)
- An evoker that is **not in combat** (no target) casts its colour spell on a **blue** sheep within **16 blocks**
  and turns it **red** (minecraft.wiki/w/Evoker, "Sheep color conversion spell": "it can change the wool color of any
  blue sheep within sixteen blocks from blue to red"; code: `Evoker.EvokerWololoSpellGoal`, targeting
  `sheep.getColor() == DyeColor.BLUE`, box inflated 16 / 4 / 16). Only blue ones: a white sheep would tell you nothing,
  which is why Dad dyes every stray (L02).
- Java needs `mobGriefing` true (the default). The set leaves it on.
- Timing (SpellcasterIllager.SpellcasterUseSpellGoal): the "prepare wololo" sound and the raised, waving arms at the
  start; the colour changes after the 40-tick warm-up (with the cast-spell sound); the arms stay up until the 60-tick
  cast ends (so they drop ~1 s AFTER the colour change). The evoker looks at the sheep while casting.
- Then it targets the kid (players are in its target list; it hadn't seen her: she came up behind trunks) and casts
  fangs: prepare-attack sound, arms up, 20-tick warm-up, then 16 fangs in a line toward the target (she is >3 blocks
  away), one per tick, 1.25 blocks apart, each snapping up out of the ground ("Fangs snap").
- Particles: wololo brownish-orange (spell colour 0.7, 0.5, 0.2); fangs purplish-grey.
- L07's snaps a year ago: the evoker attacking something in the woods (a wandering trader, never shown or said).

## Scenes and time
| scene | lines | time | light |
|---|---|---|---|
| A. the pasture, morning | L01-L03 | 1000 | sun low east |
| B. the count | L04 | 13000 | nightfall: the gate-post lantern and the last sky |
| C. last spring (memory) | L05 (day 6000), L06 (dusk 12300), L07 (night 18000) | per shot | lanterns on the palisade at night |
| D. today | L08-L11 + the reveal | 12000 (S08-S09), 12100 (S10), 12200 (S11-S12) | low sun from the west, behind the kid: the lamb's blue, then red, must read at 300 px |

## Places
| place | where (from the east gate, canonical; x east, z south) | establishing shot |
|---|---|---|
| pasture | inside the palisade south of the east gate, ~40 x 30, oak fence, 60 sheep | S01 (EWS) |
| pasture gate | a fence gate in the east palisade at (0, 0, 15), a lantern post | S02, S04, S05, S08 |
| Dad's house | a small spruce house just inside the palisade, west of the pasture gate (new stamp) | S03 |
| east gate | canonical, logs, at (0, 0, 0) | S06, S07 |
| fields and ford | east of the gates: fields, the ford at +40 | S06-S08 |
| the birch woods | past the ford from +45; the clearing staged at +45..+54 (inside the footprint) | S10-S12 |

## Cast and costume
- **The kid (narrator):** a player, `alex` skin, never named. POV only (S08-S11); her shoulder in S12. Hearts full,
  no armour, shears selected (held low), the same 9-slot bar in every POV shot (story.json `hotbar`).
- **Dad:** a player actor, `kai` skin. Blue dye in hand S02-S03; crossbow S05 (legs and crossbow only) and S06; a
  lantern on the post in S04 (not in his hand); empty-handed, mending the fence in S09.
- **The lamb:** a baby sheep, `Color:11` blue from S01 (unsingled) to S11; red only from S12 +0.3 s. `PersistenceRequired`.
- **The flock:** 60 sheep, all blue in every shot (no white, no other colour) except the stray in S02 (white until
  'GATE') and the one red sheep in S05.
- **The evoker:** vanilla, only in S12. Not in frame, not as a silhouette, not as particles before S12. Its prepare
  sound is heard under L11 (S11).

## Props
| prop | state | shots |
|---|---|---|
| blue dye | Dad's hand | S02, S03 |
| crossbow | Dad's | S05, S06 |
| the red sheep | one, last spring | S05 only (gone today: Dad re-dyed it, never said) |
| the pasture gate | shut except S02 (Dad lets the stray in), S05 (open), S08 (open) | |
| lantern | on the pasture gate post; on the palisade every 8 blocks | S04, S07 |
| the old tower | on the Ridge, skyline (the easter egg) | S01 |
| pillager outpost | far on the horizon (canon (-1913, -393)) | S06, never named |

## Positions and screen direction
- The woods are east; gate shots look east (S01, S05, S06, S07, S08), except S04 (looks at the gate from inside) and
  S09 (the glance back west).
- S12: the kid faces east; the lamb 2.5 blocks ahead; the evoker 8 blocks beyond the lamb (10.5 from the kid: inside
  its 16-block spell range for the lamb and its 12-block follow range for the kid), at the same height (spell box ±4).
  The fangs come straight at the camera.

## Who knows what
- **Dad** knows what red means from L03. He never says it.
- **The kid** knows "red = bad, woods = bad", not what. She learns at S12.
- **The viewer:** guesses "red means danger in the woods" at L05; players may hear the fangs at L07 and the wololo at
  L11; everyone knows at S12.

## Numbers the picture must match
- 60 sheep, all blue (S01); 1 white stray (S02); 1 red sheep (S05); 3 snaps (S07); 1 lamb.

## The narrator
The kid, first person, Pip's voice (cast `narrator`), past tense from L05. The narrator's sex is never said; "she" is
the lamb.
