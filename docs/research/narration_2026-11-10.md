# Narrator or dialogue? Voice structure in story Shorts (research, 2026-11-10)

Question from the owner: "maybe we should have a narrator? ... check what actually works online."
The four structures tested:

- **A**: one first-person narrator and no other voices. Other characters' lines are quoted *in the narrator's voice* ("I said, 'Bro...'").
- **B**: a third-person storyteller frames the story, plus character dialogue.
- **C**: dialogue only, no narrator.
- **D**: a first-person narrator plus acted character voices (hybrid).
- **E** (added because it turned up everywhere): no words, only music, grunts and sound effects, with the title telling the story.

Our own data point: story_runaway is A (Kokoro am_adam, sped up, 132 words, first person). It got 71 subs from 22,390 views, 3.2 subs per 1k views, the best on the channel.

## Recommendation

**Use A: one first-person narrator who tells the whole story and quotes the other characters in his own voice.** If we want a little more, use "A+": up to 2-3 very short character lines (6 words or fewer each) in one strongly contrasting voice. Do not add a third-person storyteller (B), and do not use several Gemini voices that share the exposition (our current D/B pilots).

How to do it:

1. **One narrator persona, the same in every story.** Xenost and Ashyyy each run hundreds of Shorts on one narrator voice. The voice becomes the brand. Use a young-male, dry or deadpan, fast voice. Keep the runaway voice (Kokoro am_adam at rate 1.45), or give Gemini an explicit style such as "fast, energetic, deadpan comedic storytelling; not whispery, not breathy, not soft". The "sensual ASMR" read comes from a soft, intimate default style. Ban those words from the style prompt, and don't use Gemini's breathy voices for the narrator.
2. **Pace: about 4.5 words per second.** First-person narrator channels measured a median of 4.57 w/s (range 3.8-5.8; Xenost 4.4-5.0, Ashyyy 4.7, Qubik 5.6-5.8). Acted storytime (D) ran about 3.1 w/s and dialogue skits about 2.5 w/s. runaway's 132 words in about 30 s is about 4.4 w/s, already on target.
3. **Other characters speak through the narrator, with spoken tags.** For example: "Mom said, 'He's just shy.'" or "The farmer yelled, 'GET AWAY.'" Xenost and Ashyyy use 2-8 "said/says" tags per Short. The ear always knows who is talking, and there is only one voice to keep consistent.
4. **If a character gets their own voice (A+):**
   - Use at most one extra voice per video, for 1-3 lines.
   - Make it a punchline or reaction ("Who yelled at my babies?"), never exposition.
   - Play it only while that character is on screen.
   - Make it maximally different from the narrator: other gender or age, or a big pitch shift. Mom works as an adult female; a monster works pitched down.
   - Give it a distinct caption colour plus a name tag.
   - Never use two extra voices of the same gender in one Short.
5. **The hook is the title, and the title is line 1:** an absurd personal premise stated flatly in first person, with no "In this world..." framing needed. Examples:
   - Xenost: "My brother can't feel pain." (41M)
   - Xenost: "My teacher didn't know his mic was ON!" (22M)
   - Ashyyy: "Dad picked me up from school at 3:15 PM and drove past our house without even stopping." (22M)
   - Ours: "All FOURTEEN villagers in my village RUN when they see ME."

   Then escalate through a list of quick examples, land a twist, and loop.

## Evidence

### 1. Channel scan (yt-dlp flat Shorts listings, 26 channels, 11,500+ Shorts)

Full data is in `narration_2026-11-10_data/`:

