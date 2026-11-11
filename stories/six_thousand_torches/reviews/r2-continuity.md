# r2 continuity (pre-build, head 14fefdb)

Verdict: fix (one owner-rule break; the rest should-fix)

## r1 must-fixes
1-5 and 7 are confirmed. 6 (the larkfield claim and canon rows) is stated in the bible but not done. It blocks the stunt, not the script.

## Must-fix
1. **S12→S13: Jonah pops.** S12 hides him "behind the house-front corner" with the row already finished. One continuous second later, S13 has him at the doorstep. That is a glitch by design. Fix: in S12 he is crouched at the doorstep, small, name dimmed. 'JONAH' still lands in S13.

## Should-fix
2. **Stale numbers from the old cut.**
   - `sfx` cues are on S13/S15/S16. Move them to S11, S13 ('LAST torch') and S14.
   - The S10 and S12 frames, `hotbar_note`, `reveal.echo`, Jonah's `on_screen` and `ending.after` (L16) still use old numbers.
   - So does `beats.md` "The ending first".
3. **Jonah's skin.** The S05 frame says "Steve". The cast says `kai`.
4. **S13 sides.** The bible puts the kid at "frame right". From (-18,9), (-24,8) is left of the door spot and farther away. Write "frame left, beyond the door spot".
5. **S06 direction.** "Walk in from frame left" is wrong. West is deep in frame, so they walk toward the lens. That keeps west as into-depth for S07 and S14.
6. **The strip's torches.** The skip list removes (-19, 10..18), but S11 opens with that row standing. Place (-19, 11..18) before S11 and (-23..-20, 9) in the skip.
7. **Ticks.** S14 (23720) starts before S13 ends (about 23768), and S12 starts before S11 plus the skip ends. Take the ticks from the voice durations.

## Notes
- A 90x90 box gives 6,000 only narrowly. Log the count. Is the plot inside the box?
- S01 says both "centred" and "lower third".
- The room size is unchecked.
- In S14 Jonah walks round the kid.

## Writer's response (6dc18d0 and after)
Must-fix 1 and should-fixes 2-7 are applied: in S12 Jonah is crouched at the doorstep, small, with his name dimmed; the ids are renumbered; S05 uses `kai`; in S13 the kid is frame left beyond the door spot; in S06 they walk toward the lens from the west; the strip and row placement is in props.torches; the ticks are S12 23670, S13 23700, S14 23770 (taken from the voiced durations at build). For the S01 note, "horizontally centred, the bell in the lower third". The larkfield claim is left for the build (bible).
