# bell_window r5: continuity, round 2 (confirm only, head 3afb3619)

Verdict: fix (two new breaks, each a one-line edit)

## r3 must-fixes
- Fixed and holding: 2-8 and 10-14.
  - 2: the simulated arrow crosses the bell at 7.46 and the sight line at 7.14.
  - 4: with the feet now at y 9, the skull sits 7.5° right of centre and 4.5° below it. It is still in frame. (frame text's "12.6° up" is stale)
  - 5: the S02 line clears the roof ridge, at y 12.2.
  - 6: the S05 line clears the cliff edge, at y 9.4. The skeleton is a 4% speck.
  - 9: Option B (dusk 12600) is done.
- Deferred to the build, as agreed: 1, the map.json claim. It must land before the stunt runs.

## New breaks
1. **S06 (L09):** the east post is now an oak log, a full block (x 0.5-1.5, y 1-8). Seen from (3, 7.5, -3.3) facing west, it hides the bell and most of the arrow; only the fletching tip clears. (my post fix). Fix: camera at (2.2, 10.0, -4.2), above the post top, looking at (0, 7.5, -3.3). There the bell's top, the shaft broadside and the fletching (frame right) are clear. S06's "bg: his lit window" is out of frame from either camera, so drop it.
2. **L03 `shows` spruce_trapdoor / glass_pane in S02:** his shutters are on the north face, under the roof line as seen from (0, 20, 14). The line to them crosses the ridge at y 9.8, so "MY window" isn't in the picture. Fix: change it to `{what:['bell'], word:'RINGS'}`, or drop it.

## Notes
- **S08 clearance:** the porch-kid line passes the east log post at x 1.55 at z -3.5, a margin of 0.05. Make the posts oak fences at y 1-6 with log caps at y 7 (clearance 0.4), or stand him at x 3.
- **L10:** `look` is the bell on PAST, but on PAST the bell is sliding out of the centre. Put the `word` on RANG.
- **S06 place:** "bedroom", should be "square".
- **L09:** checked. From the window, the fletching shows under the bell's lip (the sight line passes at 7.16, under the lip at 7.25), so the kid can see the "feather".
