# HelloBuh: brand identity (draft, 2026-11-10)

Owner, 2026-11-10: "Im thinking we do the unique voices", "Instead of the sped up trying to copy", "We need a brand
identity", "I think the narrator does all of it essentially, plus short lines from other characters" (STANDARDS 2.00).
The owner picks the voice. `voices/cast.json` is unchanged. Candidates: `out/brand_voice/` (not committed; README there).

**The promise:** *one Minecraft world, one voice, and every Short is the weirdest thing that ever happened in it.*

## Why these choices (the evidence, and how strong it is)
- **Reach depends on the first seconds.** An *engaged view* is one that "stayed to watch past the initial seconds"
  ([YouTube Help](https://support.google.com/youtube/answer/12220281)). Retention metrics still run on engaged views
  after the 2026 view-count change ([YouTube Blog](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)).
  **Strong.** So nothing branded may play *before* the hook. This is our inference, not a YouTube rule.
- **Feed viewers rarely see a Shorts thumbnail.** The Shorts lead said so on Creator Insider
  ([video](https://www.youtube.com/watch?v=n3jsYK_-aRU); quote via a transcription, not checked by us); thumbnails show
  on search and channel pages ([Tubefilter](https://www.tubefilter.com/2023/01/18/youtube-shorts-thumbnails-analytics-ads-creator-insider/amp/)).
  **Moderate.** Frame 1 is the thumbnail.
- **Distinctive assets must be unique as well as consistent.** An asset that every competitor also uses builds no
  link to our brand ([Ehrenberg-Bass](https://marketingscience.info/news-and-insights/brands-need-distinctive-assets),
  [Romaniuk](https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets)). **Moderate** (a general brand
  framework, not about voices). This is the case against the sped-up stock voice the whole genre uses: viewers notice
  it ([forum thread](https://boards.straightdope.com/t/whats-up-with-this-ubiquitous-ai-voice/1020355), **thin**).
  YouTube's July 2025 "inauthentic content" clarification also targets templated, mass-produced sameness
  ([SEJ](https://www.searchenginejournal.com/youtube-monetization-update-spam-not-reaction-channels/550755/), **moderate**).
- **Familiar voices are easier to understand**, even when listeners don't consciously recognise them (Holmes,
  Domingo & Johnsrude 2018, Psychological Science; via [Neuroscience News](https://neurosciencenews.com/familiar-voice-understanding-9936/amp/)).
  **Moderate and indirect:** it supports one voice across every Short.
- **Captions:** 69% of US adults watch with the sound off in public, and 80% say captions make them more likely to
  finish a video (Verizon Media and Publicis, a 2019 survey; [Next TV](https://www.nexttv.com/news/mobile-videos-often-watched-without-audio-study-finds)).
  **Moderate**, self-reported. Bold word-by-word captions are now the default everywhere, so the caption *style*
  won't set us apart. Only our colours and rules can. Vendor numbers like "+34% watch time" are **thin**; we don't cite them.
- **Sonic logos:** in one study, more complex melodies were easier to recognise but harder to recall
  ([Silas et al.](https://www.repository.cam.ac.uk/items/903c50f3-6d66-4721-af94-7c037073b139), **strong** for that
  finding only). Nothing rigorous gives the right length; "1-5 s" is practitioner lore (**thin**). Hence: optional,
  short, under the hook, and A/B tested.
- **A recurring world and characters:** YouTube's 2026 trends report shows young viewers following original animated
  *series* ([Tubefilter](https://www.tubefilter.com/?p=191734)); Skibidi Toilet is the Shorts-native case
  ([Cartoon Brew](https://www.cartoonbrew.com/animators/dafuqboom-youtube-alexey-gerasimov-skibidi-toilet-230239.html)).
  **Moderate**, but these are single cases. Our canon (docs/world/canon.md) is already this asset.
- **Titles:** no YouTube document says how Shorts titles show in the feed. Third-party pages say they are cut at about
  40-60 characters ([vidIQ](https://vidiq.com/blog/post/youtube-shorts-titles/)). **Thin.** Keep titles short and put
  the strange part first.

## The narrator: "the house voice"
- **Who:** the voice of the HelloBuh world. Whoever lived the story tells it, and they all speak in this one voice:
  kid Buh in Light Sleeper, Pip on Dog Hill, the dog in Good Boy. One actor plays every "I", like a friend doing all
  the parts at a sleepover. The narrator is never named and never says Buh's name (STANDARDS 1.8).
- **Age and attitude: a happy, bubbly kid who's figuring the world out** (STANDARDS 2.000). The owner, 2026-11-10:
  "i think it should still sound like a child", then "it should sound happy, bubbly. maybe like a child that doesnt
  understand teh wrold? like theyre figuring it out? I kinda like pip."
  - **Who it sounds like:** a kid of about 9-11, Pip-based (Leda). The age is never said aloud. It's in a TTS direction
    only where the model accepts it, as Pip's recipe does. Most of the stories' "I"s are kids anyway (kid Buh, Pip).
  - **The comedy is the misreading.** The kid says the strange detail proudly and innocently, as if it were normal,
    and the viewer understands what the kid doesn't: "Our bell is wrapped in wool. I've never heard it!" said as a fun
    fact, not a clue. That's how one cheerful voice carries a creepy twist without going hushed (STANDARDS 1.6).
  - **Never:** hushed, breathy, whispery, squeaky or cartoonish. For the one line per story that matters, the kid goes
    plain and puzzled ("Why would he do that?"), not sad-voiced.
- **Relationship to Buh and the world:** grew up in this world and takes its rules for granted (the carpets, the boxed
  bell, the dog). It talks about the places like home ("our bell", "my village"), and it's fond of Buh.
- **Clarity first** (the owner: "The no pause only works if tis clear what is beign said ... somehow in the ohter ones
  i never get lost"):
  - **Write for the ear:** one short thought per sentence, in time order, joined by So, Then and But. One spoken stress
    per sentence, on its last key word. The captions still colour one key word per chunk.
  - **Perform it fast, don't cut it fast.** The take is directed continuously ("one breath, keep going: each new
    sentence lifts, hit the key word"). A take performed with pauses and then cut confused the owner. `pause_cap` is
    only a safety net.
  - **Keep any speed-up mild.** Round 2 showed that an atempo of 1.3-1.4, needed to push a kid voice from about 4 to 5
    words/s, made 5 of 6 voices sound like adults to a cold listener. If the kid reads slower than 5.0, keep the kid and
    the clarity and let the pace give way. The direction should get the speed, not the filter.
  - **Check:** a cold listener, audio only, one listen: "could you follow it?", their transcript against the script,
    and the age they hear (`scripts/brand_voice/coldlisten.py`).
- **Voice spec:**

| | spec | check |
|---|---|---|
| words/s while speaking | **5.0-5.5 as performed** (about 4.6-5.0 overall on short-fragment scripts). If the kid voice can't reach it, clarity and the kid sound win over the number | pace, cold listener |
| silences inside a take | performed short; **0.12 s** cap as a safety net (tts.shorten_pauses); words never cut | take_gate |
| speed change | the voice's own pace from the direction first; at most **atempo 1.15, pitch kept**. Above that the kid stops sounding like a kid (round 2). Never a resample (no asetrate) | cast `tempo`, cold listener age |
| sounds like | a real kid, unshifted. No pitch lift (the +2 st lift was heard as "chipmunk", docs/voices.md "Realism") | panel, owner |
| delivery | happy, bubbly, continuous from frame 0 to the cut; one take per beat (STANDARDS 2b.4-5); one stress per sentence | panel, cold listener |
| identity | one voice + one model + one direction string, byte for byte, in every Short (docs/voices.md) | voice_drift |
| never | a clone, or a soundalike of a real person or product voice; whisper; "dramatic" pauses; a take cut out of a paused read | owner |

## Narrator candidates, round 1: adult voices (2026-11-10; rejected by the owner: "i think it should still sound like a child")
### Round 2: kid voices (2026-11-10)
The same 78 words. 8 requests:
- 6 takes on gemini-3.8-flash-lite-tts, in Pip's layout ("[direction]" + the text, generateContent);
- 1 per-minute 429 on lite, retried after a minute;
- 1 voice create on 3.8-flash-tts, **refused by safety**: "Generated voice prompt was flagged", even though the
  description had no age ("a high, bright, boyish voice, small and excited, quick and cheeky"). A designed child-like
  voice looks blocked by policy. We don't work around that.

The chain: no pitch shift, silences capped at 0.12 s, then an atempo (pitch kept) up to about 5.0 words/s while
speaking. The cold-listener check (`scripts/brand_voice/coldlisten.py`) gives each clip to gemini-3.5-flash alone, heard
once, with no script. Samples are on the branch `claude/brand-samples`, under `brand/voice_samples/kid/`, as
`reel_kid_brand_pace.mp3` and `reel_kid_natural.mp3`.

| # | take | voice, direction | natural w/s | atempo -> w/s | pitch | cold listener: age, sex, sounds like, clarity, grating |
|---|---|---|---|---|---|---|
| 1 | k1_pip | Leda, Pip's bubbly direction + "one breath, keep going: each new sentence lifts, hit the key word" | 3.72 | 1.40 -> 4.92 | 229 Hz | 20-25, male, AI, 10, 3 |
| 2 | k2_cheeky | Leda, "cheeky kid ... bouncing higher" | 3.60 | 1.44 -> 4.83 | 229 Hz | 18-25, female, adult playing a kid, 10, 2 |
| 3 | k3_deadpan | Leda, "deadpan kid ... like it's totally normal" | 4.25 | 1.22 -> 4.97 | 178 Hz | 20-30, female, AI, 10, 2 |
| 4 | **k4_sleepover** | Leda, "spooky-funny story at a sleepover, fast and gleeful" | 4.07 | 1.28 -> 5.01 | 211 Hz | **10-14**, female, AI, 9, 4 ("rushed") |
| 5 | k5_laomedeia | Laomedeia, the k1 direction | 3.93 | 1.32 -> 5.00 | 198 Hz | 15-22, male, adult playing a kid, 10, 2 |
| 6 | k6_zephyr | Zephyr, the k1 direction | 4.07 | 1.28 -> 4.95 | 193 Hz | 20-30, female, AI, 10, 2 |

What it says:
- **Clarity is fine everywhere.** The listener caught 95-97 % of the words on one listen, missing only "9,000" written
  as digits and "doghouse" as two words.
- **The kid read mostly doesn't survive the speed-up.** Kid voices read at 3.6-4.3 words/s, so the 5.0 target takes a
  1.22-1.44 atempo. At that tempo only k4 was heard as a kid. Pip at 1.40 was heard as a man in his early twenties.
- **Untested:** a cold-listener pass on the natural-pace takes, to confirm the tempo is the cause. The listener model
  hit a 429.
- The listener is one noisy pass. Judge by ear.

**Next round (owner's later note: happy, bubbly, figuring it out):** Pip (Leda) as the base, with 2-3 variations
that add "a kid who doesn't quite get it, proudly telling you something they think is totally normal", plus 1-2
alternative kid voices. Same text, the continuous direction, atempo 1.15 or less. Judge with the cold listener
("could you follow it?" and the age heard).

**Round 2 recommendation:** **k4_sleepover** (Leda, the sleepover direction): the only one heard as a kid at the brand
pace, at the second-smallest atempo (1.28). If the owner hears every one as too old, the trade-off is the pace target:
- at atempo 1.15 the voices land around 4.2-4.9 words/s and keep more of the kid;
- `reel_kid_natural.mp3` is the other end, at 3.6-4.3 words/s.

Round 1, kept for the record:
The same 78 words for each: Light Sleeper vNext L01-L04, then Dog on the Hill vNext L01-L03. Each take is
gemini-3.8-flash-tts through the Interactions API, with the style "speaking rapidly and continuously, no pauses between
sentences, deadpan and amused, full voice". Then the chain we would ship: silences capped at 0.12 s, a mild atempo
(pitch kept), and -16 LUFS. No take was cloned from a reference clip: one voice was designed from a written
description, and the others come from Google's stock library. `reel_candidates.mp3` plays the four with a beep
between them; `reel_natural_speed.mp3` plays the same takes without the atempo.

| file | voice | natural words/s speaking | atempo | final words/s speaking (overall) | max gap | median pitch (spread) | blind listener, 2 passes: distinctive / real |
|---|---|---|---|---|---|---|---|
| `d1_local.mp3` | **designed voice** `voice_tztgc6ke4u5r` ("guy in his early twenties, bright, slightly scratchy, a grin in it") | 4.82 | 1.10 | 5.16 (4.66) | 0.12 s | 157 Hz (11.5 st) | 4 / 6 ("hype-narration TTS", "rushed") |
| `l1_south.mp3` | library **en-us-advisor-7** (26, Inland Southern, "fast-paced") | 4.62 | 1.15 | 5.14 (4.70) | 0.11 s | 117 Hz (13.1 st) | 5 / 6-7 ("somber", "movie-trailer") |
| `l2_zeno.mp3` | library **en-us-zeno** (27, Northwest, "Entertainment & Gaming") | 4.81 | 1.10 | 5.19 (4.66) | 0.11 s | 133 Hz (**15.8 st**) | **8 / 8, then 7 / 8; picked best both times** ("raspy, youthful, lively") |
| `l3_quick.mp3` | library **en-us-training-4** (26, woman, East Coast, "fast-paced") | 4.85 | 1.13 | 5.07 (4.64) | 0.11 s | 205 Hz (13.1 st) | 6 / 6, then 6 / 8 ("hyperactive", "sarcastic") |

`d1_local_google_sample.mp3` is the designed voice's own 51 s sample (Google's text). The listener is gemini-3.5-flash
(`scripts/brand_voice/listen.py`, 2 passes in a shuffled order, not a TTS model). It is noisy: it heard d1 as male in
one pass and female in the other. Whisper heard every take's words right, apart from the usual digits and homophones
("share" for "shear"), except Zeno's "hasn't", which came out as "has it" at 1.10: listen to that line.

**Round 1 recommendation (superseded by the owner's verdict): `l2_zeno`.** It has the widest melody of the four (15.8 st, against the Orus x1.45 narrator's 10.7
and the reference Short's 11.6), and it needs the smallest tempo change (1.10). It was the listener's pick in both
passes. It is a stock library voice, so the direction string and the persona have to make it ours. The **designed
voice** is the one nobody else can use; it can be re-described in a few words and tried again once there is quota.

Shipping either voice needs a change in `tts.py`. Library and designed voices are only reachable through
`POST /v1beta/interactions` (the `voice` field takes `en-us-zeno` or `voice_...`), while tts.py uses `generateContent`.
Multi-speaker requests there take only 2 prebuilt voices, so the narrator and a character are voiced in separate
requests, one per beat. The 0.12 s cap and the atempo are already the cast's `pause_cap` and `tempo`.
Requests: 6 on gemini-3.8-flash-tts (1 voice create refused as unsafe, because its description said "seventeen-year-old"; 1 voice
create, which is billed as a generation; 4 reads), plus 2 listener calls on gemini-3.5-flash. None used flash-lite.
Scripts: `scripts/brand_voice/` (`gem.py`, `post.py`, `listen.py`, `text.txt`).

## Character voices: short lines, about 6 words or fewer
Each one sits clearly apart from the narrator (another age, sex or texture) and keeps the same voice and profile
everywhere. Existing cast entries stay as they are. The new ones are **proposals** (not yet heard, 0 quota left today).

| character | voice | why it's distinct | status |
|---|---|---|---|
| Mom (Hushwell) | **Sulafat** (`mom`) | woman in her forties, warm and tired | in cast, heard |
| Grandpa (Ravenford) | **Charon** (`elder`) | man in his seventies, rough, slow; ~105 Hz vs the narrator's ~130 Hz, and much older | in cast, heard ("genuinely aged") |
| Grandma (Portal Cottage) | **en-us-concierge-11** (library: "62-year-old ... slightly dry humor, and warm") | older woman, dry; fallback **Gacrux** ("mature") | to audition |
| Buh, at 16+ | **Achird** (`buh`) | friendly, a little nervous | in cast |
| Villager kid | **Laomedeia** (`child`) | real-kid pitch, unshifted. With a kid narrator, a kid character's line must differ in sex or texture from the narrator, or be narrated | in cast |
| Friend | **Fenrir** (`friend`) | loud, excitable teen | in cast |
| Gruff villager / smith | **Orus** (`smith`) | low and blunt | in cast |

Rules: never two extra voices of the same sex in one Short; a line only while that character is on screen; no
back-and-forth dialogue (STANDARDS 1.5). Samples: `voices/samples/` for the cast entries; Grandma is pending quota.

## Captions
2-3 word chunks, Poppins Black 96 px, centred at 0.70 of the game view, popping in hard (STANDARDS 6). **One brand key
colour on every story: `#FFD640` "Buh gold"** (story_track's default), under the narrator's key word as a bar. We
stop choosing a key colour per story (today 22 stories use 22 different ones): a fixed colour is the only caption
choice that can become *ours*. Character words take the character's colour (voices/cast.json).

## Colour palette
| role | hex | from |
|---|---|---|
| narrator text | `#FFFFFF` | captions |
| brand key / accent | `#FFD640` Buh gold | the sunset in the avatar (`docs/brand/avatar_sunset_backlit.png`) |
| Buh / hero | `#4FD8E6` Steve cyan | Buh's shirt; cast `buh` |
| night base (bands, banner) | `#1B2030` | banner V2 dusk sky |
| dusk warm | `#BC624A` | banner V2 sunset |
| sea fog teal | `#1B3E43` | avatar shadow |

## Sound logo (optional; test before adopting)
A **0.4 s two-note rising note-block-style blip**, synthesised by us (not a game sample), mixed **under the first
word** at -12 dB below the voice. It never plays before the hook and never delays the first word (STANDARDS 8: the
first word by 0.2 s). A/B it on 4-6 Shorts against the stayed-to-watch rate. If it's lower, drop it. The recurring
cue we already own costs nothing: the **boxed white bell** in the background of Hushwell stories (canon easter egg).

## Titles and descriptions
**Title = line 1, cut to its strangest part, lowercase, ≤ 45 characters, then one emoji and `#minecraft #shorts`**:
"my village is covered in 9,000 carpets 😳". Use a number written as digits, a first-person "my/I", and no
"true story" (STANDARDS 1.7). The description's first line is the quotable line, then "HelloBuh: one world, one
voice." Pinned comment: one lore question ("who built the hut on Dog Hill?").

## The opening frame
Frame 1 is the thumbnail. It shows **line 1's subject, already moving**, at the exact moment line 1 begins. The title
band is on top, the first caption chunk is on screen, and the strange detail is readable at phone size. No logo, no
black frame, no channel name, no intro, no establishing pause. If the sound logo is used, it plays under this frame.
