# lantern_bay: continuity bible (r1)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - Drowned spawn naturally in water only where the block light is 0, and in oceans only below sea level - 5
    (`Drowned.checkDrownedSpawnRules`: `isDarkEnoughToSpawn` + `isDeepEnoughToSpawn`). Natural spawns are 24+ blocks
    from a player. Hostile mobs 128+ blocks from every player despawn.
  - Water dampens light by 1 more than air (light drops 2 a block through water). A lantern gives light 15, so a floor
    lantern lights 7 blocks up and 7 to each side.
  - Sky light also drops through water: 13 blocks down it is 2 even at noon, too dim to stop a spawn
    (`isDarkEnoughToSpawn` needs block light 0, then a raw brightness check that light 2 usually passes).
  - Lanterns can be placed in water (they waterlog and keep glowing); torches can't. A held lantern lights nothing.
  - A player has 300 ticks of air (10 bubbles on the HUD, one per 1.5 s) underwater.
  - A chest renamed in an anvil keeps the name when placed, and its screen shows the name as the title.
  - Drowned may spawn holding a trident.
- **Nobody becomes a drowned in this story.** Grandpa (a player) is lost at sea; the story never says how.
- **The backstory (never staged):** Grandpa dove the old shipwreck in the bay for its treasure. He found a Heart of
  the Sea, hid it on the wreck's deck in a chest he had renamed For Rosa (Grandma's name; his boat was the ROSA too),
  meaning to give it to her on her birthday. One night he dove late in the ROSA and neither he nor the boat came back.
  301 nights ago. The next night Grandma placed the first lantern at the foot of the dock. She has placed one a night
  since, 2 blocks apart, straight toward the wreck: 300 lanterns before tonight, a road 600 blocks long. Tonight's is
  the 301st, and it lands on the deck.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. any night (the habit) | L01-L03 | night | 18000 for S01, S02, S03, S03b | half moon high in the south (S01 looks west: the moon frame left); the lighthouse lit; the lantern line |
| B. a morning | L04 | morning | 1000 | sun low in the east, behind the camera (S04 looks west) |
| C. once, at noon (flashback, "ONCE") | L05-L07 | noon | 6000 | underwater at depth 13: sky light 2 at the end of the line, near black; the lanterns are the light |
| D. dusk (the day of tonight) | L08 | dusk | 12600 | the sun setting in the west, straight down the line |
| E. tonight | L09-L13 | night | 18000 for every shot | as A |

- Weather: clear throughout. Season: summer. The bay is calm.
- **Numbers said and what the picture must show:**
  - "three hundred lanterns": not countable on screen. S01 shows the line from the dock's foot running out into the
    fog: ~60 lanterns visible, more implied. Spacing is the same everywhere: one every 2 blocks, on the floor.
  - "ONE more" (L03): exactly one lantern placed on screen in S03b.
  - "TRIDENTS" (L06): two drowned, each holding a trident, in S06.
  - "LAST one" (L09) and "the LAST one" (L11): one lantern, in Grandma's hand in S09, in Milo's from the toss on.
  - The chest: one; one item in it (one Heart of the Sea, count 1, middle slot of the top 9x3 grid: slot 13).
  - Breath bar: 10 bubbles on entering the water; S05 shows 8 at the start, S06 6; S10b 10 dropping; S12 4; S13 4.

