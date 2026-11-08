# Long-form (16:9) videos for HelloBuh

Owner, 2026-11-08: "Can you try to make a long form video? How would this even be done for hello buh?"
This is the answer and the pilot. The pilot is `episodes/clutches` ("I Tested Every Minecraft Clutch").

## Why long form at all
- **Monetization.** YPP needs 1,000 subscribers plus either **4,000 public watch hours in 12 months** or **10M
  Shorts views in 90 days** (https://support.google.com/youtube/answer/72851). Shorts-feed watch time doesn't
  count toward the 4,000 hours. At 3 Shorts a day the 10M route needs ~37K views per Short on average
  (10M / 270); the channel's median in `research/formats.md` is 7.5K. Watch hours are a separate route, and
  only long form earns them. Third-party sites
  report both bars doubling for new applicants from Feb 2027 (unconfirmed on Google's page as of 2026-11-08).
- **Revenue per view.** Long form carries pre-rolls and, at 8+ minutes, mid-rolls. Shorts revenue comes from a
  shared pool and is a small fraction of that per view.
- **Shorts feed long form.** A Short can link a related video, so every Short can point at the episode it's
  cut from.

## What "long form" means here
Any 16:9 upload; Shorts are vertical or square only. In practice: 1920x1080, 30 fps, chapters, a custom thumbnail,
an end screen, and narration, because without a voice the viewer has no reason to keep watching for 8 minutes.

## How it works: the bot recordings are the whole world
Every Short on the `videos` branch keeps its bot recording (`shorts/<name>/recording.json.gz`: chunks, every tick's
pose, block changes, entities, sounds) and the exact edit it was published with (`metadata.json` `edit.args`).
`render.js` already takes any size, so **an existing Short can be re-rendered as 16:9 footage with no server and
no bot**. The wider frame shows more of the world, and the held item sits where vanilla puts it at 16:9.

```bash
git fetch --filter=blob:none origin videos:refs/remotes/origin/videos   # blobless: the mp4s stay on GitHub
python3 scripts/longform.py plan   episodes/clutches   # every segment's marks in segment time (for cues)
python3 scripts/longform.py render episodes/clutches   # each segment -> work/lf/<seg>.mp4 (16:9, its own edit)
~/.hb-tts/bin/python scripts/voice.py episodes/clutches   # narration from episodes/clutches/story.json
python3 scripts/longform.py build  episodes/clutches   # -> out/lf_clutches.mp4, .json, _thumb.jpg
```
| piece | file | what |
|---|---|---|
| segment render | `scripts/longform.py render` | fetches the recording + metadata from `videos` (`git show`: only those blobs), renders only the frames the edit keeps at 1920x1080 / 30 fps, plus real slow-mo in-betweens and the third-person replay pass, rebuilds the game audio (`audio.py`), and runs the 16:9 edit. Frames are cached (`done.json`), so a re-edit doesn't re-render. |
| 16:9 edit | `scripts/landscape_edit.py` | `edit.py` unchanged, with its layout constants (and `retention.py`'s) switched to 1920x1080 and no caption band: the same HUD, death screen, subtitles, counters, cards, slow-mo and replay. The hook preview, loop dissolve and song are dropped, because the episode has its own. |
| episode | `episodes/<ep>/episode.json` | `segments` (+ optional `start_at`/`end_after`/`replay: false` overrides), `pieces` in order (`seg`, `clip` = part of a segment, `card` = chapter card), `narration` cues `[LINE, PIECE, SECONDS]`, `music`, `thumbnail`, title, description. |
| narration | `episodes/<ep>/story.json` + `scripts/voice.py` | the story narrator (Kokoro `am_adam`) at **rate 1.0** (the story Shorts use 1.45x; long form at ~150-250 wpm and natural pitch). |
| assembly | `scripts/longform_build.py` | cards (blurred frame, slow push-in, kicker/title/sub or a ranking list on the left half for the end screen), one concat, then the mix: narration -16 LUFS, game -21 ducked 9 dB under each line, NCS bed -30 ducked 6 dB, a whoosh per card, master -14 LUFS. Writes chapters (from `chapter` keys), the description with the NCS credit, and a 1280x720 thumbnail. |

## Measured costs (4 CPUs, no GPU)
- Render: about **0.6-1.0 s per 1920x1080 frame**, i.e. ~17-30 s of render per video second at 30 fps, plus ~15 s
  of world load per segment. A 10-minute episode is roughly 3-5 hours of render. Segments are independent, so
  they split across worker sessions the same way Shorts do.
- Narration: ~10 s of synthesis per line on CPU.
- Assembly: a few minutes (one 1080p encode).

## What changes vs the Shorts rules
| | Shorts | long form |
|---|---|---|
| frame | 1080x1920, caption band | 1920x1080 full frame, no caption band; the green subtitles and cards stay |
| first seconds | stunt on screen by 1 s | a **cold open**: the finale's setup, cut before it lands, plus a promise ("by the end of this video I'm landing it") |
| structure | one escalating format, ends <= 1 s after the payoff | **chapters** (>= 3, each >= 10 s, first at 0:00), a card per chapter, a re-hook every 30-60 s ("but the next one is worse") |
| voice | game audio + song | narration over the gameplay explains the mechanic and the stakes; game audio ducks under it |
| ending | cut on the payoff | a 10-20 s outro with space for YouTube's end screen (subscribe + next video) |
| music | NCS lead at -13 LUFS | NCS bed at about -30 LUFS under the narration, same credit rule |
| loudness | -10 to -18 LUFS | -14 LUFS (YouTube's reference) |
| metadata | lowercase meme title + "(do not check the sound)" | a searchable title, a custom thumbnail, chapters in the description; no `#shorts` |

## Formats that fit the bot (best first)
1. **"I tested every X" episodes** (the pilot): a theme stitched from re-rendered recordings with a narrator.
   Cheapest, because no new recording is needed. Limit: the existing material runs out fast (the clutch
   recordings give ~3 minutes), so a full 8-10 minute episode needs recordings made for long form: more
   attempts, the fails, longer escalations.
2. **Long narrated mystery stories** (the owner's favourite genre): the story Short pipeline (`story.json`,
   `voice.py`, a `story_<name>` stunt) at 60-120 lines instead of 15. Twist structures need room to plant clues,
   so they suit 8-12 minutes. The cost is staging: one scene per line.
3. **Escalation challenges recorded for long form**: "every minute it gets worse", "1 vs 10 vs 100 vs 1000",
   "100 clutches from 1 to 100 blocks", with a scoreboard and the narrator counting fails. One long recording
   per chapter (`botTimeout`).
4. **Time-lapse builds** (owner favourite): "I built a castle in survival" with real-time beats between
   `lib/time_lapse.js` spans, narrated.
5. **"Every HelloBuh Short" compilations**: lowest effort and lowest value; filler between episodes.

## Not done yet
- **Uploading.** `youtube_upload.py` only handles Shorts packages (`videos/shorts/`, the posting mix, `#shorts`).
  Long form needs its own package folder (`videos/longform/<name>/`), a custom thumbnail (`thumbnails.set`
  needs a verified channel), chapters in the description and a slower cadence (1 a week). Upload by hand for now.
- **QA.** Every Short gets frame QA, a retention audit and a Minecraft audit. Long form needs a retention audit
  of its own (cold open, re-hooks, chapter pacing, dead air between narration lines). The engine and
  Minecraft audits carry over per segment.
- **The wider frame** shows set edges that the Shorts' near-square crop hid. Check every segment's sides.
