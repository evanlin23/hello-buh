# the_walk r3: continuity (pre-build)

Verdict: fix

## Breaks
1. **Canon, "Ten YEARS":** canon counts 365 days a year (One More Eye: day 3000, six years = day ~810). Ten years before day 2300 falls before day 0. Move the story to day 3700 (the flashback is day ~50) or say "SIX years".
2. **World:** gullwick is still unclaimed (`world.js story the_walk` throws). On world_map.jpg (-2190, -380) is land; the water west of it is light blue (a lake or river?) or the stronghold islets. Survey first. The tower is 200-300 blocks off, past the default fog at 192: raise renderDistance.
3. **S04:** Grandpa stands 6 blocks ahead on the window's axis. At FOV 20 he fills the frame and blocks the window. Move the camera to (0.5, 3, 14) and Grandpa to (-0.8, 0, 0.5). At 74 blocks that's about 39 px a block, so Grandma is about 70 px tall.
4. **S05:** the boat at (2, 0, -2) is behind the camera (z -1, looking +z). Move it to (2, 0, 4). S05 is also day between two dusk shots, and Grandpa walks out after S04 already found him at the end. Set S05 to 13000, with him walking inland, away, past the boat. Fix the bible's walk line to match.
5. **S07:** the camera at z -2 is seaward of Grandpa, so there's no shoulder. Use (0.7, 2.4, 1.5) with Grandpa at (0, 0, 0.5) on frame left. That keeps S06's +x side of the line.
6. **S06:** the island is about 31° off the aim, out of frame. Use (6, 3, 8) looking at (0, 1, -5).
7. **S11:** from (0, 10, 14), Grandpa at the dock's end sits 27° below centre, outside FOV 40. Move the camera to (0, 5, 14).
8. **S03:** the camera is 2.8 blocks away, which is MS (FS is 6-8 at FOV 50), so it's MS→MS. Pull back to about 6 blocks. In the hut, Grandpa (0, 1.6, 0) stands inside S01's lectern (0, 1, 0). Add a bible row: *hut coordinates are hut-local, origin the lectern; librarian at (0, 1, -1), Grandpa (-1, 1, 1.5), kid (1, 1, 1.5).*
9. **S08:** at FOV 30, a full Mom needs about 6.5 blocks. Use a camera at (-3, 1.6, 21) and Mom at (-1.5, 0, 14.5).
10. **Grandpa's voice `elder`** is Ravenford's Grandpa's (his Grandma died), a few hundred blocks away. Conflict 11 says another voice.
11. **No old skins exist** (skins/, vanilla defaults). Paint grey-haired Grandpa and Grandma skins, or S02 can't tell Grandpa from the kid.

## Notes
12. L01 breaks the lectern on frame 0, before BROKEN. Keep it standing on LECTERN.
13. L10 names GRANDPA, but its look is the screen. Put his face above the GUI.
14. Bible rows needed: S06-S07 without the tied boat; S07 window dark; Grandpa's axe per shot (flashback? S11?); S03 librarian plain; S03 "head to boots" changed to "head to toe".
15. The anvil is in the hut (set.md) and also in the kid's hotbar. Pick one.
16. set.md: lib/sets has no `library`, so use `room`. Lead ropes don't render: build that or drop the lead. The island seen through the door in S01 is a speck. 3,000 marks is about 60 signs.
17. `look.note` is stale. Grandma's figure in S11 is about 9 px on a phone (the window reads).
