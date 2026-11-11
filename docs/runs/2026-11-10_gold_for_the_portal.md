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
- 16:05: owner rule "none of these new stories should go out until i've OKed them": the lead set the package back to
  held on `videos` (5de29cb). Main f4c0605 is merged (publish.js packages story_* as held unless the owner OKs one).
  Not re-marked ready.

## vNext previews for the owner's visual audit (20:55-21:35 UTC)
- The story.json hotbar: all 9 slots, 67 eggs (owner). Since main f10c3ae the kit applies it after setup, so the
  stunt keeps only the slot selection (the potion slot in S05, the gold slot from L06).
- Preview 1: the vNext port, recorded against the old voice.json as the timing stand-in. 57.45 s; render/ b6451dd.
- The lead's visual audit (docs/runs/visual_audit_2026-11-10/gold_for_the_portal.md), folded in for preview 2:
  - B1: S01 low on the throw line, with gold and a lantern in frame.
  - B2: S05 framed over the shoulder.
  - B4: the S03 waypoint.
  - F1 (the crane only), F2, F4-F7, F9.
  - Left open: B3 (the GUI scale and the potion tint) goes to the engine agent; F1's landscaping is a world change.
  - 3 recordings. One blocker came up: S07b's re-framing put Grandma off-centre, which the subject check caught.
    Two lint problems also came up. The S01 subject point sat inside the carpet's block. The crane second had
    nobody moving, so Grandma now sways under it.
- Tool fix (main cca4086): `./hb render X --wait` doesn't queue a render. When the recording was newer than the last
  queue, it fetched the old Short (it did that here once). It now refuses and says "./hb render X" first.
- The lead's addendum and the owner's direction, folded in for preview 3 (render/ after 22:10 UTC):
  - B5, gold on screen: a "GOLD SENT: 9,000" sign, 4 ingots in frames beside the portal, a gold step at the
    ladder, a gold-block table and the S01 stack.
  - B6, set-ups: over the shoulder at the barrel, high from the ladder (L08, L10), a low reverse from the portal's
    north side (L08, L11), the middle gift from low at the portal's foot. 22 shots.
  - F1, the pad's cut edges: lib/sets `banks` (opt-in; main 7879439), so the portal cottage meets the hill in
    earth banks and cut slopes, not retaining walls.
  - B3: edit.guiScale 4 and tinted potions (main 1337b60).
- Previews 1 and 2 had the S14 camera inside the narrator's head: the payoff frame was a blur of Steve's skin.
  In the vNext port L11 leaves him at 7.0, 5.5, and s14 stood at 6.9, 5.5. Only the sheet showed it: the lint and
  the subject check passed it, because the subject (the piglin) was 100% seen and the narrator was too close to
  count as an occluder. Moved to 7.65, 5.95.
- A server stall (~1.6 s) at L01's start once froze Grandma and then jumped her 75 degrees, and the lint caught it
  ("nobody moves"). The next recording was clean.
- Voicing: on hold. The owner wants a new brand narrator voice, not the sped-up Orus.

## Voiced, reviewed, packaged held (2026-11-11)
- Narrator: Pip (the owner's final pick), ONE flash-lite request through tts.py `one_take` (main ecab130). Gate OK.
  Grandma recast Gacrux -> Vindemiatrix (owner: "gravelly"), on 3.8-flash-tts with a short bracketed direction.
- Look: { mood: 'bright', rolloff: 0.8 } (owner picked B in the A/B); punches only on L01/L07/L12 (owner: "only the
  big ones").
- Engine/tool fixes on main from this run:
  - one_take (ecab130, 82e11c0); word-to-word gaps between takes (f337f29); look 'bright' + punchStress (6632d43);
  - banks terrain (7879439); ./hb render --wait guard (cca4086);
  - ./hb drift one_take rule (8c94f094): within-take WOBBLE/OFFREF warn, not block.
- Found the hard way: an item or mob inside a Nether portal block is sent to the Nether, and the load stalls the
  server 1.6-2 s (Grandma froze on frame 1, the piglin at the reveal). Throws stop at x 10.8 and vanish on arrival;
  the piglin appears in front of the purple.
- Owner notes on preview_gold_3: all four fixed (no Nico; Grandma recast; BLUE stripe gap 0.58 -> 0.27 s; end sync).
- render/ 2c1b89bf, 50.0 s, CHECK OK, pace 0 blockers; independent review READY.
- Packaged held: videos 26c98040, release pkg-story_gold_for_the_portal (story_gold_for_the_portal.short.1f3a6766fefdb569.mp4).
