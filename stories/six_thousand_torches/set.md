# six_thousand_torches: set brief (r2; world pass 2026-11-11)

Inherits stories/nine_thousand_torches/set.md (r2) for the site, the dressing and the scene swaps, with these
changes: **no chat lines and no quit** anywhere (S07 Jonah waves and turns to walk home; S14 he walks away west down
the street); one new view (S14, the kid's POV from (-24, 8) looking west); the door cameras moved into the street east
of the door (S06 about (-15, 9), S13 about (-18, 9), looking west-north-west: a camera due south of the door would be
inside the house across the street); the box widened to ~90 x 90 (one torch per column: 78 x 78 gives only ~4-5k);
the dressing skips the growing row's cells and the door spot; the easter egg is `pip_and_dog` in S04 (world pass
2026-11-11: Larkfield moved to the High Meadow, where the line to the hilltop is clear). Continuity r1, reviews/r1-continuity.md.

## The world (2026-11-11)
- **Site:** `larkfield` on main (bell (-360, 116, -712), box (-405..-316, -757..-668), the High Meadow's north-east
  top, meadow at y 116-119; the box's south-east corner is 16 blocks from the Digger's House footprint: keep the dressing
  inside the box). Build the village from library pieces and write them to map.json `larkfield.pieces` before
  recording (the canon's torches stamp `six_thousand_torches` dresses the box after the pieces, so later stories get
  the same glowing village; it is live from 4501, so on 4500 this story's own dressing keeps its skip list for the growing row and the door spot).
  There's no dark oak on the plateau: the "forest" in S04 is the dark lowland below the rim; the west hills in S05,
  S10 and S14 are the High Meadow's west top.
- **The cameo (S04):** `world.build(ctx, { story: 'six_thousand_torches' })` builds Dog Hill's cameo needs (meadow,
  dog, Pip, patch, hut). S04's POV at bell + (39, 0.81, -44), facing north-east (yaw toward D (-202, 109, -898), about
  40 degrees east of north). Dog Hill is 185 blocks out: set `renderDistance: 14` and a chunk stop / recordRadius that
  holds Dog Hill's chunks. Pip and the dog are 3-4 px at the default FOV, side by side (they overlap from here): one speck, as intended. The line clears the ground by only 0.7-0.8 blocks: pin the POV to the surveyed ground, keep fence posts, lamps and roofs off the sightline at the corner, add the kid's cell (-321, -756) to the dressing skip, pitch the POV ~12 degrees down, and check on a still. Torch Hill's lone torch (-290, -684) is canon: keep it out of the count. Check the west hills (the High Meadow's west top, y 115-123) don't read flat on stills.
- **From Dog Hill (later stories):** the cameo `larkfield_glow` (renderDistance 13+ from the hill, south-west).

## The narration's claims (owner rule: the set matches every claim; check on stills from every shot angle)
| line | claim | what the set must show | check |
|---|---|---|---|
| L01 | "six THOUSAND TORCHES on my VILLAGE" | 6,000-6,300 torches in the village box, the whole village in S01 | `sets.dress.torches` over a ~90 x 90 box (one per column) with the skip list; count logged here and in the recording log; S01 still |
| L02 | "FENCES" | a torch on every fence post in shot | S02 still |
| L02 | "ROOFS" | a torch on every full block of the roof ridges in shot | S02 tilt, S01 |
| L02 | "HAY bales" | a torch on every exposed hay top | S02, S03 bg |
| L02 | "Not ONE DARK block" | block light > 0 on every block in the box in A/C/D; no dark patch in any A/C/D frame except the strip in S11 and the door spot until S13 | light map; stills |
| L03 | "ONE torch LIGHTS a whole HOUSE" | in S03 one torch sharp at lower centre on 'ONE torch', a house beside it, every block of it lit | S03 still |
| L05 | "one PLAYER" | Jonah the only player in every shot | stills |
| L06 | "WALKS me HOME with his TORCH" | S06: Jonah and the kid walk to our door, the torch in Jonah's hand lighting them | S06 frames |
| L08 | "his STUFF in OUR chest" | the chest screen with Jonah's 11 items | S08 frame |
| L10 | "his HOUSE? GONE." | the 9 x 9 coarse-dirt footprint, 81 torches, no trace of the cottage, S05's angle | S10 vs S05 stills |
| L11 | "One ROW of TORCHES was still GROWING" | a single row up the strip; new torches appear at (-19, 10) then (-19, 9) on 'GROWING', Jonah unseen | S11 frames |
| L12 | "to MY door" | the row ends one block short of the door spot; our door centred; Jonah NOT in frame | S12 still |
| L13 | "his LAST torch" | Jonah holds exactly 1 torch, places it on the door spot after 'LAST torch', hand empty after | S13 frames |
| L13 | "NEVER in the DARK" | the kid lit by the new torch, gold sunrise around | S13 still |
| L14 | "He FORGOT to SAY" | no chat, no speech; Jonah walking away west, empty-handed, ~10-14 blocks out at 'TOMORROW' | S14 frames |
| L15 | "I'll ask him WHY... TOMORROW" | the same: Jonah further away (~14-18 blocks), still walking, the chat empty | S14 frames (the shot runs ~2 s longer) |
| (picture) | flashback (B) | **zero** story torches in S05-S07 (the whole-box swap) | a B still per shot |

