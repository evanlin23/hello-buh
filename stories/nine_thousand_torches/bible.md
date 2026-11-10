# nine_thousand_torches: continuity bible (r2)

The story's count is **six thousand** since r2 (the folder name stays).

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - Monsters spawn only where block light is 0 (since 1.18), and only on a block with a sturdy (full) top face.
  - Dirt paths, farmland, bottom slabs and stair roofs aren't full-topped. Nothing spawns on them, and a torch can't
    stand on them either.
  - A torch stands on any sturdy top, and on fence and wall posts.
  - Villagers sleep through the night.
  - A player who quits a server vanishes at once (no animation), and chat prints `<name> left the game` in yellow.
  - A player's chat message shows as `<Jonah> text` in white.
  - Players show their name over their head unless they're sneaking. While Jonah crouches (sneak) in S06, S13 and S14
    his name dims to the sneaking nameplate (vanilla: drawn dimmer, not hidden), so it still reads in S13-S14.
  - Players can't kneel or wave. Jonah uses sneak and arm swings only.
- **The nightly torch (backstory and S06):** at nightfall Jonah puts a torch on the grass block one east of the kid's
  doorstep (the **door spot**), types "see you tomorrow" and logs off. When he logs in the next day he picks the torch
  back up (players reuse their torches), so in the morning the spot is empty. The last torch (S14) goes on this spot.
- **Why every block (implied by the twist, never said):** Jonah can't do the nightly torch any more, so he did every
  night at once, everywhere. He won't be back to find a spot he missed, so he left none: a torch on every block that
  takes one. The roads and fields stay dark because nothing spawns there (S01 shows them as dark lines).
