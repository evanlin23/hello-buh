# gold_for_the_portal: continuity bible (r1)

## World
- Where: a spruce cottage alone on a ridge, across the valley from the carpeted village (Light Sleeper); the cellar
  (library `basement`) under it, with a Nether portal built into its east wall. story.json `world`.
- Scenes play in this order. Times in ticks; the cellar has no sky, so its "time" is the hatch (open in daylight in C,
  shut at night) and the establishing shots outside.

| scene | shots | time | light | notes |
|---|---|---|---|---|
| A: tonight's ritual (any night) | S01 | 18000 night | portal glow (light 11) + two lanterns, candles | the hatch shut |
| B: the ridge | S02 | 18000 night | moon at frame right, one lit window, gate lanterns | clear sky, no rain |
| C: the morning after | S03, S04 | 1000 morning | the hatch open: a shaft of daylight on the floor at the ladder's foot; portal glow | |
| D: the garden | S05 | 1000 morning | sun low at frame left (east) | clear; light haze to the far hill |
| E: 25 years ago | S06, S07 | 18000 night | portal glow, one lantern; flashback grade (warm, faded, soft vignette) | the cellar bare: no barrels of gifts, no gold chest dent, a newer-looking floor |
| F: tonight | S08-S14 | 18000 night | portal glow + lanterns; hatch shut after S12 | the same night as the ending; S08 opens it |

- Weather: clear throughout; `look.fog` false (the cellar needs none; S02 and S05 use the normal distance haze).
- Days: 25 years since Grandpa went in. Every number said vs what the picture shows:

