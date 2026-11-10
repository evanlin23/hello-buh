# names_in_the_woods: continuity bible (r2 polish)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A zombie that kills a villager converts it into a zombie villager on Normal (50%) and Hard (100%). The zombie
    villager keeps the villager's custom name and name visibility, its type and profession (the outfit), and what it
    held in both hands (Mob.convertTo copies the hand and armour slots). Play the stunt on Hard.
  - A zombie villager is cured by a **player**: a splash potion of Weakness on it, then a golden apple used on it from
    the player's hand. Villagers can't throw anything (players, witches and a few mobs throw), so no villager can cure
    one.
  - Zombies burn in sunlight, go for villagers and players, and can't open fence gates. Named mobs don't despawn.
  - A player's nameplate is free (other players see it). A mob shows its custom name all the time only with
    CustomNameVisible. **Fiction:** the hamlet tags every newborn and the tags are always visible (the stunt summons with
    `CustomName` and `CustomNameVisible:1b`). A vanilla name-tag item alone shows on the crosshair only. That's the
    premise; the audit may call it a nitpick.
- **Staged, not vanilla (audit risk, low):** ROSA lets the potion fall toward Remy in S13 (a zombie doesn't drop a held
  item by itself). It's played as her choice on screen: she looks at the bottle, then at him, then lets it go (L13 "for
  ME"), Mom's last act. Also
  staged: ROSA and the three stop and stare (at the fence in S02, at the lamp post in S13-S15), and the shutters close
  in S04.
- **Backstory (never said):** a zombie siege, months ago, converted Tomas (farmer), Greta (librarian) and Old Ben
  (fisherman). Since then Mom, the hamlet's cleric, has gone every week with a golden apple and a splash potion she
  can't use. She stands at the sunny edge of the oaks in daylight holding the apple out, then brings both back. Seven
  weeks: Remy's golden apple stack (6, then 7 in S08) is one a week. Tonight she left late (S10), stayed past sunset,
  and was caught under the trees. The apple was in her main hand and the potion in her off hand (her inventory, unseen
  on a villager), and conversion kept both.
- **The place and the day (shared world, docs/world/canon.md):**
  - **Place:** a new place to claim, `oakend` ("Oakend"), a cleric's hamlet on the North Inlet's west bank at the east
    edge of the north-west forest, facing Fernbank across the inlet. The west gate (this bible's (0,0)) about (-512, 66,
    -1030), footprint about (-545, -1055, -447, -1005) (it stops one block short of Fernbank's). Read the ground off the
    survey grid before claiming. Claim it in its own commit (not done here):
    `./hb world claim oakend --name "Oakend" --kind village --region the_green --at -512,66,-1030 --footprint -545,-1055,-447,-1005 --story names_in_the_woods --day 2700`
    Then add map.json `pieces` (the cottages, the well, the fence and gate, the lamp post) and
    `stories.names_in_the_woods.cameos: ["empty_boat"]`, and run `./hb world check`.
  - **Day:** 2700 (the night of the story), outside the Long Day (800-1100). Fernbank across the water is empty but for
    its librarian and golem since day 520, and its boat floats empty at the dock.
  - **Who:** a new family, not Milo's: Remy (the hamlet's only player, a kid, the house narrator voice) and his mom ROSA
    (the hamlet's cleric, a plains villager, her own voice: not the cast `mom`, who is Milo's mom in Hushwell).
  - **Stands alone:** no line names a place or another story.
  - **Canon consequences to record** (map.json and canon.md, in the claim commit; canon files not edited here):

    | what | since | stamp / note |
    |---|---|---|
    | Oakend: seven cottages, the well, the west gate and fence, the lamp post, the meadow, the dark oak edge | before ~2500 | pieces and stamps at `oakend` |
    | The siege: Tomas, Greta and Old Ben converted, keeping their tags; their three cottages shut, signs at the gates | ~2500 | stamps: the three empty cottages (shutters closed, cobweb), the three named zombie villagers (nights, at the forest edge) |
    | ROSA converted at dusk and cured by Remy (potion, then apple) | 2700 | timeline row: **2700, Oakend. Names in the Woods.** "Every night three named zombies walk out of the woods. Tonight a fourth wears Mom's tag, ROSA, and her son throws the cure." Whether Remy cures the other three is never said (open) |
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | sun / light |
|---|---|---|---|---|
| A. any night (habitual) | L01-L02 | dusk | S01 13000, S02 13100 | the sun just set behind the forest (west): an orange sky over the black treeline; the path lamp (-15,2) and the gate lanterns light the zombies' faces |
| B. the hamlet, a day | L03 | midday | S03 6000 | high sun |
| C. another dusk (a later night than A), indoors | L04 | dusk | S04 13200 | the room lantern-lit; dusk through the window until the shutters close |
| D. the empty row, a morning | L05 | morning | S05 2500 | low sun from the east, behind the camera |
| E. a gift day | L06-L08 | morning, then late afternoon | S06 3000, S07 3200, S08 11000 (indoors) | bright morning; S08 warm late light through the window |
| F. an egg-fight day | L09 | midday | S09 6000 | high sun |
| G. tonight | L10-L15 | late afternoon into dusk | S10 11800, S11 13400, S12 13400, S13 13450, S14 13500, S15 13500 | S10 the sun low over the treeline; S11-S15 after sunset, a red-to-purple afterglow in the west, the lanterns and the path lamp |

