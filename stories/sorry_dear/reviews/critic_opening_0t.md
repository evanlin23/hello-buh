# sorry_dear: the opening (L01, 0-8 s) against 0t/0u/0v/0w/0y (critic, 2026-11-12)

Verdict: **A** (keep the owner-reviewed L01). No blocker in the line. Two must-fixes in the picture, plus S02.

## A against B
| check | A "In my village, every SORRY shrinks you an INCH. My aunt is the size of a MUG." | B "My aunt is the size of a MUG. In my village, every SORRY..." |
|---|---|---|
| 0t key word by 1.8 s | SORRY is word 5, ~1.4-1.6 s if there's no pause after "village". **Pass.** | MUG is word 8, ~2.1-2.3 s. **Fail.** The study's 1.3 s cut needs ~5 words/s, and Pip speaks at ~3. |
| 0t frame 1 a person the rule acts on | the shrunken aunt and the mug, moving | the same |
| 0t cut on the key word | on SORRY, to the stranger, who pops on INCH: the picture shows the rule as it's said | on MUG, to the kid's face |
| 0t stake on a face, 2-4 s | the kid looms over her on MUG (2.8-5.3 s) | the kid looms (2.1-2.8 s) |
| 0t rule on a new person, 4-8 s | **fails as planned**: the kid's face, then the door tilt | passes (strangers at 2.8-5.3 s) |
| 0w opener + a stranger clause | the rule, then a clause that makes it stranger: she's said it ~60 times. **Pass.** | the fact, then the rule, which *explains* it: the first "why?" is answered within 3 s and the real question has to restart |
| 0v absurd, parses | yes: a rule with a number (0u) | yes. "size of a MUG" is the punchier first 2 s, its one edge |
| mystery question | forms once and grows: "why would she keep saying it?" L02 says it out loud | two steps, answer then question: a sag at 3-5 s |

B's only real advantage is 4-8 s, and that is a picture problem. A can take it without touching the line (fix 3).

## Must-fixes
1. **S01 in story.json is still one 1.2-block-out shot over all of L01.** At fov ~70 her face is ~16 % of the width,
   not the 25 % 0t needs, and there's no cut on SORRY. Split it to match plan A:
   - S01a (0-~1.5 s): MCU at her eye level, lens ~0.55 out, face >= 1/4 width, mug beside her; cut on SORRY.
   - S01b (to INCH): the stranger in the lane.
   - S01c (to ~5.3 s): the kid's face looming over her and the mug, on MUG.
   - Add a new `place` (the lane outside the neighbour's cottage, canon Stillwater). `world.where` currently says
     "inside the cottage only".
   - L01 direction: "no pause after 'village'". Measure the take: SORRY's onset must be <= 1.8 s.
2. **The stranger's inch has to be visible.** One inch is ~0.028 blocks, ~6 px at 300 px wide in an MS.
   - Frame S01b as an MCU with the stranger's hat touching a fixed line (a door lintel or the bottom of a hanging
     sign). Show a bloop and a clear gap opening on INCH. That's ~19 px at 300 px, the same trick as S12's sill.
   - Give the stranger a bow as the "sorry" pose. She bows in S03, so the bow becomes the film's visual for "sorry".
3. **S02 (L02) is backstory/layout at 5.3-8 s under 0t:** a slow tilt down an empty wall from a button.
   - Line unchanged. Smallest picture fix: a locked-off wide on the door, button mark in frame, three hard jump cuts
     ~1.2 s apart on "She used to be taller than the DOOR":
     - her on the floor at scale ~1.22, head at the button; she bows, bloop;
     - her at ~0.8, head well under the mark; she bows, bloop;
     - now: on the table, mug-size, looking up at the mark, over "So why won't she STOP saying it?"
   - The fixed door and mark make the scale readable. That puts the rule on a body every ~1.2 s, and the line's
     subject (DOOR, her) stays on screen.
   - The three bloops plant the sound that L10 and L12 pay off. It needs no new asset beyond the entity scale the
     script already needs.

## Should-fix
- Line 1 runs ~5.3 s in both versions (0t's "done by ~2.5 s" is unmet by either). A's first sentence is complete by
  ~2.7 s, which is what 0y's "by 3 s" asks. Accept it.
- Title band: A/B the line-1 band against the study's "Every SORRY shrinks you an inch" (7 words, 0t item 7).
