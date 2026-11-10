# gold_for_the_portal: continuity bible (r3)

## World
- Where: The Portal Cottage, a spruce cottage alone on a forested ridge in the Green's north forest, north-east of
  Hushwell, across the valley from its plaza; the cellar (library `basement`) under it, with a Nether portal built into
  its east wall. story.json `world`; the place and the day are below ("The place and the day").
- Scenes play in this order. Times in ticks; the cellar has no sky, so its "time" is the hatch (open in daylight in C,
  shut at night) and the establishing shots outside.

| scene | shots | time | light | notes |
|---|---|---|---|---|
| A: tonight's ritual (any night) | S01 | 18000 night | portal glow (light 11) + two lanterns, candles | the hatch shut |
| B: the ridge | S02 | 14500 night | moon low at frame right (not overhead), one lit window, gate lanterns | clear sky, no rain |
| C: the mornings after | S03, S04 (three quick mornings, one gift each) | 1000 morning | the hatch open: a shaft of daylight on the floor at the ladder's foot; portal glow | |
| D: the garden | S05 | 1000 morning | sun low at frame left (east) | clear; light haze to the far hill |
| E: 25 years ago | S06, S07 | 18000 night | portal glow, one lantern; flashback grade (warm, faded, soft vignette) | the cellar bare: no barrels of gifts, no gold chest dent, a newer-looking floor |
| F: tonight | S08-S14 | 18000 night | portal glow + lanterns; hatch shut after S12 | the same night as the ending; S08 opens it |

- Weather: clear throughout; `look.fog` false (the cellar needs none; S02 and S05 use the normal distance haze).
- Days: 25 years since Grandpa went in. Every number said vs what the picture shows:

| said | line | the picture |
|---|---|---|
| NINE THOUSAND gold ingots | L01 | one ingot in flight (the ritual); the gold chest (Grandpa's hoard, blocks of gold, low) is set dressing, not in S01's frame. Not counted on screen: 25 years x 365 = 9,125, "nine thousand" is the kid's round number |
| One every NIGHT | L02 | one ingot per throw in S01, S09, S14 |
| three gifts (obsidian, string, ender pearls) | L03 | one gift per morning, three mornings cut together in S04: one obsidian block, one string, one stack of 3 ender pearls (a single barter drop), each picked up; one potion drunk in S05 |
| Twenty-five years ago | L04 | the flashback grade, the bare cellar |
| SIXTY-FOUR | L09 | the hotbar slot shows a stack of 64 gold ingots in S11, empty after the throw in S12 |

### The place and the day (shared world, docs/world/canon.md)
- **Place:** a new place to claim, `portal_cottage` ("The Portal Cottage"), in the Green's north forest north-east of
  Hushwell. Origin (the cellar portal) about (-110, 85, -990), footprint about (-125, -1005, -95, -975). The garden
  looks south-south-west over the valley to Hushwell's plaza, about 140 blocks away. Read the ground y off the survey
  grid before claiming. Claim it in its own commit (not done here):
  `./hb world claim portal_cottage --name "The Portal Cottage" --kind homestead --region the_green --at -110,85,-990 --footprint -125,-1005,-95,-975 --story gold_for_the_portal --day 9300`
  Then add map.json `pieces` (`cottage` facing south over the `basement`, the portal in its east wall) and
  `stories.gold_for_the_portal.cameos: ["boxed_bell"]`, and run `./hb world check`.
- **Day:** 9300. Grandpa went in "twenty-five years ago" (9,125 days) on day ~175. The world has no night in days
  800-1100 (the Long Day), so Grandma threw about 8,825 ingots: "NINE THOUSAND" is the kid's round number. Both
  night scenes (day ~175 and day 9300) are outside the Long Day.
- **Who:** a new family, not Milo's. Nico (a player kid, the house narrator voice), his grandma (a plains librarian
  villager) and his grandpa (a player, `ari` skin, flashback only; not the Ravenford grandpa, who is `zuri`). One
  grandpa in this Short, called Grandpa only by his own grandchild.
- **Stands alone:** no line names a place or another story.

