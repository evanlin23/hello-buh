# thirty_one_raids: what's left (2026-11-10, end of run 1)

Everything is built, recorded (hb check clean) and rendered once on Actions; the picture is done. **Only the narrator's
last three lines (L10-L12) are missing in the approved voice**, because gemini-3.1-flash-tts-preview's shared daily quota
(10 requests) ran out. The owner's kid narrator (cast `narrator`, Puck, "kid puck is fine") is only that voice on 3.1
(~230 Hz). On 2.5-flash and 3.8-flash, Puck comes out as an adult man (~110-156 Hz, tested and measured), and the
drift rule forbids mixing models within one character. L01-L08 and Grandpa (L09, L13) are on 3.1 already.

## Finish (about 45 min, after 08:00 UTC when the quota resets)
1. Put the raw 3.1 takes back where the tools look for them (the .f32 files are gitignored):
   `for r in n1 n2 g1; do ffmpeg -v error -y -i stories/thirty_one_raids/voice/raw/${r}_take.wav -ac 1 -ar 24000 -f f32le stories/thirty_one_raids/voice/${r}_take.f32; done`
   and into tts.py's cache under their prompt hashes (so step 2 asks only for n3; the hashes hold while story.json's
   requests, lines and directions are unchanged):
   `mkdir -p work/tts && cp stories/thirty_one_raids/voice/raw/n1_take.wav work/tts/a0ae16e45edcf65c.wav && cp stories/thirty_one_raids/voice/raw/n2_take.wav work/tts/4576538907d654f2.wav && cp stories/thirty_one_raids/voice/raw/g1_take.wav work/tts/e7b9b5a439c61514.wav`
2. Voice n3 (L10-L12) on 3.1 only, Puck, with the same scene text as n1/n2 (story.json `requests`, identical): use the
   bridge in the run report (tts.py with `MODELS = ['gemini-3.1-flash-tts-preview']`, raw take saved as
   `voice/n3_take.f32`, and an `n3` entry added to `voices.json`): `python3 scripts/voice_bridge_31.py stories/thirty_one_raids`
   (it should print 1 request, 3 cached). Don't let it fall back to 2.5 on a 429: wait.
3. `~/.hb-tts/bin/python scripts/voice_check.py stories/thirty_one_raids --resplit`, then
   `python3 scripts/voice_edges.py stories/thirty_one_raids` (0 CUT), `voice_check.py` (transcripts, pitch), a
   listening pass, `voice_check.py --words` and `python3 scripts/voice_cast.py stories/thirty_one_raids --timing`.
   Run `scripts/voice_drift.py` if it's on main by then.
4. `./hb record story_thirty_one_raids`, `./hb check` (it was clean on these line lengths +-1 s), `./hb render`, `--wait`.
5. short-review (independent session), `./hb pace`, publish with `node scripts/publish.js story_thirty_one_raids --pass`,
   add it to the review page, and mark the premise `made` in docs/stories.md.

## Known nitpicks to carry
- L01 may say "Grandpa's saved" (listening checks disagree: "Grandpa saved" / "always saved"); the meaning holds.
- L13 starts with an ad-libbed "And" ("And now they'll love you too, kid"); the cutter never splices it out. Re-take
  g1 on 3.1 if a quota request is spare.
- The village's own ground is gently rolling plains (sd 3.4); rec_check's set-level "flat plain" warning is about the
  natural village, not a cleared set (the hill/plateau, trees, fields, palisade and tower fill the views).
