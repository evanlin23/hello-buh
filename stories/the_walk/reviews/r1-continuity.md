# the_walk r1: continuity (pre-build)

Verdict: fix

## Must-fix
1. **World:** claim `gullwick` before building. Check the survey: the bay must be `cold_ocean`, not `frozen_ocean` (Frost Walker needs water), and there must be a natural island. Then add `"the_walk": {"day": 2300, "places": ["gullwick"], "status": "claimed", "cameos": ["raven_tower"]}`.
2. **The trade screen is the kid's, not Grandpa's.** A GUI exists only for the player who opens it, so POV can't show Grandpa's trade (S02, S07, S08). Stage it as the kid trading (emeralds in hand) while Grandpa reads over the kid's shoulder; on ANYTHING the kid buys it for him. The lines can stay.
3. **Engine:** edit.py has no merchant screen or tooltip. Build it ("Add a GUI screen").
4. **L08 look is Grandpa, but S08 is the screen:** compose S08 with Grandpa's face above the GUI in the top third, silent.
5. **Order of time:** S07-S08 "this morning" are day, but S09 is dawn 23500, which is earlier. Set S07-S08 at 22800 (lantern-lit hut) and S09 at 23500. Add per-shot `look.time`.
6. **Boots are drawn** (`renderer/entities.js` armour on players); the bible says they aren't. Grandpa wears no boots in S01-S06 and boots in S09: the visible cause.
7. **Frost Walker needs a flush dock:** the ice forms one block below the feet. Lay the planks at sea level (stand at y 63). Frost Walker on a teleported actor may not fire: verify, or stamp frosted ice per step.
8. **Directions:** the bible says the island is west, the shots say -z. State it: *shot coordinates are dock-relative; -z = out along the dock = west.*
9. **S02 and S03 are both ms:** make S03 an FS (Grandpa and the lectern).
10. **The window doesn't read:** at 120 blocks one window is about 2 px at phone size. Put the island at 60-80 blocks, light two or three windows and a porch lantern, and shoot S04/S06 at FOV 30.
11. **The easter egg is behind the camera:** S04 looks out to sea, and the tower is inland. Shoot S05 from the dock end looking back inland, with the tower on the skyline. Gullwick must sit within about 200 blocks of (-2000, -445).

## Should-fix
12. Name the skin: there's no old-man skin in skins/. Use a default skin other than zuri and steve. Give the kid a non-Steve skin too (Steve reads as Buh).
13. S04→S06: Grandpa is at the dock's end, then passing the boat, then at the end again. Have him walk out past the boat in S05, the same direction across the frame.
14. L05 names BOAT: add `prop:boat` to its look. A boat can't be mossy and the coast has no snow, so cut "snow-free".
15. A narrator row for the bible: *emeralds in slot 1 (S02, S07); hearts full; no armour.*
