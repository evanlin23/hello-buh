# slow_falling r2: critic

Verdict: **APPROVE**, overall **7.9/10**, on two mechanical look fixes (below). These are data errors, so no round 3 is needed.

**Cold read.** Grandma floats off the windmill every day on the juice Grandpa packs her. Milo takes one of Grandpa's forbidden "teas" for his own trip, gets stuck at the top of the up-only fountain, sees the tea is the same color as her juice, drinks it and floats down too. The twist: her "flying" is Grandpa's slow falling, brewed every night, and she doesn't know.

## Round 1 must-fixes
1. S01 has empty hands and no bottle, and the S02 camera is 7 blocks out: **fixed.**
2. L07 "I took ONE. For MY trip.": **fixed.** The theft is now a choice.
3. L09 "Wait. I'm not LIGHT. It only goes UP.": **fixed.** The "why ride up" question is answered.
4. L13 "Grandpa BREWED her wings", with the bottle in Grandpa's hand in S13: **fixed.**
5. The jetty step at (-2,24,1): **fixed** in the props, bible and set.

## Scores
| | | why |
|---|---|---|
| Hook | 9 | empty hands, a 23-block drop, the number |
| Second beat | 7 | "Not one SCRATCH" raises it; still no threat to me |
| Mystery | 7 | the chain tea, theft, stuck, same color builds, but the S03 potion tips players at 8 s |
| Twist | 8 | one step; flips L02 "light as a FEATHER" and L05 "BORN to fly"; the game names it |
| Fairness | 9 | the bottle, swirls, stand, color and name are all shown first |
| Rewatch | 9 | L02, L03 "for the trip", L06 "I'm not allowed ANY" |
| Agency | 8 | takes the tea on purpose, works it out, chooses to drink |
| Character | 7 | L12 carries the misread; the two quotes still overlap |
| Delivery | 8 | 116 words, about 41 s, no "...", L09's pause planned |
| Visual | 8 | wide, 24-block depth, the reveal is the hotbar name |
| Continuity | 7 | see the fixes |
| Owner fit | 8 | why-tf, self-explaining end, the pip voice recipe |

**Against runaway:** worse (about 9.1 against 7.9). To close the gap, hide the potion in S03: have Grandpa hand it over in a wrapped or held pose so the item icon is unreadable until S10.

## Must-fix (owner rule 2, "look at what the line names")
1. **L11:** look `word: "TOO"` isn't in the line, so the look never fires. Change it to `"OFF"`.
2. **L09:** on "UP" the look target is `prop:market_below`, which is down. Set the look on "UP" to `prop:fountain`, looking into the column at the rising bubbles, and keep the look on the market for "LIGHT".

## Should-fix
- S01 in story.json and shots.md says the step is "3 blocks west of the cliff face". The bible says 2. Make it 2.
- L01 says "jumped", but S01 has her step off (rule 3, the picture contradicts the words). Have her hop off the jetty end.
- The thirty_one_raids overlap is unresolved. The lead decides.
