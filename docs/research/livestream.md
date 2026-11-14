# Vertical long lives / long VODs for HelloBuh: research (2026-11-14, [#2])

Scope: vertical (9:16) 8–12 h YouTube lives or long VODs, fully automated, $0. Policy claims cite support.google.com with a short quote. Market numbers were read from YouTube search, channel and watch pages on **2026-11-14, about 06:00–06:40 UTC**. They are snapshots: "views" are lifetime views of a live replay, and "watching" is live concurrents at that moment. YouTube rate-limited my page reads partway through (captcha), so some numbers come from search result cards. Frame descriptions come from YouTube's auto-generated frames at 25/50/75% of each video (`i.ytimg.com/vi/<id>/hq1|hq2|hq3.jpg`) and from live snapshots (`hqdefault_live.jpg`). I could not hear any audio.

For the owner rule r:r584b30 (`docs/stories.md`, 2026-11-14). The format proposals and the pipeline built on this are in
`docs/livestream.md`.

---

## A. Policy (primary sources)

### A1. YPP eligibility and what counts

- **Current thresholds:** "Get 1,000 subscribers with 4,000 qualified watch hours in the last 12 months", or "1,000 subscribers with 10 million qualified Shorts views in the last 90 days." — https://support.google.com/youtube/answer/72851
- **Lives count only as a public archive (VOD).** Excluded: "Private videos", "Unlisted videos", "Deleted videos", "Ad campaigns", "YouTube Shorts", and "Livestreams that are unlisted, deleted, or not converted to VOD (video on demand)." — https://support.google.com/youtube/answer/72851
  - The YouTube blog (Aug 12 2026) says the same: "To count as qualified, watch hours have to come from public long form videos (including podcasts) or archived livestreams." It also lists "Live streams that aren't archived" as non-qualifying. — https://blog.youtube/news-and-events/youtube-monetization-qualified-watch-hours-shorts-views/
  - **Live vs archive:** neither page says whether hours watched *during* the live count in real time. In practice the hours count only if the stream ends up as a public archived VOD (inference from the "not converted to VOD" exclusion).
- **Shorts feed:** watch hours "in the Shorts Feed won't count towards the 4,000 qualified public watch hours threshold." — https://support.google.com/youtube/answer/72851
  - **Vertical lives watched in the Shorts feed: unverified.** No Google page says whether these hours count. They are not "Shorts" (see next bullet), but they are consumed in the Shorts feed. Treat them as at risk.
- **What counts as a Short:** "videos uploaded on or after October 15, 2024 with a square or vertical aspect ratio up to three minutes in length will be categorized as Shorts." — https://support.google.com/youtube/answer/15424877
  - So an 8–12 h vertical VOD or live archive is long-form. Its hours count when viewed outside the Shorts feed.
- **Premieres:** the YPP page does not mention them. After a Premiere ends the video is an ordinary public upload: "Once the Premiere is over, we follow your channel's upload default settings for ads." — https://support.google.com/youtube/answer/10356739
  - Whether watch time during the Premiere itself counts toward YPP is **unverified** (likely, since it is a public long-form video).
- **2027 change, confirmed on Google's own page.** "Starting February 1, 2027, we are introducing updates to the YouTube Partner Program (YPP)." YPP entry thresholds "for new creators are changing to 8,000 qualified watch hours in the last 365 days, or 20M qualified Shorts views in the last 90 days." "If you are already in YPP, your status is not impacted by this update." — https://support.google.com/youtube/answer/12843009
  - The page does not say whether creators who meet 4,000 h but apply just before Feb 1 keep the old bar: **unverified**.
  - New activity rule from Feb 1 2027: a channel stays active with "1,000 qualified watch hours in the past 365 days, or 1 million qualified Shorts views in the last 90 days, or 2 long-form videos or 5 Shorts uploaded every 90 days". — same URL
  - Arithmetic:
    - 8,000 h / 365 d ≈ 22 h of qualified watch time per day, which is about 2 average concurrent viewers on an 11 h public, archived stream every day for a year.
    - 4,000 h before Feb 1 2027 (about 79 days away) needs about 51 h/day.

### A2. Vertical live streaming and eligibility to stream

- **Basic eligibility (any method):** no live-streaming restrictions in the last 90 days, a verified channel, and age 16+: "You must be at least 16 years old to live stream." — https://support.google.com/youtube/answer/2474026
- **Phone verification:** "To access advanced features, you must first complete phone verification." Verified accounts can "Upload videos longer than 15 minutes … Live stream". — https://support.google.com/youtube/answer/171664
- **First activation:** "may take up to 24 hours", and after that "your stream can go live instantly." — https://support.google.com/youtube/answer/2907883
- **Mobile only:** "At least 50 subscribers." For channels with 50–1,000 subscribers, "we may limit the number of viewers on your mobile live stream" and the archive "will be set to private by default." — https://support.google.com/youtube/answer/9228390
  - Encoder/RTMP streaming has no subscriber minimum on the page above, so HelloBuh (about 600 subscribers) can stream from an encoder.
- **How vertical works:** "When your live stream is vertical (more tall than wide), viewers on mobile will now enter a full screen viewing experience … Viewers (not limited to existing channel subscribers) can also find these live streams when browsing YouTube Shorts." — https://support.google.com/youtube/answer/2474026
- **Dual format (Live Control Room default):** "By default, your live streams will go live in both horizontal (16:9 aspect ratio) and vertical (9:16 aspect ratio) formats". "The vertical stream is a center crop of the horizontal stream"; layout options are Center crop, Fit to phone width and Stacked. "You can't add the vertical format once the stream has started." — same URL
  - With an encoder: "Choose the RTMP(S) streaming protocol for third-party dual streaming" and "choose your second stream key to use for your vertical stream." "Check that the vertical and horizontal content match". — same URL
- **Native 9:16 from an encoder works.** The successful TNT lives below are delivered at 1080×1920 and 720×1280; I read their format lists from the player data, e.g. https://www.youtube.com/watch?v=k7L7_eyQcMg (1080×1920) and https://www.youtube.com/watch?v=jROu7IzZuGE (720×1280).
  - Google publishes no vertical resolution spec. Its bitrate table (per orientation) recommends 1080p30 H.264 at about 14 Mbps (minimum 5) and 720p30 H.264 at about 8 Mbps (minimum 3), a keyframe every 2 s ("Do not exceed 4 seconds"), and AAC 44.1 kHz 128 kbps stereo. — https://support.google.com/youtube/answer/2853702
- **Shorts-feed conditions:** "Scheduled live streams and Premieres won't show up in the vertical live feed." "The vertical live feed is only available on the YouTube app and not currently available on tablets." — https://support.google.com/youtube/answer/13822251
  - It is ambiguous whether a stream that *was created as scheduled* is excluded once it is live, or only while it is upcoming. Safest: create the broadcast at go-live time, not as a scheduled event.
  - Entry points: a "Watch Live"/"big grey button" while scrolling Shorts, or pausing a Short and tapping Live; viewers can then swipe between lives. — https://support.google.com/youtube/answer/13822251 ; https://www.tubefilter.com/?p=178428 (Feb 8 2024, YouTube PM Sherry Lin)
- **Live restrictions and limits:**
  - A strike or a removed live can disable live streaming "temporarily or permanently".
  - "If you've hit your daily live stream creation limit, you can try again in 24 hours." — https://support.google.com/youtube/answer/2853834

### A3. Ads in lives

- **Eligibility:** "If your channel is monetized and monetization is turned on for your live stream, YouTube will trigger ads…" — https://support.google.com/youtube/answer/7385599
  - Pre-roll and display ads turn on automatically.
- **Mid-roll modes:**
  - Automatic: "YouTube shows mid-roll ads to viewers at natural breakpoints during a live stream".
  - Scheduled: "between 6, 12, 18, 24, or 30 minutes".
  - Manual: "You can manually select all mid-roll ad breaks while live streaming."
  - "Side-by-side mid-rolls … will automatically show on eligible streams."
  - "Delay ads" postpones mid-rolls for 10 minutes. — same URL
- **Archive:** the page only says "You can view a breakdown of your ad revenue from live streams and live replays in YouTube Analytics". Live replays earn, but the page does not say how mid-rolls are placed on them: **unverified**. — same URL
- **VOD rule:** "On monetized videos that are 8 minutes or longer, you can turn on ads during the middle of the video", and "our systems help find natural breakpoints". — https://support.google.com/youtube/answer/6175006
- **Vertical feed has no live ads.** In Google's own feature table, "Live ad midrolls and pre-rolls" is **Yes for horizontal, No for vertical**. Vertical also lacks "Clickable links", "Premieres" and "Live redirect"; it keeps "Memberships" and "Gifted memberships", and only vertical is "Discoverable in the Shorts feed". — https://support.google.com/youtube/answer/2474026
  - Vertical-feed revenue is fan funding (Super Chat, Stickers, memberships). — https://support.google.com/youtube/answer/13822251
  - So for ad revenue you need the **horizontal** leg of a dual stream, or the archived VOD.
- **Premieres:** "you can turn on ads to serve pre-rolls during the Premiere. Mid-roll and post-roll ads are not available during the Premiere." — https://support.google.com/youtube/answer/10356739

### A4. Inauthentic / repetitive / reused / automated content

