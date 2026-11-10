# Kid narrator, round 3 (2026-11-10): Light Sleeper's real r-cast narrator lines
Text: stories/light_sleeper/script_vNext.md "r-cast", the narrator's lines only: L01-03, L06-14 and L16. Mom's L05 and
L15 are left out, and so is the lead-in L04 ("Mom says:"). 120 words; the bold stress words are in CAPS (one per sentence).
Model: gemini-3.8-flash-lite-tts, voice Leda, Pip's layout. No pitch shift. Silences capped at 0.12 s, atempo 1.15
(pitch kept, the new cap), -16 LUFS. *_natural.mp3 = no atempo.

reel_kid_r3.mp3          r1, r2, r3, r0 with a beep between each (atempo 1.15)
reel_kid_r3_natural.mp3  the same takes without the atempo

| take | direction (all end "One breath, keep going: each new sentence lifts, stress only the capitalised word") | natural w/s | at 1.15 | pitch | Whisper words | cold listener |
|---|---|---|---|---|---|---|
| r1_pip | Pip's bubbly-nine-year-old direction | 4.23 | 4.72 | 188 Hz | 95.5 % ("tonight" heard as "to date", "stepped" as "stopped") | age 10-14, "adult playing a kid", clarity 9, grating 3, pace right; heard "nine thousand" as "knitted" |
| r2_proud | "proudly telling a friend about their town, as if every weird thing were totally normal and kind of cool" | 3.68 | 4.12 | 216 Hz | 97.1 % ("wells echo" heard as "well zeko") | (listener 503) |
| r3_figuring | "figuring the world out loud, sharing fun facts they got a little bit wrong, completely sure of themselves" | 3.99 | 4.44 | 219 Hz | 97.1 % ("a sweater" heard as "us water") | (listener 503) |
| r0_nodirection | NO direction (the bracket was "[x]"; a request I sent by mistake, kept as a baseline) | 3.84 | 4.34 | 205 Hz | 97.6 % | (listener 503) |
Not made: r4 show-and-tell (Leda), and the k4 sleepover direction on Laomedeia and Autonoe. Flash-lite returned a 429
(probably the day's limit, after about 10 successful requests today), so I stopped.
