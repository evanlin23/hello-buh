# goat_horn r2, critic

Verdict: APPROVE (overall 7.6/10)

**Cold read:** A goat knocks Dad off a cliff every day while he tries to dodge it. He leaves for the winter mines without the "one thing" he promised his kid, so the kid takes his spot, dodges, and the goat hits the oak and drops a horn. The kid realises the horn was what Dad was after, so he could call him, and when he blows it, Dad turns round on the road and waves.

## Round 1 must-fixes
1. L03 "He tries / to DODGE. / Too SLOW.": **fixed.** The oak is only in the picture now, so the question holds to L05.
2. L07 "...till he gets me / ONE thing. / I figured / he meant a WIN.": **fixed.** It sets up "for ME".
3. L12-L13: **fixed.** "To CALL him" explains the blast, and "turned and WAVED" says he heard it. S12b shows the blast.
4. Goat model: **fixed as a gate.** set.md line 84 says nothing records until `HasRightHorn:0b` reads at 300 px. It stays a build risk, not a script fault.

No regressions. 116 words, no "...", L01 is one breath, and the first `<short pause>` is in L03, about 7 s in.

## Scores
| | score | why |
|---|---|---|
| Hook | 8 | launched off a 28-block cliff on frame 0, with 213 over it |
| Second beat | 7 | L02 is still procedural; L03 brings the question back |
| Mystery | 7 | L05 "Goats don't MISS" still tips players at 38%, but the clue is fair |
| Twist | 8 | one step, the game shows it (the horn pop), and it flips L01 and L07 |
| Fairness | 8 | horn rule (L05), tell (S03, L10), motive (L06), the "for me" plant (L07) |
| Rewatch | 8 | L01's 213, L03 "Too SLOW", L07 "ONE thing" |
| Agency | 8 | Dad tries, and the kid acts on the tell he watched. Every fall has a visible ram |
| Character | 7 | "Two hundred THIRTEEN!" is good. "gets me ... a WIN" is a slightly forced misread |
| Delivery | 8 | the pauses fall before "Too SLOW", "Goats don't MISS" and "I STEPPED" |
| Visual | 7 | wides everywhere, and the horn has its own close-up (S11b). S13's wave is with Dad's back to us |
| Continuity | 7 | all 13 breaks are fixed. The goat model is unbuilt |
| Owner fit | 8 | Minecraft-native, visible causes, nothing hushed, the out-of-context read is clean |
| **Average** | **7.6** | |

**Against runaway:** worse. Its image is a 10 and this one is an 8, and players solve it a beat early. A stranger opening image would close the gap.

## Must-fixes
None.

## Should-fixes
- L08: a viewer asks why Dad left without the one thing. Make it "And this morning, / out of TIME, / he LEFT." (same length).
- L07: "gets me a win" is an odd thing for a kid to think. Try "I figured / he meant BEATING it."
- r3 names no model. Write the smith's model into the request so it can't drift.
- S11: if the goat-model gate fails at 300 px, the dropped horn plus S11b carries the reveal alone. Don't stall the shoot over the missing horn on the head.
