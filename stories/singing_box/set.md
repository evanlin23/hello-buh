# singing_box: set plan (r3)

**Place:** the lowland under Torch Hill, by the Digger's House (map.json `digger_house`, at (-245, 67, -650),
footprint (-300, -692, -232, -636)). Days 1489-1500. Not claimed yet: the build claims `torch_hill_cottages`
(`node scripts/world.js claim`, after reading the ground y off the survey) and stamps every piece below; the numbers
are a first fit for the live check.

- **The old torch shaft** (canon stamp `torch_hill`, since 300): air y 44-84 at x -290, z -684, a wall torch every 4
  blocks on its west wall, the torch on the slope at y 85. Untouched: no ladder in it. Torch's lava pocket under its
  floor (~y 42) is sealed from her shaft beside it, stays out of every shot and is never mentioned.
- **Her ladder shaft:** x -289, z -684, open to the old shaft on its west side; a ladder on its east wall from y 84 down
  to the tunnel. She climbs out of it beside the old torches (S09).
- **Her tunnel:** x -290..-268, z -684..-680 (22 long, 5 wide), floor y -54 (deepslate; inside diamond's band, the lava
  aquifer level), air to y -50. Her torches on the south wall. The face at x -268: plain deepslate (no ore shows
  before a blast; the ore is inside); S11 shows the crater of the last blast.
- **The lava pool:** along the north wall, z -684..-683 (2 wide), x -279..-274 (6 long), 1 deep. She walks on the south
  side and never goes near it (L06).
- **The hole:** 1x1 in the north wall at (-276, -50, -685): floor + 4, over the lava, out of her reach and eye-line.
- **The note block:** in his room at (-276, -51, -686), on a dirt block at (-276, -52, -686) (dirt below: harp), so the hole shows
  its top edge in its lower part with air above; the allay passes over it; items thrown at it land on its top, inside
  his room, in his reach. Its note particle (y + 1.2 = -49.8) rises in the hole, visible from the tunnel.
- **His room:** x -279..-273, z -692..-686 (7x7), floor y -53, air y -52..-49, torch-lit; his ladder in the south-west
  corner (not behind S13b's north-wall camera) up to his cottage. Nothing in it but him and the note block.
- **The cottages:** hers (birch and cobble) by the shaft mouths; his (spruce) about 8 blocks north-east, its shuttered
  window facing the shaft mouths (S10). Both new.
- **Earshot:** every point in the tunnel is within 15.4 blocks of the note block (r2 continuity).

## The easter egg (map.json, at build)
`sheep_block` (with the door torches) and cameo `blue_sheep` end at day 1112; only `shaft_open` (a 1x1 hole) runs on.
Add a stamp `door_torches` (the 5 torches from the Digger's door, since 700, no until) and a cameo `sheep_hole`
(`needs: [shaft_open, door_torches]`, since 1112). S09 looks south-south-east from north-west of the shaft so the hole
and torch line sit small at frame left.

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| 31 found, she never had more than one (L01) | every delivery goes to his note block; her one is the allay's held item, which an allay keeps | the count in the bible |
| an allay holding a diamond looks for diamonds (L02) | vanilla: it collects items matching its held item | [wiki](https://minecraft.wiki/w/Allay#Behavior) |
| TNT bounces diamonds everywhere (L04) | ore broken by TNT drops its item (diamond ore: a diamond) | S04 |
| the singing box is where your finds go (L05) | vanilla: an allay that hears a note block played within 16 blocks delivers there instead of to its player, for 30 s, each note resetting it | wiki |
| it's by the glowy orange water; she never goes near (L06) | the pool along the north wall, the hole above it; her path is the south side | S06 |
| when I bring it diamonds, it sings (L07) | he plays it every few seconds (the allay hears it, then comes); always within 16 blocks | S07: the note first |
| they're gone when I look back (L08) | the drops land on the note block's top in his room; he picks them up. Diamond 32 in S13b: thrown at the box, it lands at his feet beside it | S08 jump cut, S13b |
| she climbs out with empty hands (L09); "It's EMPTY" (L10) | nothing is delivered to her; the face shows no ore before a blast | S09, S10 |
| some of us are trying to sleep (L11) | his cover: he says he sleeps by day; really he's in the room behind the wall | S10 |
| 32 lands at his feet (S13b) | he tapped the box; the allay delivers | S13b |

## Vanilla notes for the build
- The allay is NoAI and moved per tick; deliveries are staged item throws onto the note block. It waits out each blast at
  the ladder with her (TNT would hurt it), then swoops.
- At dusk on 1499 the allay is with her (he's at his window, not playing the box).
- Her pickaxe is iron. S03's fuse is timed so the S04 blast lands on L04's "BOOM".
