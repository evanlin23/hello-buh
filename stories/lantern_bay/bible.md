# lantern_bay: continuity bible (r2)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - Drowned spawn naturally in water only where the block light is 0, and in oceans only below sea level - 5
    (`Drowned.checkDrownedSpawnRules`: `isDarkEnoughToSpawn` + `isDeepEnoughToSpawn`). Natural spawns are 24+ blocks
    from a player. Hostile mobs 128+ blocks from every player despawn.
  - **Light drops 1 a block through water** (as in air). A lantern gives light 15, so a floor lantern lights 14
    blocks around it. The bay's deep floor is 13 down, so a floor lantern lights the whole water column above the road
    to the surface.
  - Sky light also drops through water: 13 blocks down it is 2 even at noon, too dim to stop a spawn
    (`isDarkEnoughToSpawn` needs block light 0, then a raw-brightness check that light 2 usually passes).
  - Lanterns can be placed in water (they waterlog and keep glowing); torches can't. A held lantern lights nothing.
  - A player has 300 ticks of air (10 bubbles on the HUD, one per 1.5 s) underwater.
  - A chest renamed in an anvil keeps the name when placed, and its screen shows the name as the title.
  - A dead player's dropped items despawn after 5 minutes. Items in a chest stay forever.
  - Drowned may spawn holding a trident and swim at players they see.