- `channels.csv`: per-channel metrics and the structure label.
- `videos.csv`: 235 sampled Shorts (each channel's top 5 plus latest 3), with views, views divided by the channel median, caption words, words/s, and speaker changes from YouTube's ASR (marked ">>").
- `all_shorts.csv`: every listed Short with its views.

Structures were classified from auto-captions where fetchable (about 120 videos). After roughly 100 caption fetches YouTube's bot check started refusing requests, so the remaining videos are labelled "unknown (captions blocked)" or the label is inferred from the channel's other transcripts. Those inferred labels are marked low or medium confidence.

| Structure | Channels (median views per Short / subs) | Median of channel medians | Median of (median views ÷ subs) |
|---|---|---|---|
| **A** first-person narrator | Xenost (4.7M / 1.3M subs), Ashyyy (2.1M / 816k) | **3.4M** | **3.09** |
| B third-person storyteller | Anjal Niroula's recent narrated Shorts only (22-29k each, vs the channel's 374k median) | n/a | 0.06x the channel's median |
| C dialogue only | narrow (15M), BlobbyClips (13M), Milo & Chip (2.2M), Bloopo (1.4M), Friend (613k), MSToons Shorts (604k), dum Dum (79k), Dark_Tales (37k), NoobieBlox (24k) | 613k | 0.45 |
| D narrator + acted voices (one performer) | Haminations (13M / 9.1M subs), Infamous Swoosh (995k), CypherDen (939k) | 995k | 0.56 |
| E wordless / music | Kamui (9.4M), Michazike (6.1M), Skytro (3.5M), Hapico (2.6M), Onion Stories (1.3M), Minoku (657k), Anjal Niroula (375k), AniMatters (162k), Baby zombie (84k), Buapepo (34k), Sprucy (32k) | 657k | 1.09 |
| Mixed | Qubik (50k / 77k subs): its first-person narrated "robloxstory" Shorts did 2.2M-3.6M (44-72x the channel median); its dialogue Animal Hospital Shorts did 2.0M (40x); its wordless anomaly clips did 19-23M | | |

How each structure performs:

- **A (first-person narrator) is the best structure for *told* stories.** The two pure-A channels have the highest views per subscriber of any talking format (2.6 and 3.6). Their whole catalogues are A, so the result is not driven by a few hits: Xenost's median Short is 4.7M.
- **D works when one human performs everything.** Haminations (99M, 91M), Infamous Swoosh (28M) and CypherDen (19M) narrate in first person and do the other characters as impressions. It is one recognisable voice, so nothing gets "mixed up". That is not what our multi-voice Gemini pilots do.
- **C wins with recurring characters and visual skits:**
  - Examples: JJ & Mikey, Milo & Chip, Friend & Ava, narrow's Grow-a-Garden characters.
  - Lines are short barks (MSToons about 1.6 w/s) and the action carries the plot.
  - Speaker changes are very frequent (MSToons: 17-29 ASR speaker changes in 60 s), so each voice must be cartoon-distinct.
  - C channels without a fixed cast (Dark_Tales, NoobieBlox) sit at 0.03-0.13 views/sub.
- **B barely exists among winners.** The one clear case is Anjal Niroula's switch from wordless cartoons (median 374k) to calm third-person "In this world, there's a shop..." narration: 22k-29k each, 0.06x the median. Recency and the pivot itself are confounds, but nothing in the sample shows B winning.
- **E dominates raw views in animation:** Onion Stories 170M, Michazike 120M, Kamui 114M. Those are visual gags, not told stories. It shows the picture must carry the hook; it is not a reason to drop the voice for a twist story like runaway.

### 2. Within-channel checks

- **Xenost has one narrator in every video.** Its top 5 (21-41M) are all first-person narrator; one of them (21M, "everyone thinks I'm a SUPERHERO! PT 2") adds a second voice for about 3 lines. That is the A+ pattern.
- **Qubik:** its first-person narrated story Shorts beat its dialogue Shorts slightly, 2.2-3.6M against 2.0M.
- **A hypothesis I dropped:** I tested whether "In this world / In this town" world-rule framing underperforms personal "My brother..." titles. In Xenost's latest 80 Shorts, world-rule titles had a median of 3.4M (13 Shorts) and personal titles 2.4M (65 Shorts). So the framing isn't the problem; first person is the constant.

### 3. Web and creator sources (weak)

- I found no Reddit thread or study that directly compares narration with dialogue for Shorts retention. Searches returned mostly vendor blogs (narrationbox, gofaceless, fluxnote, voxbooster). They recommend a narrator at about 155-180 wpm (2.6-3.0 w/s), but they sell voice tools, so weight them low. Our measured winners run faster than that.
- Academic work is about first-person *camera* perspective, not narration. EMAC 2025 and PACIS 2025 found that first-person perspective raises immersion and engagement in short video, with mixed effects by creator size. This is suggestive only.
- The "how I make viral Roblox Shorts" tutorials (AI Hustle, Syrax, Ventura) describe a different format: an AI streamer facecam reacting over gameplay. They say nothing about narrator vs dialogue.
- **Policy note:** YouTube renamed its "repetitious content" policy to "inauthentic content" in July 2025. It targets templated, mass-produced Shorts such as AI-voiced Reddit-story channels. A single fixed narrator over *original* rendered footage with original scripts is fine. Keep premises and footage varied so the channel doesn't read as a template.

