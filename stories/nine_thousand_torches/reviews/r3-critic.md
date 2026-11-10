# nine_thousand_torches: critic, round 3

Verdict: **APPROVE** (overall 8.1/10; Hook 9, Twist 9, Fairness 9, none under 7), with one mechanical build fix (MF1) that doesn't need another round.

**Cold read.** A villager kid wakes to six thousand torches and decides something big is coming. His player-friend Jonah lights his door every night "so nothing SPAWNS". Now Jonah's things are in the kid's chest, his house is gone, and a row of torches grows to the kid's door. Jonah places the last one there and leaves without his "see you tomorrow". The village is every night's torch done at once, because Jonah isn't coming back.

**Does r3 close the gap?** Mostly. "so nothing SPAWNS" (L06) hooks the habit onto L03's rule, so the motive now comes from the rule, as runaway's does. "Every night at ONCE." (L14) names the bridge in four words, and the departure is still left to the game (L15 plus the chat). That isn't over-explaining. It does take a little surprise from L15: a viewer who adds L07 "One LAST night" may get there a beat early. It's a fair trade, because L15 now lands as certainty, not as a puzzle.

**Regressions.** Words: 125 (was 118), about 44 s at Pip's natural pace, now inside the range. L01 is unchanged and still one breath. No "...". The out-of-context read is clean: "he puts a TORCH by my door so nothing SPAWNS" is a game rule, bright. The echo holds: "Then he says, see you TOMORROW." (L06) and "He didn't say, see you TOMORROW." (L15).

**Scores**
| | | why |
|---|---|---|
| Hook | 9 | one picture, a number, one breath |
| Second beat | 7 | L02 widens the picture but raises no stakes |
| Mystery | 8 | one idea per beat; L06 now does two jobs without crowding |
| Twist | 9 | "Something BIG must be COMING" (L04) flips to going; L03's rule now explains the motive |
| Fairness | 9 | rule L03, habit L06/S06, "one LAST night" L07, chest L09, house L11, row L12, all shown before L15 |
| Rewatch | 9 | L01 "Someone", L06 "so nothing SPAWNS", L10 "whatever's COMING" |
| Agency | 7 | "I had to know WHO" plus the chase |
| Character | 7 | narrator only; L08 is the best misdirect |
| Delivery | 8 | 125 words, fits; L14's direction is now wrong (SF1) |
| Visual | 8 | wide by default; S05/S11 and S06/S14 matches |
| Continuity | 7 | S12's arm-only sightline; MF1 |
| Owner fit | 8 | Pip recipe, single speaker, no trip, no "..." |
| Canon | 8 | stands alone; Jonah isn't Milo; the dog is in the background of S01 only |

Against runaway: about equal on rule-to-motive now. The remaining gap is the second beat: runaway raises the stakes at once, while L02 here only repeats the image.

**Must-fixes**
1. S14 (story.json and shots.md) still says "on 'WAVED', swings his arm twice", but L14 no longer says "WAVED". Change it to "after 'ONCE', in the gap before L15, he stands, turns to the kid and swings his arm twice". Fix bible.md line 139 "(and waved)" to match.

**Should-fixes**
1. L14 direction: change "happy to see him" to "happy on 'Jonah', then quieter on 'Every night at ONCE', getting it", because this is the line where the kid understands.
2. Claim `larkfield` (day 4500) in docs/world/map.json before the build. It isn't there yet.
3. L02: "Not one DARK block." could carry stakes instead: "Even the HAY bales. Not one DARK block." is optional. Don't add words elsewhere.