- **Rename (YPP monetization policy):** "We are also renaming this policy from "repetitious content" to "inauthentic content."" (update dated Jul 15 2025). — https://support.google.com/youtube/answer/1311392
- **What it covers:** "Generic or repetitive content includes content that looks like it's made with a template". Not monetizable:
  - "Similar or repetitive content with low educational value, commentary, narratives, or minimal variation across videos"
  - "Image slideshows, templated storylines, or scrolling text with minimal or no narrative"
  - "AI-generated content made with generic or unoriginal templates"
  - characters put in the same situation repeatedly with the same outcome.
- **What is still allowed:** the same intro/outro, and series with a consistent format where each video has a distinct storyline. Automation is allowed if the result still shows creative vision: "If you use automated tools or templates to help create your content" the final product must still provide value. — same URL
  - The page has no live-specific, "loop", "static" or "ambient" wording, and "video" includes live streaming.
- **Reused content:** this covers content repurposed "without significant original commentary, substantive changes". "This policy applies even if you have permission from the original creator." Review is channel-wide. — same URL
- **Community Guidelines spam rule (strike-level, not only demonetization).** "Automated or synthetic mass-production: Using automated tools or AI to churn out high volumes of similar content with minimal changes", and "we don't allow use of these tools to flood our platform with repetitive content". Example: "Channels that use the exact same background music and repetitive AI generated imagery across many videos". Also listed: "Malicious clickbait: Using maliciously misleading titles, thumbnails, descriptions, or imagery". — https://support.google.com/youtube/answer/2801973
- **Fake engagement:** "content that solely exists to incentivize viewers for engagement (views, likes, comments, etc) is prohibited". At the same time, "You're allowed to encourage viewers to subscribe, hit the like button…". It applies to "live streams". — https://support.google.com/youtube/answer/3399767
  - This matters for "1 SUB = 1 TNT" streams whose *only* content is the sub trigger.
