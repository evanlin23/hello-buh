# Cinematic scenes from existing recordings (scripts/cinematic.py)

Owner, 2026-11-10: "can we render a super cinematic scene". THE KEEP (`episodes/keep/scene.json`) re-shoots the
published lapse_castle recording: no server, no new recording.

```bash
python3 scripts/cinematic.py episodes/keep/scene.json --sheet --at 0.1,0.5,0.9   # stills of every clip (~3 min a clip)
python3 scripts/cinematic.py episodes/keep/scene.json --sheet --only gold --portrait
# full render on Actions (.github/workflows/render-cinematic.yml): 12 slices x 2 cuts, then the score and the title
echo '{"scene": "episodes/keep/scene.json", "portrait": true}' > renders/cine_job.json && git commit -am queue && git push
gh run download <run> -n film -n vertical
```

A scene is a list of clips. Each clip is a window of the recording (`t0` seconds) played at `rate` recording seconds per
screen second (0.06 = near-frozen, 8.5 = a time-lapse), one render.js camera spec (`shot`; `path`/`lookPath` keys and
`degPerSec` in screen seconds), an hour (`day`: a dayTime or `[[sec, dayTime], ...]`, a time mark every frame), a `look`
merged over the stunt module's (stunts/cinematic_keep.js) and an optional `fogSea`. `drop` removes block changes (the
recording's small builds), the recording bot is parked under the world, `xfade` dissolves into a clip, `title` and
`cues` place the card and the score's sections. The vertical cut (`--portrait`) widens each lens by 1.55 (or `vfov`)
and drops the letterbox.

Renderer changes it needed: a time change only re-meshes when the sky darkening changes (`DAY_LIGHT_STEP`, 0.025 here,
rounds it at dawn and dusk), the grade clamps before its S-curve (blown skies near the sun went cyan), and
`look.reflect.ice: false` mirrors water only (grass level with the plane mirrored the whole courtyard).

Costs: each render.js call meshes the world (~25 s) and walks to its frames; a dusk clip re-meshes a few times
(~20-50 s each). On Actions the 16:9 film's slices took 4-16 minutes each.

# Invisible cuts (story Shorts; STANDARDS 3b.3)

- **First-person cuts are eye-traced too** (2026-11-10): a first-person shot right after a camera shot is turned so the
  camera shot's subject, if it's in the first-person frame, lands where the eye was, then eased back (hold 0.5 s,
  settle 2 s; render.js eyeTraceOffset, lib/eyetrace.js `traced`/`weight`). If the subject was the narrator (you can't
  see yourself in first person), it can't: end the camera shot with the narrator near the centre or aim K.cut there.
  Opt out per cut with `K.shot(name, { eyeTrace: false })` or `K.cut(..., { shot, eyeTrace: false })`. ./hb cuts
  measures the same thing and BLOCKs any jump over 33 % not opted out. Test: lib/hb/test/pov_eyetrace.test.js.
- **Cuts inside a line start on `at.cut(i)`**, never `at(i)` (the word's own start: the cut lands after it, splitting
  the word). The motion lint flags `if (k === at(i)) ... K.cut/K.shot/K.cutShot(...)` (lib/hb/motion_lint.js AT_CUT).

Owner, 2026-11-10: "the cuts don't seem to be correct, because i keep noticing them ... the focus of attention stays in
the same location between cuts? Also idk if our timings for the cuts are correct?" (r:rfa229d). What editors and the
eye-tracking research say, and what we build in:

