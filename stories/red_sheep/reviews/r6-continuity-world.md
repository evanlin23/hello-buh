# red_sheep r6: continuity, world pass only (pre-build)

Verdict: fix

The canon checks pass: day 2300, link 11 (raid 32 at day 1900, both evokers), the flock blue from the morning after, all 32 frames full with RAIDS WON 32, Grandpa `zuri` and never named, and map.json `stories.red_sheep`. The stamp coordinates match the bible (house, windows, door, bench, frames). "Last spring" at about day 1950, 350 days back, fits canon's year (Buh is about 10 at 1500 and about 11 at 1900).

## Breaks
1. **S01 still aims at the old plot.** story.json `shots[S01].camera` looks east along z 15, but the pasture is z 13..40, so the sheep sit in the right half (not "the middle third"). set.md checklist 2 asks for a re-aim but story.json is the source of truth. Replace with: `path: crane down from (-50, 20, 26) to (-38, 10, 26), west of the pasture, looking EAST at (-15, 0, 26). FOV 55. Moving from frame 1; every sheep 14+ blocks from the lens`.
2. **S01 is still called the easter egg** (one cameo per story). In `shots[S01].frame`, replace `the old tower on the skyline (the easter egg)` with `the old tower on the skyline (geography, not the cameo)`.
3. **bible.md Places, pasture row:** `~40 x 30` → `gate + (-29..-1, 13..40), 29 x 28`.
4. **S04's sightline needs checking before you record.** The ground at the north fence (x -13, z 13) is y 74, and the fence's visible top is 75.0 (the 75.5 in set.md is the collision height). The window spans 74-76. To see the whole window over the fence the lens has to sit at y 75.3 or higher, and at 75.6 or higher to see Grandpa's body. So `1.4` only works if the ground at (-13, 18) is y 74 or higher. Grandpa's ray also clips the generated house's corner (-10, 3) by about 0.2 blocks. Fix: take a still with `world.build` first. If either fails, raise the lens to y 75.6 and set the sheep 4 blocks out (it stays full figure and the window stays in frame). Then move Grandpa to sit 1 block west, or have him stand at about (-9, 1, -6).

## Notes
5. story.json `cast` has no Grandpa. Paste in: `"Grandpa": {"role": "extra", "on_screen": "S04 only: player actor, zuri skin, sitting on his bench, soft; no line, no nameplate, never named"}`. Keep `nameTags`/`playerNames` off for him.
6. bible Cast says "crossbow on his back", which can't render. Change to "empty-handed". At "facing south" he looks at the lens, so face him east down the road.
7. The `blue_flock` stamp summons 8 more sheep. Add to bible Numbers: "60 = blue_flock's 8 + 52 summoned".
8. The south fence runs y 67-78, not 70-77 as set.md says. The stamp's lantern is on the corner post at (-1, 14) and reads as the gate post.
9. beats.md:37 still says `raven_tower`. It's frozen, so just flag it.
