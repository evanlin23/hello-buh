# pulled_away: continuity, pre-build r2 (r2.1)

Verdict: fix (one script must-fix; two build gates)

## Round-1 must-fixes
- **1 Sightline/switch:** resolved by the flashback (see 6).
- **2 Window:** partly. **Must-fix:** [-370,66,-1050] is grass. house2's only west glass is upstairs, **x -369, y 72-73, z -1052..-1051**. Use `"at": [-369, 72.5, -1051.5]` and put the librarian at (-368.5, 71, -1051.5) facing west. `home` (x -403..-389, z -1057..-1042, to y 77) still blocks a camera "5 north of the shore path". S04/S04b go at about **(-452, 66, -1076)**.
- **3 Name tags:** with the owner. **Build gate.**
- **4 Lead:** not drawn. **Build gate** (engine feature).

## Should-fix
1. **S05:** a profile can't hold the window (80° off-axis). Drop it.
2. **S05 full → S06 full:** make S06 ms.
3. **S06:** the bank runs north-south, so looking east sees present-day Fernbank. Look north-east up the slope instead.
4. **S08 doors:** by S07/S07b, her door is on the lane's north side and Uncle's on the south. Looking west, hers is **right** and Uncle's **left**. Swap.
5. **look:** N's on_screen starts "baby", so it resolves to entity `baby`. Start it "villager (baby, …)". `shut_doors.at` needs [x,y,z]. L02: look `N` (the man is at the frame edge).
6. **Hidden quarter:** S11's dock and Oakend's bank share an axis. What S11 sees over the old houses, Oakend sees too. At ~90 blocks the villagers are specks. Put the readable villagers and lanterns within 30 blocks on the path. Keep the old houses dark (drop "and in the old houses" from `new_quarter`). Check present-day stills (S08/S09), not S04 (day 5700).
7. **S04 at 12000:** the lit window won't read in sunset daylight. Use ~13000.
8. **Cameos:** at FOV 40, the golem and the empty boat fall outside S04. Put the boat in S10 and the golem in S11. Fix `world.easter_egg`.

## Notes
- S03 `oakend_bank_slope` and S11 `fernbank_dock_foot` are new places with no wide. Label S11 `wide`.
- S08→S09 jumps 11700→12600 unspoken.
- Eight cottages don't fit east of the church inside x -323. Claim the footprint in map.json.
