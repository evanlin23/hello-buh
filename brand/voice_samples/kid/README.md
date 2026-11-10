# Kid narrator candidates, round 2 (2026-11-10). Owner: "i think it should still sound like a child".
Text (all): the same 78 words (Light Sleeper vNext L01-04 + Dog on the Hill vNext L01-03).
Model: gemini-3.8-flash-lite-tts, generateContent, Pip's layout ("[direction]" + the text). No pitch shift on any take.
Chain: silences capped at 0.12 s, then an atempo (pitch kept) up to about 5.0 words/s while speaking, then -16 LUFS.

reel_kid_brand_pace.mp3  the six at the brand pace, a beep between each, in this order
reel_kid_natural.mp3     the same takes at their own pace (gaps capped only)

| # | file | voice + direction | natural w/s | atempo -> w/s | pitch | cold listener (brand pace, 1 listen): age / sex / sounds like / clarity / grating |
|---|---|---|---|---|---|---|
| 1 | k1_pip | Leda, Pip's bubbly direction + "one breath, keep going: each new sentence lifts, hit the key word" | 3.72 | 1.40 -> 4.92 | 229 Hz | 20-25 / male / AI / 10 / 3 |
| 2 | k2_cheeky | Leda, "cheeky kid who can't wait to tell you ... bouncing higher" | 3.60 | 1.44 -> 4.83 | 229 Hz | 18-25 / female / adult playing a kid / 10 / 2 |
| 3 | k3_deadpan | Leda, "deadpan kid ... like it's totally normal ... a little smug on the key word" | 4.25 | 1.22 -> 4.97 | 178 Hz | 20-30 / female / AI / 10 / 2 |
| 4 | k4_sleepover | Leda, "spooky-funny story at a sleepover, fast and gleeful" | 4.07 | 1.28 -> 5.01 | 211 Hz | **10-14** / female / AI / 9 / 4, "rushed" |
| 5 | k5_laomedeia | Laomedeia, the k1 direction | 3.93 | 1.32 -> 5.00 | 198 Hz | 15-22 / male / adult playing a kid / 10 / 2 |
| 6 | k6_zephyr | Zephyr, the k1 direction | 4.07 | 1.28 -> 4.95 | 193 Hz | 20-30 / female / AI / 10 / 2 |
