# lantern_bay r1: response (r2 changes)

Grandma is **Mae** everywhere, and the chest prop is `mae_chest` (the coordinator's rename). The script is now 12 lines,
111 words, ~40-42 s; payoff L12; valid JSON; no ellipses.

## Critic must-fixes
| # | must-fix | change |
|---|---|---|
| 1 | L08 "used to dive" contradicts the deadly deep; nothing plants the gift | New L07: "Grandpa dove to that SHIPWRECK one night, for Grandma's PRESENT. He never came BACK." He went **once**, and the present is planted. The bible explains how: the treasure beside the wreck, and a chest he brought for it, already renamed For Mae. |
| 2 | The reveal doesn't flip L01 | New L12 (payoff): "It said, FOR MAE. That's GRANDMA. He GOT there." The chest proves Grandpa reached the wreck. With the drowned coming he locked her present in a chest with her name on it (carried items despawn, a chest keeps them). "He never came BACK" flips to "He GOT there", and the road she built leads to that proof. |
| 3 | Why bring a nine-year-old to the step she sprints from? | L08: Grandma said, "LAST one. Come SEE." Tonight the road arrives and she wants him to see what's at the end. S09: she's calm. S11: Grandma calm beside #300, the bow dim but visible at the edge of the light, no drowned within 15 blocks (two far beyond the wreck). beats.md "Why?" has the answer. |
| 4 | "SPRINTS" has no cause | S03b: when the new lantern's light lands, a drowned at its edge turns and swims at her with its trident, and she sprint-swims home out of frame left. It is on screen by ~8 s. |
| 5 | L01 in one breath; stakes by 8 s (merge L02-L03) | L01: "There are THREE HUNDRED lanterns on the bottom of our BAY." (11 words). L02: "Grandma thinks I'm ASLEEP. Every NIGHT she swims to the END, puts ONE more, and SPRINTS home." over S02, then S03b with the drowned (stakes at ~7-9 s). |
| should | Bigger MAE sign; L12 bright; check the chest GUI | A big glow-ink sign: 2 blocks from the eye in S04 and 1.5 blocks in S08 (a second sign if needed). L12 is directed "bright, the realization lands big and happy". set.md adds a "check it renders" row for the chest GUI. |
| extra | Make the light rule distinct from "torches stop spawns" | The light is now a **road across deadly water**: Grandma's "It's a ROAD", the drowned charging at the edge in S03b, the empty lit road between black walls in S07, and the "why?" answer in beats.md (the only lit way across the deep, and it can only grow at its end). |

## Continuity must-fixes
| # | break | change |
|---|---|---|
| 1 | The wreck was already lit; light in water drops 1 a block | The bible's rule now says light drops 1 a block in water, so a lantern reaches 14 blocks (the 13-deep column is still fully lit). The row is now `line_end_wreck`: #300 at x -618, the bow at x -630 (12 past #300, light 3: a dim hull), the chest 4 aft of the bow (light 0 until #301), drowned 15+ blocks past #300. |
| 2 | S01: Grandma under the lens | The crane ends 12 blocks behind her, 6 up, pitched down 25°; she walks out onto the T-head ahead of the lens. |
| 3 | S02: Grandma a speck | Over Milo's shoulder at the window, FOV 30; Grandma steps off the T-head. |
| 4 | The lighthouse is out of frame | The headland moves to about (-80,-20), ~18° right of due west from the T-head: frame right in every westward shot. |
| 5 | S03b: north-facing camera puts the sea frame left | The camera now looks south: the sea is frame right, home frame left. |
| 6 | S11: "points past him" points home | She points over her own shoulder, west, at the bow. |
| 7 | S10: dock and cottage behind the camera | The T-head and its lamp are at the bottom edge on frame 1; the background is the glow ahead, the moon and the lighthouse. |
| 8 | S05 to S06 is a same-size jump cut | One POV shot (S05) across L04-L05, pushing in on "TRIDENTS". S06 is cut. |
| notes | far-end coordinates; prop split; moon; nitwit; line end; sizes; breath; places; sides; hand | Far end built x -570..-650. Props `line_end` (#300) and `lantern_301`. Night is 20500 (the moon low in the west, in frame). The nitwit stands on a 1-deep rock at (-34,-12). The near-end line runs to x -200 (or `fogSea`). S07 is WS and S03b FS. The breath bar is set with marks. `cottage_upstairs` becomes `cottage` (one room, the bed under the west window), and `bay_surface` has a bible row. S09 sides: Grandma frame left, Milo frame right. Grandma's hand is empty in S10-S11. |

## Owner rule for every story tonight (voice drift + Pip's recipe)
- Narrator lines are in two single-speaker requests (r1: L01-L06, r2: L07-L09, L11, L12). Both use
  `gemini-3.8-flash-lite-tts`, Leda, and the recipe's direction verbatim, identical in both:
  `[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery, breathy or soft]`.
- Grandma has her own request (r3: L10), Gacrux, on the same model.
- No "true story" phrasing in any direction or line.
