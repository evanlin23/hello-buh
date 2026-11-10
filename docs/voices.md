# Voices: the recurring cast

Owner, 2026-11-10: "we should have a library of voices belonging to certain recurring characters, i kinda like the
ones we used in the AI short." Stories are serious and acted now (docs/stories.md, docs/story_craft.md): every
speaking character gets a Gemini TTS voice with an acting direction, never the old 1.45x Kokoro narrator.

- `voices/cast.json`: the library (below). A character keeps its id, Gemini voice and `profile` string in every
  story. Change any of the three and it is a different person to the viewer.
- `scripts/tts.py`: Gemini TTS, multi-speaker in one request, cut into lines, cached, loudness-normalised.
- `scripts/align.py`: forced-aligned word timings (`scripts/ctc_align.py`) into `voice.json` and `voice/words.json`,
  so captions and stunt beats line up with the take ("Caption timing" below).
- `scripts/speaker_check.py`: is every line in its own speaker's voice, with the right words (below).
- `./hb voice <stunt>`: the one path for a cast story: takes, word cuts, the check, automatic re-takes, alignment.
- `voices/samples/`: one line per character and a two-character exchange (`exchange.mp3`: Max and Milo), made from
  `voices/samples/samples.json`. The whole reel with a beep between characters: `out/voices_cast/cast_reel.mp3`
  (not committed; rebuild from the samples).

## The library

| id | name (what Gemini sees) | Gemini voice | caption colour | direction (`profile`) | Kokoro fallback | from |
|---|---|---|---|---|---|---|
| `narrator` | Narrator | **Orus, tempo 0.95 + rate 1.45** (gemini-3.8-flash-tts, locked) | `#FFFFFF` white | the Roblox-story narrator: a deep-voiced guy in his twenties telling a crazy true story, first person, punchy, no gaps (= `narrator_roblox`) | am_adam | voice match, owner 2026-11-10: "s3_gemini_orus.mp3 is good" |
| `narrator_roblox` | Narrator | Orus, tempo 0.95 + rate 1.45 | `#FFFFFF` white | the same entry under its own name (recipe: voices/recipes/narrator_roblox.md) | am_adam | out/voice_match/s3 |
| `pip` | Pip | Leda | `#FFFFFF` white | Pip, Dog on the Hill's kid narrator (the default narrator until 2026-11-10; a named alternative now) | am_adam | Dog on the Hill v3 |
| `puck_kid` | Narrator (kid Puck, alt) | Puck | `#FFFFFF` white | a twelve-year-old boy telling his friends a funny story (the alternative narrator) | am_adam | Good Boy audition |
| `storyteller` | Storyteller | Despina | `#D9C8FF` pale lilac | a woman in her thirties telling a friend a story late at night, low and close, plain, never an announcer | bf_emma | the old narrator (was Erinome) |
| `milo` | Milo | Achird | `#4FD8E6` Steve's cyan | Milo, 16, friendly and quick, a little nervous; jokes when scared, quiet and serious when it matters | am_michael | AI Shorts' Claude, the trailer's Milo |
| `elder` | Elder | Charon | `#F0A845` robe amber | an old man in his seventies, tired, low and a little rough in the throat, slow and quiet; has seen this before | bm_george | the trailer's Highkeeper (recast from Algenib) |
| `child` | Kid | Laomedeia (no shift) | `#FFEE70` sunny yellow | a real village kid about nine, small and quick, breath catching, words tumbling out; scared but brave | af_sky | recast from Leda +2 st |
| `smith` | Smith | Orus | `#9C9C9C` iron grey | a big gruff blacksmith in his fifties, low and blunt, short sentences, a hidden soft heart | am_onyx | new |
| `stranger` | Stranger | Algenib | `#B39BFF` dusk violet | a hooded stranger, very old and gravelly, a slow low whisper, says less than he knows | bm_fable | the movie's Fen (Charon went to the elder; audition) |
| `villain` | Villain | Schedar | `#F03A47` redstone red | a man in his forties, cold, flat, quiet, perfectly calm and faintly amused; never shouts | bm_daniel | AI Shorts' DeepSeek |
| `mom` | Mom | Sulafat | `#FFC2A8` hearth peach | Milo's mom, a warm woman in her forties, gentle and tired, a little worried under it | af_sarah | new |
| `friend` | Max | Fenrir | `#7DF07D` lime | Milo's best friend, 16, loud, excitable, loyal, talks fast and jokes | am_puck | new |

The full direction strings are in `voices/cast.json` (copy them exactly; the table shortens them). Spares that have
been heard to work, for new roles: Kore (crisp, firm woman: a guard captain, an official), Iapetus (measured,
polite man: a mayor), Gacrux (mature woman), Enceladus (breathy man: a ghost). Puck, directed as a 16-year-old boy,
read as a young woman: use it for one. Erinome (polished: heard as an announcer, so a radio host, not a storyteller),
Leda unlifted (a natural teenage girl, 15-18), Achernar (soft and very breathy: a ghost, someone sick).

Measured on the samples before the 2026-11-10 recast (median pitch): Kid ~330 Hz, Narrator ~190, Milo ~105-175 (higher when scared), Max ~130-200,
Mom ~135, Smith ~105, Elder ~105, Villain ~95, Stranger ~75. Elder, Smith and Villain sit close in pitch; they
differ in pace and texture, so avoid putting two of them in the same scene without a reason.

## Casting a new character

1. Reuse first: if the role fits a library character (any old wise villager is `elder`), use it. Recurring voices
   are the point.
