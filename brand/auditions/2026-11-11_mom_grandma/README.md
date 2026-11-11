# Casting audition: Mom and Grandma (2026-11-11)

The owner's note, after watching the held cuts: "The moms voice is too similar to narrator, need a new voice. Grandma
sounds like a dude still. Can you explore options?" (r:rc31bfe, STANDARDS 2.7). This is an audition only: no story is
changed. The review video is on the review page (shorts `audition_voices`).

**How the clips were made.** Stock Gemini voices only (no reference audio, no designed voice). Two voices per request
(multi-speaker, speakers labelled Anna/Beth), cut per speaker at Whisper's word times
(`scripts/brand_voice/audition.py`). Today's model is **gemini-3.1-flash-tts-preview**: 3.8-flash-tts was spent
(10/10) and flash-lite is the narrator's. Five requests in total. Direction, one short bracketed clause:
- Mom: `[A warm mother around forty, low, calm and steady]`, reading "Walk soft, sweetie. The ground's a light
  sleeper." / "Sweetie, don't move."
- Grandma: `[An old grandmother in her seventies, warm, slow and a little dry]`, reading "One's plenty, sweetie."

**Measures** (`scripts/brand_voice/measure.py`, `who.py`):
- **f0** is the median pitch in Hz.
- **st Pip** is the semitones from Pip's 215 Hz.
- **sim** is the speaker-embedding cosine (Resemblyzer, as speaker_check):
  - to Pip (dog_hill's 14 narrator lines);
  - to the current Mom, Sulafat (Light Sleeper L05/L15, f0 215);
  - to Gold's Grandma **on main** (L08: Gacrux on 3.1 with Gold's long profile; the video's card wrongly says
    Vindemiatrix, and the column keeps that name). The real Vindemiatrix take is on Gold's branch
    (claude/story-gold-portal L10, 3.8-flash-tts) and is measured in its own row below; f0 110).
  - Higher means closer. For reference, the current Mom's L05 is 0.853 to Pip, which is the owner's "too similar".
- **Listener**: a blind Gemini listener (gemini-3-flash-preview, one clip at a time, no names or script) says who it
  hears. Its "role" leans on the words ("sweetie" makes everyone a mother), so its **sex and age** are what matter.
  The first six clips also went to gemini-3.5-flash, until that model's 20/day ran out; those results are in brackets.

