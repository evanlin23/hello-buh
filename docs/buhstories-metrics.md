# Buh Stories numbers: what to run, and when

Buh Stories (@BuhStoriesMC) uploads are manual for now (owner, 2026-11-11), so nothing records them automatically and
the YouTube API has no token for that account. The numbers come from Studio through Claude in Chrome, like
@HelloBuh's (docs/studio-metrics-prompt.md), and are judged by the decision rules in
docs/research/buhstories_growth_2026-11-11.md "Ongoing: what to measure and the decision rules".

## The owner, after each upload (once, 10 seconds)
Tell the session the story and the video link, or run it yourself:

    ./hb uploaded light_sleeper https://youtube.com/shorts/XXXXXXXXXXX "2026-11-12 18:05"

(time in Central; leave it off to mean "now"). It writes uploads/buhstories/uploads.json: package, video id, time and
premise family (story.json `family`; `--family F` sets it). Studio numbers for a Short that isn't recorded here are not
imported. The same file is the uploader's record, so once uploads are automated nothing goes up twice.

## The owner, in Chrome: 48 hours after each upload, then weekly
Paste docs/studio-metrics-prompt-buhstories.md into Claude in Chrome, signed in to the **Buh Stories** account. One run
covers every Short, so in launch week (one upload a day) a run every other day catches each Short near 48 h; after
that, once a week (the 7-day reading of each Short falls in it). Send the JSON answer to the session, which runs

    python3 scripts/studio_import.py --channel buhstories answer.json   # -> uploads/buhstories/studio.json (+ a snapshot)
    ./hb stories-report

## What the report says
Per Short: age, shown in feed, engaged views, stayed to watch %, average % viewed, subs and subs per 1,000 engaged
views, then the channel median (once 3+ Shorts have numbers). Then every rule that fires, each with its line in the
research doc:

| rule | fires when |
|---|---|
| hook problem | stayed to watch < 60 %, or 10+ pts under the median: the next 3 stories change line 1 / frame 1 style |
| middle sags / loop works | APV < 70 % / > 110 % |
| 5x hit | engaged views > 5x the channel median: 2-3 standalone stories in the same family within 7 days (owner 2026-11-11) |
| flop | under a fifth of the median: leave it up, never delete and re-upload |
| subs | subs per 1k engaged < 1.0 on the last 3 Shorts |
| after 10 / 30 / 60 uploads | best < 10k engaged / no Short > 100k (format review) / median < 5k |
| made for kids, AI label | as Studio reports them |
| explore | no 5x hit yet and the last two uploads share a family (owner 2026-11-11: explore until the numbers say what works) |

Per-Short rules wait for 1,000 feed impressions (the doc's table), using views when "shown in feed" wasn't read. The
report lists what is missing (no Studio numbers, a field Studio didn't show, a 48 h or 7-day snapshot not taken yet,
an unknown family) instead of guessing. `--json` gives the same as one object.
