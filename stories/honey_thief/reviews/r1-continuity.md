# honey_thief r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **S10 reveal won't read.** Flowers are cross sprites, so from straight above they're edge-on and the bee reads as grass plus podzol stripes. Also, at FOV 70 a 9:16 frame from 55 up covers only ~43 blocks across, and the wings are 61 wide (x -30..+30). Fix: render a test patch of dandelions top-down before the build. Then lift to about 85 up, or sweep the wings back to about 36 across. If the flowers still don't read, pitch about -70 from the south.
2. **Row 52 is impossible.** set.md makes z +24..+25 podzol (the stinger) and 3 wide, and z +14..+17 has no flowers at all, yet S10 has him "planting the 52nd row". S03 also says "half-finished field", which contradicts the bible's "complete except row 52". Fix: make the stinger tip dandelions. S03, S04 and S10 are all row 52, and the S03 frame should read "complete to row 51".
3. **The antennae end at z -748**, outside the footprint (-746). Fix: end them at (±7, -30), or move the footprint's north edge to -750 in map.json.
4. **Harvest order.** S01 fills the bottle on HONEY, but S02 shows him holding a glass bottle again, and L03's "CLINK" comes after the picture (the owner's "words lead" pattern). Fix: in S01 he holds the glass bottle at the dripping hive (look `block:beehive`). The fill happens on CLINK at the start of S03, which starts at the hive.
5. **S01's dandelion lands inside the red heart.** Fix: he places a poppy, or the placing moves to S04.
6. **S08 heading.** The left wing lies west to west-north-west of the hive and north-west of the tail, so "south-west" flies off the picture. Larkfield is behind a westward camera, and it's 47-77 blocks away, not 30-50. Fix: fly west, and move the easter egg to the end of S07's orbit, facing east.
7. **Shot sizes.** S01 opens a new place with an MS. S02 to S03 is WS to WS, and S04 to S05 is MCU to MCU. Fix: S01 WS, S02 MS, S03 FULL, S04 WS (side-on, row receding, hive behind), S05 MCU, S06 CU.
8. **The giant in L10 is a speck.** He's about 42 blocks off at FOV 70, roughly 3 % of the frame height. Fix: FOV 25-30 for the find.
9. **S09 vs L10's "every WAY".** West of the wingtip is bare meadow, and the Cliff House stands about 30 blocks away. Fix: sweep the look from north through east to south.
10. **S03's walk.** Hive to tail is 25 blocks in about 4 s. Fix: cut to the edge (see 4 and 7).

## Notes
- L06's `item:` isn't a supported look form. Use `actor:Giant`.
- L05's direction says "young man", but Torches has Jonah as a "teenage boy" 300 days later. Match them. Torches also shows his name tag. Ask the owner.
- Bible rows to paste:
  - `honey bottle | offhand from S03, raised in S06; main hand: dandelions | S03-S06`
  - `hive's bees | 3 + narrator; S07 shows 3 | S02, S07`
  - `heart | point south`
- Move the top-level `hotbar` (eggs, cake) into `props.giant`. S01 says "noon", but time 3000 is morning.
- Name the natural ground in view for S03-S06 and S09 (the plateau rim, the Cliff House).
- Torches' bible needs a line: at 4500 the unlit field sits west of Larkfield.
