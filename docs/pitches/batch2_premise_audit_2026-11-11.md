# Batch 2 premise audit (2026-11-11, story-critic, pitch mode)

For the owner's premise audit before any script is written (owner, 2026-11-11: "I want good premises. Good premises
turn into good scripts and good stories."). Bars: Light Sleeper ("the carpet one") and runaway.

**Rules applied.** The STANDARDS 1.0 mystery test: a question by 3 s, a guess but no certainty at the midpoint, a cut
on the reveal, and one sentence after it. Owner notes from 2026-11-11 also apply:
- length is not a criterion (r:r08fd98), so no old "Fast / 25-40 s" fails are carried over;
- Pip is fine as narrator, and characters must sound distinct from her;
- everything the narration names is on screen;
- each story stands alone, so canon and easter eggs are not scored;
- vary premise families, and keep grandparents down ("Do we need the grandpa and grandma stories? That feels too
  specific").

Names in the Woods' "I dont understand this one" is the confusing end of the test: a twist that needs two mechanics
fails.

**Excluded (made or queued).** Light Sleeper, Good Boy, Thirty-One Raids, Gold for the Portal, Dog on the Hill; and
HelloBuh's chunk_next_door, nitwit, respawn_voice/respawn_tax, sheep_stares, sun_wont_set, torch. I checked
originality against all of these, against put_back, and against every row in the pitch files.

**Families already used:**
- village_custom: Light Sleeper;
- grandparent_secret: Thirty-One Raids, Gold;
- waiting_pet: Dog on the Hill, Good Boy.

The families below are named by the shape of the twist.

**Scores.** H = hook, T = twist, F = fairness, Fit = owner fit, each 1-10. For calibration, runaway scores H 10, T 10,
F 9, Fit 10, and Light Sleeper about 10 / 9 / 9 / 10.

## 1. Every candidate

### Approved / revise scripts
| candidate | H | T | F | Fit | mystery test | family | engine risk | why strong or weak |
|---|---|---|---|---|---|---|---|---|
| **The Walk** | 8 | 9 | 8 | 9 | **pass** (late: the r1 cold read was 75-80 % sure, but only at L06 of 8) | grandparent_love | merchant screen + tooltip GUI; boots on a player actor (armour now draws); ice placed per step | The best twist in the bank: "walk the water" taken literally, and the sea freezing toward her window is the game saying it. Weakness: "why not a bridge?" is still open. |
| **Red Sheep** | 8 | 8 | 8 | 8 | **pass** (45 %; players who know "wololo" are near sure by L04) | mob_alarm (village_custom shape) | evoker casting arms + spell particles, fangs, a sheep recolouring on screen | Clean one-step, game-shown twist ("EYES" is literal), but it's Light Sleeper's shape: a village custom, a mob only the custom keeps away, and the kid breaks it. |
| **The Bell in the Window** | 7 | 8 | 8 | 8 | **pass** (40 %, the biggest "ohhh" in the cold reads) | guardian_misread | skeleton bow-draw arms, bell swing, arrow in a post, window-bell-oak line-up | The bell that scares everyone was a shield: a real flip. Line 1 ("the whole village RUNS inside") echoes runaway's line 1 almost word for word. |
| **The Scarecrow** | 8 | 8 | 8 | 7 | **pass** (the question shifts from "what" to "why" once players see a snow golem) | guardian_misread | snow golem walk + snowballs (model exists), a snow trail, night zombies | "Stalker becomes guard" flips L03. Weaknesses: players read the snow golem on frame 1; it needs the recheck's cut of L11; it's a grandparent story (a dead Grandpa). |
| **The Broken Rail** | 6 | 8 | 9 | 7 | **pass** after the recheck's restage (cut on the cart arriving, Grandma unseen until then) | grandparent + waiting | minecart rail run, crater, activator rail | A fair, warm twist (she couldn't get out, like the pig). But an old man waiting breaks no rule, and it repeats both used families. |
| **Lantern Bay** | 8 | 6 | 8 | 6 | **fail: answered at ~55 %**, then a second question; reveal in chest-title text | grandparent (lost elder) | drowned in dark water, tridents, chest GUI title | A beautiful image whose twist flips L07, not L01. A fourth lost-elder story. |
| **Slow Falling** | 9 | 7 | 9 | 6 | **fail: too obvious** ("JUICE" at 8 s says "potion" to every player) | grandparent_secret | bubble column, potion swirls, effect icon | A great opening image, but the mystery is solved by a word, and it's the used grandparent_secret family. |
| **Six Thousand Torches** | 9 | 8 | 8 | 7 | **pass** ("something's coming" holds; giving his things away tips adults to "goodbye" about 60 %) | player_goodbye (villager POV) | mass torch placement, a player actor, the "left the game" chat | Hook 9 and a true flip (coming becomes going). It ends on "X left the game" like Dog on the Hill, and a pedant will note that nothing spawns once no player is online. |
| **Goat Horn** | 9 | 8 | 8 | 8 | **pass** (L05 "Goats don't MISS" tips players at ~38 %: move it later) | parent_quest | **goat model not drawn** (first on the to-build list); horn drop, a far-off wave | A visible cause, a want, and a true drop rule. "Dad isn't losing, he's farming me a way to call him" flips L01. Engine first. |
| **Forty-One Cats** | 9 | 6 | 8 | 5 | **fail: too obvious** (65-85 % "creepers") | guardian (Light Sleeper's shape) | cat sit pose, collars | Light Sleeper's plot with runaway's creeper, called by most readers. **Kill for this batch.** |
| **Names in the Woods** | 8 | 5 | 9 | 3 | **fail: confusing** (the owner: "I dont understand this one") | monster_in_family | nameplates, potion throw | Two mechanics must chain: a named villager keeps its name when zombified, and only players can throw the cure. **Kill.** |

### Story dirs with only a story.json
| candidate | H | T | F | Fit | mystery test | family | engine risk | why |
|---|---|---|---|---|---|---|---|---|
| **same_spot** | 8 | 5 | 6 | 4 | fail: obvious to players ("chunks unload" at the frozen sheep), confusing to others; told in 5 lines; ends "Which is why" | world_rule | frozen mobs mid-air | Same engine as chunk_next_door (published on HelloBuh). The twist is explained, not shown. **Kill.** |
| **sign_by_bed** | 7 | 3 | 4 | 2 | fail: no reveal (ends on a question card) | interactive | signs | A near-retelling of the owner's own example (a future message, "I never placed a chest", Mom smiling), which the bank bans. **Kill.** |

### Open premise-bank rows (old scripts on `claude/story-*` branches)
| # | candidate | H | T | F | Fit | mystery test | family | engine | why |
|---|---|---|---|---|---|---|---|---|---|
| 2 | **First Player in 3,000 Years** | 7 | 5 | 6 | 5 | fail: the answer explains ("the world only runs with a player"); sad epilogue | world_rule | frozen villagers | Same_spot's and chunk_next_door's engine. **Kill.** |
| 5 | **Every Block I Place** | 5 | 3 | 2 | 3 | fail: confusing; no vanilla rule, and forgetting can't be shown | none | n/a | **Kill.** |
| 7 | **One More Eye** | 8 | 3 | 3 | 3 | fail: the twist is false (the dragon can't leave the End or place eyes) | lost_sibling | portal frame, dragon | Also put_back's "brother went to fight the dragon". **Kill.** |
| 8 | **More Golems Every Morning** | 8 | 4 | 4 | 3 | fail: "I'm a zombie at night" isn't vanilla | narrator_is_mob | golems | Runaway's spine with a made-up rule. **Kill** (keep the mechanic: scared villagers summon golems). |
| 9 | **One Block Higher** | 9 | 5 | 4 | 5 | fail: the sea doesn't rise in vanilla, so the answer is unfair; ends "So THAT's why..." | guardian | water, dirt pillar | Great image: a bed on a growing dirt pillar. No in-game cause. **Park** until someone finds a vanilla flood. |

### Strong unmade premises from the pitch files
| candidate (source) | H | T | F | Fit | mystery test | family | engine | why |
|---|---|---|---|---|---|---|---|---|
| **The Wall Grows** (story_pitches #1, test 10/10, never developed) | 9 | 9 | 8 | 9 | **pass** (midpoint: "something outside: giants? the warden? people?"; players get it at the minecart flinch, ~70 %) | the_viewer_is_the_threat | a 40-high wall and a trading hall (/fill, full scale), a player actor | The twist turns line 1 and the viewer: the wall keeps out *players*, who box villagers into trading halls. Every clue is a real player habit. **The best premise not yet built.** |
| **Bed in the Square** (heart #1, developed on `agent/writers-heart`) | 7 | 8 | 7 | 6 | pass for players; the reveal is chat text ("left the confines of this world") | grandparent + waiting | chat line, a respawn appear | A good one-step (the world's edge killed him, so the bed brought him home). Both families are used and Grandpa's player status is unclear. **Park.** |
| **Spawn Room** (absurd #2, on `agent/writers-absurd`) | 8 | 6 | 8 | 6 | fail: too obvious (tree-punching at ~6 s tells every player) | world_rule (comic) | floating trees, a chat flood | Ideal for a bubbly kid who misreads the world, but it's a sketch more than a mystery. **Park**: hold the tree-punching to the midpoint. |
| **Monsters Nearby** (eerie #1, on `agent/writers-eerie`) | 7 | 7 | 8 | 4 | fail: Grandma must be on screen, and on screen she's a witch, so it's solved at first sight | monster_in_family | witch, bed message | The "monster is family" shape again, and a grandparent. **Park.** |
| **The Pale Tree** (eerie #3) | 9 | 8 | 7 | 8 | pass on paper | eerie_watch | **creaking + pale garden not drawn** | Vanilla needs a *player* to freeze the creaking, so the watcher must be the kid. **Park on engine.** |
| **Phantoms Over Our Roof** (story_pitches #3) | 8 | 6 | 7 | 6 | pass, but the answer explains rather than turns | guardian | phantoms, cat | Phantoms are a player-only rule applied to Dad. **Park.** |
| **The Golem Waterfall** (absurd #9) | 9 | 7 | 7 | 5 | fail: players read "iron farm" on frame 1 | the_viewer_is_the_threat | golems, lava | The Wall Grows does the same flip, fairer. **Kill.** |
| **Wither Garden** (absurd #4) | 9 | 6 | 7 | 6 | pass | keeper | wither model exists | Needs the narrator's stake; it's a grandparent keeper. **Park.** |
| **Golem Facing In** (story_pitches #2) | 9 | 6 | 7 | 6 | pass | monster_in_family | golem, cure | The same cure as Names in the Woods, and vanilla golems attack zombie villagers. **Kill.** |
| **Boots on the Lake** (eerie #4) | 9 | 7 | 7 | 6 | pass | parent_secret | armour now draws, so the old engine block is lifted | Same Frost Walker as The Walk: only one can be made. **Park** behind The Walk. |

### NEW (proposed here)
| candidate | H | T | F | Fit | mystery test | family | engine | why |
|---|---|---|---|---|---|---|---|---|
| **NEW: The White Horse** | 8 | 7 | 9 | 7 | **pass** for casual viewers (the guess is "a ghost horse?"); players who know the skeleton trap are ~50-60 % sure from frame 1 | lure (a new family: the thing that only comes for you is bait) | skeleton_horse model exists, thunder weather and lightning light exist; needs 4 skeletons riding horses (passenger pose) in iron helmets | Vanilla-true down to the detail: a trap horse appears only near a player in a thunderstorm, despawns by morning if nobody triggers it, ignores villagers, and springs within 10 blocks. A new mob and a new setting (storm, hillside). |

**NEW: The White Horse, the spine.**
- Every thunderstorm, a white horse appears outside the kid's window, alone in the rain, and by morning it's gone.
  "Thirty storms. Thirty horses."
- Villagers walk right past it; it only ever looks at *him*.
- He's the only one in the village who could ride a horse, and he has always wanted one.
- Mom: "A horse in a STORM isn't LONELY, honey." She shutters his window.
- Up close it's very thin: "You can see its RIBS. I'll bring it APPLES."
- Tonight he goes out in the storm with an apple. Ten blocks out, lightning hits it, and four skeleton riders in
  iron helmets rise, turning their bows on him. Cut on the draw.

Line 1 flips: "a horse shows up for me" becomes "it was waiting for me". One sentence: "It's a skeleton trap: it
only springs when a player walks up, and he's the only player."

## 2. Ranked shortlist (8)

Seven families, two grandparent stories (The Walk, The Scarecrow). Red Sheep's Grandpa becomes Dad to stay under the
cap.

**None of the eight is at the carpet bar yet:**
- **The Wall Grows** is closest on premise;
- **The Walk** is closest on twist;
- **The Bell** gives the best "ohhh" on a cold read.

| rank | story | family | H/T/F/Fit |
|---|---|---|---|
| 1 | The Wall Grows | the_viewer_is_the_threat | 9/9/8/9 |
| 2 | The Walk | grandparent_love (GP 1) | 8/9/8/9 |
| 3 | The Bell in the Window | guardian_misread | 7→8/8/8/8 |
| 4 | Goat Horn | parent_quest (engine: goat) | 9/8/8/8 |
| 5 | Red Sheep (Dad, not Grandpa) | mob_alarm | 8/8/8/8 |
| 6 | Six Thousand Torches | player_goodbye | 9/8/8/7 |
| 7 | NEW: The White Horse | lure | 8/7/9/7 |
| 8 | The Scarecrow | guardian_misread (GP 2) | 8/8/8/7 |

### 1. The Wall Grows
- **Line 1:** "The wall around my village is FORTY blocks high. Old Tomas adds ONE more every MORNING."
- **Reveal:** the kid climbs to the top and sees a trading hall outside: a hundred villagers, each boxed in a
  one-block cell, and a player at its door turning to look up at him.
- **Guess and surprise:** by the midpoint a viewer knows the wall isn't for zombies ("Zombies can't climb ONE block")
  and guesses "something worse is out there". The torches on the rim at night and a block that "vanished" point at
  players, but most read "monster". Players lock in at the minecart flinch (~70 %). The surprise is that the monster
  is *them*: every player watching has built that hall, which is also the comment bait.
- **What must change:**
  1. **Answer "why one more a day?"** Each dawn a dirt pillar pokes just over the rim from outside (a player
     towering up), and Tomas builds above it. It's a picture clue players know.
  2. **Cut on the player looking up.** Drop Tomas's "Come DOWN, kid. Add your BLOCK." because it plays after the
     reveal.
  3. **Recast the voices.** Pip narrates as the villager kid. Tomas gets an old, slow male voice, kept to two lines.
  4. **Clear the minecart flinch.** Villagers placing blocks is a style choice: the minecart flinch must read as
     fear, not comedy.

### 2. The Walk
- **Line 1:** "My grandpa has broken the same LECTERN three thousand TIMES."
- **Reveal:** the trade finally shows Frost Walker II, and without a word he walks off the dock as the sea freezes
  under each step toward Grandma's lit window.
- **Guess and surprise:** players know lectern rerolling, so they spend the middle guessing *which* book (Mending?).
  "WALK the WATER to me, or don't COME" lets the attentive call Frost Walker just before the screen does. The
  surprise is that he took "never" literally for ten years.
- **What must change:**
  1. **Close the bridge hole.** Add the misread line "Mom says that means NEVER." after L06. It answers the bridge
     (a bridge isn't walking the water) and plants the literal reading.
  2. **Show Grandma.** Her lit window and her silhouette must be readable at phone size (STANDARDS: named means on
     screen).
  3. **Pin the island.** Island at 60 blocks everywhere, FOV 30.
  4. **Engine.** Build the trade-screen tooltip, with "Frost Walker II" also in the caption track.

### 3. The Bell in the Window
- **Line 1 (rewrite):** "Every time I open my WINDOW, the village BELL RINGS." (L02: "And the WHOLE village runs
  INSIDE.") This drops runaway's "everyone runs from me" opening.
- **Reveal:** he leans out past the bell, and the skeleton under the cliff-top oak, which every arrow was hitting
  the bell to reach, draws on him with nothing in between.
- **Guess and surprise:** the arrow in the bell post each morning and "something WHITE under the oak" make a
  skeleton a fair guess (~40 %). Nobody guesses that the bell was a shield until he leans past it.
- **What must change:**
  1. **The line-up.** Window, bell and skeleton sit on one axis in a single wide; set.md's line-up check should read
     "8-11 high, ≤15 blocks from the window".
  2. **The bell must be on the line.** Lower the beam or raise the window.
  3. **Engine.** Skeleton bow-draw arms.

### 4. Goat Horn
- **Line 1:** "A GOAT has knocked my DAD off the same CLIFF 213 TIMES."
- **Reveal:** the kid steps aside on the goat's tell, the goat hits the oak, a goat horn pops out, he blows it, and
  far down the road Dad turns around.
- **Guess and surprise:** "Goats don't MISS" plus the neighbour's horn lets players guess "he wants a horn". The
  surprise is who it's for (the kid, to call him from the mines) and that the kid is the one who gets it.
- **What must change:**
  1. **L05.** "IDA" becomes "The girl NEXT DOOR" (an unexplained name), and the line moves after the donkey line so
     it isn't solved at 38 %.
  2. **Cut L12.** "It was for ME. To CALL him." explains the picture; end on Dad turning.
  3. **Engine first.** Build the goat model (no goat, no story).

### 5. Red Sheep
- **Line 1:** "Every SHEEP in our village is BLUE. All SIXTY of them."
- **Reveal:** in the woods his lamb turns red as an evoker behind it lowers its arms, and the fangs snap toward him.
- **Guess and surprise:** "They're our EYES, kid" and the one sheep that came back red make "red means danger" the
  midpoint guess (45 %). The surprise is the mechanic: an evoker's spell is what turns blue sheep red, so the flock
  is an alarm.
- **What must change:**
  1. **Grandpa becomes Dad** (the batch's grandparent cap; "kid" stays his verbal habit).
  2. **Keep the evoker unseen until the reveal frame.** Cause and effect sit in one wide.
  3. **Space it from Light Sleeper.** It shares its shape, so don't release them back to back.

### 6. Six Thousand Torches
- **Line 1:** "Someone put SIX THOUSAND TORCHES on my village last NIGHT."
- **Reveal:** the last row ends at the kid's own door, where his player friend places the final torch, waves and
  leaves the game without his nightly "see you TOMORROW".
- **Guess and surprise:** the kid's "Something BIG must be COMING" is the decoy. "One LAST night" and Jonah's things
  in the chest let adults suspect a goodbye at about 60 %. The surprise is that it's every future night's torch at
  once.
- **What must change:**
  1. **Change the ending device.** Make it the missing "see you TOMORROW" over the doorstep wave, not the chat line,
     or it repeats Dog on the Hill's "left the game" ending.
  2. **Answer the spawn pedants.** Let the kid's line carry the gesture: "So I'm never in the DARK."
  3. **Release order.** Never next to Dog on the Hill.

### 7. NEW: The White Horse
- **Line 1:** "Every THUNDERSTORM, a white horse shows up outside my WINDOW. Thirty storms."
- **Reveal:** ten blocks from it, with an apple held out, lightning strikes and the horse splits into four skeleton
  riders turning their bows on him.
- **Guess and surprise:** "You can see its RIBS", the villagers walking past it, and Mom's "A horse in a STORM isn't
  LONELY" give a guess of "it's not a real horse". Only players who know the trap are sure. Everyone else gets the
  biggest spectacle in the batch.
- **What must change:** it's a new premise, so the full writers' room, critic and cold read. Engine check first:
  skeletons riding skeleton horses, iron helmets, the bolt.

### 8. The Scarecrow
- **Line 1:** "SIXTY-THREE mornings in a row, a trail of SNOW runs from our SCARECROW to my WINDOW."
- **Reveal:** he throws the window open to catch it, the scarecrow is gone from the wheat, and below him the snow
  golem is knocking zombies off his wall with snowballs.
- **Guess and surprise:** groaning and "a GROSS little GIFT" (rotten flesh) say "zombies". The snow golem is readable,
  but "stalking or guarding?" stays open to the window. The surprise is "STARING at me" becoming "keeping an EYE OUT
  for me".
- **What must change:**
  1. **Apply the recheck.** Cut L11, end on the tilt down, and trim L07 to "He SAID he'd keep an EYE on me."
  2. **Release order.** Not in the same five as The Bell (same family).

**Reserves:** Bed in the Square (if the owner wants a third heart story), Spawn Room (if he wants a comic one, after
the fix above), Slow Falling (only with the recheck's "LUNCH" fix and a cold read under 50 %).

**Suggested batch of five** (five families, one grandparent, no two adjacent alike): The Wall Grows, The Bell in the
Window, The Walk, Goat Horn (once the goat draws; otherwise Six Thousand Torches), Red Sheep.
