# bell_window r3: continuity (pre-build)

Verdict: fix

## Breaks
1. **Canon:** no `bell_window` claim, stamps or `saltmouth_portal` cameo in map.json (r1 #1, #11); `world.js story` throws.
2. **The line-up:** the eye is placed in the wall. Standing at z 0.8, the line meets the bell at y 7.0, above the ring zone (< 6.81). Vanilla arrows also arc about 0.3 high. Fix: bell y 7 (sturdy post tops), skeleton feet (0,9,-12). The arrow then crosses at 7.46 (zone 7.25-7.81) and the sight line at 7.14, under the lip. The rise must end by z -9.5.
3. **The oak and the skeleton** share a block (0,10,-12). Offset the trunk.
4. **S08:** the skull is 28° off-axis at FOV 30, out of frame. Camera (0.6,12.6,-15.5): skull 7.5° right. It is the *left* shoulder.
5. **S02:** the north-wall window can't be seen from behind the house, and the roof cuts the bell line. Camera y 19 or higher; show the window's glow, not the window.
6. **S06:** the cliff edge hides the skeleton. At 13 m by day it reads as a skeleton (the bible's Never). Use about (8,14,20), a 4.5% white speck.
7. **S04:** the arrow's shaft hides behind the post. Camera (3,5.6,-3.3) facing west.
8. **S05:** the portal is 62° off-axis. Stamp open shutters on the neighbours' windows (L07).
9. **12000 is sunset**, but the frames say moon and dark. Use 13000 with villagers summoned outdoors, or write dusk.
10. **The window is 1x1:** the villagers below (L02) can't be seen through it and he can't step out (S07). Make it 1x2; the porch at z -1.
11. **S03:** the shutters shut themselves. Drop the close. Door at (3,4,2), camera (-2,5.6,5.5).
12. **No line has `look`**. Use prop:bell / entity:villager / Mom / prop:arrow / prop:window / prop:skeleton.
13. **S07's visible arrow** gives away the shield. Clang only.
14. **Stale fields:** `ending.after` L07 should be L09; Mom's "arrow in S04"; the POV lists.

## Notes
- Saltmouth's generated bell: say which bell is "the village bell".
- The day-1700 stamps will appear in Good Boy.
- canon.md lists Mom as Sulafat.
- Build the bow-draw arms.
