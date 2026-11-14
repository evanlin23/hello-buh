# Vertical long form and live (9:16, hours)

Owner, 2026-11-14 (r:r584b30 and r:r045b80, `docs/stories.md`): a long video in the Shorts frame, meant to run for hours as a live
stream overnight, built like the "the village is going to explode soon" TNT videos. Later the same morning, on [#2]'s
first drafts: "we need to make it seem like the tnt is always 'just about to explode' so they wait"; "maybe we dont need
a count down? ... we do that thing where we edge it a little and keep them on as long as possible. like build out to the
edge, put creepers, etc."; "we dont necessarily need to do TNT it could be like a fake mod like mob fights, or whatever is
going viral right now"; "are people gonna wait 2 hours... really?" (no: see "How long people wait"; nothing on screen
counts in hours). Run by [#2] (`docs/second-team.md`, issue #7). **Nothing streams or uploads without the owner's
OK on that exact stream or video.** Research: `docs/research/livestream.md` (sources, quotes, numbers).

## What the research changed (short version)
- **The winners are real lives of 40 min to 1.5 h, 2-6 a day, not one 12 h block** (ItzPyr0_XD 1.49M views on a
  1:37 TNT-village live and ~3.6K subs in ~1.5 days; Tutu Gaming 64K-1.2M a live after 139-870 on its Roblox lives).
  Same layout everywhere: a black top band with one bold line (one red word) and a live number, first person always
  moving toward the target, the bottom quarter empty for the Shorts player. **No hh:mm:ss clocks**; rounds (a new
  village every few minutes).
- **How long people wait:** no published number. From the observed concurrents and views, a Shorts-feed viewer stays
  seconds to about 2 minutes. So a real payoff has to come every ~3-5 minutes at most, and the screen must show it is
  near. Nobody watches the whole stream: its length is for the stream of new viewers the Shorts feed keeps swiping in,
  each of whom lands minutes from a payoff. Fake or resetting countdowns got channels exposed and removed (May 2026).
- **Money:** vertical lives get **no live ads in the Shorts feed** (Google's table: live pre/mid-rolls horizontal
  only). Ads need the dual stream (a horizontal leg on a second key) or come from the archived replay. Only a **public
  archived** live counts toward YPP hours; a stream over **12 h may not archive at all**. The YPP bar for new channels
  doubles on **2027-02-01** (8,000 h).
- **Policy risks, ranked:** inauthentic / mass-produced automated content (now a spam-policy strike, not just
  demonetisation: every stream must be materially different), misleading imminence or titles, the 12 h archive limit,
  music (NCS is fine under gameplay with "Music provided by http://spoti.fi/NCS"; an NCS "radio" stream is not).
- **Where to stream from for $0:** Oracle Cloud Always Free (10 TB a month out). **Not GitHub Actions** (its terms;
  the account that hosts the Shorts would be at risk), not GCP's free VM (1 GB a month out).

## The formats (each has a 1-minute sample, rendered on Actions; the Review Room gets them from [#1])
Three takes on "always just about to blow", each a stunt with a 1-minute sample. The sample compresses a stream: a
live slice, a skip (a time-lapse or a card), the payoff. A real stream never skips.

| # | format | what the viewer sees on arrival | the payoff, and how often | sample (stunt) |
|---|---|---|---|---|
| 1 | **Rounds: "THIS HOUSE EXPLODES IN 0:26"** | first person packing the current target (a house, the farm, the church...) with TNT; the big line is that round's clock, never more than a few minutes (nothing counts in hours: r:r045b80) | a real blast every 3-5 min at 0:00; "NEXT: THE FARM 2:30" straight after; the whole village at the end of the hour; a new village every hour | `live_village_tnt` |
| 2 | **The edge, no clock: "THE VILLAGE EXPLODES AT 100%"** (the owner's idea) | first person closing the last gap in a TNT field round the village; the big line is the goal, 99%; the flint and steel comes out... "WAIT... BIGGER": the goal grows (one more layer, out to the edge, creepers on it), shown honestly | the round really blows when the bigger goal is met, every ~3-5 min; never a fake or reset number | `live_village_edge` |
| 3 | **Gauntlet: "CAN THE IRON GOLEM BEAT EVERY MOB?"** (beyond TNT) | a vanilla arena from the wall: the champion vs the current opponents; "6 / 40 WINS", HUSKS LEFT counting down | a KO every 15-90 s (the sample: four husks in ~12 s); "NEXT: ???" then the reveal; a final boss at the end of the run (the sample: a ravager; a warden, tried first, never engaged); a new champion and ladder each run | `live_golem_gauntlet` |

All three keep the winners' layout (one bold line with a red word and a big live number in the top band, the bottom
quarter clear for the Shorts player) and fit a 1-3 h session of rounds. Formats can mix: a gauntlet that ends each
round on a TNT finale is the research's #3 ("escalating siege").
SAMPLES_LIST

## How a sample is made (and how a stream chunk will be)
A live format is an ordinary stunt (`stunts/live_<name>.js`) with a `live` block, recorded and rendered like a Short;
only the overlay is new:
- **The bands.** `lib/live.js` puts marks in the recording: `L.clock` (the stream's clock: S seconds in, `rate` stream
  seconds per recorded second, 1 live, more in a time-lapse), `L.target(label, at, red)` (the line in the top band and
  what the big countdown counts to; `at: null` for no clock), `L.goal(of)` (the goal mode: the big number is the
  counter's percent of `of`), `L.count(n)` and `L.stat(label, value)`. `scripts/live_overlay.py` maps every output
  frame to its source tick (`scripts/hb_time.py`, so the edit's trims, speed spans and cuts are honoured) and draws the
  top band (opaque, over the edit's caption) and the top half of the bottom band (the Shorts player covers the rest).
- **The hands.** `lib/live_crew.js`: stands on open ground that reach the most of the next cells, walks only on a
  checked clear line, lays cells with aimed places (`lib/act.js`), the edge stand, the stand out of the blast, and
  invisible drone anchors (interaction entities registered as actors, so `orbit: 'actor:village'` works wherever
  set-up found the village).
- **Opt-in.** `scripts/finish_render.sh` runs the overlay only when the stunt has a `live` block; no Short has one.
  Nothing else in the Shorts path changed. Proof (2026-11-14): the finish step of `main` and of this branch, run with
  `python3` stubbed to log every command, on tnt, story_nitwit, lapse_castle and one_in_a_million: byte-identical
  command lists and exits; only `live_village_tnt` and `live_village_edge` open the gate; no file outside `stunts/live_*`,
  `lib/live*` and the overlay requires the new modules.
- **Render** on Actions like a Short: `RENDER_BRANCH=claude/lf-<topic>-render-<stunt> ./hb render <stunt>`.

## The pipeline for a real stream ($0) — a plan; the streaming side waits for the owner's pick
**Shape.** A session is 1-3 h of 3-5 min rounds (the research's recommendation), run 2-4 times a day; an overnight
8-12 h session is the same thing longer, cut into broadcasts under 11 h 45 m so each archives. Every round is one
self-contained recording (its own village, seed and target), so rounds record and render in parallel and the session
is their concatenation. A session plan (`episodes/live/<date>.json`, to build) lists the rounds: seed, biome and
village type, target (a house, the farm, the church, a tower, the whole village), pattern (carpet, rings, walls,
towers, trench), the edge beats (one more layer, out to the edge, creepers, a lava moat), escalating to a mega blast on
the hour, and the stream clock at each round's start (the overlay's marks carry it).
**Variety is the policy defence:** a fresh seed and village every round, the event order drawn per session, the
camera's paths per village. Never the same file twice, never one stream on two channels.

**Record.** One round = ~4-6 min of game time plus 1-2 min of set-up. The server already runs on Actions
(`render.yml` runs `./run.sh`); a recording job takes a batch of rounds (8 rounds a job fits well under the 6 h cap)
and uploads the `.rec.json.gz` files. A 3 h session = ~40 rounds = 5 jobs in parallel, ~1 h.

**Render.** Measured today (run 43566228897): a 1080x1011 frame costs ~0.5 s on a 4-core runner (600 frames in ~5 min
a slice). At 30 fps a 3 h session is ~324K frames = ~45 runner-hours, ~2.3 h of wall clock on 20 parallel runners
(the free plan's concurrency); at 60 fps double. A 12 h session at 30 fps is ~180 runner-hours, ~9 h of wall clock,
so 30 fps and short sessions it is (a long session renders over a day ahead). The dual stream needs the 16:9 leg too:
render.js's `wideMaster` renders the 16:9 master once and crops the vertical from it (one render, both legs; ~1.7x
the pixels).

**Assemble.** Each round's mp4 already carries its bands (the overlay at the end of its edit); the session is an
ffmpeg concat with `-c copy` (same codec settings) plus the music bed (NCS under the game, -26 LUFS, credited) laid
over the whole thing at assembly. Keyframes every 2 s, H.264 + AAC 128k, 720x1280 or 1080x1920 at 30 fps (Google:
720p30 ~8 Mbps, 1080p30 ~14 Mbps).

**Stream.** An Oracle Cloud Always Free VM (owner: an Oracle account; a card is asked for verification, no charge)
pulls the session files and pushes them with `ffmpeg -re -i session.mp4 -c copy -f flv rtmps://.../live2/<key>`
(the `tee` muxer for the second key of the horizontal leg). The broadcast is created at go-live, not scheduled
(scheduled lives and Premieres never enter the vertical live feed), via the YouTube API (`liveBroadcasts.insert`,
`bind`, auto-start), with `enableAutoStop` and `recordFromStart` on so it archives. Owner steps first: live streaming
enabled on @HelloBuh (phone verification, then up to 24 h), and a new OAuth refresh token with the `youtube` scope
(the uploader's token only has `youtube.upload` + `youtube.readonly`).
**Simpler first step, no server:** upload one session as a public VOD (vertical, up to 12 h). It gets no Shorts-feed
live discovery (vertical long VODs do poorly), so it only tests the content.

**Honesty rules for every stream.** Every countdown or goal on screen really pays off (no reset timers, no "explodes in
1 minute" titles on a 3 h stream); the description says it is an automated, pre-rendered stream; no "1 sub = 1 TNT"
promise unless subs really trigger something (possible later: the streaming VM polls the sub count with the Data API
and splices a pre-rendered bonus blast between rounds).

## Open questions for the owner
1. Which format(s) (the table above), and the session shape: 1-3 h lives a few times a day (what the winners do) or
   the overnight 8-12 h block?
2. Vertical only (Shorts-feed reach, no live ads) or the dual stream (ads on the horizontal leg; ~1.7x render)?
3. The Oracle account and the live-scope OAuth token (both owner-only steps), when a format is picked.
