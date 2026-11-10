# names_in_the_woods: continuity bible (r1)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A zombie that kills a villager converts it into a zombie villager on Normal (50%) and Hard (100%) difficulty. The
    zombie villager keeps the villager's custom name and name visibility, its profession and type (the outfit), and
    whatever it held (Mob.convertTo copies the hand and armour slots). Play the stunt on Hard.
  - A zombie villager is cured by a **player**: hit it with a splash potion of Weakness, then use a golden apple on it
    (the apple comes from the player's hand). Villagers can't throw anything (only players, witches and a few mobs
    throw), so no villager can cure one.
  - Zombies burn in sunlight, attack villagers and players, can't open fence gates. Named mobs don't despawn.
  - Players have their nameplate for free (other players see it over the head); a mob shows a custom name always only
    with CustomNameVisible. **Fiction:** the hamlet tags every newborn and sets the tag always visible (the stunt
    summons every villager with `CustomName` and `CustomNameVisible:1b`). A vanilla name-tag item alone shows the name
    on the crosshair only; the audit may call this a nitpick, it is the premise.
- **Backstory (never said):** a zombie siege, months ago, converted Tomas (farmer), Greta (librarian) and Old Ben
  (fisherman). Mom, the hamlet's cleric, has tried every week since with the cure she can't use. Seven weeks: Milo's
  golden apple stack (6, then 7 in S08) is one per week.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | sun / light |
|---|---|---|---|---|
| A. any night (habitual) | L01 | dusk | S01 13000 | the sun just set behind the forest (west): sky orange over the black treeline, the zombies backlit |
| B. the hamlet, days | L02-L03 | midday | S02, S03 6000 | high sun |
| C. another dusk | L04 | dusk | S04 13000 | as S01 |
| D. the empty row, a morning | L05 | morning | S05 2500 | low sun from the east, behind the camera |
| E. a gift day | L06-L08 | morning, then late afternoon | S07 2800, S06 3000, S08 11000 (indoors) | S06 bright morning; S08 warm late light through the window |
| F. an egg-fight day | L09 | midday | S09 6000 | high sun |
| G. tonight | L10-L14 | late afternoon into dusk | S10 11800, S11 13400, S12 13400, S13 13450, S14 13500, S15 13500 | S10 sun low over the treeline; S11-S15 after sunset, a red-to-purple afterglow in the west, gate lanterns and the path lamp lit |

- Zombies only appear at 13000+ (S01, S04, S11-S15): after sunset, so none of them smokes. If the renderer still
  shows them in sunlight at 13000, push S01/S04 to 13100.
- Weather: clear throughout. Season: summer (green grass, full leaves). No fog flag; the grade does the dusk.
- **Numbers said and what the picture shows:** "THREE zombies" (L01): exactly 3 in S01 and S04. "FOUR zombies"
  (L11): exactly 4 in S11, and the same 4 in S12-S15 (ROSA in front, three behind). Golden apples: unsaid; the hotbar
  shows 6 (S05, S08 before) then 7 (S08 after, S13, S15). Potion: one (in the chest in S08, on the grass in S13, thrown
  in S15).

## Places
Coordinates: the west gate is (0,0); +x east (into the hamlet), -x west (the meadow, the forest); +z south. Heights
are relative to the gate's ground.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| west_gate | (0,0) in a fence line along x=0 from z -22 to +22 | an oak fence gate with two lantern posts (lit at dusk), the fence running north and south along the hamlet's west edge | S01 (from 3 blocks inside, looking west) | the gate is shut in S01, S04, S11; open in S06, S10 (Mom goes out) and S13-S15 (Milo went out) |
| meadow | x -1 to -30, z -15 to +15 | grass and flowers rising ~7 blocks to the west; a worn path from the gate to the treeline at (-30, 2); a lamp post on the path at (-12, 2); the potion drops at (-11, 0) | S10 (EWS from above the gate) | S13: the potion lies on the path at (-11, 0) until he picks it up |
| forest | x < -30 | a dark oak forest (dense canopy, black inside at dusk) rising further west | S01 (its edge, backlit) | none |
| hamlet / lane | the lane runs east from the gate (0,0) to (45,0), the well at (24,0) | seven cottages either side of the lane, gardens, lanterns, the well, fields beyond the east end; villagers with tags (HUGO farmer, PIA shepherd, NELL armorer, LIL TEO a baby) | S02 (crane over the lane, looking east) | none |
| mom_cottage | north of the lane, gate at (10,-6), cottage facing south | a cottage (library `cottage`, plaster palette), garden with the brewing stand on a table by the door (Mom's job site, three bottles in it), flowers, fenced; window toward the lane | S03 (FS at the gate) | none |
| mom_cottage_inside | inside it | the kitchen chest by the window (one Splash Potion of Weakness, one golden apple, in S08), table, two chairs, a bed | S08 (POV at the chest) | the apple leaves the chest in S08 |
| empty_row | south of the lane: three cottages with gates at (14,6), (30,6), (40,6), facing north onto the lane | three cottages, shutters closed, gardens overgrown (tall grass, no flowers), a cobweb in one door; a sign at each gate: TOMAS, GRETA, OLD BEN; by each door its job block: composter (Tomas), lectern (Greta), barrel (Old Ben) | S05 (POV, Mom in front) | none |

The well at (24,0) is in the lane between the first two empty cottages. S05 is shot from (8,0) looking east-south-east down
the lane, so the three empty cottages recede in depth behind Mom, the TOMAS sign nearest and readable.

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| Milo (N) | the player, default Steve skin | none; hotbar: slot 1 eggs (16), slot 2 golden apples (6, then 7 from S08), slot 3 the splash potion (S13-S15) | his player nameplate "Milo" in camera shots (S03, S10 too small to read, S14) | S03 at Mom's gate; S05, S08, S09 POV; S10 at the west gate (from behind, small); S13 on the path at (-9,0); S14-S15 on the path at (-10,0) | hearts full throughout; nothing hits him |
| Mom / ROSA | a plains cleric villager (purple robe); after the conversion a zombie villager, plains, cleric | the golden apple in her crossed arms in S06, S07, S10 (villager CrossedArmsItemLayer); as a zombie, the golden apple in her right hand (ItemInHandLayer) | ROSA, always visible | S03 at her gate (10,-6); S04 at the west gate (inside, hand on it); S05 in the lane at (12,2); S06 walking out of the west gate; S07 at her brewing stand; S08 by her window (inside); S10 on the meadow path walking west, into the trees on "DARK"; S11 the fourth out of the trees; S12 on the path at (-18,0) walking east; S13 at (-16,0); S14-S15 at (-15,0) | villager until S10; zombie villager from S11; S15 splashed with Weakness (the grey-purple swirl stays on her) |
| TOMAS | zombie villager, plains farmer (straw hat) | nothing | TOMAS | S01, S04 at the treeline; S11-S15 3-8 blocks behind ROSA | none |
| GRETA | zombie villager, plains librarian | nothing | GRETA | as Tomas | none |
| OLD BEN | zombie villager, plains fisherman | nothing | OLD BEN | as Tomas | none |
| HUGO | villager, plains farmer | none; NoAI, crossed arms | HUGO | S02 in his garden; S09 in the lane 7 blocks from Milo | an egg pops on him in S09 (no reaction) |
| PIA | villager, plains shepherd | none | PIA | S02; S09 beside Hugo | an egg pops on her in S09 |
| NELL | villager, plains armorer | none | NELL | S02 only | none |
| LIL TEO | baby villager | none | LIL TEO | S02, running across the lane on "BIRTH" | none |

## Props
| prop | first seen (line, shot) | state | where exactly | later appearances and their state |
|---|---|---|---|---|
| name tags (nameplates) | L01, S01 | white text on the translucent black plate, always visible within 64 blocks | over every villager and zombie villager | every shot with a villager or zombie |
| signs TOMAS / GRETA / OLD BEN | L05, S05 | oak signs on posts at the empty cottages' gates | (14,6), (30,6), (40,6) | none |
| brewing stand | L06, S06 (fg); S07 | three bottles in it (has_bottle_0/1/2 true) | on Mom's garden table by her door | none |
| golden apple (Mom's) | L06, S06 | held | in Mom's arms (S06, S07, S10), ROSA's hand (S12-S15) | still held at the end |
| the chest | L08, S08 | closed, then the chest screen: 1 Splash Potion of Weakness, 1 golden apple; the apple taken | Mom's kitchen, by the window | none |
| splash potion of weakness | L08, S08 (in the chest) | in the chest; tonight on the grass (an item entity, bobbing); in Milo's hand; thrown | S13: on the path at (-11,0) | S15: thrown, shatters on ROSA |
| eggs | L09, S09 | 16 in slot 1, 14 after S09 | hotbar | S13-S15: 14 |
| lamp post on the path | S10 | lit from S11 | (-12, 2) | lights ROSA's face in S12 (she is 6 blocks short of it, walking toward it) |

## Positions and screen direction
- **The forest is west; the hamlet east.** The sun sets behind the forest, so every shot looking west at dusk (S01,
  S04, S10, S11, S12) is backlit, and the one looking east (S14) is lit by the afterglow on the zombies' backs and the
  hamlet's windows in front.
- Toward the forest = away from the camera in every westward shot (Mom leaving in S06, S10); the zombies come toward
  the camera (S01, S11, S12).
- S12 (camera in front of ROSA, looking west) to S13 (POV, Milo looking west up the path) to S14 (the reverse, behind
  ROSA, looking east at Milo) to S15 (POV again, looking west): the line runs along the path; the camera stays on its
  south side in S12 and S14, so ROSA's apple hand (her right) is toward the lens in S12 and at frame left in S14.
- S03: Mom at frame left nearer the lens, Milo at frame right a step behind (staged in depth, not side by side).

## The narrator
| shot | where Milo is | what's in hand / the HUD |
|---|---|---|
| S03 | at Mom's gate, beside her | (camera shot) empty hand |
| S05 | in the lane, 4 blocks from Mom | eggs selected (slot 1); slot 2 golden apples x6 |
| S08 | at the chest in Mom's kitchen | chest screen; the apple goes to slot 2: x6 -> x7 |
| S09 | in the lane | eggs (16 -> 14) |
| S10 | at the west gate, inside, small | (camera shot) |
| S13 | on the path, 9 blocks out of the gate | picks up the potion: slot 3, selected, "Splash Potion of Weakness" above the hotbar |
| S14 | on the path at (-10,0), facing ROSA | (camera shot) the potion in hand |
| S15 | same spot | throws the potion (slot 3 empties), selection slides to slot 2: golden apples x7, "Golden Apple" above the hotbar |

Hearts full and hunger full throughout. Survival HUD.

## Who knows what (line by line)
| line | Milo knows | Mom knows | the viewer can know |
|---|---|---|---|
| L01-L03 | zombies named like the neighbors walk out each night; the hamlet tags everyone | everything | zombies have villager names (players: probably zombie villagers) |
| L04-L05 | the zombies stole the tags; the neighbors moved | she's lying | the names on the empty houses match the zombies |
| L06-L08 | Mom brings the city presents, they never take them | she's failing at the cure | players: that's the cure; she can't make it work |
| L09 | villagers can't throw | why she can't cure them | why she fails (if they connect it) |
| L10 | Mom will be back by dark | she's late, taking a risk | what comes out at dark |
| L11-L12 | four zombies; the fourth is ROSA | (converted) | Mom is a zombie villager, still holding the apple |
| L13-L14 | the potion is here; she lied to keep him home; she can't throw, he can | | he can cure her: potion, then apple |

## Clue map
See beats.md (the clue map table). Picture plants: S01/S04 (names on zombies), S03 (ROSA, the robe), S05 (signs and
job blocks), S06-S08 (apple, brewing stand, chest), S09 (no one throws back), S10 (into the oaks at sunset).

## Easter egg
S02: the carpeted village of Light Sleeper on the far east hill (carpet roofs, a white-wool-boxed bell). Provisional:
re-check against docs/world/canon.md when it lands.
