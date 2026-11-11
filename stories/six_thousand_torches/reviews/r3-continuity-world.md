Verdict: fix

Scope: the world pass only (S01, S04, `world`, Larkfield/canon). Checked: box = bell + (-45..44); NE corner 181.3 from D, 185.3 from the well; S04 POV (-321, -756) 185.3 from D at 40 deg east of north; from S01 Dog Hill is 40-47 deg, off frame left of an east look; plot inside the box; canon link 13, cameo table and map.json agree.

**Breaks**
1. `docs/world/map.json` larkfield stamp `six_thousand_torches` is `since: 4500`, the story's own day, with no `skip`. `world.build({story})` (lib/world.js stamp()) torches the whole box: the door spot, the growing row, B's flashback, and the bare meadow while `pieces` is empty. Its `what` says it skips the row and door spot. It doesn't, and it shouldn't, because after the story both hold torches. Fix: `"since": 4501`. Replace the `what` tail "; the stamp skips the story's growing row and door spot" with "; on day 4500 itself the story dresses the box (its skip list)". In set.md, after "the same glowing village;", insert "it is live from 4501, so on 4500".
2. S04 (shots.md + story.json): the POV at bell + (39, -44) puts the box's north edge (z -45) 1 block ahead. At level pitch the last row is below frame, so "the last rows of torches ending in a clean line a few blocks ahead" is false. Replace the fg with: "fg: the corner of the torch carpet, the last row along the bottom of frame (POV pitched ~12 degrees down; Dog Hill stays in the upper half), the east edge 5 blocks to the right". Add the POV cell (-321, -756) to the dressing skip.
3. bible.md World/The ending: "walks away east empty-handed" contradicts S14 and set.md (west). Replace with "walks away west down the street, empty-handed".

**Notes**
4. "two pale specks": Pip has a brown robe and sits on the dog's south side, which is nearer to us, so the two overlap. canon.md says "a pale speck". Use "a speck on the hilltop (the dog and Pip side by side)". Drop "hills against the blue dawn sky", because nothing beyond Dog Hill rises above it.
5. There's only 0.7-0.8 of clearance. Pin the POV y to the surveyed ground, keep fence posts, lamps and roofs out of the 40 deg sightline at the NE corner, and check on a still.
6. set.md: the Digger's House is 16 blocks from the box (x -316 vs -300), not 6.
7. S01's frame takes in Tidewater (~94 deg, 160 blocks) and Torch Hill's lone torch (-290, 85, -684) if they're in the server snapshot. Both are canon, but keep the torch out of the dressing count. In S04 Hushwell sits right of frame, under the rim.
8. The High Meadow's west top is y 115-123, so the "west hills" in S05/S10/S14 may read flat (superflat risk). Check stills.
9. Stale but frozen or old: beats.md S04 "dark forest"; set.md's S14 row has 6 cells and says "east edge".
