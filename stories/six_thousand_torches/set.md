# six_thousand_torches: set brief (r1)

Inherits stories/nine_thousand_torches/set.md (r2) for the site, the dressing and the scene swaps, with these
changes: **no chat lines and no quit** anywhere (S07 Jonah waves and turns to walk home; S16 he walks away east down
the street); one new view (S16, from beside our door looking east); shot numbers moved by one from S07 on.

## The narration's claims (owner rule: the set matches every claim; check on stills from every shot angle)
| line | claim | what the set must show | check |
|---|---|---|---|
| L01 | "six THOUSAND TORCHES on my VILLAGE" | 6,000-6,300 torches placed in the village box, all of the village in S01 | `sets.dress.torches` count logged in the recording log and here; S01 still |
| L02 | "FENCES" | a torch on every fence post in S02 (and every fence in any A/C/D shot) | S02 still |
| L02 | "ROOFS" | a torch on every full block of the roof ridges in shot (stairs can't take one: the ridge's full blocks do) | S02 tilt still, S01 |
| L02 | "HAY bales" | a torch on every exposed hay top | S02, S03 bg |
| L02 | "Not ONE DARK block" | block light > 0 on every block in the box in A/C/D; paths and farmland (no torch possible) lit by neighbours; no unlit dark patch in any A/C/D frame except the strip in S13 and the door spot until S15 | light map over the box; stills |
| L03 | "ONE torch lights a YARD" | in S03 one torch sharp at lower centre on 'ONE torch' | S03 still |
| L05 | "one PLAYER" | Jonah the only player in every shot | stills |
| L06 | "a TORCH by my DOOR" | S06: Jonah places one torch on the door spot, our door in frame | S06 still |
| L06 | "never in the DARK" | the kid lit by that torch at sunset | S06 still |
| L10 | "his STUFF in OUR chest" | the chest screen with Jonah's 11 items | S10 frame |
| L12 | "his HOUSE? GONE. Just TORCHES." | the 9 x 9 coarse-dirt footprint, 81 torches, no trace of the cottage, S05's angle | S12 vs S05 stills |
| L13 | "One ROW was still GROWING" | a single torch row up the strip, a new torch placed round the corner on 'GROWING' | S13 frames |
| L14 | "to MY door" | the row ends one block short of the door spot; our door centred | S14 still |
| L15 | "ONE torch LEFT" | Jonah holds exactly 1 torch (`/item replace ... torch 1`), places it after 'LEFT', hand empty after | S15 frames |
| L16 | "he didn't SAY" | no chat, no speech, Jonah walking away, the last torch in fg | S16 frames |
| (picture) | the village's own lamp posts and wall torches | kept as generated in all scenes | |
| (picture) | flashback (B) | **zero** story torches in S05-S09 (the whole-box swap) | a B still per shot |

## Site, library pieces, dressing, scene swaps
As nine_thousand_torches/set.md r2 (Larkfield; the whole-box `/clone` swap A ↔ B at the S04→S05 and S09→S10 cuts;
Jonah's birch cottage in B only; our chest with the 11 items; the growing-row staging), with:
- **S06-S07 (B):** Jonah places the nightly torch on 'TORCH', stands; S07 (MS, same moment) he swings his arm twice on
  "See you" and turns toward his cottage on 'TOMORROW'. **No chat message, no bot quit.** At the S07→S08 cut, remove
  the S06 torch from the door spot.
- **S15-S16 (D):** after placing the last torch and waving (S15), Jonah turns east and walks down the main street
  (`M.walk` / pathfinder along the dirt path, a player's walk, never sprint), 3 blocks from the kid at S16's start, ~8
  at 'TOMORROW'. Clear the path east of anything that would make him swerve.
- **S16 view:** camera at the kid's eye beside our door looking east along the main street: check the street runs east
  for 25+ blocks of torch-lit village and the east hills fill the end (sunrise just off frame right). If the placed
  village's main street doesn't run east from our door, pick our house so that it does (or walk him down whichever
  street does, and re-aim S16).
- The sun: S16 at 23720 looks east. Keep the sun's disc just off frame right (yaw a few degrees north of east) so the
  bloom doesn't wash Jonah out.

## What fills each establishing shot out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 | ridge torches and fence posts under the lens | the whole box: thousands of torches, darker path lines | the forest ring, east hills, dawn band, Dog Hill speck at frame right |
| S04 | the last torch row | open unlit grass | the dark oak forest, hills, blue dawn sky |
| S05 | Jonah's garden fence and gate lanterns | Jonah at his gate; two villagers on the street | west hills, golden sky |
| S12 | the torched street fence | the 9 x 9 torch square | west hills (S05's skyline) |
| S16 | the last torch by our door | Jonah walking away down the torched street | the east edge of the village, the hills, the sunrise glow |

## Engine check (2026-11-11, against renderer/, lib/, render.js, docs/engine_features.md)
| need | status |
|---|---|
| 6,000 torches placed by script, legal spots only | **exists**: `lib/sets/dress.js` `torches()` (sturdy tops and posts, skips paths/farmland/stairs..., returns count and cells) |
| the whole-box `/clone` swap A ↔ B | exists (`/clone`, lib/movie.js helpers); needs `commandModificationBlockLimit` raised (set-up, not engine) |
| Jonah's player name over his head, dim while sneaking | **exists**: `stunt.playerNames: true` (docs/engine_features.md "Player names"); set it in the stunt |
| the baby villager narrator (`stunt.self` with `extra.baby`) | **exists** (render.js stunt.self `{ model, eye, extra }`, entities.js `poseBaby`) |
| chest screen with contents in POV | exists (edit.py container overlay) |
| sneak, arm swing (wave = two swings), torch held, real placement, walking away | exist (recorded sneak, `M.swing`, `M.give`, `placeBlock`, `M.walk`) |
| held-torch light on Jonah | exists (engine-2 held light) |
| chat lines / quit | **not needed any more** (no chat, no quit in this version) |
| 6,000 block-light emitters render in time | **unverified**: render one S01 frame and time it before recording |
| torch flame and smoke particles | **missing**: renderer/particles.js has no torch flame/smoke. Nice to have for S03, S06, S15, S16 (near torches); bloom carries the far ones. ~1 h, gated |
| Gemini voice for Jonah (cast `friend`, Fenrir, flash-tts) | exists in voices/cast.json; not auditioned on this line (owner picks new casts from an audition, STANDARDS 2.7) |
| the place `larkfield` in docs/world/map.json | **missing**: never claimed (claim commit before building) |