## Site, library pieces, dressing, scene swaps
As nine_thousand_torches/set.md r2 (Larkfield; the whole-box `/clone` swap A ↔ B at the S04→S05 and S09→S10 cuts;
Jonah's birch cottage in B only; our chest with the 11 items; the growing-row staging), the swap back A at the S07→S08 cut (was S09→S10), and:
- **S06-S07 (B):** Jonah walks the kid home along the path holding a torch (`M.give` 1 torch; held light on); S07 (MS,
  same moment) he swings his arm twice on "See you" and turns toward his cottage on 'TOMORROW', still holding it.
  **Nothing is placed; no chat message, no bot quit.**
- **S12 (D):** Jonah crouches just behind the house-front corner on frame left, out of shot (test the follow's last
  frame); he steps to the doorstep in the cut to S13.
- **S13-S14 (D):** after placing the last torch and waving (S13), Jonah turns west and walks down the main street toward his bare plot
  (`M.walk` / pathfinder along the dirt path, a player's walk, never sprint), 3 blocks from the kid at S14's start, ~10-14
  at L14's 'TOMORROW' and ~14-18 at L15's. Clear the path of anything that would make him swerve.
- **S14 view:** the kid's eye at (-24, 8), turned west along the main street: check the street runs west 20+ blocks
  to the plot's torch square and the west hills fill the end; the sunrise (23720, east) is behind the camera and lights
  Jonah's back.

## What fills each establishing shot out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 | ridge torches and fence posts under the lens | the whole box: thousands of torches, darker path lines | the High Meadow's east rim falling to the dark lowland and the sea, the dawn band (Dog Hill off frame left) |
| S04 | the last torch row | open unlit grass to the plateau's rim | the dark lowland, Dog Hill on the far skyline north-east with Pip and the dog (one speck: the cameo), blue dawn sky |
| S05 | Jonah's garden fence and gate lanterns | Jonah at his gate; two villagers on the street | west hills, golden sky |
| S10 | the torched street fence | the 9 x 9 torch square | west hills (S05's skyline) |
| S14 | the torched street | Jonah walking away west | the plot's torch square, the west hills in sunrise light | Jonah walking away down the torched street | the east edge of the village, the hills, the sunrise glow |

## Engine check (2026-11-11, against renderer/, lib/, render.js, docs/engine_features.md)
| need | status |
|---|---|
| 6,000 torches placed by script, legal spots only | **exists**: `lib/sets/dress.js` `torches()` (sturdy tops and posts, skips paths/farmland/stairs..., returns count and cells) |
| the whole-box `/clone` swap A ↔ B | exists (`/clone`, lib/movie.js helpers); needs `commandModificationBlockLimit` raised (set-up, not engine) |
| Jonah's player name over his head, dim while sneaking; a non-Steve default skin | **exists**: `stunt.playerNames: true` (docs/engine_features.md "Player names"); set it in the stunt |
| the baby villager narrator (`stunt.self` with `extra.baby`) | **exists** (render.js stunt.self `{ model, eye, extra }`, entities.js `poseBaby`) |
| chest screen with contents in POV | exists (edit.py container overlay) |
| sneak, arm swing (wave = two swings), torch held with held light (S06), real placement, walking away | exist (recorded sneak, `M.swing`, `M.give`, `placeBlock`, `M.walk`) |
| held-torch light on Jonah | exists (engine-2 held light) |
| chat lines / quit | **not needed any more** (no chat, no quit in this version) |
| 6,000 block-light emitters render in time | **unverified**: render one S01 frame and time it before recording |
| torch flame and smoke particles | **missing**: renderer/particles.js has no torch flame/smoke. Nice to have for S03, S11, S13 (near torches); bloom carries the far ones. ~1 h, gated |
| Gemini voice for Jonah (cast `friend`, Fenrir, flash-tts) | exists in voices/cast.json; not auditioned on this line (owner picks new casts from an audition, STANDARDS 2.7) |
| the place `larkfield` in docs/world/map.json | **claimed** on main 2026-11-11 (pieces still to add) |
