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
