# singing_box r3: continuity (pre-build, confirm)

Verdict: fix (one cheap break; A and B resolved)

## r2 blockers
- A. Resolved. Hole (-276,-50,-685) is 13 ahead and 3 left of S06's ladder-end camera (13 deg, inside the 21 deg half-FOV). She stands at x -286, 7 from the pool. Room x -279..-273 sits behind the 1-block wall at z -685. Earshot holds.
- B. Resolved. S03/S11 are shot full from 5-6 off the face, S04/S12 wide from 12 with the pool in the left fg, so sizes go full > wide > ms > wide > cu > ms.
- Allay held item: engine gap, still listed, unbuilt (as agreed).

## Breaks
1. **S10 / L12 `look` entity:allay on "BOOM"**: S10 has no allay (shot frame; bible cast lists the allay in S01-S09 and S11-S13b only). The allay sits frame right in the fg, at the edge, so `Her` on "LOUD" is off-centre too. Owner rule (the line's subject). Cheapest fix: on L12, cut to **S10b** (full, from her south-west, same side of the line). She stands right of centre, the allay at her head, centre, glaring at his shutter as it slams in the bg left. Bible row: `S10b | L12 | 1499 dusk | her + allay, his shut window bg`. Add S10 to the allay's shots.
2. **L09 `look` entity:allay on "NIGHT"**: "NIGHT" is the first word, before the climb starts on "climbs", so the allay is still down the shaft. Fix: drop that entry, or make it `block:ladder` on "NIGHT".

## Should-fix
1. L07: the first note plays before "SINGS" (by design), which `./hb owner` may flag as the picture ahead of the words. If it does, move that note into S06's last second. The sfx row still says "'SINGS' and 'CLOSE'". "CLOSE" is gone: make it "one before the line, one on 'SINGS'".
2. His cottage: S10 says 4-5 blocks (or FOV 30), set.md says about 8 blocks north-east. Pick one in set.md.
3. Stale text. Bible Positions and set.md's easter-egg section still say S09 looks "south-south-east". It now looks south-east (140 deg). Bible Props: the hole "S03 (dark), S11" and the lava pool "S03, S11" are now behind the camera, so remove them from those rows.
4. S06 "she stands small in the low foreground": 3 blocks from the camera she is not small. Say "lower right fg, full figure".

## Notes
- L11 at dusk while she's quiet: the bible's cause covers it (he's complaining about the day).
- L13's "biggest" is paid off by the three TNT, not by the item. A diamond item has one size, and the irony works.
- `torch_hill_cottages` isn't claimed yet (world.js story fails). Claim it at build, as set.md plans.