| finding | number | what we do |
|---|---|---|
| Eye-trace: put the new shot's point of interest where the eye already is (Murch, *In the Blink of an Eye*; Bruce Block's "continuum of attention") | a matched location is fixated in ~600 ms after the cut, a mismatched one in ~1000 ms (Valuch et al. 2017, PMC5502321); viewers start moving to an expected screen spot ~200 ms after a voice cue (Smith 2012) | render.js `eyeTrace` (default on): each camera shot is re-aimed so its subject lands where the last frame's subject was |
| Edit blindness: matched action/attention hides the cut | a third of match-action cuts go unseen (Smith & Henderson 2008); removing the motion after the cut makes cuts easier to spot (Smith & Santacreu 2016) | every camera shot moves (path / push / drift) from its first frame; keep it |
| Murch's rule of six | emotion 51 %, story 23 %, rhythm 10 %, eye-trace 7 %, 2D plane 5 %, 3D space 4 % | eye-trace gives way to story: `eyeTrace: false` on a deliberate jump (a shock cut, the reveal) |
| Where the eye is after a cut | a strong pull to the centre and to faces/motion right after a cut (Carmi & Itti 2006) | attention = the shot's `subject`, else the most salient cast member (size x closeness to the middle), else the aim |
| Cut timing vs the words | sound ahead of picture is noticed from ~45 ms, picture ahead of sound only from ~125 ms (ITU-R BT.1359); editors cut a few frames before the word (J/L cuts: 3-5 frames) | cut in the pause, 2-9 frames at 60 fps (33-150 ms) before the line's first word, never after it; never inside a word |

Numbers we hold (lib/hb/cuts.js, `./hb cuts <stunt>`, a step of `./hb check`):
- **Eye jump across a cut** (attention point, last frame before vs first frame after, in % of the game view's width):
  <= 15 % fine (inside the ~5 deg the eye takes in at phone distance), > 20 % WARN, > 33 % BLOCK (unless the shot
  says `eyeTrace: false`).
- **Cut vs the line's voice**: a cut that opens a line lands within 100 ms of where that line's voice starts (WARN),
  250 ms (BLOCK); the first word starts 33-150 ms after the cut, never > 50 ms before it (WARN).

How it's built (the owner's rule: by construction first, check second):
- `eyeTrace` (render.js, lib/eyetrace.js): the new shot's subject goes onto the previous frame's attention point, kept
  in the box x 30-70 %, y 28-58 % (faces on the upper third, clear of the captions) and at most 14 deg; the offset holds
  0.5 s, then eases back to the shot's own framing by 2 s (a re-frame the eye follows; held offsets crept to the edge).
  Name what the eye should be on with the shot's `subject` (the lint's list: `['actor:Grok']`, `['entity:wolf']`,
  `['self']`, or a point `[dx, dy, dz]`; a story kit actor by its tag, `['actor:pip']`, from its K.actor 'actor' mark); otherwise the biggest cast member near the middle wins, so a stray mob in
  the set (dog_hill's village horse beside the dog) steals the eye: clear it. Shot options: `eyeTrace: false`,
  `eyeTrace: { max, hold, settle }`; the stunt: `eyeTrace: false`; `EYETRACE=0` renders without it.
- Cut timing (lib/story.js `K.line`): inside a continuous take a line ends early enough that the next cut shows
  `cutLead` (0.033 s) before the next line's first word, allowing for the last `K.cut`'s landing time (2-4 ticks),
  never before the line's own last word. `stunt.cutLead: null` turns it off. A stunt that runs its own clock
  (dog_hill: `dur + 0.08` per line against a take with no gaps) drifts 85 ms per line: 1.4 s late by the end.
- First-person cuts (`K.cut`) are recorded, so eyeTrace can't move them: aim the new view where the last shot's
  subject was, or cut to a camera shot.

Measured 2026-11-10 (render branches, `./hb cuts`): dog_hill eye jump median 12 %, max 36 % (reveal -> reunion),
3 cuts over 20 %; with eyeTrace median 1 %, max 11 %. Its picture runs +85 ms (L02) to +1375 ms (L14) behind the
voice and 5 cuts come over 50 ms after their word starts (65-135 ms). light_sleeper: median 7 %, max 30 %, 4 over 20 %;
with eyeTrace max 30 % (both left are first-person cuts); K.shot cuts sit within 25 ms of their line's voice, K.cut
cuts 125-195 ms late (the teleport's landing), 3 after their word.
Stills (top EYETRACE=0, bottom eyeTrace; pairs = last frame / first frame of hut -> beg, beg -> gramps, reveal -> reunion): `docs/runs/invisible_cuts_dog_hill_2026-11-10.jpg`.
