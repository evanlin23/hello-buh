# Run report: thirty_one_raids (2026-11-10, run 1): built, recorded, rendered; held for 3 narrator lines

**Premise:** Grandpa has saved the village from 31 raids, and every one started the night he came home. His
"courage" is an ominous bottle: he brings every raid himself, because a raid is the only time anyone's glad to see
him. Tonight he's too tired, so Milo drinks it. The horn. "Now they'll love you too, kid."

**Result:** not published. The Short is built, `hb check` is clean, and Actions rendered it (45.5 s, 1080x1920,
run 42781096996), but that render has the morning's narrator (Leda), which the owner rejected during this run
("so high pitched and annoying"). The approved narrator (kid Puck) exists only on gemini-3.1-flash-tts, whose shared
daily quota ran out with L01-L08 and Grandpa voiced. L10-L12 need one 3.1 request: `stories/thirty_one_raids/NEXT.md`
has the exact steps (~45 min).

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

## Voice (TTS requests: 14)
1. Milo (Achird) + Grandpa (Algenib), 3.1: 2 requests (then the narrator-first and kid-narrator rules arrived).
2. Leda kid + Charon, 3.1: 4 + 2 re-takes for pace (the 4.5 w/s target was later dropped).
3. Puck kid (the owner's pick), 3.1: 2 requests (L01-L08); 3.1 then out of quota.
4. Puck on 2.5-flash (3 requests) measured an adult (median 107-133 Hz, drifting lower in n3), and on 3.8-flash (1
   test) an adult (~156 Hz): neither is the approved voice, and the drift rule forbids mixing models within one
   character, so L10-L12 wait for 3.1.
- Cutting: main's fixed `voice_check.py --resplit` (quietest point, padding, fades); `voice_edges.py`: 0 cut.

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
stories/thirty_one_raids (r3 fixes, r4 narrator-first, voice, NEXT.md), stunts/story_thirty_one_raids.js,
stunts/scout_raids.js and scout_site.js (outpost/site scouting), scripts/voice_bridge_31.py, scripts/tts.py (the
per-line request, branch only), docs/stories.md (premise status).
