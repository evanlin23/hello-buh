# What formats to make (survey 2026-11-06)

Data: `research/yt_survey.py` → `research/survey.json`. It reads YouTube's public search pages
for 32 Minecraft stunt/meme queries (first ~25 Shorts each) plus HelloBuh's own Shorts tab.
View counts are rounded, and search ranks popular videos first, so medians show what *can* work,
not base rates. Web articles on "viral Minecraft Shorts 2026" were mostly SEO filler; the one
real 2026 signal there was horror-meme edits (e.g. the "Matrix Verity" meme around ThatMob's
Verity character, July 2026).

## HelloBuh's own Shorts (48 on the Shorts tab; median 7.5K, best 45K)
| what | evidence |
|---|---|
| **"(do not check the sound 💀💀)" in the title** | 20 of the top 21 Shorts (16K–45K) end with it. Titles without it ("firework save" 838, "afk firework" 820, "xray minecraft" 814, "glitched lava" 1.2K) flop. |
| **Question / reaction titles** | "what is bro doing???" 39K and 29K, "????" 33K, "why did bro do that??" 28K, "why didnt i die?" 26K, "zombie???" 25K |
| **The "job" running gag** | "at least i have a job" 45K, "minecraft employment" 33K, "minecraft job" 32K, "minecraft village job" 26K |
| **Sarcastic boss captions** | "the wither is so hard 🙄" 27K, "the warden is so hard 🙄🙄" 25K, "Do you know what else is hard? 💀" 16K |
| **Mobs as the punchline** | enderman 29K and 18K, zombie 25K, villager 22K |
| water MLG | "mlg water do not check the sound" 18K; "water mlg in the nether" (battery bait) 4.9K |

Takeaway: the title formula matters more than the stunt. Lowercase, a reaction or question,
then `(do not check the sound 💀💀)`. The "sound" is the song added at upload (owner decision),
so the bait only works if a recognisable meme song is added. That stays a manual step.

## The wider market (median views of the top Shorts per query)
| query | median | read |
|---|---:|---|
| villager meme | 1.1M | villagers are the most viral Minecraft character in Shorts |
| satisfying | 1.0M | perfect placements, chain reactions, farms |
| speedrun clutch | 650K | dominated by Dream/manhunt clips (not reproducible) |
| parkour POV | 451K | first-person parkour, often with a story caption |
| TNT launch | 385K | physics spectacle |
| physics | 318K | |
| **water bucket clutch** | **94K** | best of the clutch types |
| trident riptide | 75K | |
| x-ray meme | 72K | |
| 1 in a million | 65K | |
| boat / impossible / mlg water / firework save | 30–43K | |
| ladder, wind charge, lava bucket, elytra | 9–15K | |
| ender pearl, scaffolding, powder snow, hay bale, cobweb, slime clutch | 1.4–2.7K | niche, skip |

## Formats the bot can stage (ranked by expected value × feasibility)
1. **Clutch + reaction title**: water clutch (built), boat clutch, ladder clutch, trident riptide.
   Title: `why didnt i die? (do not check the sound 💀💀)` / `what is bro doing??? (…)`.
   Variations are cheap: height, the set (village, nether, end), what you land on.
2. **"X is so hard 🙄"**: the bot trivially beats something "hard" (warden, wither, ender
   dragon) using a setup built with commands (e.g. the mob spawned in a trap, one hit with a
   stacked weapon). Proven on the channel (25–27K) and fully scriptable.
3. **Villager bits**: villagers react, trade or get trapped ("villager get out", 22K here; 1.1M
   market median). Spawned and posed with commands; the bot interacts.
4. **"Satisfying"**: one perfect action. A TNT chain, a lava cast, a sand/gravel stack, a farm
   harvest. Commands build it; the bot triggers it. Big market (1M median), new for this channel.
5. **"job" series**: a repetitive task from POV ("end portal job", "village job"), a running
   gag the audience already knows.

Each needs its own set builder + action script in `bot.js` (or a sibling); the server, render,
audio and edit stay the same. The channel needs a distinct angle per video (house rule: YouTube
reviews "templated" content channel-wide), so vary the set, the stunt and the caption every time.

## Songs (research/sounds_survey.py → sounds.json)
Checked the sound attribution of the top 4 Shorts for each query (120 Shorts, 1.7B views
combined): **118 show "Original Sound"**. Viral Minecraft Shorts bake the song into the upload
(like HelloBuh), so YouTube doesn't name the song and we can't scrape song names. Song choice
has to come from the owner or from listening to the clips. We don't rip audio from
YouTube/TikTok (terms of service; the downloads are also blocked from the cloud); song files are
owner-supplied into `songs/`.
