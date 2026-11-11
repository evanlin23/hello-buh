# Studio metrics for Buh Stories: task for Claude in Chrome

The Buh Stories version of docs/studio-metrics-prompt.md (that one is @HelloBuh's). Paste everything below the line
into Claude in Chrome while signed in to the **Buh Stories Google account** (its own account, not the HelloBuh login),
then save its answer as a file and run `python3 scripts/studio_import.py --channel buhstories <file>` (or paste it to
the Buh Stories session). When: docs/buhstories-metrics.md.

---

Collect YouTube Studio analytics for my channel "Buh Stories" (@BuhStoriesMC, channel id UC5m8kcDO2cSlXT49VoJjpRw).
Only read; don't change any setting, video, title or comment. Stop and ask me if anything needs a password or a code.
Make sure the channel switcher (top right) says "Buh Stories" and the handle is @BuhStoriesMC; if it shows Hello Buh,
stop and tell me.

0. ALWAYS THE LATEST NUMBERS
   - Reload every page before reading it; never reuse numbers from an earlier run or an earlier tab.
   - Use each Short's own Analytics page with period "Lifetime" ending today. Use Advanced mode only for a number those
     pages don't show, and say so in couldnt_read (it lags 1-2 days).
   - For each Short, record "data_through": the last date and time the Studio numbers cover ("Updated ... ago" or
     the date range Studio shows).

1. LIST THE SHORTS: https://studio.youtube.com → Content → Shorts. Every public Short: its video ID (the part after
   /video/ in its link), title, and publish date and time.

2. FOR EACH PUBLIC SHORT open https://studio.youtube.com/video/<ID>/analytics/tab-overview/period-lifetime and read
   (write null for anything Studio doesn't show; never guess):
   - **engaged_views**: "Engaged views" (Overview, or Advanced mode → Metrics → Engaged views). Not the same as
     "Views" since 2026-08-24; read both.
   - **views**: "Views".
   - **shown_in_feed**: "Shown in feed" / "Impressions in the Shorts feed" (Reach tab, or the "Viewed vs swiped away"
     card's total).
   - **viewed_pct**: "Viewed vs. swiped away", the % that VIEWED ("stayed to watch").
   - **avg_pct_viewed**: "Average percentage viewed" (can be over 100 %), and **avg_view_s**: average view duration in
     seconds.
   - **subs_gained** and **subs_lost**: subscribers gained and lost from this Short.
   - likes, comments, shares.
   - **retention_3s**: hover the audience-retention graph at 0:03 and read the %.
   - **made_for_kids**: true if the Short's Details page says "Made for kids" (set by YouTube or by us), else false.
   - **ai_label**: null if there is no "Altered or synthetic content" label; otherwise what Studio says about it
     ("detected", "C2PA", "creator disclosed").

3. CHANNEL: https://studio.youtube.com → Analytics, last 28 days: total subscribers, views, engaged views if shown,
   "Viewed vs swiped away" for the channel.

4. ANSWER with ONE JSON code block, numbers as plain numbers (12.5 not "12.5%"), collected_at as an ISO time with the
   offset (e.g. 2026-11-14T18:05-06:00):
```json
{
  "collected_at": "YYYY-MM-DDTHH:MM-06:00",
  "channel": {"subscribers_total": 0, "last_28d": {"views": 0, "engaged_views": 0, "subs_net": 0, "viewed_pct": 0}},
  "videos": [
    {
      "id": "VIDEO_ID", "title": "...", "published": "YYYY-MM-DDTHH:MM", "data_through": "YYYY-MM-DDTHH:MM",
      "engaged_views": 0, "views": 0, "shown_in_feed": 0, "viewed_pct": 0,
      "avg_pct_viewed": 0, "avg_view_s": 0, "subs_gained": 0, "subs_lost": 0,
      "likes": 0, "comments": 0, "shares": 0, "retention_3s": 0,
      "made_for_kids": false, "ai_label": null
    }
  ],
  "couldnt_read": ["anything you couldn't find, and where you looked"]
}
```
