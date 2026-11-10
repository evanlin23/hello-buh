# goat_horn r1: writer's response (r2)

Every must-fix from r1-critic.md and r1-continuity.md, plus the cheap should-fixes and tonight's voice rule. The
script is now 120 words, about 41 s of speech and about 42 s with the hold.

## Critic must-fixes
| # | fix | change |
|---|---|---|
| 1 | L03 gives the plan away | L03 is now "He tries / to DODGE. / Too SLOW." The oak is in the picture only (S01-S03, one block behind Dad). Players now get ahead at L05 (38%), not 18%. |
| 2 | L07 must set up that it's for the kid | L07 is now "Dad said / he can't go / till he gets me / ONE thing. / I figured / he meant a WIN." The misread changes from "REVENGE" to "a WIN". |
| 3 | L12-L13 must explain the ending | L12 is now "It was / for ME. / To CALL him." L13 is now "I BLASTED it. / Down the ROAD, / Dad turned / and WAVED." (payoff L13). A new shot, S12b, shows the blast before S13 cuts to Dad. |
| 4 | the goat model is unproven | set.md, Staging notes: build the goat model first and prove it on `scripts/pose_fixture.js` with `HasRightHorn:0b` at 300 px before any recording. The engine-needs table keeps the estimate (~1.5 h model, ~45 min ram). |

## Critic should-fixes
- **213 everywhere:** L01 now says "213 TIMES" and the caption "213 losses". The bible's numbers section shows S01 as
  the 212th knock and S03 as the 213th (Dad's L04). L10 says "213 TIMES".
- **Why the kid can dodge:** L10 is now "I'd watched / 213 TIMES. / It dropped / its HEAD. / I STEPPED." S10 shows the
  goat standing on "213 TIMES" and holds the head-drop for ~0.8 s.
- **Trims:** "Old" (L05), "Right" (L11), "far" (L06), "Way" (L13), "FOR him" (L09) and "once" (L05) are gone. The
  total is 120 words.

## Continuity breaks
| # | break | change |
|---|---|---|
| 1 | `look` fields | L09 and L12 now use `actor:HelloBuh`. L05 uses `entity:villager` (Ida) plus `prop:ida_horn`. L06 is `entity:donkey` only (the mine look is dropped). |
| 2 | S03's tell is off-frame | `goat_spot` is now (1.6,0,-5). The S03 and S11 camera is at (-5.65,1.6,-1.5). The boulder is at (-2,-3). |
| 3 | BONK misses the trunk | The ram line is now x 1.6 (the goat's body x 1.15..2.05 meets the trunk at x 0..2). Dad's launch veers south-east past the trunk's corner and lands at (4,-28,9). S10's step goes to (2.6,0,-1). |
| 4 | wrong horn | The goat loses its RIGHT horn (the near side to the S11 camera): `HasRightHorn:0b`. |
| 5 | Milo in S12 | After S11b, Milo is at (3.3,0,1.4) at the lip facing south, with the oak behind him (bible cast row, props). |
| 6 | S06 can't be framed | The camera is at (-44,-21,19), aimed between the gate and the mine, with no Milo on the doorstep. S06, S08 and S13 render at 16 chunks. |
| 7 | S07: the cliff is behind Dad | S07 is now an over-the-shoulder shot from behind Dad's right shoulder, looking north-east at the cliff and the oak. |
| 8 | S04 shows Dad's back | The camera is now low, north-east of Dad, looking south-west at his face. |
| 9 | S13: the oak is off-axis | The camera is at (107,-18,75), on the line from the oak through Dad (100,-20,70). The road and a lamp at (104,-19,73) run along that line. |
| 10 | S05 has no wide | S05 now opens wide, 12 blocks east of Ida's door, and pushes to full. S06 is now `ews`. |
| 11 | S01/S02 splash twice | S01 launches on "CLIFF" with no splash. S02 splashes on "LAKE". |
| 12 | S09's crane passes through things | S09 is now a straight crane up behind the goat, from (1.6,1,-8) to 6 blocks up, clear of the canopy and the actors. |
| 13 | S02 is unplaced | The camera is at (-18,-27,16), aimed at the landing (4,-28,9). The nitwit is at (-12,-28,11), 6 blocks from the lens. No swim is shown (the tilt goes up the stairs). |

## Continuity notes
- **212 vs 213:** fixed (see above).
- **S10's trunk is behind the POV:** the frame now says so (no trunk in frame).
- **S05 looks west:** the frame no longer mentions the lake or the sun ahead. The sun is behind the camera.
- **The item frame:** moved to x -51 (on the front wall).
- **S08:** Dad and the donkey are 30-40 blocks from the camera.
- **The road:** it leaves our gate south-east to the south shore (bible, set.md).
- **S02's swim:** cut.

## Voice (tonight's rule for every story)
- All twelve narrator lines are in two single-speaker requests (r1 L01-L03 and L05-L07, r2 L08-L13). Each is on
  `gemini-3.8-flash-lite-tts` with Leda and the exact bracketed direction from voices/recipes/pip.md, identical in both.
  No extra scene text.
- Dad (`smith`) has his own request (r3, L04), on one model for the whole story.
- No "true story" framing anywhere, and no ellipses.
