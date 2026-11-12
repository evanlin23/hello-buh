# red_sheep: critic r7 (the r5 story-format rewrite, commit 24115f62)

Verdict: **APPROVE** (average 8.07; Hook 8, Twist 9, Fairness 8; nothing under 7). There is one build must-fix (the S13 spell timing). It is not a script change.

## Cold read
A kid's village keeps all sixty sheep blue, Dad won't say why, and last spring one came back from the woods red. She follows her lamb into the woods to find more red ones, and a grey man raises his arms and her lamb turns red.
The twist: the blue sheep are Dad's alarm ("our EYES"). Red means the thing in the woods is near, and now it is near her.

Casual reader, at the midpoint (L07): "something in the woods turns sheep red, and Dad's scared of it". That's a guess, not a certainty. After the reveal: "The grey man turns blue sheep red, so blue sheep warn them he's close." That's one sentence.
Gamer: calls "wololo" at L06 (45%). Accepted, but this is the gap to runaway.

## Format blockers (story_format.md, 0y, 0z, 0a): all pass
- L01 says the fact and the "why", and S01 shows it from frame 1.
- Five two-way clues: L02, L03/L04, L05, L06, L07. Each has its innocent reading on the line.
- The kid wants to know (L01, L10).
- The lamb is at stake.
- L13 says what she sees, and S13 shows it.
- One beat (the look), then the cut 1 s later.
- "turned RED" loops into "are BLUE... WHY".
- There's no "...", no spoken name, and no innuendo.
- L10 "never go in the WOODS" is said while she is short of the woods, so it doesn't contradict the picture.

## Scores
Hook 8 · Second beat 8 · Mystery 8 (cutting the snap makes it one idea per beat) · Twist 9 (it flips L01 and L03 "EYES") · Fairness 8 · Rewatch 9 (L03, L05 "helps him SLEEP", L11 "find MORE red ones") · Naivety 8 · Agency 8 · Character 7 (Dad has one 4-word line) · Delivery 8 (139 words) · Visual 8 · Continuity 7 · Owner fit 9 · Canon 8 (stands alone; the totem-wall egg is unspoken)

Against runaway: still a little worse. The premise breaks a custom, not a mechanic, and the gamers who know about the spell are sure by L06.

## Must-fix (build, before recording)
1. **S13 sync.** The shots put the arms up at +0.0 and the cast tick at +2.0 ("RED"). But L13 is 14 words. At Pip's pace (about 5 words/s) "RED" lands at about 2.7-3.0 s, so the lamb would turn red under "and my lamb", before the word.
   - Key the spell from the voiced take: warm-up start = onset("RED") minus 40 ticks. The arms then rise around "raised his ARMS", and he stands still under "A grey man in the trees".
   - Cut at onset("RED") + 1.0 s, which is also where the 60-tick pose drops his arms.
   - Update the timings in story.json `ending`, shots.md S13 and bible.md lines 36-38.

## Should-fix
- beats.md spine still says the woods "Dad is 'so boring' about". Change it to "the woods Dad never explains".
- beats.md "Easter egg" still names raven_tower on S01. The shots make the totem wall in S04 the egg and the tower just geography. Make them say the same thing.
- If "Like she was LISTENING" comes out hushed or ominous, re-take it bright (rule 0a).
