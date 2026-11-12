Verdict: REVISE (avg 7.4; Hook, Twist, Fairness 8+; Naivety blocker on L12; length over the format)

**Cold read.** An allay flies every diamond its miner blasts loose to a singing box in a hole by the lava; they vanish, she says she'll quit, and the grumpy neighbor yells that he's trying to sleep. It follows the biggest one through the hole and finds him playing the box, wearing all her diamonds: he made the box sing so the allay would bring them to him.

**Format.** L01 fact + "WHY" ✓; five clues ✓; wants to know (L01, L15 "to see where they GO") ✓; at stake, "Tomorrow, I QUIT" ✓ (thin); goes to look ✓; reveal said plainly in L16 ✓ (L07 already gave the rule, so a casual viewer needs no game knowledge); one beat, L17 "Thirty-TWO" echoes L01 ✓; no names ✓. **Fails:** L12 has no misreading (0a); 165 words is ~55 s, over 25-45.

**Cold reader, my estimate.** Midpoint: casual 60% neighbor, gamer 75%. L12 "I never see him in the DAY" points straight at him. After: "the neighbor played the note block so the allay gave him her diamonds." Both get it.

**Scores**
Hook 8 · Second beat 6 (L02 is a day-one flashback) · Mystery 8 · Twist 8 (flips L07, L11, L01) · Fairness 9 · Rewatch 9 (L07 "When it SINGS", L08 "so HUNGRY", L11 "trying to SLEEP") · Naivety 6 · Agency 7 · Character 7 · Delivery 6 · Visual 7 (the S01/S07 hole at 300 px is still the risk) · Continuity 6 (beats.md is still r3: "It's EMPTY", "too BIG to throw"; `torch_hill_cottages` and `sheep_hole` not in map.json) · Owner fit 8 · Canon 8 (stands alone; the egg is unspoken)

**Must-fixes**
1. L12: the kid states a pointed fact with no innocent reading. Write: "That's the grumpy man next DOOR. He sleeps all DAY, and the boom blocks WAKE him!" On rewatch, the booms are his cue.
2. Length: cut to about 145 words.
   - Cut L09. S09's empty hands and L10 "Nothing AGAIN" carry it.
   - L01: "I found her THIRTY-ONE diamonds. She's never had more than ONE. And I don't know WHY." (the fact lands by 3 s)
   - L08: "I drop them ON it. GONE! It must be so HUNGRY."
   - L16: "And there was the grumpy man, PLAYING the box, wearing every diamond I ever FOUND."

**Should-fixes**
- L13: "She CAN'T quit!" raises the question of why she can't, and it isn't the allay acting. Write: "I won't let her QUIT! Today, she lit THREE."
- Update beats.md and bible.md to r4. Claim the place and the egg in map.json.
- `mood` is still `"funny"`. Make it `["mystery","funny"]`.
- Run the two fresh cold readers on r4. The lines changed after r3's reads.

Against runaway: worse. Runaway's line 1 flips on one image. Here the flip needs L07's rule and the hole to read.

## r4b
Verdict: APPROVE (avg 7.7; Hook 8, Twist 8, Fairness 9; nothing under 6).

**Must-fixes, rechecked**
1. L11 (was L12): **fixed.** "He sleeps all DAY, and the boom blocks WAKE him!" The kid repeats his claim as fact, so 0a passes; on rewatch the booms are his cue.
2. Length: **fixed enough.** 143 narrator words plus 13 character words is about 50 s at Pip's pace. STANDARDS 0 says ~50 s is fine, and nothing is padded.

**Changes since r4.** L01 "She hasn't gotten a single ONE" reads better with L02, where she gives her one away. L12 "I won't let her QUIT!" gives the allay a want, so agency goes from 7 to 8. No regressions: no "...", the hero is not named, no line reads as innuendo, and L16 "Thirty-TWO" still echoes L01.

**Cold reads on r4** (real; the coordinator's message): casual reader 60% on the neighbor at the midpoint, a bit surprised, explained it correctly. Java reader 55%, correct. The neighbor clue in those reads was the old L12, "I never see him in the DAY", which pointed harder than the new L11. Between obvious and confusing.

**Scores**
Hook 8 · Second beat 6 · Mystery 8 · Twist 8 · Fairness 9 · Rewatch 9 · Naivety 8 · Agency 8 · Character 7 · Delivery 7 · Visual 7 · Continuity 7 · Owner fit 8 · Canon 8

**Should-fixes**
- S10 is at dusk, but L11 says he sleeps all DAY. In the bible and in L10's direction, make it clear he is shouting about today's booms as she climbs out ("finally home, still sore"). Otherwise a sharp viewer asks why someone who sleeps by day is in bed at dusk.
- S09 now opens on L09 "Nothing AGAIN": keep her empty main hand readable from the first frame, since no line says it any more.
- beats.md and bible.md to r4b. The map.json claims stay a build-time task.
