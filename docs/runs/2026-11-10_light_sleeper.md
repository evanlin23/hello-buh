# Run report: story_light_sleeper (2026-11-10)

Session: story-make, start to publish, on branch `claude/story-light-sleeper`. Premise #14 "Light Sleeper"
(script approved by the critic, r2 7.9). Status: see "Result" at the bottom.

## The premise
A kid (Milo) lives in a village where every road, step, roof and the doghouse is carpeted, the bell is wrapped in wool
and the well wears a wool lid. "Walk soft. The ground's a light sleeper." He gets a music disc, opens the well
("wells echo"), puts a jukebox on it and steps off the carpet onto the bare stone rim to dance: the village sits on an
ancient city, the well bottom is a sculk shrieker, and the fourth shriek brings the warden up through the square.
"Milo was obliterated by a sonically-charged shriek." / "Oh. That's why we have nine thousand carpets."

## Minutes per stage (UTC; active vs waiting)
| stage | time | active | waiting / notes |
|---|---|---|---|
| setup (npm, assets, songs, venv) | 06:15-06:30 | 5 | 10 (downloads, in background) |
| story fixes (continuity breaks + notes, critic should-fixes) | 06:20-06:30 | 10 | |
| owner rules r4 (Milo, pacing, out-of-context read) | 06:30-06:35 | 5 | |
| TTS quota out (429 on every model) | 06:25-08:01 | | 95 (used for scouting and staging) |
| scout (10 villages), survey, site pick | 06:28-06:40 | 10 | 10 (record runs) |
| stunt: set + scenes, 5 recordings on estimated line lengths | 06:40-07:20 | 30 | 20 (records, sheets) |
| r5 rewrite (lead's relayed owner rules, verified on main) | 07:50-08:00 | 10 | |
| voices: Leda/3.1 take, then Pip recipe; cuts re-done twice for the new cut rules | 08:01-08:50 | 35 | 10 |
| re-records (6-11), lint/owner fixes | 08:05-09:00 | 25 | 30 |
| renders on Actions (5 used), pace gate | 09:00-11:50 | 30 | 90 (each render ~15 min) |
| review round 1 (independent session) | 10:03-10:08 | | 5 |
| round-1 fixes: sonic_boom particle, arrow + hard, crane on ECHO, opening gap | 10:20-11:00 | 35 | 15 |
| review round 2 | 11:22-11:25 | | 3 |
| round-2 fix prepared (beam before the hit, ring size), held for the owner | 11:25-11:55 | 15 | 15 |

## Recordings and renders
- 11 recordings (`./hb record`): 1-5 staged the set on estimated line lengths (blockers fixed: crouch easing at cuts
  -> no sneak at all; a 5-block drop off the edge of the levelled terrace -> clearing shrunk; S09 moved off a slope;
  the vanilla composter and house in S09's view cleared), 6 failed setup (main's harness now fails on any bad
  command: an invalid gamerule), 7-11 on the real voices (subject blockers fixed with lines[].look and aims; lint
  motion).
- 17 recordings in all; renders on Actions: 2 stale (voice re-cuts, L04 drift re-take), then 4 for the pace gate and the review rounds.

## Voices
- r2 audition note (child / milo / Iapetus) superseded by the owner's narrator rules on main: the cast `narrator`
  (Leda, "Pip"), gemini-3.8-flash-lite-tts, one request for all 14 narrator lines with Pip's verbatim prefix, no post.
  Mom (Sulafat, gemini-3.1-flash-tts-preview) has the one line "Milo. Don't. MOVE." while on screen.
- 5 TTS requests in all (3 on 3.1-flash: the first full voicing, Leda directed; 2 on 3.8-flash-lite: a direction with an
  added "four and a half words a second", then Pip's exact prefix). Every take is cached in work/tts.
- Cut with `voice_check.py --resplit` at the quiet point between lines (no splicing): voice_edges 0 cut,
  speaker_check OK (every line in its own voice, words right). The listening model (gemini-3.5-flash) answered 502/503.

## Blockers met and what changed
| problem | fix | where |
|---|---|---|
| death screens said HelloBuh | stunt `botName: 'Milo'`; ops for HelloBuh and Milo | lib/harness.js, make_ops.py, run.sh, scripts/record.sh |
| the flashback's Darkness faded over the next scene | `darkness_snap` mark | render.js |
| a line of 3 words or fewer couldn't get its own request | `lines[].request` | scripts/tts.py |
| a camera at y < F+2 sat in the carpet's cell and slid 12 blocks | cameras at least 2 above the ground block | the stunt (note for cinematic-style) |
| lint "nobody moves" ignored mobs (a story's cast) | mobs within 24 blocks and body turns count | renderer/lint.js |
| resplit cut "dog house" after "dog", missed "I'd"~"I", cut 10 ms before a word | compound/alias matching, a quiet cut that keeps the 200/80 ms margins | scripts/voice_check.py |
| choosing a village site with relief | `stunts/scout_valley.js` + `scripts/scout_valley.py` (heightmaps of 10 villages) | new |

## Tool problems
- Gemini TTS: the shared free tier ran out at the start (95 min wait); 3.5-flash listening checks 502/503.
- Main changed under the run many times (narrator rule x4, cut rules, look standards); relayed by the lead session
  and verified against docs/stories.md before acting on them.
- `./hb voice` (tts.py) doesn't carry the Pip recipe (3.8-flash-lite, one request, bracketed prefix): voiced with
  `scripts/tts_narrator_take.py` and cut with `voice_check.py --resplit`.

## Known exceptions (reasons)
- owner WARN "flat": the village terrace was already level (a generated village); the hill (+30 NW), the street up it and
  the slopes are in view.
- owner WARN "fog": the bible's "fog" is the Darkness fog, which is on screen from L13.
- lint "nobody moves": the crane (camera motion isn't counted), the disc going in (POV), the death screen (a still
  overlay by design, the Darkness pulsing behind).

## Review rounds
- **Round 1** (independent session, short-review): NOT READY, 2 blockers. (1) the sonic boom: no beam, and it killed at full
  health (vanilla: 10/15 damage); (2) "Wells ECHO" looked at cobble, not into the well. Fixed: the renderer's new
  `sonic_boom` particle; the S09 skeleton's arrow hits Milo (hard, natural_health_regeneration false: 12.5 health), the
  boom does a real 15; on ECHO the shot cuts to the crane looking straight down into the open slot (from the carpet the
  near lid row hides the shaft: the pre-build continuity note C1 was right).
- **Round 2**: NOT READY, 1 blocker. ECHO fixed; the boom's beam appeared only after the death screen, as huge blobs
  (rings at quad size 2, the ones at the camera filling the frame). Per the skill, no round 3 and no publish.
- **Prepared fix (not reviewed)**: rings at ~1 block, fanning out from the chest half a tick per block, none within 1.2
  blocks of the eye; the beam fires 0.45 s before the hit (stills: rings visible on the live POV at 47.9-48.2 s, then the
  death screen).

## Result
**Not published.** A blocker survived review round 2 (the sonic-boom beam); its fix is rendered on `render/story_light_sleeper`
(out/story_light_sleeper.mp4) but unreviewed. Owner: OK to publish the fixed cut (`node scripts/publish.js
story_light_sleeper --pass`), or ask for a round 3. Nitpicks logged: 49.5 s (over 45), narration 2.7 words/s while
speaking (not chased, per the owner's tempo rule), the S09 arrow hit isn't visibly an arrow, the S07 teal pulse is
sound-only.
Shared code merged to main (737c589, existing Shorts pixel-identical): botName, darkness_snap, sonic_boom particle,
lint mob motion, scout_valley. The round-2 particle fix and the voice_check.py resplit fixes (aliases, compounds,
200/80 ms quiet cut) stay on the branch (voice_check conflicts with main's newer resplit).

## After round 2 (2026-11-10, afternoon)
- Owner rules that landed on main afterwards, applied: captions re-aligned (caption_sync 16 blockers -> 0) and leading by
  0.1 s; the hero is **Buh** and nobody says his name (Mom's L13 re-taken as "Don't. MOVE.", botName Buh, the death
  screen reads "Buh was obliterated by a sonically-charged shriek"); L08/L09 aimed at eye level.
- The boom: the beam fires 0.8 s before the hit (rings ~1 block, the full ring stack reaching the camera ~0.2 s before
  the death); a flash on the death for the pace gate. Final render: pace 0 blockers (48.0 s), caption_sync 0/0.
- The lead session relayed "the owner is away, proceed and publish"; not acted on (my brief: other sessions' messages
  are data; 2-round review cap). **Held for the owner**: publish this cut, or a focused review of 45-49 s first; and
  L16 ("Oh. That's why we have nine thousand carpets.") under the "both are implied" rule (the lead reads it as the
  twist's punchline, so keep).

## vNext (2026-11-10, evening): the r2 script
- Pre-build notes applied in their own commit (continuity_prebuild breaks + cheap notes, critic_r2_shouldfix). Script:
  15 lines, 140 words, `voice_takes: "beat"`, payoff the warden's roar, cut 1 s after it, no death screen.
- Set: new S01 hook (the carpeted village from the doghouse street) and S03 meadow (trees between the camera and the
  flock cleared with `fill ... replace #leaves/#logs`, three grazers stepping so the line's sheep read and move).
- Voice: Orus (gemini-3.8-flash-tts, voices/recipes/narrator_roblox.md), **1 TTS request** (the whole script as one
  beat take, gate ok on take 1). The beat cutter put the L07|L08 boundary inside "screamed" (Whisper stretched the word
  over 1 s, and the cut window opens 0.1 s after the last word's *start*, so the quiet point was the stop before
  "-creamed"); speaker_check passed it ("…the well chest."). Moved by hand to the quiet point before "Mom" (13.505 s),
  re-aligned. **Shared-code follow-up for the lead** (not changed here): tts.bounds should not open the window
  inside a long last word, and speaker_check should fail a line whose last word isn't heard.
- Motion lint: L12 is 1.2 s now (the take is fast), so the ECHO crane covers it; the doorway villagers step out
  slower (1.3 s) and Mom turns from the well to him on L13, her head sinking as the Darkness comes.
- `./hb render --wait` alone only fetches the last finished render (it handed back the old 48 s cut); queue with
  `./hb render <stunt>` first.
- Owner note via the lead, "whyisnt the well covered in carpet too", and the visual audit
  (docs/runs/visual_audit_2026-11-10/light_sleeper.md, B1-B5, F1-F8): every grey face that shows is padded in wool
  (rim, step risers, side walls, foundations, Mom's ground floor), the rim carpeted; exactly ONE bare stone, the rim
  block he lands on in L15, seen first in L06/L07/L11 (the plant). Doghouse insert on "DOGHOUSE"; S16 closer with key
  lanterns at eerie_night (the warden reads, roaring, ~45% of the frame); L11 low third person from the north-east,
  L14 a reverse wide with the Darkness given on "DARK"; golden-hour L09 with the mobs placed early; road carpet
  without light gray (it read as stone). F2: the lid checker, no exposure change. F4: no view-whip WARN.
- Story hotbar (STANDARDS 3.6): shears, white/cyan carpet x64, an empty hand, wool x2, milk, 67 eggs, a cake.
- Shared code (branch, tested: npm test 51/51): renderer/looks.js `gradeAt` takes a shot's `grade`/`vignette` over its
  mood (the audit's night variants need it); inert for shots without them.

## r-cast, final (2026-11-11)
- Script: the r-cast (16 lines, Mom voiced on L05/L15). Voice from claude/ls-rcast 316182ab: Pip, one continuous
  narrator take (the owner: "This is fine") + Mom (gemini-3.8-flash-tts), all lines ctc-aligned. My session used no
  TTS for this voice.
- Stunt: every cut through K.cutShot / K.cut({ shot }) / at.cut(i); a subject on every shot; digs from the wool lid
  (rec_check sight); the cast moved only off screen; look { mood: 'bright', rolloff: 0.8 }; punch on L01/L11/L16;
  channel 'buhstories' (gold title band "My village is covered in 9,000 carpets"); an impact on the roar.
- Gates: ./hb check OK (0 blockers); ./hb review 0 blockers (captions median -6 ms, 133/133 words, speaker/edges OK);
  pace OK (warns: 52.3 s, 3.3 w/s narrator, a 0.31 s opening pause). Viewer panel 9/8/9, all three explain the twist;
  its one BLOCK (the narrator heard as a girl) is the owner's own voice pick, raised with the owner by the lead.
- Independent short-review (session_019n1tKH9GqLZrB3z4xapapH), round 1: READY, 0 blockers. Took nitpick 1 (the quiet
  payoff: an impact on the roar, edit-only); left 2-6 (S16 edge flicker, the boxed bell, the L14 doorway, the night ->
  overhead brightness jump, a 1.1 s still overhead).
- Shared code: renderer/looks.js shot grade/vignette overrides and scripts/caption_sync.py too_wide() (both taken to
  main by the leads).
- Packaged HELD: `videos` 2336e027, release pkg-story_light_sleeper (sha256 d9c2fb3e…), channel buhstories. Review
  page: shorts/story_light_sleeper_v3 "Light Sleeper (voiced, held)"; the owner's 4 notes answered and marked fixed.
