# monsters_nearby: continuity bible

## World
- **Scene order and time** (ticks): S01-S03c night 9, 18000 (clear, moon high in the east window). S04 a flash-back to
  night 4, 18000, clear (same sky). S05 night 9, 18000. S06 **day**, 6000, overcast (the only daytime shot: it's
  "since the storm", a memory shot; the cut is carried by the line). S07-S09 night 9, 18000. S10-S15 the same night
  later, 19000, **thunderstorm** (rain starts on the S10 cut: `K.cut(..., { time: 19000 })` + `ctx.setWeather('thunder')`
  set on S10's frame).
- **Sun/moon:** the bedroom window faces east; at 18000 the moon is high, so the window shows sky and moonlight, not
  the moon's disc (except S04, looking straight up, and S09, looking up through the window).
- **Season:** none; swamp (grey-green water and grass, vines on the oaks).
- **Numbers the script says:** NINE nights (L01), EIGHT blocks (L02, L13), night FOUR (L04). No other counts. The torch
  ring is 72 torches but is never counted aloud. Three phantoms in S04, one in S09.

## Places

| place | where (x, z from the bed head, +x east) | what's there | establishing shot | changes during the story |
|---|---|---|---|---|
| bedroom | interior x -6..0, z -3..+3 (7 x 7), 4 high; bed head at (0, 0) against the east wall, foot at (-1, 0) | blue bed (head east) under the east window, the chair (oak stairs) at (0, -2) facing the bed, one lantern at the ceiling centre, the dug hole at (-4..-3, +1..+3), the front door in the south wall at (-3, +4), the kitchen doorway in the north wall at (-3, -4) | S01 | the hole is already dug in S01 (an earlier night); door open S10-S11, shut after |
| kitchen | north of the bedroom: interior x -6..0, z -8..-5 (7 x 4); all of it inside the bed's reach | furnace (lit) and cauldron (full) on the north wall, table with a brewing stand (one red potion) and an empty glass bottle, the black cat on the counter by the west wall | S05 | none |
| attic | over both rooms, hatch above (-5, -2) | beams, cobwebs, one chest, one torch | S03b | none |
| well | (+5, +6), inside the torch ring | cobblestone rim, 6 deep, water at the bottom | S03c | none |
| yard | around the cottage | the torch ring: fence posts with torches on the square |x| = 9 or |z| = 9 (72 torches), one block past the bed's 8-block reach; on the north side the ring runs along the kitchen's back wall as wall torches; the garden path from the porch round the south-east corner to the gate | S02 (EWS) | rain from S10 |
| garden gate | (+10, 0), straight out of the bedroom window, one block past the torch line | an oak fence gate between two posts; a lantern on the north post | seen in S06 (by day) and S10, S14 | Grandma stops here in S14 |
| roof | over the cottage | dark-oak roof; a ragged 4 x 3 patch of fresh birch planks over the kitchen; a cobblestone chimney (over the furnace) carrying a copper lightning rod | S04 (night), S06 (day) | none |

**The reach rule, checked:** the bed's box is 8 blocks each way horizontally and 5 vertically. The whole cottage
(x -7..+1, z -9..+4), the attic, the well and the chair are inside it. The gate (+10) is outside. Grandma in the
kitchen, the chair or the porch blocks the bed; at the gate she doesn't.

## Cast and costume

| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| Narrator (N) | the bot (POV), `hideHand: false` | stone sword (slot 1), torch (slot 2); no armor; hearts full, hunger 6 (he's tired) | none | S01 doorway; S02 swamp edge; S03 over the hole; S03b attic hatch; S03c well; S04 yard; S05 doorway; S06 path (day); S07 kitchen; S08 table; S09-S15 bed or beside it | holds the sword from S12 |
| Grandma | witch, NoAI, silent (the giggle is an SFX), never in frame before S14 | vanilla witch model (hat, robe); in S14 she holds nothing | none | S05/S07/S08: the kitchen's north-west corner (-6, -8), out of frame left; S09: in the chair at (0, -2), out of frame right; S10-S11: on the porch at (-2, +5), out of frame; S14: at the gate (+10, 0), facing west (toward the window) | none: she is a witch the whole story |
| the black cat | cat, variant `all_black`, NoAI, sitting | none | none | S05/S07 on the kitchen counter; S12 curled on the bedroom chair | moves to the chair after Grandma leaves (between S11 and S12) |
| phantoms (3) | phantom, NoAI, moved on a circle | none | none | S04: circling 12-14 blocks above the roof; S09: one crosses the window, 10+ blocks up | absent from S10 on (storm, and they're never shown low) |

## Props

| prop | first seen | state | where | later |
|---|---|---|---|---|
| bed | S01 | blue, made | (0, 0), head east | S09, S12, S13, S15 |
| chair (oak stairs) | S01 (empty) | empty | (0, -2), facing the bed | S07 empty (seen through the door), S12 the cat on it |
| lantern | S01 | lit | ceiling centre of the bedroom | all bedroom shots |
| hole in the floor | S03 | 6 planks up, 2 deep, a torch at the bottom | (-4..-3, +1..+3) | visible at the frame edge in S10 |
| torch ring | S02 | 72 lit torches on fence posts | square at 9 blocks | S10, S14 (rain doesn't put torches out) |
| lightning rod | S04 | copper, unoxidised (new) | on the chimney | S06 |
| roof patch | S06 | fresh birch planks in dark oak | over the kitchen | (not seen at night) |
| furnace | S05 | lit | kitchen north wall | S07, S08 |
| cauldron | S05 | full of water | beside the furnace, north wall | S07 |
| brewing stand + red potion | S08 | one bottle slot filled (healing potion, red) | kitchen table | none |
| empty glass bottle | S08 | on the table | beside the brewing stand | none |
| front door | S10 | opens outward-in from the porch | south wall | shut on L11's last word, stays shut |
| gate lantern | S06 | lit | north gate post | S10, S14 |

## Positions and screen direction
- The bedroom window looks **east**; the gate is straight out of it. In every shot of the yard from inside (S10,
  S14), the gate is centre frame, the torch line runs across the frame just in front of it.
- Grandma's voice always comes from **out of frame**: left in S05 (the kitchen's north-west corner), right in S09 (the
  chair, north of the bed), from beyond the door in S10-S11. Never cut to where she is until S14.
- Her walk in S10-S14 is **away from camera, east**, along the garden path. In S14 she has turned back to face west,
  toward the window.

## The narrator
- Slot 2 (torch) is selected S01-S11 (he's been searching with a torch); slot 1 (stone sword) from the S12 cut on.
- Hearts full throughout (no phantom hits on screen). Hunger 6/10 (tired). No armor.
- Where he is when each line is said: see the Cast table.

## Who knows what

| line | the narrator knows | Grandma knows | the viewer can know |
|---|---|---|---|
| L01-L04 | a monster is within 8 blocks, somewhere | that it's her | the rule; the empty chair |
| L05-L08 | Grandma has changed since the storm | everything | lightning + giggle + potion: a player suspects a witch |
| L09 | she'll sit by him | she's the reason he can't sleep, and chooses to stay | strong suspicion |
| L10-L11 | sending her away keeps her safe | the bed will work the moment she's gone | the count will tell |
| L12-L13 | counting blocks | | that "eight" is the line |
| S14-L14 | Grandma is the monster | that he knows now | everything |

## Clue map

| clue | where planted | misread as | after the twist |
|---|---|---|---|
| empty chair beside the bed | L01 S01; S07; S12 | furniture | her seat inside the reach |
| 8-block rule + torch ring | L02 S02 | his search grid | she is the only thing inside it every night |
| places searched, never people | L03 S03-S03c | thoroughness | the monster isn't hiding |
| "Monsters? In MY house, dear?" | L05 S05 | teasing | literally true |
| the giggle (witch ambient) | after L05; under L07; after L14 | an old lady's laugh | a witch's laugh |
| black cat + cauldron | S05, S07 | a grandma's kitchen | a witch hut's cat and cauldron |
| storm, burned roof, new lightning rod | L06 S06; S04 | a frightening night | lightning turned her |
| never goes to bed | L07 | old age | witches don't sleep in beds |
| red potion healed the burn | L08 S08 | medicine | witches drink healing when hurt |
| "Where I can WATCH you." | L09 | love | love, and she knows she's the monster |
| "If you're SURE, dear." | L11 | reluctance | she knows the bed will work |
