# goat_horn r1, critic

Verdict: REVISE (overall 6.8/10)

**Cold read:** A goat keeps knocking Dad off a cliff, and he keeps trying to dodge it so it hits the oak behind him. He leaves for the mines without the "one thing", the kid dodges, the goat hits the oak and drops a horn, the kid blows it and Dad turns around. Twist: as written it doesn't come through. Why is it "for ME"? And does "turned around" mean Dad is coming home?

## Scores
- Hook 8: the goat charging and a man launched off a 28-block cliff in frame 1, with a number. Goats knocking players off cliffs is a common meme, though.
- Second beat 6: L02 escalates (he goes back up), then L03 answers the hook question.
- Mystery 5: "so it hits the OAK" (L03, 8 s) tells every Minecraft player "goat horn" at 18%. After that only the motive is left.
- Twist 6: the game shows it and it's one step, but line 1 has already flipped at L03. "It was for ME" isn't earned.
- Fairness 7: horn rule (Ida, "MISSED"), the tell (S03) and motive (L06) are fair. Nothing plants that the horn is *for the kid*.
- Rewatch 7: L01, L05 "Goats don't MISS", L07 "ONE thing".
- Agency 8: Dad tries, and the kid chooses and acts on the tell. Every fall has a visible ram.
- Character/dialogue 6: Dad's "Two hundred THIRTEEN!" is the right punchline (3 words, on screen). "One thing → REVENGE" is a strained misread.
- Delivery 7: no "...", L01 fits in one breath, nothing hushed. At 119 words with 8 pauses it's at the 45 s edge.
- Visual 7: wide shots, natural relief, full scale. The horn pop in S11 is small, so S11b carries it.
- Continuity 6: L01 is narrated today ("has knocked… 212") but S03 is the 213th. The renderer has no goat code (grep: only TOOT_HORN), so a one-horned goat is unproven.
- Owner fit 8: Minecraft-native, visible causes, out-of-context read clean, ending close to self-explaining.
- Against runaway: worse. Its question holds until the blast, but this one's is answered at 8 s.

## Must-fixes
1. **L03** gives the plan away. Change it to "He tries / to DODGE. / Too SLOW." and keep the oak in the picture only (S01-S03). Then the kid's dodge at L10 hitting the oak is the reveal.
2. **L07** must plant "for me" and misread it: "Dad said / he can't go / till he gets me / ONE thing. / I figured / he meant a WIN."
3. **L12-L13**, the ending must say its purpose: L12 "It was / for ME. / To CALL him." L13 "I BLASTED it. / Way down the road, / Dad turned / and WAVED." ("Turned around" reads as him coming home.)
4. **S11/S12**: build and test the goat model with `HasLeftHorn:0b` (docs/engine_features.md) before recording. The reveal picture depends on it.

## Should-fixes
- L01/caption: say 213 (today's total). Then L04 and the bible's "watched 213" agree.
- L10: show why the kid is faster. Hold S10 on the head-drop before he steps, or write "I'd watched / 213 TIMES."
- Word budget after the fixes: cut "Old" (L05) and "Right" (L11) to stay under 45 s.
