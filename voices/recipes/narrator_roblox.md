# The Roblox narrator (`narrator_roblox`, the default `narrator`): how s3 was made

Owner, 2026-11-10, choosing from the voice-match reel: "s3_gemini_orus.mp3 is good". Then, after hearing it at
1.30x-1.60x: "we can just do 1.45 thats fine". This is that voice, reproducible. Why it is built this way is in
docs/voice_search.md "Closest match": the Roblox-story voice is ElevenLabs Adam played ~1.45x faster, pitch and all.
We don't use or clone Adam. We play a Gemini voice the same way.

## The request (one per beat; s3 was one request for 9 short paragraphs)
- Model: `gemini-3.8-flash-tts` (locked in the cast: never another model, never flash-lite).
- Voice: `Orus`, single speaker.
- Text: the direction in square brackets, a blank line, then the lines separated by blank lines. tts.py's BRACKET
  layout makes exactly this for a single-speaker 3.8 request, byte for byte what `scripts/voice_match/gem.py` sent
  (`scripts/voice_match/replay_s3.py` asserts it).
- Direction, verbatim (the cast `profile`):
  `[A deep-voiced American guy in his twenties telling a crazy true story from his own life, first person, straight into a phone mic; confident, punchy and matter-of-fact, every sentence driven forward with no gaps between sentences, a little smug, landing each line hard on the last word; full, close and clear, not an announcer, not an audiobook, never whispery; steady natural speaking pace]`
- A re-take adds the take gate's fix inside the bracket (`; one continuous take, no pauses between sentences`).

## The speed-up (cast `tempo` 0.95, `rate` 1.45; tts.py `speed_up`)
On the WHOLE raw take, before anything else (trim, `post`, room, loudness, Whisper, the take gate, the line slices):
`atempo=0.95` (pitch kept), then `asetrate=34800,aresample=24000` (played 1.45x faster: pitch, formants and tempo all
rise by 1.45, with no pitch correction). In all, a take gets 1/(0.95 x 1.45) = 0.73x as long. This is the one
owner-approved exception to docs/voices.md's "never pitch-shift a voice", for this narrator only.

**Not kept from s3: its gap cut.** s3 also ran `silenceremove` (every gap over 0.1 s cut to 0.06 s). That edits inside
a continuous take, which STANDARDS 2b.4 forbids. Instead the take gate judges the sped-up take (0.3 s inside a line,
0.35 s between lines), and a take with pauses is re-taken with the fix above. The raw s3 take fails that gate. Its
sentence pauses are ~0.6-0.7 s as read, 0.37-0.51 s once sped up, so in production expect re-takes until Orus reads
with no gaps (see "Risk" below).

## Measured (out/voice_match/, not committed)
| | duration | pitch (p10-p90 spread) | nasal band | words/s speaking (overall) | cos to the owner's Short | cos to s3 |
|---|---|---|---|---|---|---|
| s3 as the owner heard it (gap cut) | 17.3 s | 208 Hz (10.7 st) | -7.5 dB | 5.94 (4.83) | 0.862 | 1 |
| the same raw take through tts.py (no cut, dry) | 21.4 s | 208 Hz (11.0 st) | -7.5 dB | 5.92 (3.90) | 0.836 | 0.977 |
| the owner's reference Short | - | 232 Hz (11.6 st) | -8.4 dB | 5.92 (5.52) | 1 | - |

So the voice is the same (pitch, melody, nasal band, speaking rate and 0.977 similarity to s3). The difference is the
4.1 s of pauses s3's cut removed, and the gate now rejects those pauses instead.

## Risk
Orus on 3.8-flash-tts paused ~0.6-0.7 s between sentences even with "no gaps between sentences" in the direction.
Whether the gate's re-take fix gets a gapless read is untested: it needs requests, and the free tier is ~10 a day on
3.8-flash-tts. If re-takes keep failing, there are two ways out, and both are the owner's call:
1. Allow `cap_pauses` (the silent middle only, 60 ms from speech, 30 ms crossfade) for this narrator's continuous takes.
2. Join a beat's lines with single newlines instead of blank lines (a prompt change, which re-keys the cache).

## Characters
One narrator says every line, quotes included (owner), so characters are rarely voiced. A character keeps its own
Gemini voice at natural speed, in its own request: tts.py refuses a request whose speakers differ in tempo/rate,
because the speed-up applies to the whole take. Orus is also `smith`'s voice. At 1.45x the narrator (~208 Hz) sits ~11 semitones
above him (~106 Hz), so speaker_check tells them apart.