### Canon consequences to record (map.json and canon.md, in the claim commit; canon files not edited here)
| what | since | stamp / note |
|---|---|---|
| The Portal Cottage and its cellar with a lit Nether portal in the east wall | ~175 | pieces `cottage` + `basement`; stamp: the portal (obsidian 4 x 5, lit) |
| Nico's grandpa walks into the portal in Grandma's striped gold helmet and never comes back (dies in the Nether) | ~175 | canon.md timeline row; a piglin wears the helmet from then on |
| One gold ingot a night into the portal, one barter back each morning | ~175 to 9300 | story-only; the gifts barrel and the obsidian stacks by the north-east wall are stamps (since ~200) |
| The piglin in Grandpa's helmet steps into the cellar and is sent home | 9300 | timeline row: **9300, The Portal Cottage. Gold for the Portal.** "Nico throws in a whole stack and the piglin that wears his grandpa's helmet steps out." |

## Places
Coordinates: basement-local (the piece faces south): +x east (0..12), +z south (0..10), F = the cellar floor. The
cottage stands over it; its door faces south over the valley. Builder: confirm against the placed piece's anchors.

| place | where | what's there | establishing shot | changes during the story |
|---|---|---|---|---|
| cellar | the basement under the cottage | stone walls, beams and posts, lanterns (2), candles; **ladder** up to the hatch at (2,F+1,2) (north-west); **bed** at (2,F+1,9) (south-west), grey; **Nether portal** in the east wall: obsidian frame 4 wide x 5 tall, the purple sheet 2 x 3 over x=11, z 5..6 (facing west); **gifts barrel** at (10,F+1,3), just north of the portal; **gold chest** (Grandpa's gold blocks, few left) at (8,F+1,1) on the north wall; stacks of obsidian and crying obsidian against the north-east wall (old gifts, used to patch the wall); barrels and crates west | S01 (full figure from 4 blocks west of the portal: Grandma, the portal, the portal centred behind her (the gold chest is out of frame); the ladder is behind the camera) | C: hatch open; F: hatch shut after Grandma leaves (S12) and opens again as she comes down (S13) |
| ridge | the cottage on the ridge, 15-20 blocks above the valley floor | spruce cottage (garden, gate lanterns, chimney smoke), a stream below, forest on both slopes | S02 (ews crane down) | none |
| garden | south of the cottage door | fenced garden, flowers, gate lanterns, the view south over the valley | S05 (wide, morning): Hushwell's plaza across the valley, its boxed bell at frame right (easter egg) | none |
| cellar_then | the same cellar, 25 years ago | the portal (fresh, the obsidian clean), one lantern, no gifts barrel, no obsidian stacks, the bed and ladder as now | S07 (wide) after S06 (ms on Grandpa in front of the same portal) | Grandpa walks into the portal in S07 |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| Nico (N) | the recording bot, POV; default Steve skin in camera shots | **golden boots always** (Grandma's rule; never mentioned); hotbar: empty in C until he picks up obsidian, string, pearls (S04, one per morning); a fire resistance potion in hand in D (S05, drunk); in F: a stack of 64 gold ingots in slot 1 from S08 (shown in the barrel screen's inventory), held S09-S12, empty on the throw in S12 | none | C: ladder foot (S03), 2 blocks from the portal (S04); D: by the garden gate (S05); F: at the barrel (S08-S09), 2 blocks in front of the portal (S10-S11), stepped back to about x7, 4 blocks from it, the ladder 5 blocks west (S12), sitting on the bed's north-east corner (about x2.9, z9.0) facing the portal, east-south-east (S13) | the potion's swirl particles in S05 only |
| Grandma | villager, plains, librarian outfit | nothing held; a thrown gold ingot leaves her each night (S01, S09, S14) | none | A: beside the portal, west of it (S01); E: beside the portal (S06 at frame left, S07 alone after he goes); F: at the portal (S09), walking off frame left toward the ladder (S10), stopped mid-cellar at about x6 z3 (S11), already climbing the ladder (S12), coming down the ladder on the left edge (S13), walked to about (8.8,F+1,4.8), at the frame's left edge, throwing one more ingot (S14) | none |
| Grandpa | player actor, default `ari` skin | **gold helmet with armour trim `sentry`, material `lapis`** (the blue stripe across the front; pinned: the same item in S06, S07, S13, S14), no other armour, empty hands | none | E only: in front of the portal (S06), walking into it (S07) | gone into the portal in S07 |
| the piglin | vanilla adult piglin | **Grandpa's helmet** (golden_helmet, trim sentry/lapis: the same item as S06), no other armour, empty hands | none | F only: steps out of the portal on "OUT" (S13) onto the floor at (10,F+1,5.5), facing west toward Nico; S14 the same spot | shakes from its first Overworld frame (vanilla zombification); head turns after the gold in S14's hold; does not convert on screen |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| the Nether portal | S01 | lit, purple, humming | east wall, sheet at x=11, z 5..6 | every cellar shot; fresh in E |
| the nightly ingot | S01 (crossing the sheet on frame 1) | thrown into the purple | from Grandma's hand to the sheet | S09 (another night's), S14 (one more ingot, sails past the piglin into the sheet) |
| the gold chest | set dressing (out of S01's frame) | closed; Grandpa's gold blocks inside (never opened on screen) | (8,F+1,1) | bg of S08-S09 |
| obsidian block (item) | S03 (pops out of the sheet on "BACK") | a dropped item | lands on the floor at (10,F+1,6) | S04 morning 1: picked up |
| string; a stack of 3 ender pearls (items) | S04 mornings 2 and 3 | one dropped item each morning | in front of the sheet, (10,F+1,5) then (10,F+1,7) | picked up on their words |
| fire resistance potion | S05 | in Nico's hand, drunk | the garden gate | gone |
| gifts barrel | S03 (bg) | closed; named "Grandpa's Gifts" (anvil name) | (10,F+1,3) | S08: opened (screen): obsidian x64, crying obsidian x23, string x48, ender pearls x16, soul sand x40, gravel x64, nether quartz x52, leather x30, iron nuggets x60, blackstone x64, potion of fire resistance x3 (separate slots); closed again for S09 |
| the stack of 64 gold ingots | S08 (the barrel screen's inventory, slot 1) | held from S09 | Nico's hotbar slot 1 | S11 in hand (64); S12 thrown on 'ALL', the slot empties on the throw |
| the gold helmet with the blue stripe | S06 | on Grandpa's head | | S13-S14: on the piglin's head (same trim, same colour) |
| the bed | S01 (bg, dim) | made, grey | (2,F+1,9) | S13: Nico sits on its north-east corner (about x2.9, z9.0) facing the portal |
| the easter egg: Hushwell's boxed bell (canon cameo `boxed_bell`) | S05 (bg, frame right, ~2 s) | the bell in its white wool box, a white speck among the plaza's roofs | Hushwell's plaza, about 140 blocks south-south-west across the valley (built by `world.build`) | none (S05 only) |
| the hatch | S03 | open (morning) | above the ladder | S11 open (night, dark), S12 shut behind Grandma on 'BED', S13 opens as she comes down |

## Positions and screen direction
- The cellar's axis is west-east: the ladder and bed on the west side, the portal on the east wall. Nico always faces
  **east** toward the portal; the portal is screen-right of anyone standing beside it when the camera is west of it.
- S01: camera 4 blocks west of the portal, the portal at frame right, Grandma full-figure just left of centre, the portal centred behind her (the gold chest is out of frame); the ladder is behind the camera.
- S09/S12: POV east to the portal (the gifts barrel at frame left in S12); S11 is the one reverse (POV west to Grandma mid-cellar at about x6 z3, the ladder behind her).
- S05: camera north of the gate looking south over the valley; the cottage corner at frame right, Hushwell's plaza far off across the valley (the boxed bell, frame right).
- S13: camera at about (1.3,F+2.0,9.7) behind the bed, FOV 70, yaw 40 degrees east of north, pitch -10: Nico's back
  (seated on the bed's north-east corner) in line with the portal, the ladder on the frame's **left edge**: Grandma's feet come down there (fallback: her steps
  and the trapdoor sound on 'OUT'). S14: the camera stands between Nico and the piglin, 2 blocks west of
  the piglin, facing east (the piglin faces west, into the lens); north is frame **left**, so Grandma's ingot from the
  ladder enters from frame left, matching S13.
- Flashback S06: Grandpa faces west (toward the camera) with the portal behind him; Grandma's shoulder at frame left
  (north side), as in the present. The helmet is pinned: golden_helmet, trim pattern `sentry`, material `lapis`;
  S06 and S14 must show the same stripe (check the two stills side by side).

## The narrator
- Hotbar and hand per scene: see Cast. Full hearts and hunger, no armour on the HUD except the golden boots (the
  armour bar shows 1 point; correct for golden boots).
- Where Nico is on each line: L01 not in the scene (camera); L02 S03 at the ladder foot; L03 at the portal, then the
  garden; L04-L05 not born (camera flashback); L06 at the barrel; L07 in front of the portal; L08 facing Grandma mid-cellar;
  L09 4 blocks from the portal; L10-L11 on the bed.

## Who knows what (line by line)
| line | Nico knows | Grandma knows | the viewer can know |
|---|---|---|---|
| L01-L03 | gold goes in, gifts come out | it is a piglin's barter | gifts come out of a portal; players: these are barter items |
| L04-L05 | the family legend: the helmet, the rule, Grandpa went in | he died over there; a piglin wears the helmet | the helmet's look; gold keeps piglins calm |
| L06 | the gifts are Grandpa's | "trading" is true, of the piglin | the full barter table on one screen; a snort |
| L07 | Grandpa is alive | he isn't | Nico is wrong, probably |
| L08 | Grandma is being careful | one ingot, one barter; a stack could pull it through | Grandma knows what's there |
| L09-L10 | 64 will buy Grandpa home | (asleep, then hears it) | something gold-hungry will come |
| L11 | the piglin has Grandpa's helmet | everything | everything: the gifts were barters; Grandpa isn't coming; she has fed it for 25 years and sends it home |

## Clue map
Kept in beats.md (the same table); the short version:

| clue | where planted | how it's misread | what it means after the twist |
|---|---|---|---|
| items out of the portal | S03 | Grandpa sends them | barters crossing the portal |
| the gifts | L03, S04, S08 | Grandpa's finds | the piglin barter table |
| the striped gold helmet | L04, S06 | Grandma's gift | what the piglin wears |
| "Gold keeps you SAFE in the NETHER" | L05 | a saying | piglins and gold |
| "he's still TRADING" | L06 | Grandpa is busy | the piglin trades |
| the snort | S09 sound | portal noise | a piglin at the portal |
| "Just ONE, Nico. One's PLENTY." | L08 | thrift | she knows |
| golden boots on Nico | S05, S10, S13 | nothing | her rule: she knows what is over there |

## Build changes (2026-11-10, the make run)
- **The place moved** down the hill's south-east slope: the cottage centre at (-128, 85, -940), not (-110, 85, -990)
  (no ridge there, and the hill hid Hushwell). The ground rises north and west of the cottage, so the garden looks
  south-south-west down the slope to Hushwell's plaza (~85 blocks; the boxed bell at cellar-local (-24, 8, 83)).
  The cellar is sunk 5 blocks deeper (a ladder shaft from the hatch, the `shaft` variant) so its east wall stays
  buried on the slope. Stamp `view` (since day 180): the trees below the garden cleared for Grandma's view.
- Cellar-local O = (-132, 74, -943); the cottage floor is at dy 11, the hatch at (1, 11, 1) by the bed.
- **S13:** Nico sits on the cellar floor at (4.6, 7.8), facing the portal, not on the bed (the bed corner put him
  1.6 blocks from the only lens position behind him). "Then I sat and WAITED" still holds.
- **The flashback cellar** is a bare copy 30 blocks under the real one, with no hatch hole (an aquifer flooded it).