- Zombies only appear at 13000+ (S01, S02, S04 through the window, S11-S15): after sunset, none smokes. If the renderer
  shows sun on them at 13000, push S01 to 13100.
- Lanterns are always lit (no "just lit" moments). Weather clear throughout. Summer.
- **Numbers said vs the picture:** "THREE zombies" (L01): exactly 3 in S01, S02, S04. "FOUR zombies" (L11): exactly 4
  in S11, the same 4 in S12-S15 (ROSA in front, three behind). "a GOLDEN APPLE" every week (L06): one in her arms, one
  in the chest (S08). Golden apples in the hotbar, unsaid: 6 (S05), 6 to 7 (S08), 7 (S09, S13, S15). Potions: three in
  the stand, then two once she takes one (S06); one in the chest (S08); one in ROSA's left hand (S12), dropped (S13),
  thrown (S15).

## Places
Coordinates: the west gate is (0,0); +x east (into the hamlet), -x west (the meadow, the forest); +z south. Heights
are relative to the gate's ground.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| west_gate | (0,0), in a fence along x=0 from z -22 to +22 | an oak fence gate, two lantern posts at (0,-2) and (0,2) | S01 (from (2,2,0) looking west) | shut in S01, S02, S11; open in S07, S10 (Mom goes out) and S13-S15 (Remy went out) |
| meadow | x -1 to -30, z -15 to +15 | grass and flowers rising ~7 blocks westward; a worn path from the gate to the treeline at (-30,2); **the lamp post at (-15,2)**; two boulders at (-8,-9) and (-20,10) | S01 (its lower half), S10 (whole, from above) | S13: the potion lands at (-13.5,0) and is picked up |
| forest | x < -30 | dark oak forest, a dense canopy, rising further west | S01 (its edge, behind the zombies) | none |
| hamlet / lane | the lane from the gate east to (52,0), the well at (24,0) | seven cottages, gardens, lanterns, villagers with tags (HUGO farmer, PIA shepherd, NELL armorer, LIL TEO a baby), fields past the east end | S03 (crane over x 4, looking east) | none |
| mom_cottage | north of the lane, gate at (10,-6), the cottage facing south | `cottage` (plaster), a garden with the brewing stand on the table by the door (her job site: three bottles, then two), flowers | S03 (the crane lands on her gate) | S06: a bottle leaves the stand |
| mom_cottage_inside | in it | a west window with trapdoor shutters, the kitchen chest, a table, two chairs, a bed, a lantern | S04 (from the `inside` corner) | S04: the shutters close; S08: the apple leaves the chest |
| empty_row | south of the lane: gates at (14,6), (30,6), (40,6), facing north | three cottages, shutters closed, gardens overgrown, a cobweb in a door; signs TOMAS, GRETA, OLD BEN at the gates; composter, lectern, barrel by the doors | S05 (WS POV from (4,0), looking east-south-east: the three recede in depth, TOMAS nearest) | none |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| Remy (N) | the player, default Steve | hotbar: slot 1 eggs (16, then 14 after S09), slot 2 golden apples (6, then 7 from S08), slot 3 the potion (S13-S15) | player nameplate "Remy" (readable in S14) | S05, S08, S09 POV; S10 at the west gate, small, from behind; S13 sprints from (-8,0) to (-12.5,0); S14-S15 at (-12.5,0) | full hearts throughout |
| Mom / ROSA | plains cleric villager (purple robe); from S11 a plains cleric zombie villager | villager: the golden apple over her crossed arms (S06, S07, S10); zombie: the apple in her right hand, the potion in her left (S11-S13), only the apple from S13 | ROSA, always visible | S02 1.5 blocks inside the west gate at (1.5,0), back to us; S03 at her gate (10,-6); S04 at her west window; S05 in the lane at (12,2); S06 at her brewing stand; S07 at the west gate going out; S08 by her window; S10 from (-22,1) into the trees at (-30,2) on "DARK"; S11 first out, nearest, at (-17,0); S12 walking slowly east to the lamp post at (-16,0); S13-S15 stopped at (-16,0) (S13: looks at the bottle, at Remy, lets it fall toward him) | villager until S10; zombie villager from S11; S15 Weakness swirl on her |
| TOMAS | zombie villager, plains farmer (straw hat) | none | TOMAS | S01 at (-13,-1.5); S02 1.5 out from the fence (-1.5,-1); S04 at the fence (through the window); S11 at (-21,-2); S12-S15 behind ROSA at (-20,-2) | none |
| GRETA | zombie villager, plains librarian | none | GRETA | S01 (-14,0); S02 (-1.5,0.5); S11 (-22,1); S12-S15 (-21,1) | none |
| OLD BEN | zombie villager, plains fisherman | none | OLD BEN | S01 (-12,1.5); S02 (-1.5,2); S11 (-23,3); S12-S15 (-22,3) | none |
| HUGO / PIA | villagers, farmer / shepherd | none, crossed arms | HUGO / PIA | S03 in their gardens; S09 in the lane 7 blocks from Remy | an egg pops on each in S09 (no reaction) |
| NELL, LIL TEO | villager (armorer), baby villager | none | NELL, LIL TEO | S03 only (LIL TEO runs across the lane) | none |