| said | line | the picture |
|---|---|---|
| NINE THOUSAND gold ingots | L01 | one ingot in flight (the ritual); the gold chest behind her (Grandpa's hoard, blocks of gold, low). Not counted on screen: 25 years x 365 = 9,125, "nine thousand" is the kid's round number |
| One every NIGHT | L02 | one ingot per throw in S01, S09, S14 |
| three gifts (obsidian, string, ender pearls) | L03 | exactly three items on the floor in S04, picked up in that order; one potion drunk in S05 |
| Twenty-five years ago | L04 | the flashback grade, the bare cellar |
| SIXTY-FOUR | L09 | the hotbar slot shows a stack of 64 gold ingots in S11, empty after the throw in S12 |

## Places
Coordinates: basement-local (the piece faces south): +x east (0..12), +z south (0..10), F = the cellar floor. The
cottage stands over it; its door faces south over the valley. Builder: confirm against the placed piece's anchors.

| place | where | what's there | establishing shot | changes during the story |
|---|---|---|---|---|
| cellar | the basement under the cottage | stone walls, beams and posts, lanterns (2), candles; **ladder** up to the hatch at (2,F+1,2) (north-west); **bed** at (2,F+1,9) (south-west), grey; **Nether portal** in the east wall: obsidian frame 4 wide x 5 tall, the purple sheet 2 x 3 over x=11, z 5..6 (facing west); **gifts barrel** at (10,F+1,3), just north of the portal; **gold chest** (Grandpa's gold blocks, few left) at (8,F+1,1) on the north wall; stacks of obsidian and crying obsidian against the north-east wall (old gifts, used to patch the wall); barrels and crates west | S01 (wide, low from the west barrels: portal, Grandma, ladder, chest) | C: hatch open; F: hatch shut after Grandma leaves (S12) and opens again as she comes down (S13) |
| ridge | the cottage on the ridge, 15-20 blocks above the valley floor | spruce cottage (garden, gate lanterns, chimney smoke), a stream below, forest on both slopes | S02 (ews crane down) | none |
| garden | south of the cottage door | fenced garden, flowers, gate lanterns, the view south over the valley | S05 (wide, morning): the carpeted village on the far hill (easter egg) | none |
| cellar_then | the same cellar, 25 years ago | the portal (fresh, the obsidian clean), one lantern, no gifts barrel, no obsidian stacks, the bed and ladder as now | S07 (wide) after S06 (ms on Grandpa in front of the same portal) | Grandpa walks into the portal in S07 |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| Milo (N) | the recording bot, POV; default Steve skin in camera shots | **golden boots always** (Grandma's rule; never mentioned); hotbar: empty in C until he picks up obsidian, string, pearl (S04); a fire resistance potion in hand in D (S05, drunk); in F: a stack of 64 gold ingots (S11), empty after S12 | none | C: ladder foot (S03), 2 blocks from the portal (S04); D: by the garden gate (S05); F: at the barrel (S08-S09), 2 blocks in front of the portal (S10-S12), sitting on the bed's east edge facing east (S13) | the potion's swirl particles in S05 only |
| Grandma | villager, plains, librarian outfit | nothing held; a thrown gold ingot leaves her each night (S01, S09, S14) | none | A: beside the portal, west of it (S01); E: beside the portal (S06 at frame left, S07 alone after he goes); F: at the portal (S09), at the ladder's foot (S11), up the ladder (S12), coming down the ladder (S13), at the ladder's foot off frame left (S14, her throw enters from frame left) | none |
| Grandpa | player actor, default `zuri` skin | **gold helmet with a lapis trim** (the blue stripe across the front), no other armour, empty hands | none | E only: in front of the portal (S06), walking into it (S07) | gone into the portal in S07 |
| the piglin | vanilla adult piglin | **Grandpa's helmet** (gold, lapis trim), no other armour, empty hands | none | F only: steps out of the portal on "OUT" (S13) onto the floor at (10,F+1,5.5), facing west toward Milo; S14 the same spot | shakes from its first Overworld frame (vanilla zombification); head turns after the gold in S14's hold; does not convert on screen |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| the Nether portal | S01 | lit, purple, humming | east wall, sheet at x=11, z 5..6 | every cellar shot; fresh in E |
| tonight's ingot | S01 (mid-arc on frame 1) | thrown into the purple | from Grandma's hand to the sheet | S09 (another night's), S14 (tonight's, sails past the piglin into the sheet) |
| the gold chest | S01 (bg) | closed; Grandpa's gold blocks inside (never opened on screen) | (8,F+1,1) | bg of S08-S09 |
| obsidian block (item) | S03 (pops out of the sheet on "BACK") | a dropped item | lands on the floor at (10,F+1,6) | S04: picked up first |
| string, ender pearl (items) | S04 | dropped items beside the obsidian | (10,F+1,5), (10,F+1,7) | picked up on their words |
| fire resistance potion | S05 | in Milo's hand, drunk | the garden gate | gone |
| gifts barrel | S03 (bg) | closed; named "Grandpa's Gifts" (anvil name) | (10,F+1,3) | S08: opened (screen): obsidian x64, crying obsidian x23, string x48, ender pearls x16, soul sand x40, gravel x64, nether quartz x52, leather x30, iron nuggets x60, blackstone x64, potion of fire resistance x3 (separate slots); closed again for S09 |
| the stack of 64 gold ingots | S11 (hand, hotbar 64) | in hand | Milo's hotbar slot 1 | S12: thrown into the sheet, the slot empties |
| the gold helmet with the blue stripe | S06 | on Grandpa's head | | S13-S14: on the piglin's head (same trim, same colour) |
| the bed | S01 (bg, dim) | made, grey | (2,F+1,9) | S13: Milo sits on its east edge |
| the hatch | S03 | open (morning) | above the ladder | S11 open (night, dark), S12 shut behind Grandma, S13 opens as she comes down |

## Positions and screen direction
- The cellar's axis is west-east: the ladder and bed on the west side, the portal on the east wall. Milo always faces
  **east** toward the portal; the portal is screen-right of anyone standing beside it when the camera is west of it.
- S01: camera low in the west, the portal at frame right, Grandma at centre, the ladder at frame left.
- S09/S12: POV east to the portal; S11 is the one reverse (POV west to Grandma at the ladder).
- S13: camera behind the bed (west), Milo's back at lower centre, the portal beyond, the ladder at frame **left**
  (north): Grandma's feet come down there. S14: the camera stands between Milo and the piglin, 2 blocks west of
  the piglin, facing east (the piglin faces west, into the lens); north is frame **left**, so Grandma's ingot from the
  ladder enters from frame left, matching S13.
- Flashback S06: Grandpa faces west (toward the camera) with the portal behind him; Grandma's shoulder at frame left
  (north side), as in the present.

## The narrator
- Hotbar and hand per scene: see Cast. Full hearts and hunger, no armour on the HUD except the golden boots (the
  armour bar shows 1 point; correct for golden boots).
- Where Milo is on each line: L01 not in the scene (camera); L02 S03 at the ladder foot; L03 at the portal, then the
  garden; L04-L05 not born (camera flashback); L06 at the barrel; L07 in front of the portal; L08 facing Grandma at the
  ladder; L09 at the portal; L10-L11 on the bed.

## Who knows what (line by line)
| line | Milo knows | Grandma knows | the viewer can know |
|---|---|---|---|
| L01-L03 | gold goes in, gifts come out | it is a piglin's barter | gifts come out of a portal; players: these are barter items |
| L04-L05 | the family legend: the helmet, the rule, Grandpa went in | he died over there; a piglin wears the helmet | the helmet's look; gold keeps piglins calm |
| L06 | the gifts are Grandpa's | "trading" is true, of the piglin | the full barter table on one screen; a snort |
| L07 | Grandpa is alive | he isn't | Milo is wrong, probably |
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
| "Just ONE, Milo. One's PLENTY." | L08 | thrift | she knows |
| golden boots on Milo | S05, S10, S13 | nothing | her rule: she knows what is over there |
