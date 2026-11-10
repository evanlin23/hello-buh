# Run report: thirty_one_raids (2026-11-10)

**Premise:** Grandpa has saved the village from 31 raids, and every one started the night he came home. His
"courage" is an ominous bottle: he brings every raid himself, because a raid is the only time anyone's glad to see
him. Tonight he's too tired, so Milo drinks it. The horn. "Now they'll love you too, kid."

**Result:** see "Outcome" at the end. First half: built, recorded, rendered, then held when the narrator voice changed
twice (Leda kid, kid Puck) and 3.1-flash ran out of quota. Second half: the owner settled on Pip's voice
(3.8-flash-lite, its own quota), so the narrator was re-voiced in one request, Grandpa moved to 2.5-flash after the
drift gate blocked his 3.1 L09, and the Short was re-recorded, rendered and reviewed.

## Minutes per stage (06:22-08:40 UTC; active / waiting)
| stage | active | waiting | notes |
|---|---|---|---|
| read rules, skill, story; setup (npm, Whisper venv) | 15 | 10 | fresh container |
| story fixes (continuity breaks 1-6, notes 7-13, critic should-fixes) | 12 | | own commit |
| site scout (outposts + villages from the fixed seed; height maps) | 20 | 8 | village (-2128,-480), outpost 210 blocks east |
| stunt (gate, palisade, Grandpa's house + yard, road, fields, watchtower template, cast) | 25 | | |
| recordings 1-5 + `hb check` fixes | 25 | 12 | subject framing, stills, stalls, the S12 superflat moment |
| sheet + preview | 5 | 12 | |
| voice (4 casts, see below) | 30 | 30 | quota reset at 08:00; three rule changes mid-run |
| recordings 6-7, check, render on Actions | 10 | 15 | |
| narrator re-voice to Puck, model tests, hand-off | 20 | | |

## Recordings and renders
- 2 scout recordings, 7 story recordings (`./hb record`). rec_check/`hb check` blockers fixed: palisade logs hiding
  Grandpa (a low parapet by the walkway), a fence post hiding him, Grandpa on the roof eave (`ground()` hit the
  eave: explicit heights near buildings), a market stall under his walk, S12 looking down at flat ground (now looks
  up the road at the tower, then back at Grandpa), off-centre subjects (recomposed every camera), the actors' stillness
  (idle head motion and a dozing nod), raiders unreadable at 13500 (13000, trees out of their sightline, closer).
- 1 Actions render (the picture is final; the audio isn't).

## Voice (TTS requests: 16)
1. Milo (Achird) + Grandpa (Algenib), 3.1: 2 requests (then the narrator-first and kid-narrator rules arrived).
2. Leda kid + Charon, 3.1: 4 + 2 re-takes for pace (the 4.5 w/s target was later dropped).
3. Puck kid (the owner's pick), 3.1: 2 requests (L01-L08); 3.1 then out of quota.
4. Puck on 2.5-flash (3 requests) measured an adult (median 107-133 Hz, drifting lower in n3), and on 3.8-flash (1
   test) an adult (~156 Hz): neither is the approved voice, and the drift rule forbids mixing models within one
   character, so L10-L12 wait for 3.1.
5. Pip (the owner's final pick: Leda, gemini-3.8-flash-lite-tts, the bracketed bubbly-nine-year-old direction): all 11
   narrator lines in ONE request (voices/recipes/pip.md). Grandpa: the drift gate (`./hb drift`) blocked his 3.1 L09
   (WOBBLE); 3.1 and 3.8-lite were out of quota, so both his lines were re-taken on 2.5-flash (`tts.py --relock`), one
   model per character.
- Cutting: main's fixed `voice_check.py --resplit` (quietest point, padding, fades); `voice_edges.py`: 0 cut;
  `speaker_check.py`: OK; `./hb drift`: 0 blockers (6 warnings: L01/L04 off the narrator's reference, slight wobble on
  L01/L05/L08, Grandpa's L13 off his provisional reference). The listening model (gemini-3.5-flash) was rate-limited
  for the final pass.
- Pacing (`./hb pace`): fixed a 0.62 s gap after line 1 (story gap 0.3 -> 0.12 s), named the payoff (story.json
  `payoff`: a mark on the crossbow click on "kid", with a punch-in), split a 5 s static picture in S10 with a cut-in.
  Final: 45.0 s, 0 blockers, 1 warning (a 0.5 s gap after line 1).

## Engine
- Used main's new engine features (agent/ergonomics): Grandpa sits at the table and on the bench (`sit`), the real
  `drink` pose at the gate, and the vanilla chest screen when Milo opens the chest of bottles. All render correctly
  in the Actions render.
- Two Grandpa actors (same skin) take turns between shots, so the next shot's Grandpa is in place before its first
  frame: no pops at cuts. Worth a line in the story kit.

## Tool problems
- tts.py's cache key is the first model's prompt, so a fallback model's take is cached under the same key: a 2.5
  take would be silently reused as "3.1". With the drift rule this needs a model in the key (or no fallback).
- `voice_check.py --resplit` reads voice_cast.py's layout (voices.json + `<req>_take.f32`), but voice_cast.py doesn't
  resolve cast `ref`s: `scripts/voice_bridge_31.py` bridges tts.py to it.
- owner check "subject": a block subject (`block:chest`) is always "hidden behind" itself.
- The per-line `request` routing in tts.py stays on this branch: good_boy's lines already carry `request` fields that
  main's tts.py ignores, so routing by them would regroup a published story's takes (not backwards compatible).
- A test run of `tts.run_story` from a scratch worktree left a stash on the shared repo (its tts.py change only);
  dropping it was declined by the permission classifier, so it's still there (harmless).

## Changed
stories/thirty_one_raids (r3 fixes, r4 narrator-first, voice), stunts/story_thirty_one_raids.js,
stunts/scout_raids.js and scout_site.js (outpost/site scouting), scripts/voice_bridge_31.py, scripts/tts.py (the
per-line request, branch only), docs/stories.md (premise status).

## Outcome
- **Published** 2026-11-10 10:11 UTC: `node scripts/publish.js story_thirty_one_raids --pass` -> videos 2f286e3
  (`shorts/story_thirty_one_raids/short.mp4`, 45.0 s, score "Magistar" added at publish). Render: Actions run
  42792926162. Added to the review page (`shorts/story_thirty_one_raids`). Upload queue untouched.
- **Recordings:** 2 scouts + 14 story recordings. **Renders:** 5 on Actions (the first two with superseded voices).
- **Review:** 1 round (independent session session_019n1tKGLsK5jsUpsgs3hSBJ): READY, 0 blockers. Nitpicks: the
  closed-chest POV shows 3 frames before the chest screen; the S11-S12 sky reads as day before the dusk glow; no raid
  bar or Bad Omen icon (the raid is staged); S05's bread wide is small on a phone; S07's bottle is held low; S09 is soft
  (depth of field); Grandpa's shoulder fills the frame for ~0.3 s as he steps in.
- **Gates at publish:** hb check clean, `./hb pace` 0 blockers (1 warning), voice edges 0 cut, speaker check OK,
  `./hb drift` 0 blockers (6 warnings).
- **Not merged to main:** no shared code needs it. The per-line `request` routing in tts.py was dropped (main's
  tts.py taken in the merge); `scripts/voice_bridge_31.py` and the scout stunts stay on the branch.

## For next time (lessons)
- Voice last: the narrator voice and its rules changed four times in two hours; the picture work survived each
  change, but every voice change cost a re-record and a render. Ask which voice before recording.
- The pace gate needs story.json `payoff` when the twist line isn't the last beat (it guessed L12 here).
- An idle actor between moves reads as "nobody moves" to the lint: give every on-screen actor a gesture on the line.

## Afternoon re-edit (owner notes relayed by the lead, verified on main)
- Captions ran early, then "seem behind": re-aligned with main's align.py (first caption on the speech onset) and
  CAPTION_LEAD 0.1 s; `caption_sync.py` 0 blockers. The hero is Buh again (owner rule a0d24ab): no spoken line or tag
  ever named him; renamed in the story files. Checked STANDARDS 1.3 (the closing line doesn't name what's on screen)
  and 2b.4 (continuous takes: one Pip take, cut only between lines).
- Two more full Actions renders (main's render code changed, so frames weren't reusable): runs 42839469258 and
  42844451555. Independent round-2 review READY, 0 blockers (`hb review` logs it as round 3 because each `hb make`
  opened a round). Republished: videos 3151d6d, status ready. The review-page row is the lead's (v3, "held");
  my 720p copy of the republished cut is asset bf12df755623756842f364f04d0c6804.
- 16:05 UTC: the owner said "none of these new stories should go out until i've OKed them"; the lead set the package
  back to **held** (videos 5de29cb). It waits for the owner's OK; publish.js now packages stories held unless
  --owner-ok (main f4c0605, merged here).

## Evening: vNext, the visual audit, r-cast (17:00-23:00 UTC)
- **Script:** vNext adopted (owner r69e712), then the writers' r-cast (`script_vNext.md`): 11 lines, Grandpa's "Lock the
  DOOR, kid. They're COMING." in his own voice (elder, Charon), a spoken stress per sentence (`lines[].stress`). The
  stunt was restaged twice (vNext, then r-cast order: wall, road/yard, square, table, tower/chest, gate, Grandpa, horn,
  bench, the drink and the reveal).
- **Engine (edit.py, opt-in):** vanilla boss bars from `bossbar` marks (title, progress, colour, overlay); the Raid bar
  fills after the horn. Checked against the vanilla sprites.
- **Visual audit (docs/runs/visual_audit_2026-11-10/thirty_one_raids.md):** all blockers and fixes folded in: the lit
  totem wall + glow frame + a RAIDS WON / 31 sign, S01 recomposed, L10's lanterns and S10/S10b, bread in frame, Grandpa
  bigger in the wides, sitting at the grindstone, no DoF on full shots, the gatehouse, the reveal at 12500 with lantern
  posts (no moon behind the raiders), a camera shot for the reveal (not a second POV), the chest screen open on "A
  whole CHEST" (pre-aimed cut). The owner's hotbar rule (story.json `hotbar`, 67 eggs).
- **Relief:** the set's plain measured 179 x 123 (owner.js `clearingOf`, a real measurement, not a cache): continuous
  natural ridges east/north/west and behind the square, trees and boulders, now 56 x 37 and no superflat warning.
- **Previews for the owner:** three no-voice renders on Actions (render/story_thirty_one_raids, labelled PREVIEW: NO
  VOICE / PLACEHOLDER TIMING); dry runs on placeholder timing (5.25 words/s) with `hb check` 0 blockers each time.
- **Voice (blocked):** the house narrator (Leda, sleepover, 3.8-flash-lite, rubberband 1.1 / +1): 7 takes, Grandpa on
  3.8-flash-tts: 2 takes; then both models' free-tier daily limit (10 requests/day/model). Every take fails the take
  gate's pause limits (0.3-0.7 s sentence breaths against 0.2-0.35 s); asked the lead for the gate/direction call.
- **Tool notes:** a reveal inside a line's `extra` was squeezed to nothing when the picture ran late (now its own fixed
  ticks after the line); `ctx.hotbar` clears and refills all 9 slots over ~1 s (use one `/item replace` mid-story);
  `ground()` must skip slabs (the gate roof); piping `hb record` into `head` kills the recording.