## Confidence and caveats

- **Moderate on "A over B and over multi-voice D" for our format.** Pure-A channels are only n=2 (Xenost, Ashyyy), plus Qubik's narrated subset. The D channels are close relatives (one dominant first-person voice). Our own runaway agrees (n=1).
- **Low on any claim that one structure wins Shorts in general.** C and E produce the biggest single numbers when there is a recurring cast or a pure visual gag. Structure is confounded with niche, art quality, channel age and posting volume. Recent-video medians are biased low because those videos are young.
- Caption-based classification covered about half the sample. ASR speaker-change marks only appear in newer captions; older captions are unpunctuated, so a 0 there does not prove a single voice.
- I could not verify caption colours or name tags visually: frames and video downloads are blocked by the bot check. Speaker marking in the A channels is done verbally with "said" tags.
- **Suggested test:** make the next 4 stories in pairs, A against A+ (same narrator, one contrasting character voice for 1-3 lines). Compare subs per 1k views and APV at 2,000+ views each.

## Sources

Channels sampled (Shorts tabs):

- https://www.youtube.com/@Xenost-j3i/shorts
- https://www.youtube.com/@Ashyyy-/shorts
- https://www.youtube.com/@QubikBlox/shorts
- https://www.youtube.com/@Haminations/shorts
- https://www.youtube.com/@InfamousSwoosh/shorts
- https://www.youtube.com/@CypherDen/shorts
- https://www.youtube.com/@MSToonsShorts/shorts
- https://www.youtube.com/channel/UC_NqVr5AA1vziN0ZLR-QiLw/shorts (Milo and Chip)
- https://www.youtube.com/channel/UC6AhuKHE0b2SdAnPUFpmFJQ/shorts (Friend)
- https://www.youtube.com/channel/UCFsRGPLEsvvC4rIYyO4TUWg/shorts (Bloopo)
- https://www.youtube.com/@nnarow/shorts
- https://www.youtube.com/@BlobbyClips/shorts
- https://www.youtube.com/@dumdumgaming-r7i/shorts
- https://www.youtube.com/@Dark_Tales0/shorts
- https://www.youtube.com/@NoobieBloxYT/shorts
- https://www.youtube.com/@KamuiAnimation/shorts
- https://www.youtube.com/@Michazike/shorts
- https://www.youtube.com/@skytrohd/shorts
- https://www.youtube.com/@Hapico/shorts
- https://www.youtube.com/@just-creeper/shorts
- https://www.youtube.com/@Minokuanimation/shorts
- https://www.youtube.com/@Anjal_Niroula/shorts
- https://www.youtube.com/@AniMatters.official/shorts
- https://www.youtube.com/@Babyzombieminecraftanimationa/shorts
- https://www.youtube.com/@Buapepo/shorts
- https://www.youtube.com/@sprucystudio/shorts

Key videos:

- Xenost, "My brother CAN'T feel pain!", 41M: https://www.youtube.com/shorts/OZva-6vx4jk
- Xenost, A+ example with about 3 second-voice lines, 21M: https://www.youtube.com/shorts/9_mjav6vC80
- Ashyyy, "Suspicious Drive", 22M: https://www.youtube.com/shorts/vVlpn2WjbbY
- Qubik, "My Grandma's a BADDIE", 3.6M: https://www.youtube.com/shorts/_z4hMCu-HB0
- Haminations, D example, 99M: https://www.youtube.com/shorts/R9lhFtcYxWg
- Anjal Niroula, B example, 22k: https://www.youtube.com/shorts/nTRx6oket3U

Web (weak or adjacent):

- https://narrationbox.com/blog/how-to-create-viral-youtube-shorts-in-2025
- https://voxbooster.com/blog/ai-voice-generator-youtube-shorts-narration/
- https://animperia.com/learn/storytime-animation
- https://proceedings.emac-online.org/pdfs/A2025-126236.pdf
- https://aisel.aisnet.org/pacis2025/sm_digcollab/sm_digcollab/17
- https://www.socialmediatoday.com/news/youtube-clarifies-monetization-update-inauthentic-repeated-content/752892/
- https://www.netinfluencer.com/youtube-clarifies-july-15-policy-update-repetitious-content-rebranded-as-inauthentic-content/
