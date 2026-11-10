# scarecrow r1: writer's response (r2)

All must-fixes are applied, plus the cheap should-fixes and the coordinator's notes. The script is now 116 spoken
words, about 40 s. The line ids are renumbered: 11 lines, the payoff is L11.

## Critic must-fixes
| # | must-fix | change |
|---|---|---|
| 1 | r1 `direction` must be Pip's recipe verbatim | `requests[0].direction` is now exactly `[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery, breathy or soft]`. `model` is `gemini-3.8-flash-lite-tts`, voice Leda, no post-processing (`voice` block). "true story" is gone from every field. |
| 2 | L11 direction | "warm and bright, a smile in it, full volume, never soft, whispered or breathy". |
| 3 | L07 "out of SNOW", and no white body in S01-S02 | Now L06: "Mom said GRANDPA built that scarecrow out of SNOW. The week before he DIED." S01's camera is 2.6 up and 2 behind, pitched so the frame's bottom cuts at the pumpkin's base (tune on the shot sheet until no white shows). S02's crane cuts the wheat at the right edge. S07 is 19 blocks away. S08 is the first look at the body, after L06 names it. |
| 4 | S10 "GONE" must read | A lantern on a fence post at (22, 1, 3) by the spot, in S01, S07, S08 and S10. "GONE" now has its own line (L10) and its own lit full shot (S10b, from S08's camera, pushing in on the empty 1x1 gap). |

## Continuity breaks
| # | break | change |
|---|---|---|
| 1 | S01 aim | S01 now looks at (8, 1.5, -3). The patch is right of centre and the window 12 degrees left. |
| 2 | S07 can't see its subjects | S07's camera is at (36, 4, 10), looking at (23, 1, -5). The nitwit moved to S02 (the paddock in the crane's end frame), and S07 claims no barn or paddock. |
| 3 | the window is 2x2 | Four spruce trapdoors. On "OPEN" the lower pair go `half=bottom` and the upper pair `half=top`, all `open=false` (bible, set.md, S09, S10). |
| 4 | "GONE" is a speck | S10b added (see critic 4). The bible has the 1x1 coarse-dirt gap. The snowball streak is dropped from S10. |
| 5 | room light | S05 has the hanging lantern and the hearth campfire lit. For S09-S11 the lantern is removed and the campfire set `campfire[lit=false]` (bible scene D, set.md). |
| 6 | heights | Every camera and prop y is now height above the local ground at that x,z. Stated in story.json's camera specs, shots.md, the bible and set.md. |
| 7 | look fields | The SNOW/UP line (now L02) looks at `prop:trail` with the word "UP". The stayed-up line (now L08) looks at `prop:window`. |

## Continuity notes (also applied)
- **Sizes:** S04 is relabelled wide and S05 full. The order is now wide, ews, ms, wide, full, ms, wide, ms, full, ms,
  full, wide: the size changes at every cut.
- **Village:** taken out of every frame and the set (off screen, down the south slope).
- **Corner lantern:** moved to (1, -9).
- **Barrel, cauldron, composter:** added to the bible's props (S06, S11).
- **S11:** reframed to what the camera sees. It ends at (8, 5, 8) looking at (2, 1, -4), with the window 18 degrees
  left, the golem 19 right and the zombies 14 left, at 14 and 10-11 blocks. No claims about the field or the porch.
- **S08:** the porch pumpkins are no longer claimed.
- **Bible timeline:** A/C is yesterday morning (the 63rd), D is last night. Hotbar: snowballs already in slot 2, an
  empty slot 3 for S09-S10.
- **Fog:** "into the fog" is now "to the horizon" everywhere (`fog: false`).
- **The golem back at its spot each morning:** logged in the bible as a known stretch. Vanilla gives it no home; we
  show one morning only and never claim it returns every day.

## Coordinator: sharper twist and a surprise reveal
- **The turn is stalker to guard, said by the game and by L11.** L03 now ends "STARING at me". L11 is "It wasn't
  STARING at me. It was keeping an EYE OUT for me." That flips L03 and pays off Grandpa's "keep an EYE on me" (L07)
  without a told backstory.
- **The surprise:**
  - L09: he throws the shutters open, ready for a face, and the yard ahead is empty (S10).
  - L10: the scarecrow is gone from its lit gap (S10b).
  - S11 then starts in his eye, looking straight down at three zombies at his wall, faces up. That is the first time
    anyone sees them, players included.
  - It then pulls out to the golem pelting them off the wall.

## Should-fixes
- **L05 "EVERY night":** done (now L04: "EVERY night, I hear GROANING. I don't LOOK.").
- **L01 without the comma pause:** done ("SIXTY-THREE mornings in a row, a trail of SNOW runs from our SCARECROW to my
  WINDOW."). L02 now folds "It never SNOWS here" into the fix that fails ("I shovel it UP. It comes BACK."), so the
  second beat isn't just a restated rule.
- **S06 scorched dirt:** cut.
- **Snowballs and puffs render:** in set.md's engine table. Thrown snowballs render. The hit puff is a ~45 min
  `snowball_hit` particle; build it and check both on S11's shot sheet before the render.
- **Bible refill and dawn:**
  - Refill: he shovels the whole trail each morning, and the golem lays it again on its walk the next night (by S10).
  - Dawn: the golem wanders once the last zombie burns (the known stretch above).

## Checks
- `story.json` is valid JSON.
- No ellipsis in any file I wrote (the only hits in the folder are quotes inside the critics' reviews).
- 116 spoken words, about 40 s.
- No semicolons or em dashes in the lines.

## r2 polish + world

**r2-continuity notes**
| # | note | change |
|---|---|---|
| 1 | S02 end frame | Key 1 now looks at (4, 0, -3). The scarecrow sits past the right edge (check the sheet, swing 2 blocks west if any white shows). The nitwit is dropped (see "World" below), so no paddock claim. |
| 2 | lantern post | Moved to (22, 1, 1). The S01 claim is dropped. It is in S07, S08 and S10b and lights the gap from 1.4 blocks. |
| 3 | S04 "whole wall" | The claim is dropped. |
| 4 | S06 rain barrel | The claim is dropped. |
| 5 | window looks | L08 and L09 look at `prop:window` with `"size": "cu"`. |
| 6 | S10 | The POV is pinned: yaw due east (Minecraft -90), pitch 0, FOV 70. The patch is 45 degrees left, outside the 36-degree half-width, and the push widens that angle. The golem throws only from S11 (set.md, cast staging). |
| 7 | S07 Mom | The camera moved closer, to (33, 4, 6), looking at (23, 1, -5). Mom is 16 blocks away, about 13% of the frame height. Check at 300 px and go to FOV 40 if needed. |

**r2-critic should-fixes**
- **L07:** now "He always SAID he'd keep an EYE on me. Kind of CREEPY now." The script is 118 words, about 41 s.
- **Breaths:** `<short pause>` at the start of L09 and L11 (L10 already had one). Pauses only, never a time-stretch.
- **Bible:** snowballs do zombies no damage, only knockback. The golem knocks them off the wall all night, and they
  burn at dawn by the wall, which is where the rotten flesh comes from. Nothing claims a hurt: the beats' sound plan
  says "the snowball hit (knockback only)", and set.md's engine row says not to add a red flash or hurt sound
  unless vanilla plays one.

**World (docs/world/canon.md, map.json, STANDARDS.md)**
- **Place:** a new place to claim, `hill_farm` ("Hushwell's hill farm"), within Hushwell. It sits on the hillside
  south-west of Dog Hill, origin about (-250, 95, -868), with the plaza 95 blocks east. The day is 2200.
- **Why there:**
  - Mom is canon Hushwell's farmer.
  - The hero must be Milo, and "one grandpa per Short" makes the dead Grandpa Milo's Ravenford grandpa. He is alive at
    day 1900, so he dies here on day 2144, after coming east.
  - The trail needs a snow golem below 0.8. Hushwell is plains (0.8), so only high ground works: at y 90+ the height
    drops it to about 0.77, and it still never snows.
  - The meadow plan is replaced (no faked biome).
- **Claim:** not done here, because it goes in its own commit. The bible gives the exact `claim` command, the pieces,
  and the y 90+ requirement (read off the survey; slide west along the ridge if lower).
- **Easter egg:** canon `boxed_bell` (since day 1400). Hushwell's wool-boxed bell is a white speck in the plaza at S08's
  frame right. The r1 nitwit egg is dropped, because canon has the nitwit gone from day 520.
- **Consequences recorded** in the bible's "Canon consequences" table, for the claim commit:
  - the farm,
  - Grandpa came east and farmed the hill,
  - the golem stamp (day 2137),
  - **Grandpa dies on day 2144** (no later story shows him alive),
  - the unharvested wheat,
  - a new open question, plus the timeline row.

  The canon files themselves are untouched.
- **Stands alone:** no line names Hushwell, Ravenford or another story.
- **Milo's age:** now about 12, voiced by the house narrator, which canon allows for kid Milo.
- **Night light (STANDARDS 3.4):** a yard lantern at (3, 1, -3) and an eave lantern at (0.5, 5, 1.5) put a lantern within
  4 blocks of every face in S11. All lanterns stay 4+ blocks from the snow, because block light over 11 melts it.
