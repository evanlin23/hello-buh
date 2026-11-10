# Pip (dog_hill narrator): how the voice the owner liked was made

Owner, 2026-11-10, on dog_hill_voices_v3: "i kinda like the pip here"; later "what about pip? i liked the audio i sent
earlier". This is that take, reproducible.

## The request (one request, all ten narrator lines)
- Model: `gemini-3.8-flash-lite-tts` (2.5-flash/pro-preview-tts and 3.8-flash-tts were out of daily quota at the time;
  3.1-flash-tts-preview refused an earlier take with finishReason SAFETY).
- Voice: `Leda`, single speaker (`voiceConfig.prebuiltVoiceConfig.voiceName`).
- Text: a SHORT bracketed direction, a blank line, then the lines separated by blank lines. No ellipses anywhere
  ("..." made the model stop and whisper). Exact JSON body: `voices/recipes/pip_request.json`.
- Direction, verbatim:
  `[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery, breathy or soft]`
- Response: audio/wav (decode with ffmpeg, not as raw PCM). 35.2 s for 96 words.

## Post-processing
None in the voice: no tempo, no pitch shift (the cast library's +2 st lift added warble), no EQ. The edit (edit.py
--story) normalizes loudness like every story line.

## Cutting
`voice_check.py --resplit` (main 9a815b2+): the quietest point between lines, >= 80 ms before the first word and
>= 200 ms after the last, 12 ms fades, no splicing inside lines. Then `scripts/voice_edges.py stories/dog_hill`: 0 cut.
(My first cut capped pauses inside lines at 0.2/0.3 s by splicing: the owner heard words cut off. Don't.)
The raw take is cached at `stories/dog_hill/voice/pip_take.f32` (24 kHz mono float32; not in git, 3.4 MB) and was
`work/fast/take.f32` in the dog_hill session.

## Measured
Median pitch 208-258 Hz per line (about 235); 96 words in ~30 s of line audio, about 3.2 words/s while speaking.

## Why this Leda sounded better than the Good Boy one (my read, untested)
Most likely the model plus the direction: 3.8-flash-lite with "bubbly ... fast, bright, energetic; not whispery,
breathy or soft" read at natural pitch with energy, while the library recipe lifted Leda ~2 semitones
(asetrate 1.12) and/or sped it 1.5x, which pushes her into the squeaky range. No post filter is the safer default.