- **Why tonight:** his mom's rule, "one last night" (L07). The real-life reason stays off screen.
- **Zombies from outside** can still walk in. That's the iron golem's job (S03).
- **The place and the day (shared world, docs/world/canon.md):**
  - **Place:** a new place to claim, `larkfield` ("Larkfield"), a plains village on the north road west of Dog Hill,
    behind the ridge west of the hilltop. The meeting point (this bible's (0,0)) about (-275, 80, -935), footprint
    about (-314, -974, -236, -896). Read the ground off the survey grid before claiming. Claim it in its own commit
    (not done here):
    `./hb world claim larkfield --name "Larkfield" --kind village --region the_green --at -275,80,-935 --footprint -314,-974,-236,-896 --story nine_thousand_torches --day 4500`
    Then add map.json `pieces` (the placed vanilla village, Jonah's cottage until 4500) and stamps (below), and
    `stories.nine_thousand_torches.cameos: ["dog_on_hill"]`, and run `./hb world check`.
  - **Day:** 4500 (the morning after Jonah's last night): after Dog on the Hill (4300), so the torches never show in
    that Short, outside the Long Day.
  - **Who:** the narrator is a new baby villager of Larkfield (not Pip, who is Hushwell's). His best friend, the
    village's player, is **Jonah, not Milo**: canon's Milo stopped playing on day 3400 from Dog Hill, so the player who
    leaves here is someone else. "Mom made me PROMISE" is Jonah's own mom in real life, never seen.
  - **Stands alone:** no line names a place or another story.
  - **Canon consequences to record** (map.json and canon.md, in the claim commit; canon files not edited here):

    | what | since | stamp / note |
    |---|---|---|
    | Larkfield: the vanilla plains village, our house, the iron golem; Jonah's birch cottage at the west end of the main street | before 4500 (cottage until 4500) | pieces at `larkfield` |
    | A torch on every sturdy top and post in Larkfield (6,000-6,300), Jonah's plot a 9 x 9 square of torches on coarse dirt, the last torch on the door spot | 4500 | stamp (the dressing script's output) since 4500. Later stories: Larkfield glows at night on the skyline west of Dog Hill |
    | Jonah leaves the game for good; his things are in our family's chest | 4500 | timeline row: **4500, Larkfield. Nine Thousand Torches.** "A villager kid wakes to six thousand torches. His best friend, the village's player, places the last one at his door and leaves the game." |
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. this morning, the village | L01-L04 | today, dawn | S01 23000, S02 23060, S03 23120, S04 23185 (each shot starts at the previous shot's end tick) | before sunrise, blue-grey, the east sky pale; torches and bloom at their strongest |
| B. Jonah (flashback) | L05-L08 | S05-S06 any evening (the habit); S07-S08 yesterday | S05 11600, S06 12000, S07 12300, S08 12600 | golden hour into sunset into late dusk. **None of the story's torches** (only the village's own lamps). Jonah's cottage stands. Villagers walk the streets in S05 (the flashback cue) |
| C. this morning, the chest and the plot | L09-L11 | today, after A | S09 23250, S10 23296, S11 23328 | dawn, brightening |
| D. the row and the door | L12-L15 | today, minutes later | S12 23450, S13 23652 (~7 s of game time pass at the S12 cut while Jonah finishes the row), then S13, S14 and S15 are one continuous moment: S14 23688, S15 23742 (each the previous shot's end tick) | first gold. S14-S15 look north, so the sun is out of frame and its light rakes from the right (east) |

  Inside A, C and D time only moves forward. B is the only flashback, and it reads as one: gold light, people on the
  streets, no torches.
- **Weather:** clear. Season: summer. No fog beyond the render distance (`look.fog: false`). S04's distance is the
  dawn sky, not fog.
- **Numbers said and what the picture must show:**
  - "SIX THOUSAND torches" (L01). The dressing script counts its placements and logs **6,000-6,300** in the village
    box (about 78 x 78 blocks, ~6,100 columns). S01's crane sees the whole box at once.
  - "Not one DARK block" / "EVERY block" (L02-L03). Every sturdy top and every fence or wall post in the box has a
    torch. No unlit full block shows in any A, C or D shot, except the strip Jonah is finishing in S12-S13 and the door
    spot until S14.
  - "One LAST night" (L07): one.
  - "his STUFF" (L09). The chest screen shows 11 items (Props), and the empty plot in S11 matches.
  - "Just TORCHES" (L11). Jonah's plot is 9 x 9 of coarse dirt with 81 torches (counted in the 6,000).
  - "the LAST one" (L14). One torch, placed on screen on the door spot. Jonah holds exactly one before it and none
    after.

## Places
Coordinates: the vanilla village's bell is (0,0); +x east, +z south. The real numbers come from the village placed at Larkfield
(set.md); keep these relations.

| place | where (x,z) | what's there | establishing shot | changes during the story |
|---|---|---|---|---|
| village | the box, about x -39..38, z -39..38 | a vanilla plains village: 10-14 houses, dirt paths, 2-3 farms with log borders, the bell, the well, hay piles, lamp posts, the iron golem | S01 | A, C and D: a torch on every sturdy top in the box. B: none of them (the whole box is swapped, set.md) |
| west_lane | a fenced lane on the west side | a fence line, grass, house ridges, the hay pile at its end | S02 | torched in A, C and D |
| meeting_point | (0,0) | the bell, the well, hay bales | S03 | torched |
| village_edge | the north edge, on a rise | the last torch row in a clean line, open grass, then a dark oak forest 20+ blocks out | S04 (POV) | none |
| jonah_house / jonah_plot | the west end of the main street, about (-38, 4) | B: Jonah's birch cottage (library `cottage`, birch), two chests and a crafting table by the door (S07), a garden fence with gate lanterns (S05 fg). A, C and D: a bare 9 x 9 footprint of **coarse dirt** with a torch on every block; the street fence in front, a torch on every post | S05 (B), S11 (C, the same angle) | the house stands in B and is gone in A, C and D |
| main street | from our door west to Jonah's | a dirt path (never torched); houses on both sides; the street fence near Jonah's | S08 | none |
| our_door / our_house_inside | about (-24, 6), **14 blocks east of Jonah's door**, on the north side of the main street, door facing south; the largest vanilla plains house in the village | the room: bed under a north-west window, our family's chest against the west wall. The doorstep is grass with the dirt path in front. **The door spot** is the grass block one east of the doorstep | S06 (B), S14 (D, same axis) | S06: the nightly torch (picked up the next day). D: empty until S14's last torch |
| village_south / our_street (coordinates to confirm on the placed village, including grass between the house front and the path, and write the exact row into this table) | the house across the street from ours, about x -27..-20, z 10..17, front facing north onto the street; a **1-wide grass strip** along its east side (x -19, z 11..18) | D: the strip is the last unlit grass. The row runs north up the strip to the house's front corner, turns left (west) along its front for 4 blocks, then straight north across the street (no torch on the dirt path) to the door spot. Provisional row: up the strip x -19 from z 18 to 10, west along z 9 from x -19 to -23 (grass between the front at z 10 and the path), the path gap at (-23, 8), the door spot (-23, 7). **Jonah in S12:** pinned at block (-22, 9), facing east (yaw -90), placing on (-20, 9) then (-21, 9), body hidden by the east wall at x -20 | S12 (POV, the strip), S13 (follow round the corner) | the row grows during S12. By S13 it's complete except the door spot |

## Cast and costume

| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (the narrator) | baby villager, plains type, no profession, `stunt.self` | nothing; no HUD and no hand in POV | none | A: in the village (POV S04). B: at our door (S06, S08, seen from outside, back to us). C: in our house (POV S09; standing on the bed in S10), then at the plot (S11, off frame). D: POV at the strip (S12), running (S13), on the path at frame right (S14), POV 2.5 blocks from Jonah (S15) | none |
| Jonah | player actor (bot `Jonah`), default Steve skin | S05 empty hand. S06 a torch, placed on 'TORCH', then empty. S07-S08 a torch. S12 a torch (only his arm in frame). S13 crouched at the doorstep holding **exactly one torch**. S14 places it on 'LAST'; empty after. S15 empty | his player name over his head (sneaking nameplate while he crouches) | B: at his gate (S05), by our door (S06), at his chests (S07), walking west (S08). D: round the corner (S12), at our doorstep (S13-S15) | S06: quits (an ordinary night). S15: quits for good |
| the iron golem | the village's own | | none | A: walking through the torches (S03) | none |
| villagers | the village's own (`mobs: 'freeze'` in A, C and D: in their beds) | professions as generated | none | B (S05): two walking on the street. A, C, D: none outside | none |

## Props

| prop | first seen (line, shot) | state | where exactly | later appearances |
|---|---|---|---|---|
| the 6,000 torches | L01, S01 | standing `torch` on every sturdy top and fence or wall post in the box | the box | every A, C and D shot; **none in B** |
| fence-post torches | L02, S02 | one per post | the west lane, and the street fence by Jonah's plot | S11 foreground |
| ridge torches | L02 'ROOFS', S02 | one on every full block of each roof ridge | house roofs | S01 |
| hay-bale torches | L02, S02 | one on every exposed top | the hay pile at the meeting point | S03 background |
| the nightly torch | L06, S06 | placed on 'TORCH' | the door spot | gone by morning (picked up) |
| the chat lines | L06, S06 | `<Jonah> see you tomorrow` (white) on 'TOMORROW', then `Jonah left the game` (yellow) when he vanishes | the chat, bottom left | S15: only `Jonah left the game` |
| chests of torch makings | L07, S07 | two open chests, coal and sticks | by Jonah's door (B) | gone in C |
| our chest | L09, S09 | diamond sword, iron helmet, chestplate, leggings and boots, red bed, shield, filled map, fishing rod, 16 bread, bucket | our room, west wall | none |
| Jonah's cottage | L05, S05 | standing, lit | jonah_house | S07-S08; gone in C (S11) |
| the plot's torch square | L11, S11 | 81 torches on coarse dirt | jonah_plot | none |
| the growing row | L12, S12 | grows round the front corner while S12 plays; complete to one short of the door spot in S13 | the strip, the house front, across the street | S13, S14 |
| the last torch | L14, S14 | placed on 'LAST' on the door spot, closing the row | the door spot | S15: burning beside the empty doorstep |
| the easter egg: the dog on Dog Hill (canon cameo `dog_on_hill`, Pip beside him) | S01 (bg, east skyline, frame right, ~2 s) | sitting, a speck against the dawn band | Dog Hill's top, about 80 blocks east-south-east of the meeting point (built by `world.build`) | none (S01 only) |

## Positions and screen direction
- Our door faces south. S06 (wide, 9 blocks out: the place's establishing shot), S14 and S15 look north at it along
  the same axis. The kid is at frame right in S06 and S14 (in S14 he came up from the south-east, out of the strip),
  always nearer the lens than the door spot so he never covers the torch.
- **S06 → S07 cut:** the chat overlay clears and the S06 torch is removed from the door spot (S07-S08 never show it).
- S08 looks west down the main street from our door. Jonah walks away from the lens to his cottage, 14 blocks away.
- S12 looks north up the strip. In S13 the kid runs north and turns left round the corner, and our door is ahead
  across the street.
- S05 and S11 share an angle (east of Jonah's plot, looking west at the west hills).

## The narrator
- A baby villager: eye height 0.81 in POV (S04, S09, S12, S15). In S10 he stands on the bed, so his eye is about 1.4
  above the floor, over the sill. `hud: false`, `hideHand: true`.
- Where he is for each line: L01-L03 in the village (camera shots, out of frame). L04 at the north edge. L05-L08 in
  the flashback, at our door. L09-L10 in our house. L11 at the plot. L12 at the strip. L13 running. L14 on the path,
  5 blocks from the door. L15 2.5 blocks from Jonah.

## Who knows what (line by line)

| line | the narrator knows | Jonah knows | the viewer can know |
|---|---|---|---|
| L01-L04 | the village is lit; the spawn rule; thinks something's coming | everything | the image, the rule, the guess |
| L05-L06 | Jonah is his best friend; the nightly torch and "see you tomorrow" | | the habit, and what an ordinary leave looks like |
| L07-L08 | "one last night"; thinks grounded | it's his last night | first suspicion |
| L09-L11 | the chest, the empty plot; thinks hiding | he gave it all away | **he's leaving** (~72%) |
| L12-L13 | a row is growing; wants to know who; it ends at his door | | where it ends: the nightly spot |
| L14 | Jonah put the last one there, every night at once (he waves after, unsaid) | goodbye | goodbye |
| L15 | no "see you tomorrow"; the game says he left | | he isn't coming back; the torches are for after |

## Clue map
See beats.md (the same table). In short: the lit village (L01-L03), the rule (L03), the nightly torch and "see you
tomorrow" (L06/S06), "one last night" (L07), the torch makings (S07-S08), the chest (S09), the house gone (S11) and
the row to the nightly spot (S12-S13).
