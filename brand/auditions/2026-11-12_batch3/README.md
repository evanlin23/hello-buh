# Casting audition: Jonah and the Pulled Away man (2026-11-12, batch 3)

An audition only: no story and no cast entry is changed (`voices/cast.json` untouched; the owner picks).
Video: `voice_audition_batch3.mp4` (32 s, 0.6 MB): Pip's REF line, then A, B, C, each clip played twice.

**How the clips were made.** One single-speaker request per candidate on **gemini-3.8-flash-tts** (3 requests,
this session's whole allowance; flash-lite is HelloBuh's today). Stock voices only, no reference audio. Pip's
layout: the bracket, a blank line, the line in plain sentence case. Cut by `tts.cut`
(`scripts/brand_voice/audition_one.py`); prompts in `take_A.json`..`take_C.json`.
- **Jonah** (The Honey Thief L05, also Six Thousand Torches), one bracket for both:
  `[A friendly teenage boy, bright and goofy]`, "You're my favorite, little guy."
- **The Pulled Away man** (L05), the branch's bracket: `[A man in his thirties, plain and steady, normal volume]`,
  "Someone's been alone a long time."

**Measures.**
- **Speaker check** (`scripts/speaker_check.py`, `--only C01`, with Pip's 14 dog_hill narrator lines as the
  narrator): words, edges, CLIPPED listener.
- **Contrast** (`scripts/voice_contrast.py`): the Resemblyzer cosine to Pip's mean, against the bar = Pip's own lines'
  leave-one-out p10 (0.836); f0 is the median pitch; st is semitones from Pip (215 Hz).
- **Listener** (`scripts/who.py`, gemini-3-flash-preview, blind, one clip at a time): backwards (voice_contrast's
  read, which hears the voice, not the words) and forwards (the audition's listener).

| | Voice | Role | File | f0 | st Pip | sim Pip (bar 0.836) | Speaker check | Listener backwards | Listener forwards |
|---|---|---|---|---|---|---|---|---|---|
| REF | Pip (Leda, flash-lite) | narrator | `ref/pip_dog_hill_L02.mp3` | 215 | 0 | (bar 0.836) | | | |
| A | Zubenelgenubi | Jonah | `A_jonah_Zubenelgenubi_gemini-3.8-flash-tts.mp3` | 151 | 6.1 | 0.528 | ok | man 25-35 | man 25-40, "father": warm, resonant, mid-pitch, gentle |
| B | Sadachbia | Jonah | `B_jonah_Sadachbia_gemini-3.8-flash-tts.mp3` | 216 | 0.1 | 0.564 | ok | man 20-35 | man 25-40, "father": warm, resonant, playful, mid-pitch |
| C | Algieba | Pulled Away man | `C_man_Algieba_gemini-3.8-flash-tts.mp3` | 103 | 12.7 | 0.555 | ok | man 30-50 | man 45-60, "father" (could be a grandfather): deep, gravelly, calm |

voice_contrast: OK, 0 blockers, 0 warnings for all three (Jonah wants male 13-20; the man male 25-45).

For context, the same embedding against the library samples (`voices/samples/`): A is closest to smith (0.73),
B to buh / friend (0.66 / 0.67), C to elder (0.67); none is close enough to be confused (all under 0.75).

## Reading

- **Every take clears Pip by a wide margin** (0.53-0.56 against a 0.836 bar): no risk of the Sulafat problem.
- **Jonah: neither voice is heard as a teenager.** Both listeners hear a man in his twenties or thirties.
  - **A Zubenelgenubi** is the furthest from Pip in timbre and 6 semitones under her, but it is warm and gentle, a
    "father", and the nearest of the three to the Smith's sample.
  - **B Sadachbia** is the youngest-heard (20-35 backwards) and "playful", which suits "bright and goofy". Its pitch
    is Pip's own (216 Hz), so it stands apart by timbre alone; 0.564 is still far under the bar.
- **The man: Algieba** passes and reads as a man, but older than the bracket asks: 30-50 backwards, 45-60 forwards,
  deep and gravelly at 103 Hz (in the elder / smith / villain band, none of whom are in Pulled Away). Umbriel is
  tomorrow's comparison.

**Recommendation.** Jonah: **B Sadachbia** (younger and more playful; timbre clearly apart from Pip), with A as the
fallback if the owner hears B as too close to Pip's pitch in a scene. If the owner wants him to sound truly teenage,
neither is: a later round with a different voice is the fix. The man: **hold Algieba** until Umbriel is heard
tomorrow; Algieba is usable but reads nearer fifty than thirty.
