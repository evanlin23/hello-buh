# red_sheep r1: continuity (pre-build)

Verdict: fix

## Must-fix
1. **World:** map.json has no `red_sheep` entry (`world.js story` throws). The palisade, gate, Grandpa's house and totem wall exist only in the Thirty-One Raids stunt, which isn't on this branch. Port them (thirty_one_raids/set.md) into `ravenford.pieces/stamps` and add the pasture (`since: 1950`). Then add `"red_sheep": {"day": 2100, "places": ["ravenford"], "status": "claimed", "cameos": ["totem_wall"]}`. The clearing at gate +60 is outside the footprint (x ≤ -1990): stage it at +45..+54 or widen the footprint.
2. **Canon geography:** east of the gate the road runs through fields to the ford at +40, so the woods start past it (birch, not spruce). S08: the lamb 15 blocks out, the treeline at 45, the ford between. The pasture is inside the palisade, so add a bible row: *pasture gate: a fence gate in the east palisade, 15 S of the east gate; the flock grazes outside by day.*
3. **Cameras break "gate shots look east":**
   - S01 looks north, so the Ridge and tower fall out of frame: look east instead.
   - S06 looks north and misses the outpost (+131, +92): camera (-10, 5, -4) aimed at (131, 20, 92), Grandpa's back in the gateway. Drop "Buh at a window", which would be behind the camera.
   - S07 aims south: use (-4, 10, 0) aimed at (45, 4, 0).
4. **S07 "wolves":** the bible has none, and a collared wolf near kid Buh reads as his dog. Cut them.
5. **S10→S11 are the same size:** a lamb 5 blocks away in POV fills about 10 % of the frame, a wide like S11. Put the lamb 2.5 blocks ahead in S10 (FS). Bible: the lamb ~8 blocks from the evoker. S11 at FOV 35 makes the evoker ¼ of the frame.
6. **Time:** `look.time: 1000` contradicts 7 shots. Add `shots[].look.time`: S01-S03 1000, S04 12000, S05 6000, S06 12300, S07 18000, S08 12500, S09-S11 12800.
7. **Engine (build):** the evoker's casting arms, its spell particles, and the fangs' bite animation (only the model exists).

## Should-fix
8. Add a narrator row to the bible: *S08-S11: empty hand; hearts full; no armour.*
9. In S05, "Grandpa's boots": write "legs" (boots would be drawn as armour).
10. S01 shows 60 blue sheep and nothing white, so keep the newborn lamb out of frame.
11. L02 names LAMB: add `prop:lamb` to its look.
12. S03: shoot from due south so the totem wall sits square behind Grandpa, and end S01 with his door in frame.
