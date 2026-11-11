# r6 continuity: world pass (set changes only)

Verdict: fix

Geometry checked: the dock (-2301,-566) points at the island (bearing 48.8 deg W of N, the pier and the island the same); window (0,3,-92) lands at world (-2370,-627), inside the island footprint. S04 47 px/block (window 141x94), S08 24 (72x48), S11 19 (57x38): all hold.

## Breaks
1. **S06 (story.json, shots.md):** the frame says "bg: the island 60 blocks out". Replace with "bg: the island 92 blocks out".
2. **beats.md L04 row:** "60 blocks out". Replace with "92 blocks out".
3. **set.md Claims, L04:** "(FOV 20 in S04)". Replace with "(FOV 11 in S04)".
4. **S04 frame (story.json, shots.md):** "Grandma ... head to toe (about 160 px)" disagrees with set.md (85). Use "(about 85 px)". At 19.6 blocks Grandpa is 268 px/block and his feet fall below the frame (half-FOV 5.5 deg): replace "(about 670 px)" with "(head and shoulders, about 340 px; feet out of frame)".
5. **S11:** at FOV 28, aimed at the window, the frame's bottom edge is 15 deg below. Grandpa's feet at the dock's end (16.5 deg) and the first ice (15.9 deg) are below the edge, so the reveal's first ice is off screen. Camera: "at: (0, 5, 14) behind Grandpa looking down the dock at (0, 1, -20), FOV 28, still". The window then sits 5.6 deg above centre, still 57x38 px.
6. **S08:** at FOV 21 Mom's head is 10.2 deg up against a 10.5 deg half-FOV, so it touches the top edge. Camera: "at: (-3, 1.9, 21) ... (0, 2, -92), still, FOV 24". Mom is then centred at 66% of the height and the window is 63x42 px. Update set.md S08 to "FOV 24 at ~113 blocks: about 21 px a block; the window about 63 x 42 px".
7. **S05 / canon link 15** ("Leo's House's stone roof is on S05's skyline"): looking straight +z, Leo's House (107 blocks, 9.6 deg S of E) sits 31 deg left of centre. That is out of frame at FOV 50 and at the edge at FOV 70, and the push loses it. Camera: "at: (1.5, 2.5, -1) ... looking at (3.8, 1, 10), slow push": the boat 6 deg right, Leo's House 19 deg left. Eye height 1.6 sits under the headland's top (y 64), so only a raised camera clears the roof.
8. **set.md render distance:** "renderDistance 8+ is enough" is wrong. The island's far side is ~127 blocks from S08's camera and Leo's House ~108 from S05's. 8 chunks guarantees only ~112. Use "renderDistance 10".

## Notes
- "west" in bible "Positions" and the shots.md header: use "out to sea (-z; north-west in the world)".
- S07 (unchanged): pitched 18 deg down at FOV 30, so the horizon and the island are out of frame. Either drop "and the island" from bg or accept open water.
- No Ridge tower is left outside the "dropped" notes.
