# red_sheep: continuity bible (r4, 2026-11-11)

## World
- **Place:** Ravenford (canonical: `ravenford` in docs/world/map.json): the pasture inside the log palisade with its
  own fence gate in the east palisade, the east gate, and the birch woods east of the ford. (No house: L03 is shot at the pasture gate.)
- **Day:** 2100. A new Ravenford family: a shepherd **Dad** and his **kid** (the narrator). Not Buh, not Grandpa.
  Nobody says "Buh" (there's no reason to: he isn't in it).
- **New canon facts** (add to canon.md when this is made):
  - from about day 1950 Ravenford's flock is dyed blue (an evoker alarm);
  - an evoker lives in the birch woods east of the ford (where it came from is never said; a raider left over from
    the raids is the fan theory, helped by the outpost on S07's horizon);
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
- Then it has a target (the kid: players are on its list; it hadn't seen her, she came up behind trunks): the cast
  ends at tick 60, its arms drop and it looks at her. **The Short cuts there** (S13 +1.3 s). Nothing after: real AI
  would summon vexes next (EvokerSummonSpellGoal, priority 4, beats the fangs at 5), so no fangs are shown.
- No particle puff on the sheep: the wool just changes on the cast tick; the spell particles are at the evoker's hands.
- Particles: wololo brownish-orange (spell colour 0.7, 0.5, 0.2), from the hands.
- L08's snaps a year ago were its fangs (it was fighting something in the woods; never shown or said).

## Scenes and time
| scene | lines | time | light |
|---|---|---|---|
| A. the pasture, morning | L01-L04 | 1000 | sun low east |
| B. the count | L05 | 13000 | nightfall: the gate-post lantern and the last sky |
| C. last spring (memory) | L06 (day 6000), L07 (dusk 12300), L08 (night 18000) | per shot | lanterns on the palisade at night |
| D. today | L09-L12 + the reveal | 12000 (S09-S10), 12100 (S11), 12200 (S12-S13) | low sun from the west, behind the kid: the lamb's blue, then red, must read at 300 px |

## Places
| place | where (from the east gate, canonical; x east, z south) | establishing shot |
|---|---|---|
| pasture | inside the palisade south of the east gate, ~40 x 30, oak fence, 60 sheep | S01 (EWS) |
| pasture gate | a fence gate in the east palisade at (0, 0, 15), a lantern post | S02, S03, S05, S06, S09, S10 |
| east gate | canonical, logs, at (0, 0, 0) | S07, S08 |
| fields and ford | east of the gates: fields, the ford at +40 | S07-S09 |
| the birch woods | past the ford from +45; the clearing staged at +45..+56 (widen the footprint east to x <= -1975); birch stamped if the seed has none | S11-S13 |

## Cast and costume
- **The kid (narrator):** a player, `alex` skin, never named. POV in S09, S11, S12; small from behind, crossing the ford, in S10; her shoulder in S13. Hearts full,
  no armour, the lead selected (held: she means to bring the lamb back), the same 9-slot bar in every POV shot (story.json `hotbar`).
- **Dad:** a player actor, `kai` skin. Blue dye in hand S02-S03; crossbow S06 (legs and crossbow only) and S07; a
  lantern on the post in S05 (not in his hand); empty-handed, mending the fence in S10.
- **The lamb:** a baby sheep, `Color:11` blue from S01 (unsingled) to S12; red only from S13 +0.3 s. `PersistenceRequired`.
- **The flock:** 60 sheep, all blue in every shot (no white, no other colour) except the stray in S02 (white until
  'GATE') and the one red sheep in S06.
- **The evoker:** vanilla, only in S13. Not in frame, not as a silhouette, not as particles before S13. Its prepare
  sound is heard under L12 (S12).

## Props
| prop | state | shots |
|---|---|---|
| blue dye | Dad's hand | S02, S03 |
| crossbow | Dad's | S06, S07 |
| the red sheep | one, last spring | S06 only (gone today: Dad re-dyed it, never said) |
| the pasture gate | open in S02-S03 (Dad lets the stray in), S06 and S09-S10; shut in S05 | |
| lantern | on the pasture gate post; on the palisade every 8 blocks | S05, S08 |
| the old tower | on the Ridge, skyline (the easter egg) | S01 |
| pillager outpost | far on the horizon (canon (-1913, -393)) | S07, never named |

## Positions and screen direction
- The woods are east; gate shots look east (S01, S06, S07, S08, S09), except S05 (looks at the gate from inside) and
  S10 (the high wide over the pasture gate, east-north-east).
- S12-S13, clearing-relative (K = the kid's stop point, facing east): the lamb stops at (1.5, 0, 0) and turns north-east;
  the evoker at (8.5, 0, -6), off the kid-lamb line: 8.5 blocks from the lamb (inside the 16-block spell range) and
  10.4 from the kid (inside its 12-block follow range), level (spell box ±4). A trunk hides it from K (S12); S13's camera
  at (-1.5, 1.6, 1.5), behind and right of the kid, sees past the trunk. Not summoned before S12 (S01, S08 and S10 look
  at this treeline).
  At the cut its head has turned to the lens (to her).

## Who knows what
- **Dad** knows what red means from L03. He never says it.
- **The kid** knows nothing. She thinks blue is Dad's favourite colour, red sheep are rare and pretty ("the prettiest one EVER"), Dad's crossbow week was waiting for more red ones, the snaps were the trees clapping, and the woods rule is Dad being boring. She goes in happily to find more red ones. She learns at S13 (the Short cuts on it). Owner rule 0a: she never hints, never sounds afraid, never explains.
- **The viewer:** sees past each innocent reading: guesses "red means danger in the woods" at L06-L07 (the crossbow); players may hear the fangs at L08 and the wololo at
  L12; everyone knows at S13.

## Numbers the picture must match
- 60 sheep, all blue (S01); 1 white stray (S02); 1 red sheep (S06); 3 snaps (S08); 1 lamb.

## The narrator
The kid, first person, Pip's voice (cast `narrator`), past tense from L05. The narrator's sex is never said aloud; "she" in
the lines is the lamb (the bible calls the kid "she" for short; the `alex` skin).
