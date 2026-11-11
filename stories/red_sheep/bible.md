# red_sheep: continuity bible (r4, 2026-11-11; world pass 2026-11-11: day 2300, the pasture placed, Grandpa's house in S04)

## World
- **Place:** Ravenford (canonical: `ravenford` in docs/world/map.json): the pasture inside the log palisade south of
  the east gate (map.json stamp `pasture`: an oak fence on the natural ground round gate + (-29..-1, 13..40), the
  palisade its east side, the pasture gate in the palisade at (0, 0, 15)), the east gate, and the birch woods east of
  the ford. Across the road north of the pasture: **Grandpa's house and yard** (stamp `grandpa_house`, house
  gate + (-15..-5, -17..-9), door south at x -10, south windows at x -13 and -7, bench at (-8..-7, -8)) with the
  **totem wall** inside its north wall (stamp `totem_wall`: all 32 frames full since raid 32). L03 is shot at the
  pasture gate.
- **Day:** 2300 (canon timeline; was 2100). "Last spring" (L06-L08) is about a year earlier, around day 1950, just
  after raid 32. A Ravenford shepherd family: **Dad** and his **kid** (the narrator). Not Buh, not Grandpa. Nobody
  says "Buh".
- **Canon this Short plants (docs/world/canon.md, links 11 and 16; never said in a line):**
  - the evoker in the woods is the one that got away from raid 32 (Thirty-One Raids, day 1900): raid 32 brought two,
    one fell (the 32nd totem on Grandpa's wall), the other strayed out of the raid's reach and into the woods;
  - since then Ravenford dyes its sheep blue (the alarm: an evoker turns a blue sheep within 16 blocks red);
  - Grandpa's 32 totems are 32 dead evokers (vanilla: an evoker drops a totem of undying);
  - the blue is the Digger's sheep's blue (`Color 11`) on purpose (a theory link, never confirmed);
  - the kid's lamb is lost (or not: the Short cuts before we know).
- **Easter egg:** `totem_wall` (map.json cameo) in S04's background: the gold of the totems glinting through
  Grandpa's west south window, 27 blocks behind the staring sheep, out of focus, never named. **Background figure:**
  Grandpa (player actor, `zuri` skin, the slow walk) on his bench by the door in S04. Never named, never called Grandpa, never speaks, never the subject
  (canon conflict 11). The old tower on S01's skyline stays as geography (no longer the story's cameo).
- **Never:** name the evoker; explain the dye; say "wololo" in a line (it is only the sound); point at Grandpa's house.

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
- **Grandpa (background only):** player actor, `zuri` skin, crossbow on his back or in hand as in Thirty-One Raids,
  sitting on his bench (gate + (-7.5, 1, -8)) in S04, small and soft at 27 blocks; the slow walk if he moves. No line,
  no name, no look at the camera.
- **The kid (narrator):** a player, `alex` skin, never named. POV in S09, S11, S12; small from behind, crossing the ford, in S10; her shoulder in S13. Hearts full,
  no armour, the lead selected (held: she means to bring the lamb back), the same 9-slot bar in every POV shot (story.json `hotbar`).
- **Dad:** a player actor, `sunny` skin (not `kai`: Six Thousand Torches' Jonah). Blue dye in hand S02-S03; crossbow S06 (legs and crossbow only) and S07 (in his off hand, on the camera's side); a
  lantern on the post in S05 (not in his hand); empty-handed, mending the field fence outside the palisade in S10 (13 blocks from the lens, facing south).
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
| the old tower | on the Ridge, skyline (geography, not the cameo) | S01 |
| Grandpa's house and the totem wall | across the road north of the pasture; the west south window (gate + (-13, 3-4, -9)) lit, the totems' gold through it; the yard, bench, lantern post | S04 (bg, the easter egg) |
| pillager outpost | far on the horizon (canon (-1913, -393)) | S07, never named |

## Positions and screen direction
- The woods are east; gate shots look east (S01, S06, S07, S08, S09), except S04 (looks NORTH across the road at
  Grandpa's house), S05 (looks at the gate from inside) and S10 (the high wide over the pasture gate,
  east-north-east).
- S12-S13, clearing-relative (K = the kid's stop point, facing east): the lamb stops at (1.5, 0, 0) and turns north-east;
  the evoker at (7.5, 0, -6), off the kid-lamb line: 8.5 blocks from the lamb (inside the 16-block spell range) and
  9.6 from the kid (inside its 12-block follow range), level (spell box ±4). A birch log column at x 1..2, z -2..-1 hides it from K (S12);
  S13's camera at (-1.5, 1.8, 2.5), behind and right of the kid, clears it by about 0.6 blocks. Not summoned before S12 (S01, S08 and S10 look
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
The kid, first person, Pip's voice (cast `narrator`), past tense from L06. The narrator's sex is never said aloud; "she" in
the lines is the lamb (the bible calls the kid "she" for short; the `alex` skin).
