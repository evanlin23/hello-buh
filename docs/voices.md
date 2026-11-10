# Voices: the recurring cast

Owner, 2026-11-10: "we should have a library of voices belonging to certain recurring characters, i kinda like the
ones we used in the AI short." Stories are serious and acted now (docs/stories.md, docs/story_craft.md): every
speaking character gets a Gemini TTS voice with an acting direction, never the old 1.45x Kokoro narrator.

- `voices/cast.json`: the library (below). A character keeps its id, Gemini voice and `profile` string in every
  story. Change any of the three and it is a different person to the viewer.
- `scripts/tts.py`: Gemini TTS, multi-speaker in one request, cut into lines, cached, loudness-normalised.
- `scripts/align.py`: Whisper word timings into `voice.json`, so captions and stunt beats line up with the take.
- `voices/samples/`: one line per character and a two-character exchange (`exchange.mp3`: Max and Milo), made from
  `voices/samples/samples.json`. The whole reel with a beep between characters: `out/voices_cast/cast_reel.mp3`
  (not committed; rebuild from the samples).

## The library

| id | name (what Gemini sees) | Gemini voice | direction (`profile`) | Kokoro fallback | from |
|---|---|---|---|---|---|
| `narrator` | Narrator | Leda (1.5x tempo, +1.5 st, formants kept) | a kid of about eleven telling his own story: fast, bright, bubbly, happy, energetic; not whispery | am_adam | kid-narrator audition, 2026-11-10 |
| `storyteller` | Storyteller | Despina | a woman in her thirties telling a friend a story late at night, low and close, plain, never an announcer | bf_emma | the old narrator (was Erinome) |
| `milo` | Milo | Achird | Milo, 16, friendly and quick, a little nervous; jokes when scared, quiet and serious when it matters | am_michael | AI Shorts' Claude, the trailer's Milo |
| `elder` | Elder | Charon | an old man in his seventies, tired, low and a little rough in the throat, slow and quiet; has seen this before | bm_george | the trailer's Highkeeper (recast from Algenib) |
| `child` | Kid | Laomedeia (no shift) | a real village kid about nine, small and quick, breath catching, words tumbling out; scared but brave | af_sky | recast from Leda +2 st |
| `smith` | Smith | Orus | a big gruff blacksmith in his fifties, low and blunt, short sentences, a hidden soft heart | am_onyx | new |
| `stranger` | Stranger | Algenib | a hooded stranger, very old and gravelly, a slow low whisper, says less than he knows | bm_fable | the movie's Fen (Charon went to the elder; audition) |
| `villain` | Villain | Schedar | a man in his forties, cold, flat, quiet, perfectly calm and faintly amused; never shouts | bm_daniel | AI Shorts' DeepSeek |
| `mom` | Mom | Sulafat | Milo's mom, a warm woman in her forties, gentle and tired, a little worried under it | af_sarah | new |
| `friend` | Max | Fenrir | Milo's best friend, 16, loud, excitable, loyal, talks fast and jokes | am_puck | new |

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
in the HF cache on first run). It matches by position, not spelling (Whisper hears "Milo" as "Buzz"), and warns when
the transcript is under 60% like the script: that line is a wrong cut or a dropped line. Listen to it.

What tts.py does to a take: it cuts the take into lines (every pause is a candidate; dynamic programming matches
each line's share of the speech to its share of the text, and penalises a line whose stretches disagree in pitch, so
two speakers don't get merged), keeps each line's in-breath and tail (it pads into the pauses), then high-pass
60 Hz, the character's `post` (EQ; the narrator's tempo and formant-kept lift), a light room, and one gain per take
(see "Realism"). It prints each line's length and pitch: a pitch that belongs to the
other speaker means a bad cut.

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
2. **Never pitch-shift a voice.** The Kid's +2 semitones (`asetrate`) came last every time ("chipmunk", "warble",
   "metallic"). Unshifted Laomedeia was heard as a real child. If a younger sound is really needed (the narrator),
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
sounds eleven on its own, and they all read at about 2.5-2.7 words a second, against the 4.5 the research asks for.
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

## Saving quota

The free tier is about 10 requests a day per model and the owner's rule is "don't necessarily use the latest
models, we might run out of usage":
- MODELS order: gemini-3.1-flash-tts-preview first (the realism winner), then gemini-2.5-flash-preview-tts; tts.py
  moves to the next only on a 429 (quota), and retries a 5xx once on the same model. Each has its own 10 a day, so
  the pair gives about 20. gemini-2.5-pro-preview-tts is not on the free tier (limit 0): it's out of the list.
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