2. Otherwise pick for contrast with whoever they talk to: pitch, age and energy should all differ (the palette in
   docs/story_craft.md section 5 lists Google's descriptors for every voice).
3. Write the profile as one sentence: who (age, job), energy, pace, emotional default, one verbal habit. Plain words:
   "hushed", "steady", "unhurried", not "flat", "monotone", "quiet" (they come out lifeless). No accents unless
   the story needs one, and then name it plainly ("a soft Scottish accent").
4. A one-story character goes in the story's own `cast` with `voice` and `profile`. Once one appears in a second
   story, move it into `voices/cast.json` and give it a sample line in `voices/samples/samples.json`.

## How a story declares speakers (story.json v2)

Aligned with docs/story_craft.md section 6 (the `cast` / `requests` / `lines[].who` extension); the library adds
one field, `ref`:

```json
"cast": {
  "N":   { "role": "narrator", "ref": "narrator", "color": "#FFFFFF", "on_screen": "pov" },
  "Milo": { "role": "character", "ref": "milo", "color": "#7FD3FF" },
  "Ida": { "role": "character", "name": "Ida", "voice": "Kore", "color": "#F2C14E",
           "profile": "the librarian: a sharp woman in her sixties, dry, precise, kind underneath" }
},
"requests": [ { "id": "r1", "speakers": ["N", "Milo"], "direction": "Night, a village square, a bell tower." } ],
"lines": [
  { "id": "L01", "who": "N", "text": "The BELL / rang TWICE." },
  { "id": "L02", "who": "Milo", "text": "Okay. / That's... / not NORMAL.", "direction": "a nervous laugh, then quiet" }
]
```

- `ref` pulls `name`, `voice`, `profile` and `post` from `voices/cast.json`; anything the story sets on top wins
  (set only `color`, `on_screen`; overriding `profile` breaks the character's consistency).
- `who` is a story cast id; a line without `who` is the cast member with `role: narrator`.
- `say` (optional) is the exact text read; default: `text` with ` / ` removed and CAPS lowered (as voice.py).
- `direction` on a line is sent as "Line 3: <note>." in that request's direction block. Never quote the line's
  words in it.
- `requests` (optional): each line goes into the first request listing its speaker. Without it, consecutive lines
  share a request until a third speaker appears. At most 6 lines per request (longer takes cut worse and drift over the take).
- The movie engine's `M.say(ctx, who, text)` marks carry the same `who`: use the story cast id there too, so a
  scene's line marks and its voice files share names.

## Making the voice

One command, for any story with a `cast` (v1 stories still go to Kokoro):
```bash
./hb voice story_<name>                 # takes -> word cuts -> speaker check -> re-takes -> align -> final check
./hb voice story_<name> --only L05      # a fresh take of changed lines only, the rest kept
./hb voice story_<name> --check         # only the check (no requests)
./hb voice story_<name> --retakes 1     # fewer automatic re-takes (default 2 per failing line); --no-check: none
```
Underneath (all in the TTS venv, ~/.hb-tts/bin/python): `scripts/tts.py stories/<name>` (the takes, the cut, the
check and the re-takes), `scripts/align.py stories/<name>` (word timings into voice.json),
`scripts/speaker_check.py stories/<name>` (the final report; exit 1 on a blocker).

**Requests.** Narrator-first (docs/stories.md): the narrator's lines go in the story's `requests` as before, but a
character line of 3 words or fewer (`SHORT_WORDS` in tts.py) is voiced in a single-speaker request with that
character's other short lines. Gemini's multi-speaker mode swapped exactly these into the other voice (Good Boy).

**The cut** (owner, 2026-11-10: "the voices seem to be edited in a way that cuts stuff off"). One cutter, `cut()` in
tts.py, used by `./hb voice` and by `voice_check.py --resplit`. Whisper (align.py's model) transcribes each
multi-line take with word times and the script is matched to it, but Whisper only says roughly where a boundary is:
its word ends swallow the pause and its starts land up to ~0.3 s late, on the consonant. So the boundary is searched
in a window (from just before the last word's heard end to 0.3 s past the next line's heard start) and placed by the
audio: the **quiet point**, among the 10 ms frames within 6 dB of the window's quietest (and in a run of 40 ms or
more of them, so a pause and not a stop consonant's closure: "zom-b-ies"), the one nearest its middle (the quietest
frame alone was once the soft "s" starting the next word: "Skeletons" heard as "Gelatin's"). Words heard between two
lines but in neither (a direction read aloud) stay with the line before. From there each line's first and last sound
are found by level (45 dB under the take's peak, above its noise floor), so soft consonants, breaths and word tails
count as the line; a line keeps 80-350 ms before its first sound and 200-450 ms after its last, never into the
neighbour's own sound (each edge is the quiet point when it lies in that range, else the quiet point of the range),
with a 15 ms fade. In a pause too short for both margins the lines meet, 200/280 of it going to the tail; two lines
said with no silence between them meet at the quiet point. A take that ends (or starts) tight on its sound gets
silence padded to the margin. A boundary Whisper can't place, or a take with no Whisper, falls back to the pauses
(`cut_pauses`: dynamic programming over the pauses, the first words heard as hints), with the same margins and quiet
point. Old cuts (Good Boy, Dog on the Hill: 0.00-0.10 s of quiet at the edges, edges at -36 to -50 dB) were the
problem. The quiet point is claude/cinematic-default's resplit rule (Good Boy's Pip take: 0 cut edges, where the
energy-valley cut left 3); the margins, fades and level-found edges are the safe cut's.

**Long pauses** inside a line are left alone unless story.json sets `"max_pause"` (seconds, or `{"opening": 0.3,
"rest": null}` where opening = the first two lines): then only the silent middle of a longer pause is removed, never
within 60 ms of a sound, joined with a 30 ms crossfade (`cap_pauses` in tts.py). A pause with no silent middle long
enough is kept: re-take the line. Speech is never spliced.
`voice_check.py --resplit` re-cuts cached raw takes (`voice/<req>_take.f32`, the voice_cast.py path) by the same rules.

**Re-takes.** After the takes, every new line goes through the speaker check. A SWAP, WORDS, EDGE or CLIPPED line is re-taken as a
single-speaker request (one voice can't swap), at most `--retakes` times; lines that pass are never re-taken. The
re-take is cached like any take (its own cache key), and voice.json records `"take": n` so a later run rebuilds that
line from the same cached re-take instead of the original bad one. Each re-take is one request of the ~10 a day.

## Continuous takes (`"voice_takes": "beat"`, STANDARDS 2b.4)

**Record after the voice is final.** Runaway's clean cuts came from voicing first and recording the stunt to the real
line lengths. A story recording is now stamped with its voice (`rec.voice`, a hash of voice/voice.json, from
lib/story.js `voiceStamp`); `./hb check` BLOCKs a recording whose stamp differs from today's voice.json (a re-take
changed the line lengths: re-record) and WARNs on an unstamped older recording. Test: lib/hb/test/voice_stamp.test.js.

Owner, 2026-11-10: "I think part of the reason the voice pacing feels off is because we are cutting it bc of silence
and stuff. but i think instead we should be ensuring the voice we get back is all like continuous already without the
stuff we dont want." Opt-in per story: set `"voice_takes": "beat"` in story.json and run `./hb voice <stunt>` as
usual. Stories without it are voiced exactly as above (the prompt and the cache keys are unchanged).

- **A beat is one request and one take.** A beat is a run of consecutive lines with the same speaker and the same
  direction (the request that lists the line in `requests[].lines`, else the first request with its speaker, else the
  story `direction`). To split or join beats by hand, give lines a `"beat"` marker: consecutive lines with the same
  marker and speaker are one beat. A beat over 6 lines warns (long takes drift). `tts.beat_groups` prints them.
- **Used whole.** Only the take's own lead and tail are cut, at its first and last sound, with the safe margins
  (80-350 ms before, 200-450 ms after, at the quiet point, 15 ms fades: `trim_take`). Nothing inside is cut, spliced or
  shortened; `max_pause` never trims here, it becomes the gate's pause limit. Then the usual post, room and one gain.
  The take is `voice/beat_<first line id>.wav`: the narration plays that file.
- **Line places inside the take.** The script is force-aligned to the finished take (`scripts/ctc_align.py`, the
  captions' aligner: `tts.align_lines`), and each line's start is cut in the gap between the previous line's last
  aligned word and its first (`tts.bounds` -> `gap_cut`): the middle of the longest run of true silence there (5 ms
  frames under the take's soft floor), else the gap's lowest-energy frame; never inside either word's span. Whisper's
  word times are only the fallback (no torch): Whisper stretches a word over the pause after it, and the old window,
  opened 0.1 s after the last word's heard start, cut Light Sleeper's L07|L08 inside "screamed" (12.785 s; the pause
  before "Mom" is at 13.52 s). The Whisper window now never opens more than 0.35 s before the word's heard end.
  voice.json `beats[].cut` says which ("aligned" / "whisper"); `cut_faults` lists any cut `tts.slice_faults` finds
  inside a word or inside sound (speaker_check blocks it as SLICE). Each line's `voice/<id>.wav` is
  its slice from its start to the next line's (the slices tile the take exactly, so speaker_check, the drift gate,
  align.py and caption_sync run on them unchanged; words.json stays relative to each slice). voice.json gets `beats`
  (`{id: {lines, file, dur, offsets, model, try, tries, fixes, ok, gate, rejected}}`) and, per line, `beat`, `offset`
  (s into the take) and `gap: 0` on every line but the beat's last.
- **The picture follows the voice.** `lib/story.js`: `S.line(id).gap` is 0 inside a beat (the take's own pause is
  the gap), and `K.line` times a beat's lines from the take's offsets on the recording's clock (`beatTicks`): each
  mark lands on its offset to the tick, with no drift over the beat; anything that runs between two lines of the beat
  (a `K.preroll`, a wait) makes that mark late and shortens that line, so the next one is back on the voice; `extra`
  counts only on the beat's last line (logged and ignored inside). `K.T(id)` uses the same gap. A stunt that times
  its own lines (runaway's) should switch to K.line before turning beats on.
- **Narration and captions.** `story_track.voice_starts`: the beat take is laid once, at its first marked line's mark
  minus that line's offset; every line of the beat starts at that point plus its offset whatever its own mark says
  (a mark more than 0.15 s off prints a warning: the picture runs early or late there). Captions and one-word timing use
  these voice starts; `CAPTION_LEAD` and "never before the line's own cut" are unchanged. edit.py's end fade uses them.
- **The take gate** (`scripts/take_gate.py`) rejects instead of editing. Measured on the finished take:
  | fail | what | limit |
  |---|---|---|
  | pause | silence (every 10 ms under peak - 30 dB, pace.py's measure) | in the story's first beat, first 5 s: 0.2 s inside line 1, 0.35 inside a line, 0.6 between (pace.py's blockers); elsewhere 0.5 inside a line, 0.8 between; story `max_pause` overrides |
  | breath | unvoiced noise, centroid under 4 kHz (not an "s"), 0.15 s+, above the silence line and under word level, not straight after a word | any |
  | whisper | a run of Whisper's words with under 20 % of their sound pitched, or 14 dB under the take's median word | 0.5 s of sound |
  | words | under 75 % of the script's letters heard, a line with under half its words heard, a run of 3+ extra words (a direction read aloud), a line edge Whisper can't place | any |
  | clipped | the raw take's first or last 20 ms within 30 dB of its peak (Gemini cut a word) | any |

  A rejected take is asked for again with the fix for each kind of failure added to its direction (`take_gate.FIX`:
  inside the bracket on Pip's model, in DIRECTOR'S NOTES on 3.x), so the re-take is a new prompt and its own cache
  entry (text + direction + fixes + model + salt); the same failures twice in a row get the same direction with a
  fresh salt. At most 1 + `--retakes` requests per beat (default 3; `--no-check`: 1). The first passing take is kept,
  else the least bad (`take_gate.score`); voice.json records its failures and speaker_check flags every line of
  that beat **GATE** (a blocker). No single-line re-takes and no drift re-takes in this mode: re-taking one line would
  splice a second take into the beat; re-take the beat (`--only <any line of it>`). `voice_check.py --resplit` refuses
  these stories. speaker_check's EDGE and voice_edges judge only the take's own ends (a slice's inner edges are not cuts);
  the inner edges are judged by speaker_check's SLICE (where the words are) and WORDS (what Whisper hears either side).
- **Calibration** (2026-11-10, on the cached thirty_one_raids takes; no requests): Pip's 11-line narrator take
  (gemini-3.8-flash-lite) passes every check as two beats; its pauses are 0.23-0.74 s. Grandpa's 2-line
  Charon take, carved into its two beats, fails both: an extra "And" heard between the lines and a 2.56 s pause
  (L09), and 1.09 s of near-unvoiced speech at the end (L13, which that story later re-took with "never a whisper").
  Not heard by ear: the whisper and breath thresholds rest on the metrics, so listen to the first gated stories.
- **What changes in the gaps** (same takes, today's cut vs continuous, `out/continuous/`, not committed): today a
  line keeps 200-450 ms of tail and 80-350 ms of lead and the stunt adds the story gap, so Pip's sentence gaps came out
  0.57-0.99 s, evened out by the margins; continuous, they are the take's own 0.38-0.74 s (the same numbers measured in
  the raw take), and the 8-line beat is 1.35 s shorter.

## The Roblox narrator (owner, 2026-11-10: "s3_gemini_orus.mp3 is good"; "we can just do 1.45 thats fine")

The default `narrator` (= `narrator_roblox`) is Gemini **Orus** on gemini-3.8-flash-tts, directed as a deep-voiced guy
telling his own crazy story with no gaps, and **played tempo 0.95 then 1.45x faster by resampling**. Pitch, formants
and tempo all rise by 1.45, with no pitch correction. That is how the Roblox-story voice is made: it measures as
ElevenLabs Adam sped up ~1.45x (docs/voice_search.md "Closest match"). It is the one exception to "never pitch-shift a
voice", for this narrator's speed-up only (STANDARDS Voice 1). The recipe and the numbers are in
`voices/recipes/narrator_roblox.md`.

- **Where:** cast `tempo` and `rate`. `tts.speed_up` runs on the WHOLE raw take, straight after the cache or the request,
  before `trim_take`, `shape`, `level`, Whisper, the take gate and the line slices. So the gate judges every pause as
  the viewer hears it, the beat file is the sped-up take, and the slices tile it. Alignment (align.py, story_track)
  runs on those final wavs as before. In the per-line path (`take()`), the speed-up also runs before the cut.
- **No splicing.** A take with pauses over the gate's limits (0.3 s inside a line, 0.35 s between lines, sped-up time)
  is re-taken with the gate's fix, never cut. The s3 sample's `silenceremove` gap cut is not part of the pipeline
  (the recipe has the numbers and the risk).
- **One speed per request:** tts.py refuses a request whose speakers have different tempo/rate. A character is voiced
  in its own request at natural speed. With one narrator saying every quote, that is rare.
- **Recast:** an already-voiced story whose voice.json locks the narrator to the old model (Pip's 3.8-flash-lite) is
  re-locked to the cast's model automatically, and ALL its narrator lines are re-taken. Old and new voices never mix.
- **voice.json:** each beat records `tempo` and `rate`.
- Test: `python3 -m unittest scripts/test_continuous.py` (class `SpeedUp`). Offline replay of the s3 take through this
  path: `scripts/voice_match/replay_s3.py` (no requests).

## Speaker check (`scripts/speaker_check.py`)

For each line's wav: a speaker embedding (Resemblyzer's GE2E encoder: 17 MB, CPU, ~0.2 s a line with torch on 2
threads) and the median pitch; Whisper's transcript. Each cast member's reference is the mean of their own lines
(long lines weigh more; refined so a line that sounds like someone else doesn't shape its speaker's reference), plus
the library samples of the same Gemini voice (`voices/samples/`, mapped by the voice each file really holds:
`SAMPLE_VOICES` in speaker_check.py, since the cast was recast after they were made), which anchor a character with only a few short
lines. Each line is scored against every cast member (similarity minus a pitch penalty that grows as the line gets
shorter, where the embedding is weakest) and flagged:

| flag | meaning | |
|---|---|---|
| SWAP | another cast voice beats the line's own `who` by more than 0.02 | blocker: re-taken automatically |
| WORDS | transcript under 60% like the script, or extra words (a direction read aloud, a word of the next line); in a continuous take, also a line's last word heard at the start of the next slice, or the next line's first word at the end of this one (Light Sleeper's bad cut: L07 "...the well chest.", L08 "Screamed. Mom held me...") | blocker: re-taken automatically |
| EDGEWORD | the line's first or last word not heard as written (letters under 50% alike, Whisper's split/merged words allowed) | listen (alone it's often Whisper mishearing a short edge word: "to keep up" -> "Kiba") |
| SLICE | continuous takes: the beat take force-aligned whole (ctc_align) puts a word of the line across its slice's edge (its last word past the end, the next line's first word before it), or the cut is above the take's silence line (peak - 30 dB) (`tts.slice_faults`) | blocker: re-take the beat or fix the cut |
| THIN | the right voice wins by under 0.06 (short or shouted lines) | listen |
| SIMILAR | two cast voices with embedding similarity over 0.88 and under 2.5 semitones apart | re-cast one |
| EDGE | the first or last 20 ms within 30 dB of the line's peak: a word or breath cut off (voice_edges.py's test) | blocker: re-taken automatically |
| TIGHT | an edge within 40 dB, or under 60 ms of quiet before the first sound / 150 ms after the last | listen |
| CLIPPED | the listening model (gemini-3.5-flash, then 3.8-flash, then flash-latest; one request per check with every line's audio) hears a word cut off at the start or end, or clipped in the middle, answering per word | blocker: re-taken automatically |

A SWAP only counts against the speakers of the request that voiced the line (voice.json `with`, else story.json
`requests`): Gemini never heard the others, and a single-speaker request can't swap at all. (Good Boy v4 voiced Sam
alone: its laughing "Hahaha! There you are" at 314 Hz looked like the narrator to the embedding and pitch, a false
alarm the request rule removes.) The listening model, given a line cut 0.33 s in, named "I've" missing at the start
and "times" cut at the end; the untouched line came back clean. No answer from it (quota, network) is a note, not a
blocker. `--no-listen` skips it, `--no-words` skips Whisper.

Measured (2026-11-10): Good Boy's 13 narrator lines all scored as the narrator (margins 0.09-0.37) and its three
clean Sam lines as Sam (0.28-0.36); the library samples split in halves (9 voices, 22 clips of 2-3.5 s, each
identified against the other halves only, no library help) were 19/22 right, the misses being Milo's scared
falsetto (his only reference was the other half) and one Villain half; in a story the reference is many lines and
the choice is between 2-3 voices, which is far easier. Pitch alone fails on shouted lines (Good Boy L15 at 182 Hz),
the embedding alone on sub-second lines, so the check uses both and flags close calls as THIN. The embedding
model was trained on real voices: TTS voices of different sexes can still look alike to it (Villain/Mom 0.84), so
SIMILAR needs the pitch to agree too.

Setup (once): `~/.hb-tts/bin/pip install transformers && ~/.hb-tts/bin/pip install --no-deps resemblyzer`
(`./hb doctor` checks both). Only Resemblyzer's weights and network shape are used; the mel spectrogram is computed
in speaker_check.py, so librosa and webrtcvad aren't needed. `scripts/voice_check.py` is the quick transcript view.

## Caption colours

Owner, 2026-11-10: "Maybe we can have color coded captions?" and "It should generally just "match" the vibe of the
character thats supposed to be speaking."
- Each library character has a `color` (and `color_why`) in voices/cast.json, matched to its look and role (table
  above). A story's cast `color` wins; a one-off character with no colour gets the first library colour no one in the
  story uses. Pick a one-off's colour the same way (a witch purple, a creeper green, the warden deep teal) and check it
  against the cast (below).
- Captions run one word at a time (docs/stories.md); each word takes its line's speaker colour, so a single word on
  screen says who is talking. Chunk mode (`"captions": "chunk"`) colours the same way.
- **The word colour is only ever the speaker.** Emphasis (a CAPS key word) is a bar under the word, never a second
  colour: a character's key word is its colour lifted toward white over a bar in its colour; in a story with a voiced
  character, the narrator's key word is white over a bar in the story's `key_color`. Tried first: the narrator's key
  words in the key colour, and character key words in the key colour too; one word at a time, Good Boy's amber key
  word read as the Elder talking. A v1 story (no cast) and every non-story Short render as before (pixel-identical:
  white, key words in the key colour). story_track.py warns when a character's colour is near the key colour.
- A name tag (the cast `name`, small caps in the speaker's colour) sits over every word of a character's first line
  (one word alone is too short to read a tag), the word staying where it would be without it. Narrator-first
  stories give a character 1-3 short lines, often off-camera in POV, so naming the voice once is worth it (the
  narration research recommends it). `"name_tags": false` in story.json turns them off.
- Checked for colour blindness (Viénot simulation, CIE Lab): every pair of library colours is at least ΔE 12 apart
  under deuteranopia, protanopia and tritanopia (31+ with normal vision), except the storyteller's lilac against
  Milo's cyan (7 under deuteranopia; the storyteller is normally the narrator, and so white), and every colour has 6:1 or more contrast
  against the caption's dark outline. Stills: out/captions_colour/ (not committed; `sheet_phone_size.png` at phone size).

`voice.json` keeps the shape `lib/story.js` and `edit.py --story` read (`dur`, `onset`, `end`, `chunks`,
`captions`, plus `who`), so stunts and captions don't change. tts.py first spreads the chunks evenly by letters;
align.py replaces them with forced-aligned word times ("Caption timing" below). Whisper (openai/whisper-base.en via
transformers, in the TTS venv; ~290 MB in the HF cache) is only its fallback for a take the aligner can't fit: it
matches by position, not spelling (Whisper hears "Milo" as "Buzz"), and warns when the transcript is under 60% like
the script: that line is a wrong cut or a dropped line. Listen to it.

What tts.py does to a take: it cuts the take into lines (every pause is a candidate; dynamic programming matches
each line's share of the speech to its share of the text, follows Whisper's word times where it heard a line's first
words, and penalises a line whose stretches disagree in pitch, so two speakers don't get merged), cuts each edge in
the pause's quietest point with the in-breath and tail kept ("The cut" above), then high-pass 60 Hz, the character's `post` (EQ; the narrator's tempo
and formant-kept lift), a light room, and one gain per take (see "Realism"). It prints each line's length and pitch:
a pitch that belongs to the
other speaker means a bad cut.

## Caption timing (owner 2026-11-10: "Some of them are earlier, some of them are after")

Each caption appears on the frame in which its word starts (STANDARDS 2b.3). The chain:
1. `scripts/align.py stories/<name>` force-aligns each line's caption words to its wav (`scripts/ctc_align.py`:
   facebook/wav2vec2-base-960h, ~360 MB in the HF cache, CPU, ~20 s a story; a small numpy CTC Viterbi, no
   torchaudio) and writes `voice/words.json`: one `[word, start, end]` per caption word, in order, numbers as shown
   ("31", "9,000"; the aligner hears them spelled out). For a word that starts with a hiss (s, f, z, sh, soft c) the
   CTC spike comes 50-100 ms into the hiss, so its start moves back to where the hiss begins. A take the aligner can't
   fit (it says another text) falls back to Whisper, with a WARNING: listen to that line.
2. `story_track._one_word` matches the caption words to words.json by their letters (`ctc_align.match_words`:
   numbers spelled out, split and merged words handled), so an old Whisper words.json still lines up; `CAPTION_LEAD`
   is 0 and `frame_of` floors each start to its 60 fps frame. A caption may still move onto a picture cut inside its
   line, at most 2 frames later or 5 frames earlier than its word (`CUT_LATE`, `CUT_EARLY`).
3. `scripts/caption_av_check.py out/<stunt>.mp4 stories/<name>` (in `./hb review`) measures the finished Short:
   "heard" is each line's stretch of the narration track (story_track.narration_wav) force-aligned to its caption
   words and placed in the video by cross-correlating that track with the final mix; "shown" is each caption's first
   frame, found in the video where the caption band changes. BLOCK when |median offset| > 33 ms or over 10% of words
   are more than 100 ms off; it prints a per-line table (a constant offset, drift, one bad line) and the worst words.
   `--events stories/<name> --rec <rec>` does the same math without a video. `scripts/caption_sync.py` (caption start
   vs the speech onset, no model) still runs too: it is the quick check before a render.

Re-timing a story that was aligned with Whisper (every story before 2026-11-10 evening): `~/.hb-tts/bin/python
scripts/align.py stories/<name>`, then re-edit from the same recording (`./hb render <stunt> --reuse`: no new
recording, no Gemini request). The stunt's beats (`S.line(id).at(k)`) read the new chunk times only at the next
recording.

**Aligners, measured** (38 word onsets hand-marked on 0.4 s waveform + spectrogram strips, 28 across the 5 held cuts
and a hold-out of 10 marked after the hiss rule was written; error = aligner start - marked onset):

| aligner | median | abs median | abs p90 | over 50 ms |
|---|---|---|---|---|
| Whisper-base word timestamps (what shipped) | -102 ms | 102 ms | 180 ms | 74% |
| wav2vec2-base-960h CTC (WhisperX's English aligner) | +18 ms | 20 ms | 77 ms | 24% |
| wav2vec2-large-960h-lv60-self CTC | +38 ms | 38 ms | 97 ms | 39% |
| MMS-300m forced aligner (MahmoudAshraf/mms-300m-1130-forced-aligner, the torchaudio MMS_FA recipe; 1.2 GB) | +3 ms | 21 ms | 65 ms | 18% |
| **wav2vec2-base + hiss rule (MODEL)** | **+6 ms** | **14 ms** | **39 ms** | **5%** |
| MMS + hiss rule | -4 ms | 13 ms | 33 ms | 3% |

Base and MMS with the hiss rule are within the marking error of each other; base is a third of the size and fitted
every line (MMS rejected one). torchaudio itself has no build for this venv's torch, so MMS was run through
transformers. The remaining misses are nasal onsets inside connected speech (m, n), where the marks themselves are a
judgement call.

Native timings: ElevenLabs' `/text-to-speech/{voice}/with-timestamps` returns per-character start and end times
(`alignment` and `normalized_alignment`), and Kokoro returns each token's start and end (scripts/voice.py uses them);
for those voices align.py could take the times as given (sum a word's characters) instead of aligning, but run
`caption_av_check.py` on the result either way. Gemini TTS returns audio only.

## Directing Gemini (first tested on gemini-2.5-flash-preview-tts; "Realism" below supersedes where they differ)

- The prompt is: the scene in one sentence, one "<Name> is <profile>." per speaker, the line notes, "Leave a pause
  after every line.", a blank line, then `Name: line` per line. The direction block is not read aloud on 2.5 flash
  (5 of 5 sample takes clean, Whisper-checked). gemini-3.x does read "Say ...:" notes aloud: tts.py warns when a
  take is far longer than its words.
- **Punctuation is the pace.** A comma is a breath, an ellipsis a trailing pause ("Tonight... it rang twice." got a
  real held beat), a full stop a stop, a question mark lifts. Short sentences act better than long ones.
- **Inline tags** (tested 2026-11-10): `(whispering)` at the start of a line is not read aloud. `[whispers]` works
  and the take whispers, but the whisper carried on into the following lines of the same request, which then
  dropped a line entirely: put a whispered line last in its request, or alone. `<long pause>` works (about 1.5 s).
  `<sigh>` came out as a spoken "Ugh". A per-line note ("terrified, his voice cracks") in the same take was lost with
  the dropped line: test notes on a line before relying on them.
- **Takes can run on.** One take came back 103 s long for 20 words (the speech, then 90 s of near silence). The cut
  ignores the tail, and the warning flags it; don't commit to a take without the Whisper check.
- Emotion goes in the profile (the default) and in a line's `direction` (the change), never in brackets in the
  line unless tested.
- A child: direct Laomedeia (or Leda) young and leave the pitch alone; see "Realism" for why the lift is gone.
- Two voices in a request alternate cleanly; the cut needs a clear pause between lines (the closing "Leave a pause
  after every line" gets about 0.3-0.8 s).

## Realism (tested 2026-11-10)

Owner, 2026-11-10: "we want the voices to be as realistic as possible (people cant tell its AI)". Tested on four
scenes (a narrator line, a scared kid and her mom, an old man's warning, Milo sneaking in past Mom) with Gemini
3.x Flash as the listener ("rate 1-10 how likely a listener thinks this is a real human recording, and what gives it
away"), plus Whisper and pitch, peak and silence checks. The listener is noisy: the same file twice scored 8 and 9,
and it sometimes names processing that isn't there. Trust a result only when it holds across batches. The reels
are `out/voices_cast/realism_ab.mp3` and `out/voices_cast/kid_narrator_audition.mp3`; neither is committed.

What made the biggest difference, largest first:
1. **The model and the prompt layout.** On `gemini-3.1-flash-tts-preview` with Google's layout (`# AUDIO PROFILE` /
   `## THE SCENE` / `### DIRECTOR'S NOTES` / `#### TRANSCRIPT`) takes scored 6-9. The 2.5-flash takes we already had
   scored 3-8. `tts.py` now tries 3.1 first, with 2.5-flash as the fallback. The headings were never read aloud
   (3 takes checked with Whisper; the listener flagged none in 9).
2. **Never pitch-shift a voice** (one owner-approved exception: the Roblox narrator's 1.45x speed-up, below). The
   Kid's +2 semitones (`asetrate`) came last every time ("chipmunk", "warble", "metallic"). Unshifted Laomedeia was heard as a real child. If a younger sound is really needed (the narrator),
   use `rubberband=pitch=...:formant=preserved`. It scored 7 against 5-6 for `asetrate` or a plain rubberband
   shift. The unshifted voice is still the most real (10).
3. **Write the direction as a scene, not as adjectives.** The same lines with the old terse profile ("calm, clear,
   a little hushed, like the opening of a mystery film") scored 4: "sing-song", "performance". With a scene ("his
   mother, just woken, half-whispering so she doesn't wake the baby") and "Real people talking, recorded close on a
   good microphone: not a performance, not an announcer or an audiobook" they scored 6-9. Words like "cinematic",
   "mystery film" and "storyteller" call up the announcer.
4. **Casting.** Erinome was called "announcer" or "audiobook" in all three batches, so the storyteller is now
   Despina (9). Algenib was "a filter", "younger than seventy", so the elder is now Charon ("genuinely aged", 9).
   Laomedeia makes a better child than Leda. Sulafat stays as Mom: Achernar was "overly breathy".
5. **Post: less is more, with a little room.** The raw take (8) beat the old chain: gate cut, de-esser and per-line
   loudnorm with the shift scored 4-5. A light synthetic room (small: RT60 0.28 s, 10% wet) beat dry in both pairs
   (9 vs 8). A faint room tone did not help: under a dry voice it sounded like a separate track, and in the mix the
   game audio fills the gaps anyway. A 7 kHz dip was heard as "dull", so it is gone.

The rules `tts.py` now follows (all of them on by default):
- **Keep the breaths and tails.** A line keeps up to 0.35 s of the pause before it (the in-breath) and 0.3 s after
  (the decay), never more than half the pause, with 15 ms fades. The old cut started and stopped at the speech gate.
- **One gain per take, not per line.** The take is brought to -16 LUFS as a whole, so the mom's whisper stays about
  7 dB under the kid's line, as it would in a real room. A limiter takes at most 3 dB off rare peaks; beyond that
  the take simply comes out quieter, and edit.py sets the final voice level. No `loudnorm` riding per line, and no
  de-esser.
- **Room per scene:** set `room` on a request (or on the story): `small` (bedroom, kitchen, shop: the default),
  `hall` (church, big cave), `outdoor` (almost dry), or `""` for dry.
- **CAPS:** lower them before TTS (`tts.spoken`, as voice.py already does). The take with CAPS words had its peaks
  5.8 dB further above its loudness (25.6 vs 19.8 dB): the capitalised words get punched. Its score was within the
  listener's noise. For emphasis, use word order and a full stop.
- **Punctuation and hesitations in the text are fine.** "I— I heard something. At the window." gave a real catch in
  the voice, and Whisper still matched the line.
- **No [bracket] tags** for emotion. gemini-3.8-flash-tts read "[barely a whisper]" aloud. It also takes no direction
  block: multi-speaker there needs `speechMetadata.speaker` on every part, and `systemInstruction` is refused.
- **An ellipsis or "dramatic" makes Gemini whisper** (story session, same day). For an upbeat line, write "full
  volume, excited".

### The kid narrator (owner, 2026-11-10: "it should be like a child most of the time right? like bubbly happy")

The audition: each voice was directed as an eleven-year-old ("fast, bright, bubbly, happy and energetic ... not
whispery, not breathy, not soft") and read runaway's L01, a deadpan clue and a scared line. 3.1-flash: two voices per
request, three requests in all. Words per second are words over speaking time:

| # | candidate | words/s | median pitch | judged real (1-10) | judged age | bubbly |
|---|---|---|---|---|---|---|
| 1 | Kokoro am_adam 1.45x (runaway) | 4.7 | 179 Hz | 1 | 35 | 1 |
| 2 | Leda, as read | 2.7 | 324 Hz | 10 | 18 | 7 |
| 3 | Leda, 1.5x tempo | 4.1 | 328 Hz | 8 | 15 | 8 |
| 4 | Puck, 1.5x | 4.0 | 358 Hz | 10 | 19 | 5 |
| 5 | Zephyr, 1.5x | 3.8 | 275 Hz | 9 | 22 (whispery) | 3 |
| 6 | Achird directed younger, 1.5x | 3.8 | 260 Hz | 9 | 22 (breathy) | 2 |
| 7 | Leda 1.5x + 2 st `asetrate` | 4.1 | - | 6 | 8 | 9 |
| 8 | **Leda 1.5x + 1.5 st rubberband, formants kept** | 4.1 | - | 7 | **11** | **9** |
| 9 | Leda 1.5x + 1.5 st rubberband, formants shifted | 4.1 | - | 5 | 9 | 9 |

(The pitch tracker can't tell the lifted takes apart; Laomedeia and Aoede ran out of quota.) No Gemini voice
sounds eleven on its own, and they all read at about 2.5-2.7 words a second, against the research's 4.5 (not a target any more: the owner chose Pip's natural tempo, docs/stories.md).
So `narrator` is #8: Leda with `post` `rubberband=tempo=1.5:pitch=1.0905:formant=preserved`. If the owner prefers
"more real" to "younger", drop the pitch from the post (#3). The old woman narrator is now `storyteller`.

## Keeping a character the same across stories

- Same id, same Gemini voice, same profile string, byte for byte (it is also the cache key).
- Same `post` filter and loudness (tts.py applies both from the library).
- The scene sentence changes per story; the profile never does. Put this story's mood in the line notes.
- If a take drifts (Achird read Milo higher when scared, ~175 Hz vs ~105 calm: that's acting, fine), re-take it
  rather than pitch-correct it.
- Don't re-cast a library character in a story. If the owner dislikes a voice, change it in `voices/cast.json`,
  re-make its sample and note the change there.

## Drift gate (owner, 2026-11-10)

Owner: "i think gemini is really bad with the voices drifting. can you ensure theres a gate or some way to audit this?
The voices for the people seem to change like all the time take to take and even within take."

```bash
./hb drift <stunt>                                              # = ~/.hb-tts/bin/python scripts/voice_drift.py stories/<name>
~/.hb-tts/bin/python scripts/voice_drift.py stories/<name> --json  # tts.py's hook reads this
~/.hb-tts/bin/python scripts/voice_drift.py --make-refs [id,...]   # rebuild voices/refs/ from voices/refs/refs.json
```

**What it measures.** For every line, and every 1.5 s window inside a line (hop 0.75 s): a speaker embedding
(Resemblyzer's GE2E encoder, the same one `speaker_check.py` uses), median pitch (YIN), spectral centroid and tilt,
mean F1-F3 (LPC) and, per line, words per second. Each comparison becomes one **drift score** in noise units (1.0 =
two good lines of one character): a weighted RMS where the embedding counts most (weight 3, its noise scale grows on
short lines: 0.06 + 0.08 / speech s) and pitch, brightness and formants count little with wide scales, because acting
moves them (Pip's "And then he STOOD UP!" is +10 st and fine). Three comparisons:

| flag | what | warn / block |
|---|---|---|
| DRIFT | the line against the character's other lines in this story (leave-one-out, median centre): take-to-take | 1.7 / 2.0 |
| OFFREF | the line against the character's locked reference (`voices/refs/<id>.json`) | 1.9 / 2.3 |
| WOBBLE | two windows in a row (>= 2.25 s) against the character (its reference, else its centre): within the take | 1.55 / 1.75 |
| MODELS | the character's lines were made by more than one TTS model (voice.json `lines[].model`) | always a blocker |
| spread | the character's median pitch spans more than 7 semitones across lines | a warning |
| short | under 0.6 s of speech: too short to judge (speaker_check's SWAP covers a swapped "SIT.") | listen |

A reference blocks only for the library character itself (`ref` in the story cast, or the cast id) and only when it
comes from an approved take; a one-off character that shares a Gemini voice, or a `provisional` library sample, is
shown and not judged. Exit 1 on any blocker.

**References** (`voices/refs/`, committed: our own generated audio, ~6 s each, and a 256-d embedding + stats). The
narrator (and `pip`) is Dog on the Hill voices v3 (the owner's pick), `puck_kid` is Good Boy's kid-Puck take (its
first five lines), the rest are the library samples, marked `provisional` (made before the recast or with another
direction): replace each with the first approved story take of that character (`refs.json`, then `--make-refs <id>`).

**Calibration (2026-11-10).** Good: Pip v3 (10 lines; max DRIFT score 1.59, his shouted "STOOD UP!"), 16 Kokoro stories
(one voice; max 1.08), Good Boy's kid Puck lines 1-7. Bad: Pip v3 with 3 Erinome lines mixed in (2.12-2.30), with 3
Leda lines from gemini-3.8-flash instead of 3.8-flash-lite (one at 1.97, two at ~1.0: same voice, other model, partly
audible), Good Boy's newest Puck with 3 lines of the first Gemini take (hushed "young man", 2.49-2.86). Windows: good
takes reach 1.82 in one window but at most 1.47 in two in a row; a Pip line finished by an Erinome take: 2.03, 1.97
(WOBBLE at 1.5 s). A synthetic story with all three faults (two swapped-in Erinome lines, one spliced line, two models)
gets DRIFT and OFFREF on both swapped lines, WOBBLE on them and on the spliced one, and MODELS. The Gemini listening judge (gemini-3.5-flash) was out of quota (429) for the whole
session, so the thresholds rest on the metrics; when it answers, re-check Good Boy's L08-L13 by ear.

**Prevention in tts.py** (the gate catches drift; these stop most of it):
- **One model per character per story.** The first request that voices a character locks its model (voice.json
  `models`, and `lines[].model` per line); a `model` in voices/cast.json locks it everywhere (the narrator: Pip's
  gemini-3.8-flash-lite-tts, with Pip's recipe prompt: `[profile]`, a blank line, the lines; single-speaker requests).
  A 429 on a locked model stops the run (`QuotaOut`; the takes so far are cached): wait for the reset, or
  `--relock <cast id>=<model>` to re-take ALL of that character's lines on another model. Good Boy's narrator came out
  of 3.1-flash for some lines and 2.5-flash for others: two different people.
- **The model is in the cache key**, so a fallback model's take can't come back as the first model's.
- **Short requests**: at most 6 lines (MAX_LINES); long multi-line takes drift over the take.
- **Identical direction**: the profile string comes from voices/cast.json; a story that overrides a library
  character's `profile` gets a warning.
- **Auto re-take**: after the speaker check, `./hb voice` runs the gate; a line it blocks is re-taken alone on the
  locked model, at most 2 times, and the take closest to the reference (lowest drift) is kept (voice.json `take`).

**Voice conversion: tested, not adopted.** OpenVoice v2's tone-colour converter (MIT since April 2024, free for
commercial use; 131 MB, CPU ~1x real time on 2 threads: 3.3 s for a 3.3 s line) mapping a take onto the
reference's timbre: it pulled drifting lines toward the reference (an Erinome line 2.70 -> 2.08 against Pip, Good
Boy's drifted L11 2.76 -> 1.86, its pitch dragged from -13 st to 0) but not under the blocker for a wrong voice, and it
pushed a clean Pip line AWAY from Pip (0.67 -> 1.04: the converter's own sound). A re-take on the locked model fixes
drift without processing, and the realism rule is "less processing is more" ("Realism" above). Not tried: seed-vc
(GPL-3.0), kNN-VC (needs WavLM-Large, ~1.2 GB, more than this box's free disk). The A/B is
`out/voice_drift/vc_ab.mp3` (not committed).

## Saving quota

The free tier is about 10 requests a day per model and the owner's rule is "don't necessarily use the latest
models, we might run out of usage":
- MODELS order: gemini-3.1-flash-tts-preview first (the realism winner), then gemini-2.5-flash-preview-tts; an
  unlocked character's first request moves to the next only on a 429 (quota), and retries a 5xx once on the same
  model. Each has its own 10 a day, so the pair gives about 20. gemini-2.5-pro-preview-tts is not on the free tier
  (limit 0): it's out of the list. **Once a character has a model in a story, it keeps it** ("Drift gate" below): a
  429 on it stops the run.
- One request per scene pair: the narrator and one character, or two characters. A 9-character sample set cost 5
  requests.
- Finalise the script before voicing (a changed comma is a new request). Re-take only changed lines with `--only`.
- Every raw take is cached in `work/tts/<hash>.wav` (hash of the prompt, the voices and the model: before
  2026-11-10 the model wasn't in it, so a fallback model's take was reused as the first model's). Re-cutting, re-processing and
  re-aligning are free. Delete bad takes (long run-on takes are megabytes).
- Whisper and the cut are local: check there before paying for another take.
- Quota out on every model: stop and leave the story for the next run (story-make skill); never fall back to the
  sped-up narrator. The Kokoro `fallback` voices are for auditions and table reads only.

## In the mix

- Voice on top: edit.py mixes voice -15 LUFS, game -27, song bed -31, master -14.
- **Keep SFX quiet and varied** (coordinator, 2026-11-10): sound effects sit under the voices, never over a line,
  and no single sample repeated back to back (pick from a few variants, vary pitch and level slightly).
- The narrator's line and a character's reply need air between them (the story `gap`, 0.25 s default for acted
  stories), not the 0.1 s of the sped-up narrator.

## Making the samples again

```bash
python3 scripts/tts.py voices/samples/samples.json /tmp/vox    # 5 requests, or 0 from the cache
```
Then encode each line to mp3 (64 kb/s mono, all under 125 KB) and concatenate them with a 0.15 s 1 kHz beep between
characters for the reel.

**Delivery by beat on Pip's model (STANDARDS 2b.1).** gemini-3.8-flash-lite takes only a bracket before the lines (Pip's
recipe), so `scripts/tts.py` used the narrator's profile there and dropped the request's direction: every beat came out
bubbly. A request whose `direction` is in [brackets] now takes the bracket's place on that model (same voice, same
model; keep it one short line and name the character, e.g. "[A nine-year-old kid telling a friend a story. This part:
stunned and quiet, close to tears; full voice, not whispery]"). An unbracketed scene, or none, still sends the profile.
