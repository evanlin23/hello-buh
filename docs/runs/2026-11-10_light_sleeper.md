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
| render on Actions, review, publish | 09:00- | | |

## Recordings and renders
- 11 recordings (`./hb record`): 1-5 staged the set on estimated line lengths (blockers fixed: crouch easing at cuts
  -> no sneak at all; a 5-block drop off the edge of the levelled terrace -> clearing shrunk; S09 moved off a slope;
  the vanilla composter and house in S09's view cleared), 6 failed setup (main's harness now fails on any bad
  command: an invalid gamerule), 7-11 on the real voices (subject blockers fixed with lines[].look and aims; lint
  motion).
- Renders on Actions: 1 stale (old voice cuts, superseded the same hour), then the final.

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

## Result
(filled in at the end)
