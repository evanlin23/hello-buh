# slow_falling: response to the r1 reviews (r2)

The script is now 116 spoken words, about 41 s. It has no ellipses, and story.json is valid JSON.

## Critic must-fixes
| # | must-fix | change |
|---|---|---|
| 1 | S01: no drink, no bottle; the bottle first appears in S03; faint swirls in S02 | S01: Grandma steps off with empty hands. The juice is first seen in S03's handover. S02's follow camera is 7 blocks out, so the swirls stay faint. |
| 2 | L07: the stolen tea can't be luck | L07 is now "On my BIRTHDAY, he fell asleep at the tea machine. I took ONE. For MY trip." He copies Grandma's "juice for the trip" on purpose. |
| 3 | L09: why ride up if it only goes up? | L09 is now "Wait. I'm not LIGHT. It only goes UP." He planned to float like her, and only at the top sees the hole in the plan. |
| 4 | L13, plus a bottle by Grandpa in S13 | L13 is now "Nope. Grandpa BREWED her wings. Eleven thousand TIMES." In S13 Grandpa holds tomorrow's peach potion on his knee. A bottle can't stand on a bench in vanilla; in the hand it renders. |
| 5 | The step position | The step moves onto a 3-block jetty: (-2,24,1), landing (-2,0,1), 2 blocks west of the cliff face. This is the critic's position, and it also meets continuity's need (west of the wall and the glass, over the paving). Updated in props, the bible, set.md and the shots. |

## Continuity must-fixes
| # | break | change |
|---|---|---|
| 1 | The step was over the cliff | See critic #5. `props.step` is [-2,24,1] and `props.market_below` is [-2,0,1]. |
| 2 | Three different fall rates | Vanilla numbers: gravity drops to 0.01 per tick while falling, with 0.98 drag, so the top speed is 0.49 blocks/tick (9.8 blocks/s). minecraft.wiki/w/Slow_Falling gives "a terminal velocity of 9.8 m/s". Simulated, the 23-block drop takes 4.4 s (88 ticks); the table is in the bible under World. Scene A: she steps on "WINDMILL" and lands on "Not one SCRATCH". Scene C: she drinks on L10 and steps on "we stepped"; he drinks on L11 and steps 0.5 s later on "OFF", which keeps them about 2 blocks apart. L12 plays 1.1-2.4 s into her fall. She touches down on "Eleven thousand", he lands 0.5 s later, and the cut comes 0.5 s after "TIMES". The timing is also in story.json `timing`. Replay the recorded real curve. |
| 3 | S12 framing | Camera 7 blocks out, FOV 50, size full, the gap 2 blocks, both seen head to foot. |
| 4 | The bench was 8 blocks from the column | The bench is now at (-22,0,6), 24 blocks out. S05 is wide at FOV 60, which also fixes the full-to-full cut after S04. S13 is shot 25 blocks from the column. S03 moves to 10 blocks out with the column running out of the top of the frame (S04's crane shows the top). |
| 5 | S09-S10 positions | S09: Milo at (1,24,-1), looking north-west, with Grandma off frame left. S10: he turns south-west onto the jetty, 2.5 blocks behind her. She faces west, her back to him. |
| 6 | Screen direction | In S02 and S12 the column is at frame LEFT of her. Fixed in the bible, shots.md and both shots' frames. |
| 7 | L06 look on "night" | Changed to "TEA". |
| 7 | `props.fountain` | Now [1,11,0]. |
| 7 | Night shots | S06 and S07 have `look: {time: 18000}`. |
| 7 | Natural ground | S02, S04, S10 and S12 now name the valley, the grove, or the grass along the cliff top. |
| note | The bottle vanishes between S01 and S02 | There's no bottle in S01 any more. |
| note | Drink 1.6 s against L11 | He drinks over L11's first phrase and steps after the effect icon appears. |
| note | Hatch light | S06 now says "the hatch a dark square above", matching the bible. |
| note | Build order and glass | The column is built after the windmill piece, with glass on x 2 above y 18 (set.md). |

## Should-fixes taken
- **L02 stakes:** L02 is now "Twenty-three BLOCKS. Not one SCRATCH. Grandma said, 'I'm light as a FEATHER.'" L06 and L08 were trimmed to stay in budget.
- **The cellar read as moonshine:** it's now dressed as a potion lab. A lit brewing stand with three peach potions stands on a stone table, with potions in item frames, bookshelves and a cauldron. The basement's barrels are moved out of frame.
- **"drank MINE and stepped off" read as a kid copying a jump:** L11 is now "So I drank MINE, and we stepped OFF." It's bright, says "we", and the effect icon is on screen before the step.
- **S08:** Grandpa is on screen at the bread stall, talking to the baker with his back to the column.

## Not taken
- **Too close to thirty_one_raids** (a grandpa, a secret bottle, a nightly ritual). The engine is different (an up-only bubble column and slow falling), and so is the twist shape (a gift she doesn't know about, not a loss). The lead decides.

## Voice (the must-fix for every story tonight)
- r1 holds narrator lines L01-L06 and r2 holds L07-L11 and L13. Both are single-speaker Leda on `gemini-3.8-flash-lite-tts`, with the exact direction from voices/recipes/pip.md, identical in both.
- r3 holds Grandma's L12 alone (Gacrux, same model).
- The phrase the owner banned for directions appears nowhere.

## r2 fixes (from reviews/r2-critic.md)
| fix | change |
|---|---|
| L11 look word "TOO" isn't in the line | Now `word: "OFF"`. |
| L09 looked down on "UP" | Two looks: the market on "LIGHT", then `prop:fountain` on "UP" (the view drops into the glass column at the rising bubbles). S09's frame says so. |
| The step distance in S01 didn't match the bible | S01 (story.json and shots.md) now says 2 blocks west of the cliff face, matching the bible, the props and set.md. |
| L01 says "jumped" but S01 showed a step-off | Grandma hops off the jetty end on "jumped". It's a vanilla jump: about 1.25 blocks up, then slow falling. The scene A timing is retimed to a landing about 4.8 s after the hop, on "Not one SCRATCH", in the bible, `timing` and beats. Scene C stays a step-off, as its lines say. |
| r2-continuity.md | Not written yet when this round finished, so none of its blockers are applied. |

## r2 polish (from reviews/r2-continuity.md, verdict clear)
| note | change |
|---|---|
| The scene A hop takes 4.55 s, not 4.8 s | Changed to 91 ticks = 4.55 s in story.json `timing`, the bible and beats. She still lands on "Not one SCRATCH" (~1.3 s into L02). |
| The gap numbers, and him landing on her | The vertical gap is now 1.4 / 2.5 / 2.8 blocks at 1.1 / 2 / 2.4 s, and 4.0 at her touchdown. He walks off the jetty end and carries about 1 block further west, staying at least 0.6 blocks apart sideways. He lands at about (-3,0,1). Updated in story.json (S11, S12, S13, props, timing), the bible, set.md and beats. |
| S10 distance | He is now at (1,24,1) on the balcony edge, 2.5 blocks behind her, so she is head to foot in frame. |
| The bible and shots.md were behind story.json | shots.md rows now carry story.json's camera and frame text. The bible says the hop happens on "jumped" and gives the new positions. Its instruction stays: record the real drops on the server first and retime from them. That instruction is also in story.json `timing.record_first`. |
