# Run report: Gold for the Portal (story_gold_for_the_portal), 2026-11-10

**Premise** (writers' room, critic r2 8.3/10): every night Grandma throws one gold ingot into the Nether portal in
the cellar, and every morning a gift comes back: obsidian, string, ender pearls, fire resistance (the piglin barter
list). Grandpa went in 25 years ago wearing her gold helmet with the blue stripe. Nico throws in a whole stack to buy
his way home. A piglin steps out, shaking, wearing Grandpa's helmet, and Grandma sends it home with one more ingot.
Branch `claude/story-gold-portal`. Place: `portal_cottage`, day 9300, easter egg `boxed_bell`.

## Minutes per stage (session ~10:40-14:45 UTC)
| stage | active | waiting | notes |
|---|---|---|---|
| set-up (npm ci, jars, assets, TTS venv) | 15 | 10 | a fresh container: no work/, no node_modules, no Whisper/torch |
| site: terrain probe and claim | 20 | 5 | a probe stunt read the ground heights (no survey grid in the container) |
| engine: armour on mobs, trims, shake | 45 | 5 | rule zero: 12 stills from 5 recordings pixel-identical to main |
| voice | 10 | 15 | one take per request, 0 re-takes; speaker_check OK, voice_edges 0 cuts, drift WARN (0 blockers) |
| stunt and recordings | 110 | 45 | 21 recording runs (see below) |
| render (Actions) | 10 | 95 | 4 full renders, 1 edit-only re-edit |
| pace, review (2 rounds), publish | 40 | 30 | |

## Recordings: 26 (the skill's cap is 4)
I went far over the cap. The blockers changed every time, so this was not one blocker surviving. They came in
this order:
1. two crashes: setblock with decimal coordinates, and the wrong `headTo` (the actor one, not the mark);
2. subject checks: the prop coordinates are block coordinates; camera `at` heights were 1 block low (a camera
   inside a carpet slides 2.8 blocks: cinematic-style mistake 20); a block counted as hiding itself (checker fix);
3. an aquifer flooded the flashback cellar through its hatch hole;
4. **the place moved**: the claimed shoulder looked south into a retaining wall (the ground rises south), so it
   went to (-128, 85, -940) on the south-east slope, with the cellar sunk 5 deeper (`shaft`) and the trees below the
   garden cleared (stamp `view`);
5. the lint's "nobody moves" only counted players, but this cast is a villager and a piglin (lint fix: living mobs
   near the set count);
6. pacing (after render 1): 0.85 s in the opening and 7.6 s of gaps from blocking cuts and waits between lines
   (mistake 19: a non-blocking `jump`); Grandma frozen on frame 1 (mistake 21: a 30-tick preroll).
Each recording is ~2.3 min, so it was cheap, but the next story should get the camera heights and the waits right
the first time (now in the skill).

## Renders: 5 (Actions)
1. 57.6 s: pace BLOCKs (a 0.85 s opening pause, the end 3.7 s after the payoff).
2. 53.1 s: the payoff was measured at L11's first word (BLOCK). Set `"payoff": "L11+1.52"` (the word HELMET).
3. The same frames: no picture change within 0.3 s of HELMET (BLOCK). Fixed edit-only: one 0.08 punch-in on HELMET.
4. Re-edit on the reused frames: pace OK. Review round 1: NOT READY, 3 blockers. (a) The barrel screen's title
   read "[object Object]": the harness didn't unwrap NBT text components, and the 1.21.5+ CustomName was written
   as a JSON string. (b) Grandma popped into S14's opening frames. (c) The end ran 1.13 s after the payoff.
5. 53.0 s after 4 more recordings (the fixes, plus two lint/subject flakes): pace 0 blockers, 5 warnings.
   Review round 2: READY.

## Warnings kept, with reasons
- 53 s, over 45 (WARN): 11 lines, 48 s of voice. Cutting a line would cut a clue (each line carries one).
- Narrator 2.35 words/s while speaking (Pip ~4.1): the takes are Pip's recipe verbatim, one take each. Re-voicing
  for speed risks drift and costs quota; speed is not a target (Voice 3).
- The end 1.13 s after HELMET (max 1.0): HELMET is a 0.9 s word and the end keeps 0.2 s after it (Voice 5).
- The same picture for 6.1 s (L05) and 5.5 s (L08-L09): the flashback wide and the POV at the portal. Both have
  movement and a cut inside.
- The build-up sags in the last third (cut rate 4.0 -> 2.3/10 s): the night scene is slower by design. The payoff
  has the sting, the punch and the head turn.

## Review
- `./hb panel`: not run. Every Gemini Flash model returned 429 (the proxy's daily quota). Budget $0, so no paid key.
- short-review (an independent subagent): round 1 NOT READY (the 3 blockers above), round 2 READY. Nitpicks for
  the notes: the fire resistance potions render as untinted bottles (engine: potion item tint), the thrown 64-stack
  is drawn as one ingot (vanilla draws a pile), a blue slab is in the corner of S10's first frames, and Grandma
  stands beside the ladder on "BED" in S12.
- Published `--pass` to `videos` (shorts/story_gold_for_the_portal, 53.0 s, status ready). On the review page as
  "Gold for the Portal" (720x1280 copy).

## Tool problems and changes (all tested; to main)
- engine: armour on mobs (`extra.armor` for every mob, `addMobArmor`), armour trims (`extra.trims` from the trim
  component, paletted textures; build_assets copies `textures/trims`), the converting shake (pose mark
  `converting`), `stunt.selfArmor`, the narrator's own staged poses (`ids: [-1]`), the `flashback` shot mood.
- sets: basement `portal: 'nether'`, `gifts`, `shaft: N`.
- harness: container titles flattened from NBT text components (named containers showed "[object Object]").
- tts.py skips `silent` cast members (the flashback grandpa, the piglin), which used to stop the voice step.
- lint: living mobs within 32 blocks of the set count as acting; scene.occluder: a block never hides itself.
- pose_fixture `--armor`; docs/engine_features.md "Armour on mobs, armour trims, a piglin shaking".
- One More Eye: both are `story_` Shorts, and the uploader never posts the same format twice in a row
  (check_queue `mix_ok`), so they can't be neighbours; One More Eye isn't on `videos` yet either. No queue edit.

## Re-edit after the owner's caption notes (15:00-16:20 UTC)
- The lead held the package on `videos` (a501e91): captions ran early. I merged main's align fix and re-aligned.
  caption_sync still blocked L04: Whisper hears "Twenty-five" as "25", so the chunk match skipped the first word and
  the first caption started 0.36 s late. align.py now starts a line's first chunk at the first word heard (on main).
- Owner rule "both are implied" (STANDARDS 1.3): cut the closing line L11 ("It was wearing Grandpa's HELMET.").
  S14 shows the striped helmet S06b set up, so the Short ends on the picture and the sound. The payoff is the
  piglin turning after Grandma's ingot (`look_at`), with the sting and a punch-in; the end is 0.73 s after it.
- Owner rule "continuous takes" (2b.4): no pause was shortened inside any take, so nothing needed re-taking.
- 0.1 s caption lead (main 44da05a): merged. One full re-render (the merged render code changed the frames).
- pace 0 blockers, caption_sync 0. The reviewer checked the changed span: READY.
- Republished `--pass`: `videos` 602e9e0, status ready. The first publish attempt raced the hold commit on `videos`.
  I reset the worktree to origin/videos and re-ran publish.js (no hand push to `videos`).