- **Pre-recorded content labelled "live":** no Google page I found prohibits streaming pre-recorded footage through an encoder. The relevant risks are misleading metadata (malicious clickbait above) and inauthentic/mass-produced content.
  - **Real enforcement case:** in May 2026 Jacksfilms exposed at least 12 channels (150K–1.4M subs) that ran looped "live" Roblox streams with fake giveaways and fake countdowns. They were caught by repeated segments and the same "winner" name reappearing. At least one channel was removed. Source: secondary (https://shazoo.ru/2026/05/06/183520/iutuber-razoblachil-set-feikovykh-strimerov-obmanyvaiushchikh-fanatov-roblox); YouTube's statement is unverified.
  - There is no official YouTube statement that 24/7 loops are ineligible. Vendor blogs (e.g. https://outlierkit.com/resources/youtube-loop-streams/) say reviewers judge the channel as a whole: **unverified / secondary**.
- **AI disclosure:** "We require creators to disclose AI-generated or altered content that seems realistic." Exempt: "Gameplay footage from video games" and animation such as "a fully animated video". Music must be disclosed if AI "Creates music that's the main focus of the video." Disclosure is the Studio "AI use" Yes/No setting. — https://support.google.com/youtube/answer/14328491
  - HelloBuh's rendered Minecraft-style footage is unrealistic or animated, so no label is needed unless AI music is the main focus.
- **What reduces risk:**
  - Each stream is materially different: a new seed, world, village and events.
  - Visible real-time state: timers, counters and chat-driven events actually change the content.
  - Honest titles (no "explodes in 1 minute" if it doesn't).
  - No cross-channel duplicates.
  - Optional "pre-recorded"/"replay" wording, or using a Premiere for a fixed file.

### A5. Music: NCS

- **Allowed in streams with credit.** "Can I use NCS music in my videos on YouTube or Twitch? Yes – all we ask is that you credit the Artist and song(s) used in the description of your video/livestream."
  - Stream credit: "If you are using our music on Twitch Stream or YouTube Stream, simply put "Music provided by http://spoti.fi/NCS" in your stream description."
  - Monetization: "Can I monetise my video if I've used NCS music? Yes – but make sure you follow the guidelines". — https://ncs.io/usage-policy
- **Not allowed (the 24/7 "music stream" problem):** "We currently do not allow content which is a music upload (music visualiser, music player, lyric video)… you should only use our music in the above types of content, not simple reuploads of music."
  - Allowed categories include "gaming" and "compilations".
  - NCS may object to use in "Training AI music models or other generative AI content". — https://ncs.io/usage-policy/2/types-of-content
  - Terms: you may not "manufacture or exploit NCS Music separately from the User Generated Content". — https://ncs.io/usage-policy/terms
  - **Net:** NCS under a Minecraft TNT/gameplay live is OK with credit. A "Minecraft ambience + NCS radio 24/7" stream is exactly what NCS forbids.
- **Claims:** NCS says some claims happen through mismatches, and its claim page says not to submit disputes for claims from "Featherstone Music or AEI Group". Use only NCS-official sources. — https://ncs.io/usage-policy/3/i-received-a-claim-strike
- **Content ID on lives:** third-party content in a live means "a placeholder image may replace your live stream". Persisting can lead to interruption or termination and a live restriction; licensed users can still be interrupted unless allowlisted. "Content ID claims are only made after the live stream ends, and only if you choose to archive." — https://support.google.com/youtube/answer/3367684
  - Archive muting is not described there (unverified).
- **Avoid C418 / Lena Raine Minecraft OST** (not covered here; commercially published).

### A6. Length limits

- **Live archive:** "All streams under 12 hours will be automatically archived." — https://support.google.com/youtube/answer/2907883
  - "If your stream exceeds 12 hours, it may not be captured at all." — https://support.google.com/youtube/answer/6247592
  - Because only archived lives give YPP hours, **cap each broadcast at about 11 h 45 m.** 24/7 is possible as consecutive <12 h broadcasts.
  - DVR may be limited past 12 h. — https://support.google.com/youtube/answer/9296823
- **Uploads:** "The maximum file size you can upload is 256 GB or 12 hours, whichever is less". Unverified accounts are limited to 15 min. — https://support.google.com/youtube/answer/71673
- **Premieres:** no length limit is stated, but "360/vr180 or an output greater than 1080p isn't supported for Premieres" and "Shorts aren't supported for Premieres." — https://support.google.com/youtube/answer/9080341
  - Premieres are excluded from the vertical live feed (A2).

---

## B. Formats (market research)

### B1. "TNT village" vertical lives are the hottest Minecraft live format right now (Nov 2026)

- **Real lives, short and repeated.** These are actual lives (isLiveContent, with start and end timestamps). They are **not** 8–12 h: typical length is 40 min–1.5 h, sometimes up to 4–5 h, run **2–6 times per day**. Views per stream swing from about 5K to 2M, which points to a Shorts-feed lottery per stream.
- **ItzPyr0_XD** (@itzpyr0_xd, 91.8K subs): 6 "Minecraft Tnt Village Live" streams in about 1.5 days.

  | Video | Views | Length |
  |---|---|---|
  | https://www.youtube.com/watch?v=QrWP3XBjFSk | 1,489,652 | 1:37:20 |
  | https://www.youtube.com/watch?v=wCv3AjSuoF4 | 621,246 | 3:43:27 |
  | https://www.youtube.com/watch?v=t1Kc4mosqIk | 359K | — |
  | https://www.youtube.com/watch?v=8_7GpLPBJ-o | 126,203 | 1:34:32 |
  | https://www.youtube.com/watch?v=wT5ipRPNBBw | 65,993 | 37:01 |
  | RAvumAlYvzA | 8.8K | — |

  - Previous stream before this run: 3 weeks earlier.
  - The on-screen sub counter read 88,203 during t1Kc4mosqIk (about 1 day before). The channel showed 91.8K at capture, so **about +3.6K subs in about 1–1.5 days**.
- **Tutu Gaming** (@TutuGaming2, 390K subs): since about 9 days ago, ~2 lives/day titled "🔴Minecraft - TNT village live #minecraft #shorts", each 1:03–1:06 long, **64K–1.2M views each**. Examples:
  - https://www.youtube.com/watch?v=7dDtksrxG14 (790,750)
  - https://www.youtube.com/watch?v=SADBZ9Pjm9s (703,047)
  - SxI5r5jmrUU (1.1M), WvDCx1aPzdk (1.2M)
  - **Before switching**, its vertical Roblox/COD lives drew **139–870 views** each (e.g. -JXsP-d2wpY: 160; XaNG-1lwT8U: 870). — https://www.youtube.com/@TutuGaming2/streams
- **Milo**, "Minecraft TNT Village Live !!!": **2,011,233 views**, 56:35. — https://www.youtube.com/watch?v=Sq80Je01Wu4
- **SenZyro** (@SenZyro1, 12.2K subs): ~5 lives/day titled "Minecraft Tnt Village Live 0004", 4.8K–358K views each.
  - https://www.youtube.com/watch?v=HIab64HwxWA: 358,634 views, **4:43:38**
  - https://www.youtube.com/watch?v=flT6rs4F5-Q: 245,772 views, 1:29:30
  - Live https://www.youtube.com/watch?v=xNgbve_MsOo held **525 → 509 → 442 → 437 → 319 concurrent** over about 40 min of my session.
- **Rzendhix** (1.14M subs), "🔴 LIVE MINECRAFT TNT VILLAGE": 367,901 views, 50:38. — https://www.youtube.com/watch?v=u0-nZJGKn9A
- **Clone network (risk signal).** "Minecraft TNT Blast Village Live 0004" runs on several small channels:
  - SILENCE GOD https://www.youtube.com/watch?v=k7L7_eyQcMg: 494,993 views, 51:51, 574 likes; thNby6mt1SE: 440,028
  - KREEPOS live https://www.youtube.com/watch?v=jROu7IzZuGE: 152–192 concurrent
  - FIRE X EDITZ
  - SILENCE GOD's video actually shows a modded **golem fight** under a "1Sub=Golem" banner, not a village. Descriptions are copy-pasted ("Hi, I'm Ashu_playz1" on SILENCE GOD) with tag spam including "#youtubepartner #verticallive #shortslive".
- **The format is not new.** MoonBile (439K subs), "🔴Minecraft Biggest TNT village blast with Subscribers💣💥", streamed about 1 year ago: 123,925 views, 53:18. — https://www.youtube.com/watch?v=bPBPCm_TteU
- **Roblox:** I found no comparable Roblox "village will explode" lives. Tutu Gaming's own Roblox lives were tiny (above).
- **Low engagement.** Likes run about **0.12–0.15% of views** (wCv3AjSuoF4: 901 likes / 621K; k7L7_eyQcMg: 574 / 495K). This is consistent with drive-by Shorts-feed swipes (see E3 for duration estimates).

### B2. Satisfying / build / "until X" lives and long VODs

- **Endurance lives** (bot-friendly premise, tiny audiences at capture):
  - Airz, "Breaking Bedrock in Minecraft FOR 1,000 DAYS (World Record)": 4 watching. https://www.youtube.com/watch?v=WlgeUXlOMTc
  - Airz, "Sailing a Boat in Minecraft FOR 365 DAYS (World Record)". https://www.youtube.com/watch?v=uxt7XyQhmb4
  - Blockathon, "Streaming Until I Fail a One Block Jump!" (thumbnail "100,000 JUMPS"). https://www.youtube.com/watch?v=B00QF4NTeL8
- **Long satisfying/relaxing VODs (horizontal, evergreen):**
  - Spicy Sauce, "6 hour Minecraft parkour run (no falls, study, sleep)": 163,844 views. https://www.youtube.com/watch?v=k9AYE6c0ynE
  - Spicy Sauce, "3 Hour Parkour with Shaders": 510,828. https://www.youtube.com/watch?v=OqPxaKs8xrk
  - bbswitzer, 1:20:14 relaxing parkour: 5,507,648. https://www.youtube.com/watch?v=n_Dv4JMiwK8
  - Windie 3D, "20 Minutes of The Most Satisfying Minecraft Simulations": 2,730,206. https://www.youtube.com/watch?v=D8XSlj_8h_c
  - Orbital's **vertical** parkour hours: about 1.7K–17K views each, e.g. https://www.youtube.com/watch?v=-lVgihPljuI. Vertical long VODs do poorly as VODs.

### B3. Ambient / sleep / study (Minecraft)

- **Long VODs:**
  - Drift Away Ambience, "stop thinking for a moment... (minecraft music w/ soft rain)", 11:54:31: **4,047,755 views**. https://www.youtube.com/watch?v=8v7-7g0LhAU
  - Retrosteve, "10 hours of Minecraft Musicbox with soft Rain": 3,305,748. https://www.youtube.com/watch?v=58YjsK8NYPE
  - CottonVelvet, relaxing longplay 10:29:08: 2,103,365. https://www.youtube.com/watch?v=Dy3VtjcHdCs
  - Start Over, 10:36:14 longplay: 310,869. https://www.youtube.com/watch?v=H_Y40EoB1KY
  - ItsMarloe, "10 Hours of Relaxing Minecraft Gameplay": 57,125. https://www.youtube.com/watch?v=PBchHQqTJ14
- **24/7 Minecraft-ambience lives** (concurrents at about 06:20 UTC on a Saturday):
  - Mochi's World (236 subs): **165**. https://www.youtube.com/watch?v=V3PuLHTd8bQ
  - Live247io: 29. https://www.youtube.com/watch?v=fJcdQ9uYoas
  - Cozy Bee Ambience: 24. https://www.youtube.com/watch?v=ScmHPLG4Rpk
  - Benchmarks: Lofi Girl sleep radio 367 (https://www.youtube.com/watch?v=xORCbIptqcc); Alan Becker lofi 139.
  - These are horizontal and found via search/browse. Most use Minecraft OST-style music, which raises the A5 risks.

### B4. 24/7 vertical lives

- Mostly **automated chat games**, built on the open-source **Falling Pickaxe** (Python, GPL-3.0). The README says it was "inspired from YouTube shorts livestreams"; chat commands include tnt/fast/slow/big; it polls the subscriber count via Data API v3 and queues a MegaTNT for each new sub (about 4 s fuse); launch scripts auto-restart for "unattended streams". — https://github.com/vycdev/falling-pickaxe
- Channels running it are tiny:
  - Endless Arcade Live (11 subs), "TYPE TNT IN CHAT 💥 You Control the Falling Pickaxe! 24/7 LIVE". https://www.youtube.com/watch?v=trKQx8pszpg
  - Pickalanche (11 subs), "LIKE = TNT". https://www.youtube.com/watch?v=dN-R68WD4rw
  - Falling Pickaxe: https://www.youtube.com/watch?v=ohDFqWYs77Y
  - Also JustMilo and Pickaxe Game LIVE.
- **Novelty 24/7 vertical:** DJ Grossman, "Box Fan - Low Speed, Black Screen (Vertical) • Live 24/7 • No mid-roll ads": 43 watching. https://www.youtube.com/watch?v=c5iz06NyjIE
- **Chat-controlled:** "MINECRAFT TETRIS ⛏️ … Satisfying Ore Mining" (TETRIS MINING). Thumbnail reads "CHAT !TNT TO PLAY!" and "ROAD TO 1K SUBS 850/1,000". https://www.youtube.com/watch?v=R_5EvReIa98

### B5. Interactive / countdown / goal formats (automatable)

- **Sub-goal blasts:** "18k SUBS = BLAST!!" (Milo), "1 Sub = Blast!" (SenZyro), "SUB = MORE FAST !!" plus a "TNT = SUB = BOOM" ticker (MoonBile).
- **Chat commands:** !tnt, !big, !fast (Falling Pickaxe); "Say Noob = Ban" chat rules.
- **Timer videos:** short timers dominate.
  - 2-minute Minecraft timer bomb: 257,636 views. https://www.youtube.com/watch?v=eq9NOGUV2RY
  - 3-minute: 172,040. https://www.youtube.com/watch?v=HQ3zt2iNsuY
  - 10-minute: 183,505. https://www.youtube.com/watch?v=3LBvSu8Fx5E
  - 30-minute: 10,116. https://www.youtube.com/watch?v=r1fhLbhHyv8
  - 1-hour: 36,680. https://www.youtube.com/watch?v=i3Ow5LdP36U
- **Automation tooling:**
  - YTLiveMC plugin ("sub = die", "like = spawn tnt"). https://awesome.ecosyste.ms/projects/github.com%2Fsiwoolol%2Fytlivemc
  - YouTube Data API costs: liveChatMessages.list = **5 units**; channels/videos/liveBroadcasts calls = 1 unit; default quota 10,000 units/day. One API project can therefore poll chat about 2,000 times/day, which is **about every 22 s over a 12 h stream** (every 43 s over 24 h). — https://developers.google.com/youtube/v3/determine_quota_cost

### B6. What holds concurrents and how vertical lives surface

- **Entry:** Shorts-feed "Watch Live" button, or pause a Short and tap Live, then swipe between lives (A2 sources). Discovery reaches non-subscribers.
- **Holding factors seen on the winners:**
  - An always-visible goal or state (live sub counter, "X SUBS = BLAST", a counter box).
  - Constant motion: first-person walking or placing toward the target.
  - A visible "next payoff".
  - Chat rules that invite typing.
- **Concurrent data:** 150–525 concurrents on lives with 60K–1.5M views. Fast churn is implied (E3).
- **Subs:** ItzPyr0_XD gained about 3.6K subs in about 1.5 days (B1). AIR's 2025 gaming medians show 1.23 subs per 1K live views vs 1.65 for videos. — https://air.io/en/air-data-findings/livestream-rpm-revenue-and-subscribers-by-youtube-niche-the-2025-numbers

### B7. Money; live vs VOD vs Premiere

- **RPM (AIR Media-Tech, 2025, 404 channels):** gaming live RPM **$2.49** vs video **$1.15** (median), and **$0.68 ad revenue per streamed hour** (gaming median). — https://air.io/en/air-data-findings/livestream-rpm-revenue-and-subscribers-by-youtube-niche-the-2025-numbers
- **Shorts RPM:** median "$0.07 to $0.20 per 1,000 views in most niches"; gaming about $0.17. — https://air.io/en/air-data-findings/youtube-shorts-rpm-vs-long-form-how-much-do-shorts-earn-in-2026
- **Vertical-feed live viewers see no live ads (A3),** so a viral vertical live mostly monetizes through the horizontal leg, the replay and fan funding.
- **Sleep/ambient RPM** claims of $2–11 are **unverified** (blog estimates).
- **"Village explodes" content is overwhelmingly real lives** (vertical, `#shorts` in title), not Premieres. Premieres can't enter the vertical live feed.
  - Some are likely pre-recorded re-streams. Signs: an identical "0004" numbering across channels, a static "999" counter on SenZyro, and identical durations. This is **inference, unverified**.
  - Tutu Gaming shows a real webcam, so it is likely live play.

---

## C. Free ($0) streaming infrastructure

- **Push:** use ffmpeg RTMP(S) with a stream key copied from Live Control Room (or created via liveStreams.insert).
  - Google says to use RTMPS: "Both the protocol and the server should be rtmps", with port 443 if SSL errors occur. — https://support.google.com/youtube/answer/10364924
  - The commonly used URL is `rtmps://a.rtmps.youtube.com:443/live2/<key>`. Note: `rtmps://a.rtmp.youtube.com` in the brief is the wrong host. **Verify** against Live Control Room.
  - Sketch: `ffmpeg -re -i next_segment.mp4 -c copy -f flv rtmps://…/live2/KEY` for pre-encoded H.264/AAC at keyint 2 s. Use concat/playlist input for continuous play, and the `tee` muxer for dual horizontal + vertical keys (which doubles egress).
- **Bandwidth:** 720×1280 at about 4.5 Mbps is about 2 GB/h, so **about 24 GB per 12 h stream** and about 730 GB/month for daily 12 h streams.
- **Where to run it:**

  | Option | Facts | Verdict |
  |---|---|---|
  | **Oracle Cloud Always Free** | "10 TB per month of outbound data"; Ampere A1 "2 OCPUs and 12 GB of memory" in total, plus 2 AMD micro VMs. Idle reclamation applies if over 7 days CPU p95 < 20%, network < 20% and (A1) memory < 20%. — https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm | **Only viable $0 24/7 host.** A copy-only ffmpeg stream may look "idle", so do the rendering on the VM. Signup reportedly needs a card for verification (unverified). |
  | **Google Cloud e2-micro** | "1 GB of outbound data transfer from North America … per month". — https://docs.cloud.google.com/free/docs/free-cloud-features | Useless: a 12 h stream is about 24 GB. |
  | **GitHub Actions hosted runners** | "Each job in a workflow can run for up to 6 hours". — https://docs.github.com/en/actions/reference/limits | 6 h jobs; ToS problem in next row. |
  | GitHub Actions minutes | Public repos: standard runners free. GitHub Free private repos: $12/month included (2,000 Linux min). — https://docs.github.com/en/billing/concepts/product-billing/github-actions | |
  | **GitHub Actions ToS** | Actions "should not be used for … any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository", nor as "a content delivery network". Misuse can mean "suspension or termination of your GitHub account". — https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features | **Streaming video from Actions is very likely a violation.** It would risk the account that also hosts the Shorts renderer. |

- **Upload a long VOD instead (simplest, no server):**
  - Max 12 h / 256 GB. Watch hours count normally.
  - Ads: mid-rolls (≥8 min) and auto-placement.
  - Trade-off: no Shorts-feed live discovery. Vertical long VODs underperform (B2: Orbital).
- **Premiere (pre-recorded with countdown and chat):**
  - Countdown and live chat; ≤1080p.
  - **Not in the vertical live feed.**
  - Only pre-rolls during the Premiere; normal ads afterwards (A3/A6).
- **API:**
  - `liveBroadcasts.insert` and `bind` (1 unit each).
  - `contentDetails.enableAutoStart` ("start automatically when you start streaming"). `enableAutoStop` stops it "around one minute after" streaming stops. That is the reconnect window if chaining 6 h jobs; disable it for planned hand-offs (behaviour on disconnect is unverified).
  - `enableDvr`; `recordFromStart` defaults true (needed for the archive). — https://developers.google.com/youtube/v3/live/docs/liveBroadcasts
  - Mind the daily live-creation limit (A2).

---

## D. What these streams look like (anatomy)

Examples are drawn from YouTube's 25/50/75% auto-frames and live snapshots. Layout positions are as seen in the frames; audio was not checked.

1. **ItzPyr0_XD, "Minecraft Tnt Village Live"**
   - Links: https://www.youtube.com/watch?v=QrWP3XBjFSk (1.49M, 1:37:20), https://www.youtube.com/watch?v=wCv3AjSuoF4 (621K, 3:43:27), https://www.youtube.com/watch?v=t1Kc4mosqIk (359K).
   - Native 9:16. Top ~10% is a black band with bold white sans text on two lines: "Say Noob = Ban" / "Don't say 67" (chat rules as a hook).
   - Top-right: a black box with a **live subscriber counter** in white ("88.203 Subscribers", later 90.406).
   - Gameplay fills roughly the middle 65%, and the **bottom ~25% is black/empty**, where the Shorts-live UI (chat, buttons) overlays.
   - No webcam, no on-screen chat, no visible timer.
   - Camera: **first-person**, held TNT in the right hand, walking down a dirt path through a huge field of **coloured TNT** (lime, red, yellow, purple, blue, pink) toward village houses.
   - The TNT colour and village change between 25/50/75% frames, so there are **many rounds per stream** (one village per round). This is inferred.
   - Title: plain "Minecraft Tnt Village Live". Thumbnail: a rendered stock "player + TNT pile" image, not a frame.
   - Payoff: presumably each round ends in ignition and a blast, then a new village. Not observed directly (unverified).
2. **Milo, "Minecraft TNT Village Live !!!"** (2.01M, 56:35) — https://www.youtube.com/watch?v=Sq80Je01Wu4
   - Same layout family: top band "Say Noob = Ban" in white with "**18k SUBS = BLAST!!**" in red underneath.
   - First-person walking a path between TNT rows into a village; later frames show a diamond/light-blue block field (a new round).
   - Thumbnail reads "AVERYMC IS LIVE" (a generic "is live" art card).
3. **SenZyro, "Minecraft Tnt Village Live 0004"** — https://www.youtube.com/watch?v=xNgbve_MsOo (live, 319–525 concurrent), https://www.youtube.com/watch?v=flT6rs4F5-Q (245K)
   - Top: "Say Noob =" in white and "Ban" in red, with a white box holding a black number "**999**". It is identical across frames, so it is static decoration rather than a countdown (inferred).
   - A "**1 Sub = Blast!**" sticker with a TNT icon sits inside the game frame.
   - First-person over yellow/pink TNT fields, digging a path.
   - About 5 streams/day.
4. **MoonBile, "🔴Minecraft Biggest TNT village blast with Subscribers💣💥 #minecraft #shortslive"** (124K, 53:18, ~1 yr ago) — https://www.youtube.com/watch?v=bPBPCm_TteU
   - Top: a large **live sub counter** (black digits in a white box: 381,631 → 381,726 across the stream).
   - Yellow text "SUB = MORE FAST !!".
   - Bottom: a **magenta scrolling ticker** "TNT = SUB = BOOM>:".
   - Camera behind and above a player building TNT walls around a village (third-person-like).
   - Payoff is tied to subs: subs speed up building, then the blast.
5. **Tutu Gaming, "🔴Minecraft - TNT village live #minecraft #shorts"** (790K / 1.2M) — https://www.youtube.com/watch?v=7dDtksrxG14 , WvDCx1aPzdk
   - No text overlays.
   - First-person **placing long lines and towers of TNT** across grassland toward a village.
   - A **real webcam** in a bottom-right box, under the game area.
   - Lengths are consistent at 1:03–1:06, about 2/day.
6. **Rzendhix, "🔴 LIVE MINECRAFT TNT VILLAGE"** (368K, 50:38) — https://www.youtube.com/watch?v=u0-nZJGKn9A
   - Full-height 9:16 gameplay with shaders and modded TNT variants ("Fire TNT", striped "2" TNT, "TNT x2" item tooltips).
   - No static overlay; spectacle-driven.
7. **SILENCE GOD, "Minecraft TNT Blast Village Live 0004"** (495K, 51:51, 1080×1920) — https://www.youtube.com/watch?v=k7L7_eyQcMg
   - Header art "**1Sub=Golem**" over a black band, and a top-right white-on-black number box (820 → 440: a counter).
   - Content is a modded golem fight, not a village (title/content mismatch).
8. **Falling Pickaxe (automated, 24/7-capable)** — https://www.youtube.com/watch?v=ohDFqWYs77Y , https://github.com/vycdev/falling-pickaxe
   - Full 9:16 **2D side view** of a stone shaft with ores; the pickaxe falls and breaks blocks; TNT blasts appear as white smoke puffs.
   - Left column: ore counters with icons (e.g. coal 82, iron 45, gold 20, redstone 232, diamond 7, emerald 3) and depth "Y: -243".
   - Top-right box: "CHAT COMMANDS: !tnt !big !fast !slow …" with rate limits.
   - Each new sub triggers a MegaTNT. No human involved.
   - Thumbnail style: "TYPE TNT IN CHAT!" and "LIKE = TNT".
9. **Minecraft ambience 24/7 (horizontal)** — https://www.youtube.com/watch?v=V3PuLHTd8bQ (165 concurrent)
   - Thumbnail: a shader night-scenery triptych with the big soft title "Sleep well".
   - The title promises "Minecraft Music & Cozy Ambience". I didn't see the in-stream layout (only the custom thumbnail was served).

**Common pattern**

- **Frame:** native 9:16 (1080×1920 or 720×1280). Gameplay sits in the upper-middle ~65%. A **black top band** (~10–15%) carries 1–2 lines of bold white sans text with one red keyword. The **bottom ~20–25% is left empty** for the Shorts-live UI.
- **Permanent text:** a chat rule ("Say Noob = Ban", "Don't say 67") plus a **goal/trigger** ("18k SUBS = BLAST!!", "1 Sub = Blast!", "SUB = MORE FAST") and a **live number box** (sub counter, or a counter). No countdown clocks in hh:mm:ss on the winners.
- **Camera:** continuous first-person, always moving toward the target (walking a path through TNT, placing TNT lines). No cuts within a round; a new village and new TNT colour each round, several rounds per stream.
- **Titles:** generic and repeated ("Minecraft TNT Village Live", "🔴Minecraft - TNT village live #minecraft #shorts"), with `#shorts`/`#shortslive` and no time in the title. Thumbnails are glossy stock "TNT + character" or "IS LIVE" cards.
- **Length and cadence:** 40 min–1.5 h typical (max seen 4:43), 2–6 streams/day, real lives.
- **Interaction:** subs and likes as blast or speed triggers; chat-rule bait; chat commands in fully automated games. Sub/like polling and chat commands are fully automatable via the Data API.

---

## E. Keeping the payoff "imminent" (design), and how long people wait

### E1. How the winners make it feel "about to blow" at every moment

- **Rounds, not one big blast.** Successful TNT lives change village and TNT colour between the 25/50/75% frames of a 1–4 h stream (B1/D1–2). That suggests rounds of minutes, each ending in a blast. A viewer swiping in at hour 3 is never more than one round from a payoff (inferred from frames; round length unverified).
- **Visible "trigger" instead of a long clock.** Goal text ("18k SUBS = BLAST!!", "1 Sub = Blast!") plus a live sub counter makes the blast feel one action away. Moving counters (88,203 → 88,335) show progress (D1–4).
- **Constant approach motion.** The first-person walk toward the village through TNT always reads as "almost there" (D1–3).
- **Frequent real mini-blasts.** Falling Pickaxe fires chat TNT continuously, MegaTNT on each new sub with a ~4 s fuse, and rate-limits commands (https://github.com/vycdev/falling-pickaxe).
- **Short timers win attention.** In standalone timer videos, 2–10 min timers get 170K–260K views vs 10K–37K for 30–60 min (B5). For an on-screen clock, roll **minutes, not hours**.
- **Fake or reset timers backfire.**
  - The Jacksfilms case (May 2026): looped "live" streams with fake countdowns and repeating "winners" were publicly exposed and partly removed (A4).
  - Policy hooks: "Malicious clickbait: Using maliciously misleading titles, thumbnails, descriptions, or imagery" (https://support.google.com/youtube/answer/2801973), and engagement-only incentive content (https://support.google.com/youtube/answer/3399767).
  - Titles like "exploding in 1 minute" on a multi-hour stream: none found on the winners; avoid.
  - A static "999" pseudo-counter (SenZyro) works only as decoration and carries some risk.
- **Honest imminence recipe (synthesis):**
  - A rolling round timer of 3–5 min (mm:ss) that **always** ends in a real blast.
  - A per-round TNT counter.
  - "Next: BIGGER blast in 0:47" teasers.
  - Like/sub/chat triggers that add TNT or shorten the fuse.
  - A larger "mega" blast on the hour.

### E2. Pacing guidance (practitioner, anecdotal)

- **Every 3–5 minutes** "something should shift": https://blog.be.live/what-livestreamers-should-do-in-a-short-form-world/ , https://scalelab.com/en/tips-for-interacting-with-viewers-during-a-stream
- **Every ~10–15 minutes:** a reset/poll restating the goal (search summary; I couldn't pin down which page said it, so treat it as anecdotal; candidates include https://air.io/trending/how-to-keep-a-high-engagement-rate-on-streams)
- **Over-frequent prompts can drive viewers off.** One streamer moved timers to every 12–15 min (anecdotal; via search summary).
- No controlled data found for a "2–3 min" rule.

### E3. How long people actually wait (numbers)

- **Event-payoff peaks are tall.** SpaceX Starship flight 1 stream (Apr 20 2023): peak **1.67M**, average **381K** (23% of peak), 986K hours watched. Peak came "towards the end of its run", at launch and explosion. Viewers pile in for the payoff rather than sit through the build-up. — https://streamscharts.com/news/starship-flight-test-becomes-spacexs-most-watched-stream-ever
  - I found no minute-level curve showing post-T-0 drop-off, but game-launch data shows sharp front-loading (Highguard: 76.8% of week-1 viewership in the first 24 h). — https://streamhatchet.com/blog/highguard-shadow-drops-on-live-streaming/
- **Live sessions generally:** about **25.4 min per live session** vs about 19 min VOD (Conviva, 2021, cross-industry; via https://bloggingwizard.com/live-streaming-statistics/). Secondary, not YouTube gaming.
- **Vertical TNT lives in the Shorts feed:** no published data. My rough estimate from observed numbers uses average watch time ≈ average concurrents × elapsed time ÷ views (Little's law):
  - KREEPOS live jROu7IzZuGE: about 150 concurrent, about 32 min after start, 3,203 views, so **about 1.5 min per view**.
  - SenZyro: a 4:43 stream with 358,634 views, assuming 300–500 concurrents (seen on its next live), gives **about 15–25 s per view**. This one is an underestimate, because replay views keep accruing.
  - So most Shorts-feed entrants stay **seconds to about 2 minutes**. A payoff or visible state change has to land within that window, which argues for a round of no more than about 5 min with a visible "next blast" clock.
  - **Estimate, unverified.**
- **Long ambient VODs** (the "wait for hours" behaviour) are a different audience: sleep/background viewers (B3). They don't need a payoff, but they bring the music/NCS and "inauthentic" risks.

---

## What this means for us

- **Best fit: a round-based vertical "TNT village" live.**
  - Rounds of about 3–5 min: walk/fly-in through TNT, a visible fuse timer, a real blast every round, a new village and colour each round, a "MEGA blast" on the hour.
  - Overlays: top band, a TNT counter and a mm:ss round clock; keep the bottom 25% clear.
  - Run **1–3 h sessions 2–4×/day** rather than one 12 h block: every winner does short, repeated lives, and each new live seems to get its own Shorts-feed push (inferred). For overnight 8–12 h, keep each broadcast under 12 h so it archives.
- **Make every stream materially different.** Use a fresh seed, village layout, TNT variants and event order, and real-time state such as live like/sub/chat triggers via the Data API (about 22 s chat polling within the 10K quota).
  - Never re-stream the same file or share one stream across channels. That is the A4 "mass-production"/"inauthentic" and Jacksfilms-style risk.
- **Monetization reality.**
  - Vertical-feed viewers get **no live pre/mid-roll ads**. Use **dual format** (horizontal plus a second vertical key) or rely on archive and fan funding.
  - Only **public archived** lives count toward YPP. Whether Shorts-feed live watch time counts is **unverified**.
  - The bar becomes **8,000 h for new applicants from Feb 1 2027** (~79 days). That is about 22 qualified hours/day for a year, or about 51 h/day to hit 4,000 h before then.
- **Honest imminence only.** Rolling short clocks that actually fire are fine. Fake "999"/reset timers, "explodes in 1 minute" titles on multi-hour streams, and sub-only premises ("content that solely exists to incentivize viewers for engagement") are policy and reputational risks.
- **Music:** NCS under gameplay with "Music provided by http://spoti.fi/NCS" in the description is allowed. An NCS "radio/visualiser" ambience stream is not. Avoid the Minecraft OST.
- **Infrastructure:**
  - **Oracle Cloud Always Free** (10 TB egress) is the only realistic $0 24/7 streamer. Render on the VM too, so it isn't reclaimed as idle.
  - GCP e2-micro is out (1 GB egress).
  - **Don't stream from GitHub Actions:** ToS (non-CI use) and the 6 h job cap would put the Shorts pipeline's GitHub account at risk.
- **Fallbacks:**
  - A pre-rendered **long horizontal ambient/satisfying VOD** (10–12 h) earns evergreen watch hours with normal mid-rolls. Long Minecraft relax VODs hit 0.3–4M views. Vertical long VODs underperform.
  - **Premieres** lose Shorts-feed discovery and mid-rolls during the Premiere.
- **Biggest risks, ranked:**
  1. Inauthentic / mass-produced (repetitive automated streams).
  2. Misleading imminence or titles.
  3. Vertical-only = no live ads and uncertain YPP hours.
  4. The 12 h archive limit.
  5. Music claims replacing the stream with a placeholder.

---

## F. Beyond TNT: what is viral now, and mob battles (added 2026-11-14, after the owner: "we dont necessarily need to do TNT")


Scope: what is viral in Minecraft Shorts and lives in Sept–Nov 2026, mob battles in depth, long-live formats with a constant "something is about to happen" feel, and how each fits HelloBuh: vanilla 1.21 server, bot player, offline renderer, pre-rendered, 9:16, $0, no real-time chat reading.

**Method and caveats**
- YouTube watch pages blocked automated reads (Google "sorry" redirect), so per-video and per-channel numbers come from **vidIQ stats pages** (snapshots dated 2026-11-13/14), YouTube oEmbed (title and channel only), news coverage, and video frames from `i.ytimg.com/vi/<id>/hq1-3.jpg`.
- vidIQ says its long-form/Shorts splits "include estimates", so treat view counts as close, not exact.
- This complements the TNT-village research already in the repo (`docs/research/livestream.md`, read 2026-11-14). That doc has the live concurrent snapshots, YouTube policy, money and hosting. I don't repeat them except where needed for comparison.
- "(unverified)" means one weak or secondary source only.

---

### F.0. Ranking for this channel (short version)

1. **Mob gauntlet / tournament ("can X beat every mob?")**: fit 5/5. This is what is hot in long-form mob content this autumn. It runs in vanilla with natural enemies. A payoff (a KO) lands every 15–90 s. A ladder or bracket on screen always shows the next fight.
2. **Mob scoreboard contests and last-mob-standing royale** (e.g. "which mob makes the most sculk", a shrinking world border): fit 4–5. It is vanilla-native and the scores move all the time. ZoraCrafter's sculk contests show the format is live in 2026.
3. **Village siege that gets worse every wave** (golems and villagers vs escalating waves, then a TNT finale): fit 4. It merges the proven TNT-village "about to explode" live (150–525 concurrent) with mob fights and gives the "edge it" pacing the owner asked for.

Not recommended as the 8–12 h spine: the fake AI-assistant horror mod (Verity-style), AI-agent civilizations, ambience/ASMR, parkour backgrounds, hardcore endurance, chat-controlled games. Details and scores are in §4.

---

### F.1. What is viral right now (Sept–Nov 2026)

#### 1a. Mob battles (Shorts and long-form): hot again, now driven by horror/creepypasta mobs
- **ZoraCrafter** (135K subs, **+11K in the last 28 days**; **+6.63M views and +33K subs in Oct 2026**). — https://vidiq.com/youtube-stats/channel/@zoracrafter/
  - "JERRY DOG vs All New Minecraft Bosses | Mob battle" (Sep 30, 2026): **2.87M views, 11:47, 38.94K likes, 49.6x outlier**. — https://vidiq.com/youtube-stats/channel/@zoracrafter/videos/EDxmUgwkezo/
  - "Which TaCZ Gun is Strongest Against JERRY DOG ?" (Oct 3, 2026): 1.97M.
  - "GHOSTPIG vs All New Minecraft Bosses" (Sep 1, 2026): 1.04M.
  - "VERITY + FALSITY + CRUELTY + OBSCURITY" (Aug 6, 2026): 1.34M.
  - "Which New Doctor Nowhere Creature will generate more Sculk ?" (Apr 2, 2026): 1.18M.
  - Latest, "Which Stalkers and Creepypasta mobs will generate more Sculk ?" (Nov 3, 2026): 123.76K. — same vidIQ page
- **Vikcraft** (291K subs, 150.5M views) is steady: **~1.1–1.6M views a month** Jun–Oct 2026, and uploads keep going (latest Nov 11, 2026).
  - Top video: "Warden vs Every mob in Minecraft (Bedrock Edition)", Jun 2022, **14.28M**.
  - "ALL WARDENS vs ALL IRON GOLEMS", Sep 2022, 7.85M.
  - — https://vidiq.com/youtube-stats/channel/@vikcraft7429/
- **Warning sign: the "Italian brainrot" mob-battle wave is over.** **Glebo** (19.9M subs, 5.95B views) had its best month in **July 2025 (+2.3M subs, +570.47M views)**. By Oct 2026 it gained only +481K views and lost subs, and its last upload was Dec 9, 2025. — https://vidiq.com/youtube-stats/channel/@glebo/ . Meme-character battles burn out fast. The matchup has to carry the video, not the meme.
- **Demand for "who would win" is evergreen.**
  - A matchup-predictor site lists the most-asked fights: **Ender Dragon vs Wither, Iron Golem vs Warden, Creeper vs Skeleton, Blaze vs Ghast**. — https://craftdex.net/mob-battle
  - A viral Reddit clip of 100 zombified piglins vs one warden rode the "100 men vs 1 gorilla" meme. — https://www.sportskeeda.com/minecraft/player-simulates-100-men-vs-1-gorilla-trend-minecraft-zombified-piglins-warden (date unverified; page 403'd)

#### 1b. Fake mods / "AI assistant mod" horror: the biggest Minecraft trend of 2026
- **Verity (ThatMob)**: found-footage videos of a player who installs a mysterious **AI-assistant mod**, a yellow smiley orb that turns sinister.
  - Premiered **May 30, 2026**; **22M+ views in about 2 months**. — https://knowyourmeme.com/memes/subcultures/verity-minecraft-arg
  - "20M+ views since May 2026". — https://www.pcgamesn.com/minecraft/verity-mod-viral-millions-downloads (Jul 14, 2026)
  - Fan mods: **4.9M downloads in 28 days** for one Bedrock add-on. — same PCGamesN
  - Verity JE: ~3.8M CurseForge downloads. — https://www.player.one/minecrafts-horror-mods-are-turning-familiar-blocks-psychological-horror-163899 (Aug 24, 2026)
  - Fan song "It's Me, It's Verity": 12M+ in about a month. — KYM above
  - "Verity's From Minecraft, He Belongs To Backrooms" was called one of September 2026's strangest memes. — https://trending.knowyourmeme.com/editorials/guides/what-is-the-veritys-from-minecraft-meme-the-viral-he-belongs-to-backrooms-memes-explained
  - **No. 7 on Google's Frightgeist Halloween-costume list** (Oct 14, 2026). — https://www.yahoo.com/entertainment/articles/minecraft-verity-top-trending-halloween-162927717.html
- **Horror-mod genre** (The Man From The Fog 17.6M downloads, Cave Dweller, FALSITY, Creepy Horse).
  - Built on "waiting builds tension", a familiar world turned wrong, and serialized escalation. — player.one above
  - Mob-battle channels feed on it: Jerry Dog, Ghostpig and Verity are all horror-mod entities (§1a).
- **"Minecraft, But …" challenge mods/datapacks** still pull millions.
  - Wallibear (3.88M subs): "Minecraft, But If We Say ANYTHING it Disappears…" (Apr 25, 2026) **3.21M**; "One Chunk, But The Chunk Changes EVERY MINUTE…" (Oct 2, 2025) **4.73M**.
  - Latest, "Minecraft, But Achievements Expand The Border…" (Nov 12, 2026): **184.54K in its first 10 h**.
  - — https://vidiq.com/youtube-stats/channel/@wallibear/
  - Many of these are **datapacks, which run on a vanilla server**: Planet Minecraft lists 1,812 "Minecraft, but" packs, such as "random chaos event every 30 seconds". — https://www.planetminecraft.com/data-packs/minecraft-but/move/
- Long lives: none found. Verity-style content is scripted episodes and Shorts, not lives.

#### 1c. AI-controlled players / AI villagers: big in the news, small on YouTube
- **News peak, Oct–Nov 2026:**
  - Google DeepMind's four Gemini agents beat the Ender Dragon in a sandboxed survival world: **27 h 14 min, 605 deaths, 2,783 Mineflayer programs, ~$520 in tokens**. — https://gizmodo.com/four-ai-agents-have-slain-minecrafts-ender-dragon-2000827679 (Oct 19, 2026)
  - 50 GPT agents told to "build a thriving civilization" fell into bureaucracy. — https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-agent-swarms-unleashed-in-minecraft-to-build-a-thriving-civilization-50-agent-teams-fail-after-falling-into-paralyzing-bureaucracy
- **YouTube numbers are modest:**
  - "Scientists Trapped 1,000 AIs in Minecraft…" (Apr 2026): 87K views, 10:40. — https://vidiq.com/youtube-stats/channel/@DanGrib/videos/ulF758rj20o/
  - "50 AIs in Minecraft Built a Society. Then a Chicken Went Missing." (Nov 9, 2026): 5.29K. — https://vidiq.com/youtube-stats/channel/@ClaudiusPapirusYT/videos/R41pD_1RKKo/
  - Emergent Garden (293K subs) is the exception, rising to **+1.74M views in Oct 2026**: "Rogue AI Agents" (Oct 10, 2026) 800.77K; "4 AIs Survive 10 Days in Minecraft" (2024) 1.9M. — https://vidiq.com/youtube-stats/channel/@EmergentGarden/ (whether "Rogue AI Agents" is Minecraft footage is unverified)
  - "AI Villagers simulate civilization" (Bibas) peaked at 265K in 2024; that channel now gets ~3–4K views a month. — https://vidiq.com/youtube-stats/channel/@bibasXL/
- **24/7 AI-plays-Minecraft lives are tiny**: listings show **2–25 viewers** (unverified snapshot). — https://www.twitch.tv/directory/all/tags/AI , https://topservers200.com/minecraft/stream
- Precedent for an AI "never-ending show": *Nothing, Forever* (AI Seinfeld, Twitch) spiked to **~14–15K concurrent** in Feb 2023. After a ban it was down to 1–1.5K, then **30–70**. — https://www.vice.com/en/article/thousands-of-people-cant-stop-watching-ai-tv-show-nothing-forever/ , https://the-decoder.com/24-7-ai-seinfeld-show-is-back-on-twitch/ , https://www.404media.co/this-is-horrible-creators-of-nothing-forever-ai-seinfeld-talk-about-the-show-jumping-the-shark/

#### 1d. Simulations / "until X happens" (no player)
- RedLogic, "Running Minecraft Until It Beats Itself": a world with **no player**, run until mobs kill the Ender Dragon (Monte Carlo, ~1.975 billion in-game years).
  - Uploaded Sep 6, 2026; 11:25; **7.6M views by Oct 13** (reported by an aggregator; unverified on YouTube). — https://pasqualepillitteri.it/en/news/23542/redlogic-reveals-how-long-minecraft-takes-to-beat-itself
  - Corroborated by Dexerto and Game & Guide. — https://www.dexerto.com/minecraft/youtuber-simulates-2-billion-years-of-minecraft-to-see-if-the-game-can-beat-itself-3411018/ , https://www.gamenguide.com/articles/109011/20260925/minecraft-beat-itself-after-nearly-2-billion-simulated-years-new-experiment.htm
  - This is directly on-brand for a bot channel ("Minecraft with nobody playing").
- Human-player civilization videos: Ish's latest reportedly got **34M views in 4 months**, ~2.5 h long (student newspaper; unverified). — https://thesciencesurvey.com/spotlight/2026/03/08/the-rise-of-minecraft-civilization-videos/

#### 1e. Chain reactions / satisfying / TNT
- The **TNT-village vertical live** is still the hottest Minecraft live format (Nov 2026):
  - 40 min–1.5 h lives, 2–6 a day, **60K–2M views each**, **150–525 concurrent** observed.
  - ItzPyr0_XD 1.49M on a 1:37 live; Tutu Gaming 64K–1.2M per live.
  - — `docs/research/livestream.md` §B1, e.g. https://www.youtube.com/watch?v=QrWP3XBjFSk
- "20 Minutes of The Most Satisfying Minecraft Simulations": 2.73M (horizontal). — https://www.youtube.com/watch?v=D8XSlj_8h_c (via livestream.md §B2)
- Non-Minecraft "ball escape" / bouncing-ball sims are a crowded automation niche. Automated channels publish them from CI; e.g. a GitHub repo releasing "Can the ball escape all 19 rings?" daily in Oct 2026. — https://github.com/hthkrksy54-dotcom/Yt/releases/tag/sims-20261018-escape-25

#### 1f. Hardcore / endurance, ambience, parkour (the long-form evergreens)
- **Endurance lives draw almost nobody:** Airz "Breaking Bedrock … FOR 1,000 DAYS" had **4 watching**. A new "1000 Days Hardcore Full Movie" (Nov 1, 2026) had ~600 views per a comment (unverified). — livestream.md §B2; https://www.youtube.com/watch?v=flG6MjHN3kQ
- **Ambience works as long horizontal VODs**, not lives:
  - Drift Away Ambience, 11:54:31: **4.05M**.
  - 24/7 Minecraft-ambience lives: **24–165 concurrent**.
  - — livestream.md §B3
- **Parkour:** the horizontal 1:20 relaxing parkour has **5.5M**; vertical parkour hours get **1.7K–17K**. — livestream.md §B2

#### 1g. Where the live audience is
- Minecraft on **TikTok LIVE: avg 37,701 / peak 82,882 viewers in Oct 2026** (+15% avg vs Sept). That category is mostly gift-controlled interactive streams, which need real-time input. — https://tiktokstats.com/categories/minecraft
- **Minecraft LIVE (Sep 26, 2026)** peaked at **694K concurrent across 279 channels**, with the official channel at ~367K. — https://streamscharts.com/news/minecraft-live-september-2026-viewership
  - Announced: the **frozen zombie** mob and Ice Caves drop, and a new dimension, **The Sift (2027)**. — https://www.bisecthosting.com/blog/minecraft-live-announcements-september-2026-the-sift-ice-caves-more
  - None of these are in a 1.21 server.
- The official Minecraft channel hit **#16 globally (543.7M weekly views)** on Shorts in July 2026. — https://www.tubefilter.com/2026/07/13/top-50-most-viewed-youtube-channels-week-of-07-12-2026/

**Which of these exist as long lives (hours)?** Only TNT-village (and its clones), ambience, chat-controlled falling-pickaxe games, endurance runs and AI-agent streams. Of those, only TNT-village holds hundreds of concurrents in the vertical feed. Mob battles, fake-mod horror, "Minecraft but" and AI civilizations are Shorts or 8–15 min long-form. That is the gap.

---

### F.2. Mob battles: how they are staged

### Production patterns (from frames and stats)
- **Long-form 8–16 min, many short fights.**
  - Lengths: ZoraCrafter Jerry Dog 11:47. Glebo "SQUID LOLOLO vs All Italian Brainrot Bosses" 15:26 (23K views, Jul 2025). Vikcraft "Warden vs Every mob" 8:27 (11.5M per an aggregator; unverified). — vidIQ pages above; https://vidiq.com/youtube-stats/channel/@glebo/videos/-33Ts8LA_1s/
  - "Warden vs Every mob" in 8:27 implies **~10–20 s per matchup** (my estimate).
- **Vikcraft** ("All Illagers vs All Wardens", frames hq1–hq3). — https://www.youtube.com/watch?v=-_su15pmuM0 , frames https://i.ytimg.com/vi/-_su15pmuM0/hq1.jpg
  - Between fights: a **"VS" title card** (blue left, red right, framed mob portrait, name under it).
  - Fights on a **flat sand superflat** under open sky, with **boss-bar-style health bars at the top** naming both fighters.
  - The player's hotbar is visible, so it reads as raw gameplay.
- **ZoraCrafter.** — https://i.ytimg.com/vi/mx_BGQSu0gY/hq2.jpg , https://i.ytimg.com/vi/MuzOdHzKWXE/hq2.jpg
  - "Ghostpig vs All Bosses" uses a **gauntlet checklist** down the left edge: opponent icons get a **green check** when beaten, and a **lucky-block "?"** marks the next one. The viewer always sees progress and that more fights remain.
  - The sculk contests use **live score columns** on both edges (mob icon plus a number per mob: 476, 520, 850, 931…) over a **striped concrete arena**.
- **Commentary:** none seen in frames or titles. These are music and gameplay (audio not checked). Prompts are titles like "Which … will generate more Sculk ?" and "vs All New Bosses".
- **"Vote in chat":** I found **no** mob-battle live that reads chat votes.
  - The closest is a sub-goal banner. **SILENCE GOD**, "Minecraft TNT Blast Village Live 0004", is a vertical live (494,993 views, 51:51) that actually shows **modded golems fighting on a TNT-covered floor**.
  - It has huge stacked heart-bar health bars over each mob, a **"1Sub=Golem"** banner and a live counter box ("440").
  - Its descriptions are copy-pasted across a clone network (risk signal).
  - — frame https://i.ytimg.com/vi/k7L7_eyQcMg/hq2.jpg ; data in livestream.md §B1
- **24/7 or multi-hour mob-battle lives:** none found.
  - The "LIVE MOB BATTLE" Short from ALPHA GAMERZ ("ME VS ALL GOLEMS | MASSIVE MOB ARMY TOURNAMENT", ~2 years old) is tagged #shortslive. — https://www.youtube.com/watch?v=6KRvrnQx-Kg
  - Bracket videos exist but are small: AndyDrewXP "1v1 Tournament of Every Hostile Mob (March Madness)" had **986 views**. — https://vidiq.com/youtube-stats/channel/@AndyDrewXP/videos/vu5RGasoWG4/
  - The niche is open for a long vertical mob tournament.

### Vanilla vs mods
- **The popular channels use mods/add-ons.**
  - Vikcraft's top video is Bedrock with mutant/titan add-ons; ZoraCrafter and Glebo use horror/brainrot mods.
  - The standard Java tool is **Mob Battle Mod** (flemmli97, **578.9K downloads**): a "Mob Stick" pits two mobs, and "Mob Army" uses scoreboard teams so team mobs keep seeking enemies. — https://modrinth.com/mod/mob-battle-mod
  - Health bars come from client mods such as Neat or ToroHealth. — https://modrinth.com/mod/neat , https://curseforge.com/minecraft/mc-mods/torohealth-damage-indicators
  - HelloBuh's offline renderer can draw its own bars, so it needs neither.
- **Forcing targets in vanilla is unreliable.**
  - Setting `AngryAt` worked for some neutral mobs (wolf → villager) but not others (pandas, bees, dolphins, llamas). — https://bugs.mojang.com/browse/MC-256268
  - Endermen ignore non-player targets. — https://bugs-legacy.mojang.com/browse/MC-265171
  - Anger tags apply only to mobs that use them. — https://mojira.dev/MC-263303
  - Clearing anger doesn't reliably calm a mob. — https://bugs.mojang.com/browse/MC-232387
  - **Plan around natural hostility instead of commands:**
    - **Iron golem (100 HP)** attacks zombies, skeletons, spiders, slimes, illagers, ravagers, witches, vexes, withers… unprovoked. — https://minecraft.wiki/w/Iron_Golem
    - **Wolves** hunt skeletons (wild and tamed), sheep, rabbits and foxes. Tamed wolves attack whatever their owner (the bot) hits. — https://minecraft.wiki/w/Wolf
    - **Warden (500 HP; melee 30 on Normal)** gets angry at mobs that bump it or make vibrations. A direct hit adds 100 anger and it becomes hostile at 80, so it fights anything that moves. — https://minecraft.wiki/w/Warden
    - **Wither (300 HP Java)** attacks all non-undead mobs except ghasts. — https://minecraft.wiki/w/Wither
    - **Piglins** attack wither skeletons and withers, and hunt hoglins at random. **Iron golems** attack piglins. — https://minecraft.wiki/w/Piglin
    - **Raids** (illagers vs villagers and golems) and **zombie sieges** (10% chance a night) are vanilla waves. — https://sportskeeda.com/minecraft/zombie-sieges-minecraft-all-need-know
  - A bot hit (arrow or snowball) that provokes the target is still the most reliable way to start an otherwise passive pairing, inferred from the anger mechanics above (untested here).
- **Sculk contests are vanilla.** A catalyst blooms when anything "dies near a sculk catalyst by any means", within 8 blocks (Java), at "one experience point … one sculk charge". The sculk score therefore tracks each mob's XP value. — https://minecraft.wiki/w/Sculk_Catalyst

---

### F.3. Long-live formats with a constant "something is about to happen" (pre-rendered, no chat reading)

1. **"Can X beat EVERY mob?" gauntlet / bracket.** One champion walks a ladder of 30–60 opponents, or a 32/64-mob bracket runs to a final.
   - It holds because a **KO arrives every 15–90 s**, a **checklist/bracket** shows how far the run has got, and the **next opponent is teased** (a "?" card, as ZoraCrafter does). "Predict the winner in chat" gives chat something to do without the bot reading it.
   - Evidence: the long-form mob-battle numbers in §1a; ZoraCrafter's ladder UI; the SILENCE GOD golem live (495K views).
2. **Scoreboard contests / last-mob-standing.** Examples: "which mob makes the most sculk", "which mob survives the anvil rain longest", a 50-mob royale inside a **shrinking `/worldborder`**.
   - It holds because the **numbers on the edges never stop moving**, and elimination counts and a closing border make the end feel close.
   - Evidence: ZoraCrafter sculk contests (1.18M Apr 2026) with live score columns.
3. **Escalating siege ("every wave it gets worse").** A village with golems faces bigger and bigger waves (zombies → pillager raid → ravagers → a warden). "WAVE 7/10" sits in the top band and a TNT finale ends each round.
   - It holds because it **always looks about to fall**: the owner's "edge it" (creepers at the wall) plus a visible wave counter. It reuses the TNT-village hook that already holds 150–525 concurrent.
   - Evidence: livestream.md §B1 and §B6; the "Minecraft, But … EVERY MINUTE" titles (Wallibear 4.73M).
4. **"Minecraft with nobody playing" / until-X runs.** Leave a world to the mobs (and the bot) until something happens, e.g. "until the golems kill the wither" or "until the village falls", with live counters.
   - It holds because of an unresolved question plus counters, but **it needs a real payoff every few minutes** or it becomes an endurance stream (4 watching).
   - Evidence: RedLogic 7.6M (unverified); endurance lives tiny (§1f).
5. **Mob race / elimination race** (the marble-race structure with mobs). Each heat drops the last mob over obstacles such as lava, anvils and TNT.
   - It holds because of the heat → elimination → final rhythm. Marble-race channels are mature and flat (Crazy Marble Race ~0.8–1.07M views a month in 2026, top 7.07M from 2023), so this would be novelty, not a trend. — https://vidiq.com/youtube-stats/channel/@crazymarblerace/ , https://vidiq.com/youtube-stats/channel/UColoRtbrPiaYh3vBu5u68zw

How people actually watch:
- Shorts-feed live viewers stay **seconds to ~2 min** (livestream.md §E3 estimate).
- A vendor case says 24/7 re-streams average **8:22 per view**. — https://air.io/en/creators-spotlight/5x-income-surge-how-gaming-channel-scaled-with-247-streaming (vendor claim)
- So every format must make sense to someone arriving at any minute, with the current state and the next payoff on screen.

Constraints that shape the stream (verified elsewhere, short):
- **Vertical lives get no live ads and cannot be Premieres**, and scheduled lives don't enter the vertical feed. — https://ppc.land/encoders-gain-youtube-dual-streaming-as-vertical-feed-lacks-5-of-9-features/ (Aug 21, 2026)
- Streams **over 12 h may not archive**. — https://support.google.com/youtube/answer/6247592
- Mass-produced / repetitive content is ineligible under the **"inauthentic content"** rule (renamed Jul 15, 2025). — https://www.socialmediatoday.com/news/youtube-clarifies-monetization-update-inauthentic-repeated-content/752892/
- Fake or looping "live" countdowns got channels exposed (May 2026). — livestream.md §A4
- So rounds must really differ, and "LIVE" claims must be honest.

---

### F.4. Fit for an automated, pre-rendered, vertical, 8–12 h stream (1–5)

| Format | Viral now? | Exists as long live? | Fit | Why (one line) |
|---|---|---|---|---|
| Mob gauntlet / tournament bracket | Yes (ZoraCrafter 2.87M Sep 30; Vikcraft steady) | Barely (SILENCE GOD golem live 495K) | **5** | Vanilla natural enemies, a KO every 15–90 s, an always-visible ladder or bracket; unlimited fresh matchups so no two hours repeat. |
| Scoreboard contest / last-mob-standing royale | Yes (sculk contests 1.18M) | No | **4.5** | Pure vanilla (sculk catalyst, `/worldborder`, scoreboard); numbers always moving; fits a top band. |
| Escalating village siege + TNT finale | TNT-village yes; siege angle new | Yes (TNT-village, 150–525 conc.) | **4** | Proven "about to blow" hook with mob action between blasts; needs care so waves really differ. |
| TNT village "about to explode" (baseline) | Yes, the hottest live | Yes | 4 | Proven, but crowded with clones and the owner wants something beyond TNT; best as the finale inside other formats. |
| Mob race / elimination heats | Mild (marble-race structure) | Marble races yes (not MC) | 3 | Easy to automate and clear rhythm; little current Minecraft demand. |
| Chain reactions / satisfying sims | Evergreen (2.73M compilation) | Few | 3 | Great 20–40 s payoffs as interludes; thin as a 12 h spine; non-MC sims are saturated. |
| "Minecraft but …" (datapack rules) | Yes (Wallibear 3.21M Apr 2026) | No | 3 | Datapacks run on vanilla, but the format leans on a player's reactions, which a bot lacks; good as a rule layer ("every 5 min a new rule"). |
| "Nobody playing" until-X simulation | Yes (RedLogic 7.6M, unverified) | No | 3 | On-brand for a bot channel; the payoff must be engineered every few minutes or it becomes an endurance stream. |
| Fake AI-assistant mod / horror ARG (Verity-like) | The biggest 2026 trend | No | 2 | Scripted episodes with dialogue and slow-burn horror; IP risk if it copies Verity; better as Shorts or a recurring "visitor" event. |
| AI-agent civilization / AI villagers | News yes; YouTube small (5K–87K; EG 800K) | Yes, tiny (2–25 viewers) | 2 | Slow, hard-to-read payoffs; 24/7 AI streams barely draw. |
| Hardcore / endurance ("until I die") | Steady, small | Yes, tiny (4 watching) | 2 | One payoff in hours; the vertical feed punishes that. |
| Ambience / ASMR | Evergreen horizontal (4.05M) | Yes (24–165 conc., horizontal) | 1 | No payoff, horizontal sleep audience, music-rights risk. |
| Parkour background | Evergreen horizontal (5.5M) | Some | 1 | Vertical parkour hours get 1.7K–17K; no stakes. |
| Chat-controlled falling pickaxe | Dozen clones | Yes, 24/7 | 1 | Needs real-time chat (excluded). Its dev called his own week-long run "pretty bad". — https://vycdev.com/Projects/Falling-Pickaxe , https://github.com/vycdev/falling-pickaxe |

---

### F.5. What I'd build first (vanilla recipe sketch, untested)
- **Spine:** "THE WARDEN vs EVERY MOB" (or "IRON GOLEM ARMY vs EVERY MOB")
  - Rounds of 3–5 min, each a mini-gauntlet of 5–10 fights.
  - Each round ends on a **sculk-score or TNT finale**, then a VS card for the next round.
  - Top band: one line ("Can the WARDEN beat all 60?") plus the ladder (green checks) and a "next: ?" icon. The bottom quarter stays empty for the Shorts UI.
- **Fights:** use pairings that fight on their own:
  - golem vs zombies/skeletons/illagers/ravager
  - wolves vs skeletons
  - warden vs anything that moves
  - wither vs golems/villagers
  - piglins vs wither skeletons
  - raid waves vs golems
  - Where a pairing is passive, the bot provokes it with one projectile.
- **The "fake mod" skin** the owner floated is renderer-only: a "MOB ARENA" popup, boss bars and VS cards. The server stays vanilla.
- **Copying:** keep the character original. Copying Verity (ThatMob's IP) or horror-mod entities would be unoriginal and risky.

### F.Gaps
- **No concurrent-viewer data for any mob-battle live.** None appeared to exist except the SILENCE GOD clone. Concurrent figures here come from TNT-village and ambience lives (livestream.md).
- **Per-fight lengths are estimated from runtime and fight count**, not timed.
- **Audio of mob-battle videos was not checked**, so "no commentary" is from frames and titles only.
- **YouTube pages were not directly readable**, so view counts come from vidIQ and news. Upload dates come from vidIQ.
