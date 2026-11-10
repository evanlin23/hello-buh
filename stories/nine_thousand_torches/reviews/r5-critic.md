# nine_thousand_torches: critic, round 5

Verdict: **REVISE** (7.7/10). Two small fixes, both mechanical. Once they're in, this is approved and doesn't need a round 6.

**Cold read.** A villager kid wakes to six thousand torches and thinks something is coming. Jonah, the player who lights his door every night, made his mom a promise; today his things are in the kid's chest, his house is gone, and a growing row of torches leads to the kid's door, where Jonah places the last torch and quits for good. The village is every night he won't be there, lit at once.

**Length.** The text has 100 words, but `say` speaks 103 (see MF1). At ~3 words/s that's 33.3 s, plus 9 gaps (2.7 s), the wave and POV (1.5 s), the hold (1.2 s) and the lead-in: **~39 s**. That passes, with no slack.

**Mystery test (1.0)**
- Question in the first 3 s: **pass**. L03 "So why EVERY block?" is answered only at the door.
- A guess at the midpoint, but not a sure one: **pass**, but only on the text. "Mom made me PROMISE." raises "promise what?", and "He's grounded a LOT" answers it wrongly. But `say` still speaks "One last night." (MF1), which brings back the 75% problem.
- Explained in one sentence afterwards: **pass**. "Jonah quit for good, so he lit every night's torch at once."
- Cut within ~1 s: **pass**. The quit, the yellow line, a 1.2 s hold, then the cut. That's within section 8's 1.8 s limit.
- Fast: **pass**. Every line moves the question.

**1.3/1.4: L14's tail.** It isn't the forbidden punchline. When L14 plays, the picture has shown only a torch being placed; the vanish hasn't happened. It answers "why every block?", and the quit then adds what no line says: "for good" (no "see you tomorrow"). "Every night he'll MISS" does spend some of the vanish's surprise, but it fixes the clarity the cold reader asked for. Keep it.

| | | why |
|---|---|---|
| Hook | 9 | one image, a number, one breath |
| Second beat | 8 | a rule, then "why" |
| Mystery | 8 | "PROMISE" is now a question, not an answer |
| Twist | 9 | "COMING" flips to going |
| Fairness | 8 | L03, L06, L07, L09, L11 and L12, all on screen first |
| Rewatch | 8 | "Someone", "COMING", "PROMISE" |
| Agency | 6 | only "I followed it" |
| Character | 7 | narrator only; L08 misdirects |
| Delivery | 7 | ~39 s; `say` doesn't match the text |
| Visual | 7 | the ending reads at 300 px if S06's chat line does |
| Continuity | 7 | stale references (MF2) |
| Owner fit | 8 | ends on picture and sound |
| Canon | 8 | stands alone; the dog egg is in S01 |

Against runaway: close. Runaway's line never says what the blast means. Here L14 says half of it.

**Must-fixes**
1. In L07, `say` still reads "Mom made me promise. One last night." Change it to `Yesterday Jonah said, "Mom made me promise."`
2. Finish r4's MF2:
   - In S12's camera, change "a step forward on 'WHO'" to "on 'GROWING'".
   - Remove the S02/S10 references from `props` (fence_torches, ridge_torches, hay_torches, dark_forest) and from the cast's `on_screen` (S10).

**Should-fixes**
1. In L14's direction, change "'Every night at ONCE'" to "'Every night he'll MISS. All at ONCE.'".
2. In S14's frame, change "in the gap before L15" to "after 'ONCE'".
3. In `look.ticks`, change "L01-L15" to "L01-L14 and S15".
4. Make sure S06's white "see you tomorrow" line is readable at 300 px.
5. A/B test with one cold reader: L14 cut to "Jonah put the LAST one THERE." If they still explain the twist in one sentence, the shorter version is runaway-grade.