- **Nobody becomes a drowned in this story.** Grandpa (a player) is lost at sea. The story never says how.
- **The backstory (never staged):**
  - Grandpa (Mae's husband) wanted to give her the Heart of the Sea. He knew where it lay: in the buried treasure beside
    the deep shipwreck in the bay, from the map he'd found in a beached wreck up the coast.
  - One night, 301 nights ago, he took the boat, the MAE, out over the wreck and dove, with a chest he'd renamed For Mae
    to carry it home in. He got there and dug it up.
  - With the drowned coming out of the dark, he placed the chest on the wreck's deck and put the heart in it, so that if
    he didn't make it up it would still be hers. He didn't make it up. The boat drifted off and was lost.
  - The next night Grandma placed the first lantern at the T-head and has placed one a night since, 2 blocks apart,
    straight toward the wreck: 300 lanterns before tonight, a road 600 blocks long. She knows he went to the wreck
    for her present. She does not know about the chest.
  - Tonight's lantern is the 301st. Milo places it on the wreck's bow.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. any night (the habit) | L01-L02 | night | 20500 for S01, S02, S03b | the moon low in the west, in frame looking out to sea; the lighthouse lit; the lantern line |
| B. a morning | L03 | morning | 1000 | the sun low in the east, behind the camera (S04 looks west) |
| C. once, at noon (flashback, "ONCE") | L04-L06 | noon | 6000 | underwater, depth 13: sky light 2 past the end, near black; the lanterns are the light |
| D. dusk (the day of tonight) | L07 | dusk | 12600 | the sun setting in the west, straight down the line |
| E. tonight | L08-L12 | night | 20500 for every shot | as A |

- Weather: clear throughout. Season: summer. The bay is calm.
- **Numbers said and what the picture must show:**
  - "three hundred lanterns": not countable on screen. S01 shows the line from the T-head running out of sight: the
    near end is built to x -200 (90 lanterns) so it never visibly stops before the fog. Spacing is the same
    everywhere: one every 2 blocks, on the floor.
  - "ONE more" (L02): exactly one lantern placed on screen in S03b.
  - "TRIDENTS" (L05): two drowned, each holding a trident, in S05.
  - "LAST one" (L08) and "the LAST one" (L10): lantern 301, in Grandma's hand in S09, in Milo's from the toss until S12.
  - The chest: one, with one item in it (one Heart of the Sea, count 1, middle slot of the 9x3 grid: slot 13).
  - Breath bar, set with marks: S05 8 at the start, 5 by the end; S10b 10, dropping; S12 4; S13 4.

## Places
Coordinates: the dock's shore landing is (0,0); the bay opens to the **west** (-x); +z south. Sea level 63.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| cottage | (14,-6), on the bank 6 blocks above the water | library `cottage` (one room), spruce; the bed under the west window, which looks down on the dock; a lantern in the window | S02 (over Milo's shoulder) | window lit in A and E |
| dock | from the landing (0,0) west to the T-head at (-20,0) | library `dock`: stone landing, plank walk on piles, rail, lamps, the shack, a bell. **The mooring** on the T-head's south side at (-19,2): an oak fence post, a slack lead knot, a big oak sign `MAE` in glow ink, no boat | S01 (from above, night) | none |
| headland | lighthouse at (-80,-20), on the north arm of the bay | library `lighthouse` on rocks, its lantern room lit at night; about 18 deg right of due west from the T-head, so it is in frame right in every shot looking out to sea | S01, S02, S04, S08, S09 (bg, frame right) | none |
| bay_shallows | x -20..-60 | the floor slopes from 4 to 13 water blocks deep; sand, gravel, seagrass; the line starts at the T-head (#1 at x -20); a 1-deep rock at (-34,-12) (the nitwit's) | S01 | none |
| bay_surface | the water over the line, x -20 to -618 | calm surface; the glow of the line below | S10 (crane, the T-head at the bottom edge on frame 1) | none |
| line_mid | x -60..-560 | floor 13 deep, sand and gravel, seagrass and kelp near the lanterns; the line along z=0 | S07 (staged at x ~ -100) | none |
| line_end_noon | the end of the line on the noon flashback (scene C), staged at the far-end set at x -580 | the last lantern, then black water; drowned 6-8 past it at the fringe | S05 | |
| line_end (S03b) | the end on an earlier night, staged at the far-end set | Grandma places one; a drowned in the new light's edge | S03b | |
| line_end_wreck | #300 at x -618; the bow at x -630 (12 past #300); the chest on the deck 4 aft of the bow (16 from #300: light 0 until #301) | vanilla `shipwreck`, upright on the sand, bow facing east, deck ~8 deep; **the For Mae chest**; drowned (2-3) 15+ blocks past #300, beyond the wreck | S10b (the dim hull), S11 | S12: lantern 301 placed on the bow, the deck lights up. S13: the chest opened |

Staging: the far end (x -570 to -650, with the wreck) is its own set, built where the bay is 13 deep. The near end runs
from the dock to x -200. The two never share a frame: S01-S04, S08-S10 look from the shore, and S03b, S05, S07,
S10b-S13 are underwater with 24-block underwater fog.

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N): Milo as a kid | the bot; POV, default Steve skin in camera shots (S02 shoulder, S09, S10) | hotbar: empty in A-D; in E lantern 301 from the toss (S09) until he places it (S12), then empty | none | A: on his bed at the window (S02); B: on the T-head behind Grandma (S04); C: underwater at the line's end (S05; S07 is a camera); D: the T-head behind the mooring post (S08, camera); E: the T-head at frame right (S09), swimming behind Grandma (S10), diving (S10b), beside her at #300 (S11), at the bow (S12-S13) | full hearts throughout |
| Grandma (Mae) | player actor, default `noor` skin | a lantern in her main hand in S01, S02, S03b (until placed), S09 (until tossed); **empty hand S10-S11** | none | A: walking out onto the T-head (S01), stepping off it into the water (S02), the line's end (S03b); B: the T-head by the mooring, facing west (S04); E: the T-head at frame left (S09), swimming ahead (S10, S10b), beside #300, calm (S11) | slow walk on land; sprint-swim underwater (S03b, S10b); upright treading at the surface (S10) |
| drowned | vanilla drowned, each holding a trident | trident in the main hand | none | S03b: one at the edge of the new light, swims at Grandma on "SPRINTS"; S05: two at the fringe 6-8 past the end (light 3-5); S07: one outside the light, frame left; S11: two far beyond the wreck, barely visible | never inside the bright part; never reach anyone; NoAI, moved with `K.actor` |
| the nitwit (easter egg) | villager, nitwit (green coat) | nothing | none | S04 only: on the 1-deep rock at (-34,-12), facing the sea | none |
| Grandpa | never seen | | | | |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| lantern_line | S01 | `lantern[waterlogged=true]` on the floor every 2 blocks along z=0, glowing | #1 at (-20,0) to #300 at (-618,0) | S02, S04 (faint by day), S07, S08, S10, S10b, S11 |
| line_end | S03b, S05 | the end of the line on that night | far-end set | tonight it is #300 at x -618 |
| Grandma's lantern in A | S01 (in hand) | carried, placed at the end in S03b on "ONE" | | |
| the empty mooring | S04 | fence post, slack lead knot, big oak sign `MAE` (glow ink, line 2), no boat | (-19,2) | S08 (fg, big) |
| lantern_301 | S09 (Grandma's hand) | tossed to Milo on "Come SEE"; in his hand S10-S12 | | placed on the bow in S12 on "light" |
| shipwreck | S10b (a dim hull) | vanilla, upright, rotted planks, broken mast | bow at (-630,0) | lit in S12 |
| mae_chest | S12 | a single chest, closed, on the deck 4 aft of the bow, facing the bow; `CustomName` "For Mae"; 1 heart_of_the_sea in slot 13 | | S13 opened: the chest screen |

## Positions and screen direction
- **Out to sea is west, and screen-forward.** Every shore shot looks west along the line: the dock runs away from the
  lens, the line runs into the fog, the lighthouse is frame right, the moon left of centre at night. Nobody swims toward
  the lens on the way out.
- S02: over Milo's shoulder at the west window, looking down to the dock.
- S03b: underwater, from the north side of the line looking **south**, so **out to sea is frame right and home is
  frame left**. Grandma places the lantern at the right, the drowned comes from the right, she sprints out frame left.
- S07 is the one reverse: underwater, looking back **east** toward the shore.
- S09: the camera south of the pair looking north-west. Grandma nearer at frame left, Milo at frame right, the sea
  beyond them.
- S10: behind and above the swimmers, looking west. The T-head is at the bottom edge on frame 1.
- S11: the camera beside Milo, east of Grandma. She faces him (east), then points over her own shoulder, **west**, at
  the bow.
- S12-S13: Milo faces west, the bow below him, the chest ahead on the deck.

## The narrator
- POV in S04, S05, S10b, S12, S13. Camera shots elsewhere (S01, S02, S03b, S07, S08, S09, S10, S11).
- Held item: empty hand everywhere except E, where he holds lantern 301 from S09's toss to S12's placing.
- HUD: full hearts. The breath bar shows only underwater (S05, S10b, S12, S13), set with marks. No armor, no hunger
  change.

## Who knows what (line by line)
| line | the narrator knows | Grandma knows | the viewer can know |
|---|---|---|---|
| L01-L02 | she adds a lantern a night and sprints home | why | something on the bay floor matters, and something in the dark attacks |
| L03 | she calls it a road; thinks it's for fish | where the road goes | it is a road to somewhere |
| L04-L06 | the end is black at noon; tridents; the lit part is empty: lucky | the dark is death; the road is the way across | players: drowned only spawn in the dark |
| L07 | Grandpa dove to the wreck for her present and never came back | the same; the road points at the wreck | the road goes to where Grandpa went |
| L08-L10 | tonight's the last; he's coming to see; he places it | the road reaches the wreck tonight, not what's there | the road arrives tonight: a grave or something else? |
| L11-L12 | there's a chest For Mae; Mae is Grandma; he got there | (now) the same | Grandpa made it, and left her present safe |

## Clue map
See `beats.md` (clue map table).

## The provisional world link
- The bay is south of the carpeted village of Light Sleeper. The nitwit of story_nitwit stands on a rock in the
  shallows in S04. **Provisional: re-check against docs/world/canon.md when it lands.**
