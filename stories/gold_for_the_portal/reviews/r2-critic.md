# gold_for_the_portal r2: critic

Verdict: **APPROVE** (overall 8.3/10)

## Cold read (unchanged)
Grandma throws gold into a portal every night and gifts come back, so Milo thinks Grandpa is alive and throws in 64 gold to bring him home. A piglin steps out in Grandpa's helmet: Grandpa is dead, and the gifts were its barters.

## Round 1 must-fixes
1. **Requests: fixed.** The split into r1 (L01-L06) and r2 (L07, L09-L11) is correct. The owner's drift rule (2026-11-10: "at most ~6 lines" per request, "identical direction text") outranks my "single request". Both use Leda on `gemini-3.8-flash-lite-tts` with Pip's direction verbatim and identical. Grandma has her own request (r3). Per-line `note`s are not sent. "True story" is gone.
2. **S01 hook: fixed.** The camera is now 4 blocks away, full figure, and the ingot crosses the purple on frame 1.

## Regressions
None blocking. No "..." anywhere. L07's rewrite reads cleanly. The S04 montage (one gift per morning) now matches "One every NIGHT".

## Scores
| | r1 | r2 | why |
|---|---|---|---|
| Hook | 8 | 9 | The ingot reads on frame 1, with the 9,000 over it |
| Second beat | 8 | 8 | "something comes BACK" |
| Mystery | 8 | 8 | One idea per beat |
| Twist | 8 | 8 | L01 flips. Grandma's knowledge still rests on L08 alone |
| Fairness | 8 | 9 | The S09 snort is now audible. The helmet (S06), the gold rule (L05) and the barters (S04, S08) are shown |
| Rewatch | 9 | 9 | L05, L06, L08 |
| Agency | 9 | 9 | Told no, does it anyway |
| Character | 7 | 7 | Grandpa is still a costume |
| Delivery | 7 | 8 | The requests are fixed. 113 words, about 44 s: under the 45 s floor but fine |
| Visual | 7 | 8 | S01 and S04 are fixed. Still cellar-heavy |
| Continuity | 7 | 8 | Trim pinned (sentry/lapis), the slot-1 gold tracked |
| Owner fit | 8 | 8 | Serious and native. It passes the out-of-context read |
| **Average** | 7.9 | **8.3** | |

Against runaway: slightly worse. Runaway's reveal needs nothing off screen. Here, Grandma knowing is told in one line, not shown.

## Must-fixes
None.

## Should-fixes
1. S14 calls the ingot "tonight's ingot", but S09 already threw tonight's. Call it "one more ingot" in the shot, the bible and the ending beats. It matches the loop line.
2. S13: confirm the ladder holds the frame edge on a still before the build. Otherwise use the sound fallback.
3. Ship order against One More Eye: not back to back (producer's call).
