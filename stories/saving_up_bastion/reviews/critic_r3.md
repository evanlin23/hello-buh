# Saving Up for a Bastion: critic r3 (2026-11-11, confirmation)

Verdict: **APPROVE**. Average 7.8. Hook 8, Twist 8, Fairness 9, no score under 7.

**Cold read.** A baby piglin catches gold that falls from above, keeps all of it for a bastion, and reads a player's fixes as gifts. It's stuck in his barter farm, and babies never barter, so his chest is empty.
- Midpoint (after L03): with "six seconds" gone, nothing on screen or in the lines says "machine" yet. A gamer can guess "a farm?" but can't be sure. A non-gamer guesses "someone's feeding it?".
- After: both explain it in one sentence. **Pass.**

**R2 blockers**
1. Out-of-context read: **resolved**. L04, L05 and L08 are verbatim. Heard with no picture, "I beat the grown-ups down the HOLE", "He's SO GENEROUS" and "WELCOME HOME" read as a kid bragging. L04 also pays off L02's stare.
2. Fast: **superseded**. I checked the rule: docs/stories.md (owner, 2026-11-11, "we shouldnt harp too much on length"), STANDARDS 0 and 9 (r:r08fd98). Over 45 s is a note, and a line is cut only if it doesn't move the question. L07 passes, but weakly. It's the second of three escalating fixes (the pattern "he keeps trying harder" is what L10 pays off), and its misreading ("like a real CASTLE") echoes L03's want. It adds no clue to the answer, so it's a should-fix, not a cut.
- r2 should-fixes: the sign (moved to the shelf, facing the piglins), S02 (staged), S11 (L-frame, sneak pose): all done.
- No regressions in the lines. L01, "Gold falls from the SKY, just for ME. I've kept all FOUR HUNDRED.", is one breath, and the number still lands. L12's "count to SIX" now reveals the clock instead of repeating it, which is a better ending.

**Scores**
- Hook 8, Second beat 8 (the stare now pays off in L04), Mystery 7
- Twist 8: L01 "kept all" flips
- Fairness 9, Rewatch 8 (L01, L05, L12)
- Naivety 9, Agency 7, Character 7
- Delivery 7 (about 43 s, a note only), Visual 8
- Canon 8: stands alone; one easter egg in S02
- Owner fit 8
- Against runaway: worse. The empty chest (L10) tells the viewer just before the reveal shows it, while runaway's reveal is the event itself. Closing that gap would mean holding the empty screen until after L12, but that's not required.

**Must-fixes:** none.

**Should-fixes**
1. story.json `ending.loop` still quotes the cut line 1 ("Every six seconds, a gold ingot falls from the sky"). Change it to: "L12 'I count to SIX' (the dropper clicks) runs into L01 'Gold falls from the SKY'."
2. Give S07 a fix the player can see: he glances up at the tower before he pours. The moat then reads as "he's protecting something that isn't working", not as set dressing.
3. beats.md, the L01 row: remove the "..." in "just for me... kept" so that nobody copies it into a line.
4. Still open from r2: flag to the owner that this is the second piglin-barter Short at Gold for the Portal's portal.