All three zombies in S01 have their arms raised (the zombie pose) and walk toward the lens, 14-16 blocks from it.

## Props
| prop | first seen | state | where | later |
|---|---|---|---|---|
| nameplates | S01 | white text on the translucent plate, within 64 blocks | over every villager and zombie | every shot with them |
| signs TOMAS / GRETA / OLD BEN | S05 | oak signs at the gates | (14,6), (30,6), (40,6) | none |
| brewing stand | S03 (behind Mom) | 3 bottles, then 2 from S06 "SPLASH POTION" | Mom's garden table | none |
| golden apple (Mom's) | S06 | held | Mom's arms (S06, S07, S10), ROSA's right hand (S11-S15) | still held at the cut |
| kitchen chest | S04 (in the room) | S08: chest screen with 1 Splash Potion of Weakness and 1 golden apple; the apple taken | by the window | none |
| splash potion of weakness | S06 (taken from the stand) | in Mom's inventory; ROSA's left hand (S12); let fall toward Remy, lands at (-13.5,0) (S13); Remy's slot 3; thrown (S15) | | shatters on ROSA in S15 |
| west window shutters | S04 | open, then shut on "STOLE" | Mom's west window | none |
| lamp post | S01 | lit (always) | (-15,2) | the key light for S12-S15 |
| eggs | S05 (hotbar) | 16, then 14 | slot 1 | none |
| the easter egg: Fernbank's empty boat (canon cameo `empty_boat`) | S03 (bg, frame right, the crane's opening) | an empty oak boat on the water | the end of Fernbank's dock across the inlet, about 75 blocks east of the gate (built by `world.build`) | none (S03 only) |

Kill chickens every tick in S09 (a thrown egg can hatch one).

## Positions and screen direction
- **Forest west, hamlet east.** The sun sets behind the forest. Westward dusk shots (S01, S02, S10, S11, S12) have the
  sky behind the subject, and the lamp post and lanterns light the faces. S14 looks east at the hamlet's windows.
- Toward the forest = away from the lens in every westward shot (Mom leaving in S07, S10). The zombies come toward it
  (S01, S11, S12).
- **S02:** the camera is behind Mom's **left** shoulder, so Mom is at frame right and the zombies at frame centre-left.
- **The S12-S15 line** runs along the path, and the camera stays on its south side. S12 is from in front of ROSA,
  looking west, her right (apple) hand at frame left. S14 is behind ROSA's **right** shoulder, looking east, her back at
  frame left with the apple toward the lens. S13 and S15 are POV from the path, looking west.
- **Distances, ROSA to Remy:** 3.5 blocks in S14 and S15 (ROSA (-16,0), Remy (-12.5,0)). In S13 he starts 8 blocks
  from her at (-8,0) and sprints 4.5 blocks (~0.8 s) to the potion.

## The narrator
| shot | where Remy is | hand / HUD |
|---|---|---|
| S05 | lane (4,0) | eggs selected; slot 2 golden apples x6 |
| S08 | Mom's kitchen chest | chest screen; slot 2 6 to 7 |
| S09 | lane | eggs 16 to 14; slot 2 x7 |
| S10 | at the west gate (camera shot, small) | |
| S13 | path (-8,0) to (-12.5,0) | picks up the potion: slot 3, selected, "Splash Potion of Weakness" over the hotbar |
| S14 | (-12.5,0) (camera shot, nameplate "Remy") | the potion in hand |
| S15 | (-12.5,0) | throws on "Potion" (slot 3 empties), selection to slot 2 on "APPLE": x7, "Golden Apple" over the hotbar |

## Who knows what
| line | Remy knows | Mom knows | the viewer can know |
|---|---|---|---|
| L01-L03 | named zombies come every night and stare at Mom; everyone is tagged | everything | named zombies (players: zombie villagers) |
| L04-L05 | they stole the tags; the neighbors moved | she's lying | the names on the empty houses match |
| L06-L08 | Mom takes presents and they come back | she's failing at the cure | players: that's the cure, and it fails |
| L09 | villagers can't throw | why she fails | why she fails |
| L10 | she'll be back by dark | she's late | what comes out at dark |
| L11-L13 | four zombies; the first is ROSA; she dropped her potion for him | (converted) | Mom is a zombie villager, still holding the apple |
| L14-L15 | she lied to keep him home; she can't throw, he can; potion, then apple | | he is curing her |

## Clue map
See beats.md.

## Easter egg
Canon cameo `empty_boat` (since day 400): Fernbank's empty oak boat at the end of its dock across the inlet, at frame
right in the opening of S03's crane (~1.5 s), small on the water. Listed in Props; `world.build` builds it.