| | Voice | File | f0 | st Pip | sim Pip | sim Sulafat | sim Vindemiatrix | Listener (sex, age, role) |
|---|---|---|---|---|---|---|---|---|
| REF | Pip (narrator) | `ref/pip_dog_hill_L02.mp3` | 215 (the reference) | 0 | 1 (the reference) |  |  | woman, 18-25, young woman |
| REF | Mom now: Sulafat | `ref/sulafat_L05.mp3` | 213 | 0.1 | 0.853 | 0.965 | 0.654 | woman, 30-45, mother |
| REF | Grandma on main: Gacrux (labelled Vindemiatrix in the video, wrongly) | `ref/gacrux_gold_main_L08.mp3` | 110 | 11.5 | 0.718 | 0.682 | 1.0 | woman, 40-55, mother |
| REF | Grandma on Gold's branch: Vindemiatrix (3.8) | `ref/vindemiatrix_gold_branch_L10.mp3` | 170 | 4.0 | 0.648 | 0.628 | 0.729 | (not listened) |
| A | Mom A: Kore | `A_mom_Kore_gemini-3.1-flash-tts-preview.mp3` | 180 | 3.1 | 0.755 | 0.803 | 0.702 | woman, 30-45, mother |
| B | Mom B: Despina | `B_mom_Despina_gemini-3.1-flash-tts-preview.mp3` | 182 | 2.9 | 0.763 | 0.811 | 0.681 | woman, 25-40, mother |
| C | Mom C: Aoede | `C_mom_Aoede_gemini-3.1-flash-tts-preview.mp3` | 178 | 3.3 | 0.791 | 0.834 | 0.677 | woman, 30-45, mother (3.5-flash: woman, [28, 42], mother) |
| D | Mom D: Pulcherrima | `D_mom_Pulcherrima_gemini-3.1-flash-tts-preview.mp3` | 176 | 3.5 | 0.799 | 0.837 | 0.664 | woman, 30-45, mother |
| E | Mom E: Callirrhoe | `E_mom_Callirrhoe_gemini-3.1-flash-tts-preview.mp3` | 162 | 4.9 | 0.775 | 0.831 | 0.686 | woman, 30-45, mother (3.5-flash: woman, 30-45, mother) |
| F | Mom F: Gacrux | `F_mom_Gacrux_gemini-3.1-flash-tts-preview.mp3` | 160 | 5.1 | 0.775 | 0.815 | 0.669 | woman, 30-45, mother |
| G | Grandma G: Gacrux | `G_grandma_Gacrux_gemini-3.1-flash-tts-preview.mp3` | 168 | 4.3 | 0.707 | 0.651 | 0.77 | woman, 55-75, grandmother (3.5-flash: woman, 55-70, grandmother) |
| H | Grandma H: Erinome | `H_grandma_Erinome_gemini-3.1-flash-tts-preview.mp3` | 168 | 4.3 | 0.68 | 0.642 | 0.759 | man, 55-75, grandfather (3.5-flash: woman, 65-75, grandmother) |
| I | Grandma I: Kore | `I_grandma_Kore_gemini-3.1-flash-tts-preview.mp3` | 190 | 2.1 | 0.848 | 0.782 | 0.717 | woman, 55-70, grandmother (3.5-flash: woman, 55-70, grandmother) |
| J | Grandma J: Autonoe | `J_grandma_Autonoe_gemini-3.1-flash-tts-preview.mp3` | 237 | 1.7 | 0.661 | 0.577 | 0.768 | woman, 65-85, grandmother (3.5-flash: woman, 35-55, mother) |

## Reading

- **Mom.**
  - Every candidate sits 3 to 5 semitones under Pip (160 to 182 Hz). The current Sulafat sits at Pip's own
    215 Hz, and the embedding agrees: Sulafat's L05 is 0.853 to Pip, the candidates 0.755 to 0.799.
  - Furthest from Pip: **A Kore** (0.755, 180 Hz) and **B Despina** (0.763), but the listener calls Despina
    "breathy", which the house rules don't allow.
  - Lowest and steadiest: **E Callirrhoe** (162 Hz) and **F Gacrux** (160 Hz).
  - Finalists for 3.8: **Kore and Callirrhoe** (Gacrux is kept for Grandma).
- **Grandma.**
  - **H Erinome is out:** one of the two blind listeners hears a man ("grandfather").
  - **G Gacrux** (168 Hz) is heard as a woman of 55 to 75 by both listeners, and is far from Pip (0.707).
  - **I Kore** is heard as a grandmother too, but her voice is 0.848 to Pip, as close as the current Mom. She's out
    for Grandma (and is a Mom finalist).
  - **J Autonoe** is the furthest from Pip (0.661), but the only high one (237 Hz), heard as a grandmother by one
    listener and a mother by the other.
  - Gold's Grandma on main (Gacrux with Gold's long profile) sits at 110 Hz, the low, gravelly read. The same
    Gacrux with the audition's short clause (G) is 168 Hz.
  - The Vindemiatrix take the owner heard as a man (Gold's branch, 3.8) measures 170 Hz, the same pitch as G, H
    and I. Pitch alone doesn't explain "a dude": the timbre does. **Autonoe (J), the owner's pick, is the one
    clearly higher voice (237 Hz)** and the furthest from Pip.
  - Finalists: **Gacrux**, then **Autonoe**, plus the library voice **en-us-concierge-11**, which runs on 3.8 only.
- **Model.** Gold's Grandma was voiced on gemini-3.1-flash-tts-preview, so these Grandma clips are already on her
  story's model. Light Sleeper's Mom is on gemini-3.8-flash-tts: the Mom finalists get re-read on 3.8 tomorrow
  (after 08:30 UTC) before the cast is set.
