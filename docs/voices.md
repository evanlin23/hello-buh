# Voices: the recurring cast

Owner, 2026-11-10: "we should have a library of voices belonging to certain recurring characters, i kinda like the
ones we used in the AI short." Stories are serious and acted now (docs/stories.md, docs/story_craft.md): every
speaking character gets a Gemini TTS voice with an acting direction, never the old 1.45x Kokoro narrator.

- `voices/cast.json`: the library (below). A character keeps its id, Gemini voice and `profile` string in every
  story. Change any of the three and it is a different person to the viewer.
- `scripts/tts.py`: Gemini TTS, multi-speaker in one request, cut into lines, cached, loudness-normalised.
- `scripts/align.py`: Whisper word timings into `voice.json`, so captions and stunt beats line up with the take.
- `voices/samples/`: one line per character and a two-character exchange (`exchange.mp3`: Max and Buh), made from
  `voices/samples/samples.json`. The whole reel with a beep between characters: `out/voices_cast/cast_reel.mp3`
  (not committed; rebuild from the samples).

## The library

| id | name (what Gemini sees) | Gemini voice | direction (`profile`) | Kokoro fallback | from |
|---|---|---|---|---|---|
| `narrator` | Narrator | Erinome | a woman in her thirties, calm, clear and a little hushed, unhurried; a small pause before the strange detail | bf_emma | the AI Shorts' narrator |
| `buh` | Buh | Achird | HelloBuh, 16, friendly and quick, a little nervous; jokes when scared, quiet and serious when it matters | am_michael | AI Shorts' Claude, the trailer's Buh |
| `elder` | Elder | Algenib | an old man in his seventies, slow, soft, warm, a little gravelly; has seen this before | bm_george | the trailer's Highkeeper (and Grok) |
| `child` | Kid | Leda (+2 semitones) | a village kid about nine, bright, earnest, fast, scared but brave | af_sky | new |
| `smith` | Smith | Orus | a big gruff blacksmith in his fifties, low and blunt, short sentences, a hidden soft heart | am_onyx | new |
| `stranger` | Stranger | Charon | a hooded stranger, very old and gravelly, a slow low whisper, says less than he knows | bm_fable | the movie's Fen |
| `villain` | Villain | Schedar | a man in his forties, cold, flat, quiet, perfectly calm and faintly amused; never shouts | bm_daniel | AI Shorts' DeepSeek |
| `mom` | Mom | Sulafat | Buh's mom, a warm woman in her forties, gentle and tired, a little worried under it | af_sarah | new |
| `friend` | Max | Fenrir | Buh's best friend, 16, loud, excitable, loyal, talks fast and jokes | am_puck | new |

The full direction strings are in `voices/cast.json` (copy them exactly; the table shortens them). Spares that have
been heard to work, for new roles: Kore (crisp, firm woman: a guard captain, an official), Iapetus (measured,
polite man: a mayor), Gacrux (mature woman), Enceladus (breathy man: a ghost). Puck, directed as a 16-year-old boy,
read as a young woman: use it for one.

Measured on the samples (median pitch): Kid ~330 Hz, Narrator ~190, Buh ~105-175 (higher when scared), Max ~130-200,
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
  "Buh": { "role": "character", "ref": "buh", "color": "#7FD3FF" },
  "Ida": { "role": "character", "name": "Ida", "voice": "Kore", "color": "#F2C14E",
           "profile": "the librarian: a sharp woman in her sixties, dry, precise, kind underneath" }
},
"requests": [ { "id": "r1", "speakers": ["N", "Buh"], "direction": "Night, a village square, a bell tower." } ],
"lines": [
  { "id": "L01", "who": "N", "text": "The BELL / rang TWICE." },
  { "id": "L02", "who": "Buh", "text": "Okay. / That's... / not NORMAL.", "direction": "a nervous laugh, then quiet" }
]
```

- `ref` pulls `name`, `voice`, `profile` and `post` from `voices/cast.json`; anything the story sets on top wins
  (set only `color`, `on_screen`; overriding `profile` breaks the character's consistency).
- `who` is a story cast id; a line without `who` is the cast member with `role: narrator`.
- `say` (optional) is the exact text read; default: `text` with ` / ` removed and CAPS lowered (as voice.py).
- `direction` on a line is sent as "Line 3: <note>." in that request's direction block. Never quote the line's
  words in it.
- `requests` (optional): each line goes into the first request listing its speaker. Without it, consecutive lines
  share a request until a third speaker appears. At most 8 lines per request (longer takes cut worse).
- The movie engine's `M.say(ctx, who, text)` marks carry the same `who`: use the story cast id there too, so a
  scene's line marks and its voice files share names.

## Making the voice

```bash
python3 scripts/tts.py stories/<name>                         # Gemini takes -> voice/<id>.wav + voice/voice.json
~/.hb-tts/bin/python scripts/align.py stories/<name>          # Whisper word timings -> the chunks in voice.json
python3 scripts/tts.py stories/<name> --only L05              # re-take one line (a new request), keep the rest
~/.hb-tts/bin/python scripts/align.py stories/<name> --only L05
```

`voice.json` keeps the shape `lib/story.js` and `edit.py --story` read (`dur`, `onset`, `end`, `chunks`,
`captions`, plus `who`), so stunts and captions don't change. tts.py first spreads the chunks evenly by letters;
align.py replaces them with Whisper's word times (openai/whisper-base.en via transformers, in the TTS venv; ~290 MB
in the HF cache on first run). It matches by position, not spelling (Whisper hears "Buh" as "Buzz"), and warns when
the transcript is under 60% like the script: that line is a wrong cut or a dropped line. Listen to it.

What tts.py does to a take: it cuts the take into lines (every pause is a candidate; dynamic programming matches
each line's share of the speech to its share of the text, and penalises a line whose stretches disagree in pitch, so
two speakers don't get merged), then high-pass 70 Hz, the character's `post` filter (the Kid's pitch lift, the
Smith's low end), de-ess, and loudness -16 LUFS. It prints each line's length and pitch: a pitch that belongs to the
other speaker means a bad cut.

## Directing Gemini (what we've tested on gemini-2.5-flash-preview-tts)

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
- A child: no Gemini voice is a child. Direct Leda young and lift it with `post` (asetrate 1.12, tempo back).
- Two voices in a request alternate cleanly; the cut needs a clear pause between lines (the closing "Leave a pause
  after every line" gets about 0.3-0.8 s).

## Keeping a character the same across stories

- Same id, same Gemini voice, same profile string, byte for byte (it is also the cache key).
- Same `post` filter and loudness (tts.py applies both from the library).
- The scene sentence changes per story; the profile never does. Put this story's mood in the line notes.
- If a take drifts (Achird read Buh higher when scared, ~175 Hz vs ~105 calm: that's acting, fine), re-take it
  rather than pitch-correct it.
- Don't re-cast a library character in a story. If the owner dislikes a voice, change it in `voices/cast.json`,
  re-make its sample and note the change there.

## Saving quota

The free tier is about 10 requests a day per model and the owner's rule is "don't necessarily use the latest
models, we might run out of usage":
- MODELS order: gemini-2.5-flash-preview-tts first; tts.py moves to the next only on a 429 (quota), and retries a
  5xx once on the same model (one 502 so far).
- One request per scene pair: the narrator and one character, or two characters. A 9-character sample set cost 5
  requests.
- Finalise the script before voicing (a changed comma is a new request). Re-take only changed lines with `--only`.
- Every raw take is cached in `work/tts/<hash>.wav` (hash of the prompt and voices). Re-cutting, re-processing and
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
