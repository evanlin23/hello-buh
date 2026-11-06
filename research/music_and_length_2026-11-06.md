# Music and Short length: research (2026-11-06)

A research agent compiled this from YouTube Help pages and third-party reports. Official facts are
separated from opinion. URLs are the sources it cited.

## Recommendation
- **Music:** don't bake copyrighted songs into the file. Upload with game audio only
  (`short_nosong.mp4` in each package on the `videos` branch). Then add the trending song in the
  YouTube app with the **Shorts audio picker**. If a song isn't in the picker, use the YouTube
  Audio Library or royalty-free tracks. The creator's 45% share is the same either way, and
  picker audio avoids standard Content ID claims.
- **Length:** default to 10-15 s for a single stunt or meme beat. Use 20-30 s only for a
  build-up, fail-then-success or two-beat story. Show the stunt in the first second, put the
  payoff in the last 1-2 s, and cut so the end loops back into the start. Never go over 60 s with
  self-added music.

## Music: facts
- A Short longer than one minute with an active copyright claim is **blocked**, whatever the
  claim's policy. Shorts of one minute or less are not affected by that rule.
  https://support.google.com/youtube/answer/15424877 , https://support.google.com/youtube/answer/6013276
- For Shorts of 60 s or less with a claim, the rights holder's Content ID policy applies (block,
  track or monetize). Labels usually leave them up, but they can block them.
- Songs added with the Shorts audio picker get special claims that "can't be disputed, as they're
  not visible to creators". Songs added outside the Shorts tools are "eligible for standard
  copyright claims". https://support.google.com/youtube/answer/13053317
- Revenue share: music shrinks the Creator Pool (one track: half to the pool, two tracks: a third,
  no music: all of it). "Monetizing creators will keep 45% of their allocated revenue, regardless
  if music was used or not." https://support.google.com/youtube/answer/12504220
- Audio Library tracks "won't receive a Content ID claim". In longer Shorts, picker songs are
  capped at 30, 60 or 90 s depending on the song. https://support.google.com/youtube/answer/13486873
- Reach: the often-quoted "+21% with trending audio" has no traceable study behind it. The "Use
  this sound" / sound-page flow is real (https://support.google.com/youtube/answer/10623810), and
  picker audio is the reliable way to get it.

## Length: facts
- Since 31 Mar 2025 every start or replay counts as a view. YPP uses **engaged views**
  (Advanced Mode), so loops raise public views but not earnings directly.
  https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/
- YouTube publishes no ideal length ("prioritize storytelling over a target length").
  https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/
- Third-party data is only directional: the OpusClip length distribution
  (https://www.bytecap.io/research/best-youtube-shorts-length), blog claims of the best retention
  at 15-30 s and funny Shorts at 18-28 s
  (https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention), and an unofficial
  70-90% viewed-vs-swiped benchmark.

## What we do
- Every package has `short.mp4` (song baked in, the drop aligned to the stunt) and
  `short_nosong.mp4` (game audio only). `metadata.json` names the song and the second its drop
  should land on, for lining it up in the picker.
- New formats aim at 10-15 s with several beats (every_clutch, fortune, tnt_run, creeper).
- Measure on the channel: compare viewed %, average % viewed and engaged views for <12 s, 12-20 s
  and 20-30 s Shorts each week.
