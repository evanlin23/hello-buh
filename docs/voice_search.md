# Voice search: a "Roblox story" first-person narrator (2026-11-10)

Owner, 2026-11-10: "I feel like the voice is not very good ... maybe we should go back to something that sounds like
the roblox voices? But not kokoro adam, bc that isnt expressive enough". Then: "it should be like a first person
narrator, maybe with something like the Roblox voice, just like higher quality, more expressive, but have like the
same pace, tone, etc." Then: "not 11 labs. We can use like the Gemini voices for the short ones, but we should
definitely try and find like a better like voice for like the Roblox like first person narrator." The cast defaults
are unchanged: the owner picks.

## What the "Roblox story" voice is (research)
- **No primary source names it.** The most common credit online is ElevenLabs' premade **Adam**: ElevenLabs' own
  help centre lists Adam, Brian and Liam as its voices most popular on TikTok and YouTube
  ([help article](https://help.elevenlabs.io/hc/en-us/articles/19012226601233-What-voices-are-popular-on-TikTok-YouTube-and-social-media));
  its library page calls Adam "one of the most recognizable voices on the internet"
  ([voice page](https://elevenlabs.io/voice-library/adam)); a Roblox-rant how-to recommends it
  ([recapio digest](https://recapio.com/digest/how-to-make-roblox-rant-videos-the-only-guide-you-need-by-nikita-cheldiev)).
  Others name TikTok's built-in "Jessie" voice ([a low-quality page](https://roblox-dub-script-auto-voice.pages.dev)).
- **Adam is off the table anyway.** Vacker v. Eleven Labs (D. Del. 1:24-cv-00987) alleges Adam was built from
  audiobook narrator Mark Boyett's recordings without consent
  ([complaint](https://storage.courtlistener.com/recap/gov.uscourts.ded.86708/gov.uscourts.ded.86708.1.0.pdf)). A
  soundalike would be imitating a real person's voice. We match the *delivery*, not the timbre.
- **What makes it work (my read; no source measured it):** one young-adult male voice, mid-low and clear; fast and
  even, with almost no gap between sentences; matter-of-fact and deadpan, so absurd details land as jokes by
  contrast; falling pitch at sentence ends; the energy rises only on the payoff. Send me two or three Shorts you mean
  and I'll measure their words per second, pitch and pauses the same way as the samples below.

## The samples (`out/voice_search/`, not committed)
Text for every sample: dog_hill lines 1-3, its sad line ("So every night now, I sit with him. Nobody should wait
alone.") and its excited line ("And then he stood up!"), then Light Sleeper's opening (lines 1-4). Every sample is
loudness-matched to -16 LUFS, with no other processing. `reel_all_six.mp3` plays all six with a beep between them.
Measured with Whisper base.en and an autocorrelation pitch track (silence means under peak - 30 dB, as in take_gate).
The pitch range is the 10th-90th percentile spread in semitones; a wider spread means more melody.

| file | what | licence | cost | median pitch | pitch range | words/s while speaking | pauses (median / max) |
|---|---|---|---|---|---|---|---|
| `g1_charon.mp3` | Gemini **gemini-3.8-flash-tts**, Charon, the direction below | Gemini API terms (output usable commercially) | $0, free tier (1 request) | 117 Hz | 9.2 st | **4.95** | 0.57 / 0.93 s |
| `g2_fenrir.mp3` | Gemini **gemini-3.8-flash-tts**, Fenrir ("excitable"), the same direction | Gemini API terms | $0, free tier (1 request) | 162 Hz | 13.8 st | 4.50 | 0.50 / 0.94 s |
| `c1_cb_ex05.mp3` | **Chatterbox** 0.5B (Resemble AI), its own default voice, exaggeration 0.5, one generation per paragraph | MIT | $0, local CPU | 152 Hz | 15.4 st | 3.46 | 0.33 / 0.56 s* |
| `c2_cb_ex085.mp3` | Chatterbox, the same voice, exaggeration 0.85 | MIT | $0, local CPU | 198 Hz | **15.8 st** | 3.62 | 0.36 / 0.55 s* |
| `k1_puck.mp3` | **Kokoro-82M** am_puck, speed 1.1 | Apache-2.0 | $0, local CPU | 116 Hz | 8.6 st | 4.80 | 1.01 / 1.07 s* |
| `k2_fenrir.mp3` | Kokoro-82M am_fenrir, speed 1.1 | Apache-2.0 | $0, local CPU | 140 Hz | 12.0 st | 4.59 | 0.88 / 0.97 s* |

\* These pauses are between the generations I joined myself. They can be set to any length, so they don't count against
the model. Whisper heard all 82 words correctly in all six samples. For reference, Pip (the current narrator)
measures about 235 Hz and about 3.2 words/s while speaking (voices/recipes/pip.md).

The Gemini direction was a single bracketed prefix, as in Pip's layout:
`[A guy in his early twenties telling his friend a crazy true story from his own life, first person; quick, steady
pace with no gaps between sentences; mostly deadpan and matter-of-fact so the weird details land funny, a dry smirk
in the voice; he goes quiet and honest on the sad line and gets genuinely hyped on the exciting one; warm, clear,
natural American voice, not an announcer, never whispery]`. A third request, Puck on gemini-2.5-pro-preview-tts,
came back 429 (out of quota), so there are 3 requests in total and none on flash-lite.

## The options at $0

The licences below are for the weights, not just the code. Speeds are on this 4-core container's CPU.

| option | commercial? | expressive | CPU speed | disk | word timings |
|---|---|---|---|---|---|
| Gemini TTS (30 prebuilt voices; 3.8 adds Voice design and an Extended Voice Library, [docs](https://aistudio.google.com/docs/speech-generation)) | yes | high, directed in words | cloud | 0 | no (Whisper, as now) |
| **Chatterbox** 0.5B ([repo](https://github.com/resemble-ai/chatterbox), [ONNX](https://huggingface.co/onnx-community/chatterbox-ONNX)) | MIT; the PyTorch version adds an inaudible PerTh watermark | high: an `exaggeration` dial (0-1); higher reads faster | ~13x slower than real time (a 30 s narration takes ~7 min) | 1.5 GB (ONNX, 4-bit LM); 3.2 GB (PyTorch) | no |
| Chatterbox-Turbo 350M ([page](https://www.resemble.ai/learn/models/chatterbox-turbo)) | MIT | tags such as `[laugh]` and `[sigh]`; no exaggeration dial | faster than Chatterbox | 0.7 GB (ONNX q4) | no; **it needs a reference clip**, and it ships no default voice |
| Orpheus 3B ([repo](https://github.com/canopyai/Orpheus-TTS)) | code Apache-2.0; weights are a Llama-3.2 fine-tune (Llama community licence, "Built with Llama") | high: 8 voices (leo, dan and zac are male), with `<laugh>` and `<sigh>` | a 3B model on 4 cores is far slower than real time | 2+ GB GGUF q4, 6.6 GB fp16; not tried here (disk) | no |
| F5-TTS ([weights](https://huggingface.co/SWivid/F5-TTS)) | **no**: the weights are CC-BY-NC-4.0, and it is a cloning model | - | - | 1.3 GB | no |
| StyleTTS2 ([repo](https://github.com/yl4579/StyleTTS2)) | code MIT; the pretrained checkpoints require disclosure, and their voices are real LibriTTS readers | medium | fast | ~0.7 GB | no |
| Kokoro-82M, other voices | Apache-2.0 | low (only speed and blends) | faster than real time | installed (0.33 GB) | **yes** (`tokens[].start_ts/end_ts`) |
| Piper | the engine is now GPL-3 (piper1-gpl); most English voices derive from lessac (research-only) or are CC-BY-NC | low | very fast | ~60 MB per voice | no (phoneme durations only) |

Not used: ElevenLabs (owner: "not 11 labs") and any cloning of a real person or commercial product.

## Recommendation
1. **Listen first:** `reel_all_six.mp3`. By the numbers, **g1 (Charon on 3.8-flash-tts)** has the Roblox shape: a
   low voice, the fastest delivery (4.95 words/s, Pip's is 3.2) and a deadpan, narrow melody. **c2 (Chatterbox, 0.85)**
   is the most expressive (the widest pitch range) and the only one that is unlimited, local and needs no quota. Its
   voice is lighter (~150-200 Hz), and it reads slower (3.6 words/s).
2. **If the owner picks Gemini (g1/g2):** add a cast entry `roblox_narrator` (voice Charon or Fenrir, the direction
   above as `profile`, `model: "gemini-3.8-flash-tts"` locked, `fallback` am_puck) and a recipe
   `voices/recipes/roblox_narrator.md`. Make it the default only on the owner's word. Take gate: its 0.57-0.93 s
   sentence gaps fail the opening limit (0.6 s between lines, 0.35 s inside a line) and sometimes the 0.8 s limit
   elsewhere. Expect `FIX["pause"]` re-takes, which come out of 3.8-flash-tts's own ~10 requests/day free quota. The next experiment worth one request is **Voice design** (`POST /v1beta/voices`, type `prompted`):
   it gives a persistent `voice_...` id from a text description, which should cut drift. It isn't tried yet.
3. **If the owner picks Chatterbox (c1/c2):** add a local engine to tts.py (`engine: "chatterbox"`,
   `model: "chatterbox-0.5b-onnx-q4"` locked, an `exaggeration` field in the cast entry, its own default voice, never a
   reference clip). The prototype is `scripts/voice_search/chatterbox_onnx.py`. One beat becomes one generation. Gate
   re-takes become free, but the FIX strings don't apply. Map each failure to a setting instead: a pause re-takes as one
   generation with a slight tempo or exaggeration change; whisper and breath are not seen. Re-takes need sampling
   (temperature), and the ONNX loop is greedy, so a re-take of the same text would come out identical. Ship the
   PyTorch build if retakes matter. Its word timings still come from Whisper (align.py).
4. Only Kokoro returns word timings natively. Gemini, Chatterbox and Orpheus all go through align.py as today.

Reproduce: `scripts/voice_search/` (`gem.py` = 1 Gemini request; `chatterbox_onnx.py`; `kokoro_sample.py`;
`measure.py`). The Chatterbox model was deleted after the run.

## Closest match (2026-11-10, by measurement)

The owner sent the exact voice they want: a 35.6 s Roblox story Short ("I don't have a twin. That's what I said at my
twin's wedding..."). It is the **primary reference**. Three public ElevenLabs **Adam** previews are the second reference
(ElevenLabs' own two preview mp3s for voice `pNInz6obpgDQGcFmaJgB`, 2.3 s and 5.3 s, and a 3.1 s copy found on a public
S3 bucket). Both were **only measured**: no model was ever given either one as a prompt or reference clip, and
neither is committed. The Short's narration was separated from its music with Demucs (htdemucs) before measuring.
Meter: `scripts/voice_match/vm.py` (Resemblyzer GE2E embedding from speaker_check.py, autocorrelation pitch, the
long-term spectrum, LPC formants, Whisper base.en for the rate).

### What the reference is: Adam, played about 1.45x faster

| | median pitch | pitch spread (p10-p90) | F1 / F2 / F3 | tilt | nasal band (0.8-1.5 kHz) | words/s speaking (overall) | pauses |
|---|---|---|---|---|---|---|---|
| **the owner's Short** (narration stem) | **232 Hz** | 11.6 st | **701 / 2054 / 3362 Hz** | -3.3 dB/oct | -8.4 dB | **5.92 (5.52)** | none: gaps 0.07-0.10 s, the longest 0.15 s |
| Adam previews, as published | 114-148 Hz | 3-11 st | 462-603 / 1398-1585 / 2160-2461 | -4.2 to -5.7 | -6.2 to -8.7 | 3.5-4.3 | - |
| Adam previews played 1.45x faster | 180-213 Hz | 7-11 st | 695-831 / 1931-2099 / 3497-3541 | -2.8 to -4.4 | -7.6 to -8.0 | 5.2-6.3 | - |

Cosine similarity of the Adam previews to the Short: **0.51-0.53 as published, 0.89-0.90 played 1.45x faster**
(resampled, so pitch, formants and tempo all rise together, like a speed change with no pitch correction). The peak is
at 1.4-1.5x (1.0x 0.54, 1.2x 0.67, 1.3x 0.82, 1.4x 0.90, 1.5x 0.89, 1.6x 0.87), and the formants line up there too.
So the voice in these Shorts is **ElevenLabs Adam sped up ~1.45x, pitch and all**. That is the owner's "deep bass but
somewhat nasally ... push stuff together": a deep voice, sped up, with every formant raised ~45%. It is also exactly what
`scripts/voice.py`'s old narrator did (`am_adam`, tempo 1.03, rate 1.45).

What this means for the search: **no unprocessed free voice comes close** (the best untouched voice scores 0.60:
Kokoro's best untouched blend 0.59, Gemini Puck 0.60). Every deep male voice played ~1.4x faster scores 0.83-0.89.
The speed-up does most of the matching; the choice of voice adds the last ~0.05. Post-processing *did* fail before
(the Charon variants), but those changed pitch and formants without the tempo; this one is the reference's own chain.
It does break docs/voices.md's "never pitch-shift a voice" (asetrate) rule, so it is the owner's call.

### Ranking (cosine similarity to the Short; best playback rate in brackets)

Kokoro and Gemini voices were scored on the same two sentences; Gemini's prebuilt voices on Google's public Chirp 3 HD
samples of the same names (cloud.google.com text-to-speech "Chirp 3: HD voices"), plus 2 live requests.

| rank | candidate | licence | untouched | best (rate) |
|---|---|---|---|---|
| ref | Adam preview (S3 copy) / (ElevenLabs preview) | not usable | 0.52 / 0.51 | 0.90 / 0.89 (x1.45) |
| 1 | Gemini **Orus**, Google's public sample | Gemini API terms | 0.59 | **0.887** (x1.4) |
| 2 | **Kokoro blend A**: am_adam 0.74, am_fenrir 0.19, am_santa 0.07 | Apache-2.0 | - | **0.886** (x1.4) |
| 3 | Kokoro blend B: am_adam 0.69, am_onyx 0.10, am_fenrir 0.09, am_puck 0.07, am_liam 0.06 | Apache-2.0 | - | 0.884 (x1.45) |
| 4 | Gemini Achird, public sample | Gemini API terms | 0.55 | 0.882 (x1.4) |
| 5 | Kokoro blend C: am_adam 0.66, am_fenrir 0.24, am_santa 0.10 | Apache-2.0 | - | 0.880 (x1.45) |
| 6 | Gemini Puck, public sample | Gemini API terms | 0.60 | 0.875 (x1.4) |
| 7 | Gemini Sadaltager / Iapetus / Schedar, public samples | Gemini API terms | 0.50-0.51 | 0.864-0.873 |
| 8 | Kokoro **am_adam** alone (the old narrator's voice) | Apache-2.0 | 0.53 | 0.868 (x1.45) |
| 9 | Gemini Charon, public sample (the rejected g1) | Gemini API terms | 0.46 | 0.845 (x1.5) |
| 10 | Gemini Orus / Achird, **live takes** with the direction in `scripts/voice_match/gem.py` | Gemini API terms | 0.52 / 0.48 | 0.837 / 0.833 (x1.45 / x1.4) |
| 11 | Kokoro am_fenrir / am_puck | Apache-2.0 | 0.59 / 0.57 | 0.825 / 0.823 (x1.3 / x1.35) |
| 12 | Kokoro am_liam, am_santa, am_echo, am_onyx, am_michael, bm_fable, bm_lewis, bm_george, am_eric, bm_daniel | Apache-2.0 | 0.42-0.55 | 0.80 down to 0.69 |
| 13 | Chatterbox's built-in voice (its `default_voice.wav`, which sets the timbre) | MIT | 0.50 | 0.766 (x1.35) |
| - | the best **untouched** Kokoro blend (am_puck 0.51, am_fenrir 0.09, am_liam/echo/adam/eric 0.10) | Apache-2.0 | 0.59 | - |

The blends were searched by `scripts/voice_match/search.py`: 40 random mixes of the 6 best voices, then 25 steps of
moving 0.1 of weight between pairs for the best 3, at rates 1.0-1.5. Speed was left at 1.0 for the search, because
Kokoro's speed changes only durations. Chatterbox wasn't downloaded: its built-in voice scored lowest, and it was
rejected before.

### The four samples (`out/voice_match/`, not committed)

Each reads the four texts from the top of this page (82 words) and is loudness-matched to -16 LUFS. `reel_top4.mp3`
plays s1-s4 with a beep between. Rate = the playback speed-up (pitch and formants rise with it). "Natural" is the
voice's own words/s while speaking before any speed change. Whisper heard every sample the same, with no misheard words
beyond its usual number and homophone slips ("share" for "shear").

| file | voice | natural rate | speed change | cos | pitch (spread) | F1/F2/F3 | tilt | nasal | words/s speaking (overall) | gaps |
|---|---|---|---|---|---|---|---|---|---|---|
| **the Short** | - | - | - | 1 | 232 Hz (11.6 st) | 701/2054/3362 | -3.3 | -8.4 | 5.92 (5.52) | 0.07-0.10 s |
| `s1_kokoro_blend_a` | blend A | 3.9 | Kokoro speed 1.10, rate 1.40 (1.54x) | **0.872** | 200 Hz (8.1 st) | 629/1939/3433 | -4.7 | -9.7 | 5.84 (5.05) | 0.06-0.09 s |
| `s2_kokoro_blend_b` | blend B | 3.9 | speed 1.05, rate 1.45 (1.52x) | **0.876** | 184 Hz (7.6 st) | 667/1986/3507 | -5.0 | -9.2 | 5.82 (5.05) | 0.06-0.09 s |
| `s3_gemini_orus` | Orus, gemini-3.8-flash-tts, 1 request | 4.4 | gaps cut to 0.06 s, tempo 0.95, rate 1.45 (1.38x) | 0.862 | 208 Hz (**10.7 st**) | 635/1872/3301 | -5.0 | **-7.5** | 5.94 (4.83) | 0.12-0.15 s |
| `s4_gemini_achird` | Achird, gemini-3.8-flash-tts, 1 request | 4.3 | gaps cut to 0.06 s, rate 1.40 | 0.865 | 178 Hz (7.2 st) | 578/1860/3458 | -5.3 | -9.1 | 5.92 (4.75) | 0.11-0.23 s |

What the numbers say:
- **Timbre:** the Kokoro blends are closest (0.87-0.88), within about 0.02 of real sped-up Adam (0.89-0.90).
- **Melody:** the Short swings 11.6 semitones. Kokoro manages ~8, which is the "not expressive enough" the owner heard
  in Kokoro Adam. Orus, directed, gets 10.7.
- **Nasal band:** Orus is closest (-7.5 against -8.4); Kokoro sits 1.3 dB under it.
- **Pace:** each sample was tuned to 5.8-5.9 words/s while speaking, matching the Short's 5.9 ("the fast pace is
  good", owner 2026-11-10). The Short's overall rate (5.5) is higher than the samples' (4.8-5.1) because its sentences
  are longer than this text's three-word fragments ("Not for rain.").
- **Speed change needed:** Kokoro reads at 3.9 words/s on its own, so it needs ~1.5x in total: Kokoro speed 1.05-1.10
  (near natural) and the 1.4-1.45 playback rate that makes the timbre. Gemini, directed at a "steady natural pace",
  reads at 4.3-4.4, so it needs only the rate (1.38-1.40x). Neither reaches 5-5.5 words/s untouched; neither does
  Adam itself (3.5-4.3 in its previews).

Gemini requests: 2 (Orus and Achird on gemini-3.8-flash-tts; none on flash-lite). The third was not spent.

### Recommendation

Listen to `reel_top4.mp3`. **s1/s2 (Kokoro blend, x1.4)** are the closest by measurement, and they're free, local,
unlimited and come with word timings. They are also, in effect, the old 1.45x Kokoro narrator with a slightly
different voice. Earlier the owner found that "not expressive enough" and its delivery "kinda bad" (docs/story_craft.md),
though that delivery also had no planned pauses. **s3 (Gemini Orus, x1.45)** is a little further in timbre (0.86) but
has the Short's melody (10.7 st) and nasal band. If expressiveness is what the owner misses, s3 is the pick, at one
Gemini request per take. Decide by ear; voices/cast.json is unchanged.

### If the owner picks a Kokoro blend: how the pipeline would use it

`scripts/voice.py` already has the chain: `NARRATOR = {"voice", "tempo", "rate"}`, Kokoro at `tempo`, then
`speed_up(x, rate)` (an FFT-band-limited resample that raises pitch and tempo together). Its chunk times are Kokoro's
own word timestamps divided by the rate. The only new piece is a blended voice:
- **Cast entry** (voices/cast.json, owner's word only):
  `"roblox_narrator": {"engine": "kokoro", "model": "kokoro-82m-v1.0", "blend": {"am_adam": 0.74, "am_fenrir": 0.19, "am_santa": 0.07}, "speed": 1.10, "rate": 1.40, "gap": 0.04, "color": "#FFFFFF"}`
  (blend B: the weights above, speed 1.05, rate 1.45).
- **Blend:** `pack = sum(w * pipe.load_single_voice(v) for v, w in blend.items())`, then `pipe(text, voice=pack, speed=speed)`.
  KPipeline takes a tensor as `voice`. The weights sum to 1, and the pack is deterministic, so the voice never drifts.
- **Word timings:** native. `tokens[].start_ts / end_ts` divided by `rate`, as voice.py does now; no align.py/Whisper.
- **Pauses:** one generation per sentence, each trimmed and joined with `gap` s (0.04 s, so 0.03 s after the rate).
  The Short has none longer than 0.15 s. Planned beats (docs/story_craft.md "Pauses are the delivery") become explicit
  `gap` values per line.
- **Take gate (scripts/take_gate.py):** mostly doesn't apply. Kokoro can't breathe, whisper or clip a word, and its
  pauses are the ones we insert. Keep only the `words` check (Whisper against the script), which catches G2P misreads.
  A failure can't be fixed by a re-take, because the same text gives the same audio. Fix it by respelling the word in
  the spoken text (voice.py already lowercases CAPS for speech).
- **Speaker and drift checks:** the blend's own output is its reference voiceprint. It can't drift, so voice_drift is
  a formality.

### If the owner picks Gemini Orus (s3)
Add the same `rate` (1.45) as a `post` step after the take (an `asetrate`-style resample, not rubberband), and keep
the direction in `scripts/voice_match/gem.py`. Cap the gaps at 0.06 s before the rate (tts.py `cap_pauses`). The
take gate applies as now; its pause limits are looser than this voice needs.

Reproduce: `scripts/voice_match/` (`vm.py` the meter, `search.py` the blend search, `score_files.py` to score sample
files, `sample.py` for a Kokoro blend sample, `gem.py` for 1 Gemini request). Demucs was installed in a scratch folder
only to separate the reference, and was deleted afterwards. No reference audio is in the repo.