## Places
Coordinates: the dock's shore landing is (0,0); the bay opens to the **west** (-x); +z south. Sea level 63.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| cottage | (14,-6), on the bank 6 blocks above the water | a spruce cottage, the bedroom window facing west over the dock; lamp in the window | seen in S02 (from inside), S10 (far behind) | window lit in E |
| dock | from the landing (0,0) west to the T-head at (-20,0) | library `dock`: stone landing, plank walk on piles, rail, lamps, the fishing shack on the T-head, a bell; **the mooring** on the T-head's south side: an oak fence post with a lead knot hanging slack, an oak sign on it reading `ROSA`, no boat | S01 (from above, night) | none |
| headland | (-30,-55), the north arm of the bay | library `lighthouse` on the rocks, lantern room lit at night | S01, S02, S04, S08, S09 (bg, frame right when looking west) | none |
| bay_shallows | x -20..-60 | floor slopes from 4 to 13 water blocks deep; sand, gravel, seagrass, some kelp; the lantern line starts at the dock's foot (-20,0) | S01 | none |
| line_mid | x -60..-560 | floor 13 deep, sand and gravel, seagrass and kelp near the lanterns; the line at z=0, a lantern every 2 blocks | S07 (staged at x ~ -100) | none |
| line_end | x ~ -560 (the edge of the light on the noon flashback, scene C) | the last lantern, then black water; drowned 8-10 blocks past it | S05, S06 | in C the end is at x = -560 (some 20 nights before tonight); in S03b (scene A) the end is wherever that night's was |
| line_end_wreck | x -618..-600 (tonight's end) | the line ends 2 blocks short of the shipwreck's bow; vanilla `shipwreck` (upright, on the sand, floor 13 deep), deck ~8 deep; **the For Rosa chest** on the deck, 2 blocks aft of the bow; drowned (3) in the black beyond the wreck | S10b (the hull shape), S11, S12 | S12: Milo places lantern 301 on the deck at the bow; the deck lights up. S13: the chest opened |

Staging: the far end is built as its own set where the bay is deep enough (the line's last 60 blocks and the wreck);
the near end (dock to x -140) is the main set. The two never share a frame: S01-S04, S08-S10 look from the shore; S05-S07,
S03b, S10b-S13 are underwater with 24-block underwater fog.

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N): Milo as a kid | the bot, POV; default Steve skin in camera shots (S09, S10 only) | hotbar: empty in A-D; in E the lantern from the toss (S09) until he places it (S12), then empty | none | A: his bedroom window (S02); B: on the dock behind Grandma (S04); C: underwater at the line's end (S05-S07, S07 is a camera); D: the T-head behind the mooring post (S08); E: the dock (S09), swimming behind Grandma (S10), diving (S10b), at the wreck's bow (S11-S13) | wet in C and E (no visible change); full hearts throughout |
| Grandma | player actor, default `noor` skin | a lantern in her main hand in S01, S02, S03 (until placed in S03b), S09 (until tossed) | none (no floating names) | A: the dock end (S01), walking down the dock (S02), swimming the line (S03), the line's end (S03b); B: the T-head by the mooring, facing west (S04); E: the T-head (S09), swimming ahead of Milo (S10, S10b), beside the last lantern at the wreck (S11) | slow walk on land; sprint-swim pose underwater (S03b, S10b), upright treading at the surface (S03, S10) |
| drowned | vanilla drowned, each holding a trident | trident in the main hand | none | S03b (one, outline, 10 blocks into the black); S06 (two, 8-10 blocks past the last lantern, at the edge of the glow); S07 (one, outside the light, frame left); S10b/S11 (two or three, far in the black past the wreck, barely visible) | never inside the light, never attack on screen; NoAI, slow drift by `K.actor` |
| the nitwit (easter egg) | villager, nitwit (green coat) | nothing | none | S04 only: knee-deep in the shallows north of the dock's foot, frame right, staring at nothing | none |
| Grandpa | never seen | | | | |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| the lantern line | S01 | `lantern[waterlogged=true]` on the floor, one every 2 blocks along z=0, glowing | from the dock's foot (-20,0) west | S02, S03, S04 (faint by day), S07, S08, S10, S10b, S11 |
| Grandma's nightly lantern | S01 (in hand) | carried, then placed at the end in S03b on "ONE" | | |
| the empty mooring | S04 | fence post, lead knot hanging slack, oak sign `ROSA` (one line, centred), no boat | T-head south side (-19,2) | S08 (fg) |
| the last lantern (tonight's, #301) | S09 (Grandma's hand) | tossed to Milo on "WITH her"; in his hand S10-S12 | | placed on the wreck's deck at the bow in S12 on "light" |
| the shipwreck | S10b (a dark mass), S11 (a hull shape) | vanilla shipwreck, upright, rotted planks, a broken mast | line_end_wreck | lit in S12 |
| the For Rosa chest | S12 | a single chest, closed, on the deck 2 blocks aft of the bow, facing the bow; `CustomName` "For Rosa"; contents: 1 heart_of_the_sea in slot 13 | | S13 opened: the chest screen |

## Positions and screen direction
- **Out to sea is screen-forward / west.** Every shore shot looks west, out along the line: the dock runs away from the
  lens, the line runs into the fog, the lighthouse is frame right (north). Nobody ever walks or swims toward the lens on
  the way out.
- S03 and S10 (following the swimmers): the swimmers move away from the lens, the glow ahead of them.
- S03b (underwater, side-on, looking north at the line's end): out to sea is frame **right**, home is frame **left**.
  Grandma arrives from the left, places the lantern on the right, sprints back to the left.
- S07 is the one reverse: underwater, looking back **east** toward the shore (the road running away to the shallows);
  it is a camera shot, labelled by the line ("the lit part").
- S11: Grandma faces Milo (east), then points past him to the west (the gap, the hull); the camera is beside Milo.
- S12-S13: Milo faces west, the bow below him, the chest ahead on the deck.

## The narrator
- POV in S02, S04, S05, S06, S10b, S12, S13; camera shots elsewhere (S01, S03, S03b, S07, S08, S09, S10, S11).
- Held item: empty hand everywhere except E: the lantern from S09's toss to S12's placing.
- HUD: hearts full; the breath bar shows only underwater (S05, S06, S10b, S12, S13). No armor. No hunger change.
- S02: sitting up in bed by the window (eye at the sill). S04: standing on the T-head behind Grandma.

## Who knows what (line by line)
| line | the narrator knows | Grandma knows | the viewer can know |
|---|---|---|---|
| L01-L03 | Grandma adds a lantern a night and swims it out | why | something on the floor of the bay matters |
| L04 | she calls it a road; thinks it's for fish | where the road goes | it is a road to somewhere |
| L05-L07 | the end is black at noon; tridents; the lit part is empty: lucky | the dark is death; the light is safety | players: drowned only spawn in the dark; the road is protection |
| L08 | Grandpa dove at the shipwreck and didn't come back | the road points at the wreck | the road goes to where Grandpa was lost (the 300 = nights) |
| L09-L11 | tonight's the last; he gets to go and to place it | the road reaches the wreck tonight; not what's on it | the road arrives tonight |
| L12-L13 | there's a chest for Rosa; Rosa is Grandma | (now) Grandpa left her something | Grandpa's last present was waiting at the end of the road |

## Clue map
See `beats.md` (clue map table): the count (L01), the secret (L02), one-and-sprint (L03), "It's a ROAD" (L04), the
ROSA sign (S04, S08), pitch black at noon (L05), the tridents (L06, S03b, S06), the empty lit road (L07), Grandpa and the
shipwreck (L08), the line pointing at the sunset (S08), "LAST one" (L09), the hull shape (S10b, S11).

## The provisional world link
- The bay is south of the carpeted village of Light Sleeper; the nitwit of story_nitwit stands in the shallows in S04.
  **Provisional: re-check against docs/world/canon.md when it lands.**
