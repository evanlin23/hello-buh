# Teaser and trailer anatomy: structure, text cards, dialogue and sound (for the BUILD LIMIT teaser)

**How these notes were made (read this first).** I couldn't get YouTube transcripts directly: YouTube blocked this machine after one request. So for seven of the requested trailers I used archived copies of the official uploads on archive.org and measured them myself:
- **Dialogue timings:** from the official YouTube caption files saved with the archive (the Minecraft teaser and trailer, and The Village). For Knives Out, Arcane, Coraline and The Maze Runner I used machine speech-to-text (Whisper small.en). Those lines are marked **[ASR]** and may have wording errors; obvious mishearings are corrected in brackets.
- **Text cards:** read by eye from frames sampled at 4 fps.
- **Cuts:** counted with ffmpeg scene-change detection (threshold 0.15 on 240-px frames). This misses dissolves and cuts between two dark shots, so treat every cut count as a **lower bound**.
- **Loudness:** "dB" is the peak of 0.25-second RMS windows in dBFS, per second, on that upload. Uploads are normalised differently, so compare the shape within one trailer, not levels between trailers.
- **Offsets:** timestamps are seconds from the start of the archived file. They can sit a few seconds off other uploads of the same trailer (green-band cards, end slates and pre-rolls differ).

Every measured figure is cited to the file it came from. I couldn't get a usable copy of the Snowpiercer, Hunger Games (teaser or trailer) or Stranger Things season 1 trailers, so those sections rely on press descriptions and have no timestamps.

## 1. Teaser vs. trailer structure: three acts, cold open, title placement, button, pacing, silence

### Takeaway
A full trailer (about 2:15 to 2:30) is built as cold open, then three acts (world/rules, escalation, montage climax), then title, then an optional button. In every full trailer measured here the title lands at 94 to 96% of the running time. The two teasers measured (Minecraft at 80 s, The Village used here as the closed-society model) put the title at about 75% and spend the last quarter on a post-title gag or tagline. Cutting speeds up into the final third (up to about 2 cuts per second in montages). The quietest moments are deliberate drop-outs right before a punchline, a reveal or the title.

### Cited Findings
**What practitioners say about structure**
- **Derek Lieu's structure.** Lieu, a game-trailer editor, teaches the shape as "The Line of Rising Action, The Cold Open, Act 1, Act 2, Act 3, The Button". These are the chapter titles of his video "How to Make a Trailer – Editing 3-Act Trailer Structure" (I saw the chapter list only, not the video) — [Let's Play Index listing](https://www.letsplayindex.com/video/how-to-make-a-trailer-editing-3-act-trailer-structure-derek-MhfyvQihMa8)
- **The music track sets the act lengths.** One composer's guide gives Act 1 15–30 s (mood, character, world), Act 2 20–60 s (pace and tension build, the problem is laid out, ticking or steady eighth- or quarter-note rhythms), Act 3 30–60 s ("fast edits, big drums, huge sounds", the highest stakes) and Act 4 about 5 s ("short, punchy" for titles and logo). The template is 30/60/60/5 s, or 30/30/30/30/30/5. It adds that trailers often "have a break just before the end and then the music comes back in" for the final act — [Richard Pryn](https://richardpryn.com/how-to-structure-trailer-music/)
- **Trailer-music courses describe the same arc.** An intro, a build (often split in two by a short breakdown), a climax and an optional short second climax (Act 4, 2 to 8 bars). Gaps between acts act as edit points. An example ~2:30 hybrid cue runs about 30–40 s each for intro and build, about 1 minute for the climax, then a few bars of Act 4 — [Master the Score](https://www.masterthescore.com/article/how-to-write-trailer-music-a-step-by-step-guide)
- **Mark Woollen on rhythm.** Woollen (Mark Woollen & Associates; Schindler's List, The Social Network, 12 Years a Slave): "trailers are really about rhythm… it's about kind of establishing certainly a pace." — [NPR Fresh Air transcript](https://www.npr.org/2015/02/23/388481464/how-the-man-behind-the-trailers-sparks-an-urge-to-see-a-movie)
- **Woollen on sequencing.** "Every cut I feel like you should be able to defend… There needs to be a storytelling or emotional sequencing… what are the little looks and moments or snippets of lines that can be joined and bumped up against each other in a different way." — [FLOOD Magazine](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **Woollen on old vs. modern trailer language.** Older trailers were carried by voiceover: "Tell them what they're going to see. Tell it to them. And then tell them what they just saw." Modern trailers work by "the juxtaposition of image to dialogue." — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **Delaying the footage.** Woollen's Social Network trailer shows no film footage until a minute in; it opens on Facebook imagery under a choir cover of "Creep" — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **Cutting speed over time.** Wired counted cuts per minute across decades of trailers and found the pace has risen. It credits digital editing tools more than shorter attention spans. The outlier is Dr. Strangelove's trailer at an average of 136 cuts per minute — [CinemaBlend summarising Wired](https://www.cinemablend.com/new/It-Your-Imagination-Movie-Trailers-Way-Faster-Than-They-Used-38195.html)

**Measured: where the title lands, and what comes after it**

| Trailer (archived file) | Length | Studio logo | Title on screen | Title as % of length | After the title |
|---|---|---|---|---|---|
| A Minecraft Movie teaser | 79.7 s | none up front (logos only on the end card) | 59.6–62 s | 75% | ~13 s llama gag, end card at 75 s, VO callback "Step right this way!" at 74.8 s |
| The Village Trailer #1 | 137.6 s (+ end slate) | Touchstone, 1.6–3.6 s | ~104–114 s | ~76% | ~18 s coda: Ivy in the woods, "You are fearless in a way that I shall never know" (121.0 s), then the tagline card "THE TRUCE IS ENDING" (132.6–136.6 s) |
| A Minecraft Movie official trailer | 148.2 s | none up front | ~126–130 s (logo smash-zoom) | 85% | ~17 s button scene: "Oh, yeah. There's one more thing you need to know." (129.1 s), night falls, skeletons, screams; end card 146.5 s |
| Knives Out trailer | 137.1 s | Lionsgate 7.6 s, MRC 8.6 s, after a 6-s pre-roll hook | 131.6–133.6 s | 96% | end card only; the button joke comes *before* the title |
| Arcane official trailer | 151.1 s | none (Netflix on the end card) | 141.6–145.6 s | 94% | "NOVEMBER 6", then "ONLY ON NETFLIX" |
| Coraline official trailer | 147.0 s | Focus 6.6 s, Laika 7.6 s, after a green band | 139.6–141.6 s | 95% | "Presented in RealD 3D in select theaters", "February 2009" |
| The Maze Runner final trailer | 149.0 s | 20th Century Fox at 33.6 s, *after* a 30-s cold open | 142.6–145.6 s | 96% | "SEPTEMBER 19" |

Sources for the table: [Minecraft teaser, archived official upload](https://archive.org/details/youtube-PE2YZhcC4NY) (original at [YouTube](https://www.youtube.com/watch?v=PE2YZhcC4NY)); [The Village](https://archive.org/details/youtube-sTGyhwvdY6k) ([YouTube](https://www.youtube.com/watch?v=sTGyhwvdY6k)); [Minecraft official trailer](https://archive.org/details/youtube-gbNzxvz2_H4) (148 s; Warner Bros.' own upload at [YouTube](https://www.youtube.com/watch?v=wJO_vIDZn-I) runs 151 s, so offsets may differ by up to about 3 s); [Knives Out](https://archive.org/details/dailymotion-x7cscee) (Dailymotion copy, 8 July 2019; Lionsgate's upload is [YouTube](https://www.youtube.com/watch?v=qGqiHJTsRkQ)); [Arcane](https://archive.org/details/youtube-OrTyvmQ0KA8) (Netflix, 27 Sept 2021); [Coraline](https://archive.org/details/coraline-2009-official-trailer-dakota-fanning-teri-hatcher-movie-hd-rotten-tomat); [The Maze Runner final trailer](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim).

**Measured: cuts per 10-second window** (lower bound; scene detection at 0.15)
- **Minecraft teaser** (80 s, 32 cuts, about 0.4 cuts/s): 1, 4, 7, 7, 5, 3, 3, 2. The first 8.6 s is one shot (a single block zooming out into the landscape), and the 8.6–13.6 s wide is held about 5 s — [measured](https://archive.org/details/youtube-PE2YZhcC4NY)
- **The Village** (22 cuts detected in 138 s): 0, 0, 0, 0, 1, 1, 9, 4, 4, 2, 0, 0, 0, 1. For the first ~47 s the shots (about 4–5 s each) are joined by fades through black, not hard cuts. Around 63.8–64.3 s there is a strobe burst: about 10 detected changes in 0.5 s as the red-slashed door is shown — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)
- **Minecraft trailer** (88 cuts, about 0.6/s): 5, 5, 6, 5, 6, 7, 3, 8, 7, 6, **16**, 6, 4, 3, 1. The peak, 1.6 cuts/s, is the song-driven "stash" montage at 100–110 s — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)
- **Knives Out** (130 cuts, about 0.95/s): **15**, 9, 3, 7, 9, 10, 11, 13, **15**, 7, 13, 12, 3, 3. It is fast in the pre-roll hook, slow (3) in the deadpan interview stretch at 20–30 s, and fastest in the montage around the "Whodunnit" cards at 80–90 s — [measured](https://archive.org/details/dailymotion-x7cscee)
- **Arcane** (125 cuts): 0, 11, 5, 7, 7, **20**, 2, 5, **18**, 9, 12, 9, 4, **14**, 2, 0. It opens with 10 s of near-black under a voiceover, then three montage spikes: at 50–60 s, 80–90 s (just after "THIS FALL") and 130–140 s (the final climax) — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
- **Coraline** (136 cuts): 9, 8, 4, 8, 8, 5, 4, 13, 11, 8, 5, **19**, 13, 15, 6. The last third runs at 1.3–1.9 cuts/s — [measured](https://archive.org/details/coraline-2009-official-trailer-dakota-fanning-teri-hatcher-movie-hd-rotten-tomat)
- **The Maze Runner** (79 cuts; dark footage, so heavily undercounted): 1, 4, 5, 4, 9, 13, 2, 3, 12, 8, 5, 3, 3, 6, 1 — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)

**Measured: silence and drop-outs**
- **Minecraft teaser:** the music drops out (about −49 dB at 45 s) between "I…" (43.9–45.9 s) and "am Steve." (45.9–47.3 s). The pause is followed by comic sound beats: "[distant cow moo-ing]" (47.3 s), then "[thunder crash]" (48.7 s) — [measured from the official captions in the archived upload](https://archive.org/details/youtube-PE2YZhcC4NY)
- **Knives Out:**
  - near-silence at 6.25–7.0 s, right after the pre-roll's one-word card "Now", before the studio logos;
  - deadpan silences in the 26–34.5 s family-interview exchange ("The party?" / "Pre-my dad's death?" … "Oh, it was great.") [ASR];
  - a level dip (−20 to −32 dB) from 117 to 127 s with near-silence at 122.75–123.5 s, just before the button line "What is this, CSI: KFC?" [ASR];
  - then the title music hits (−13 to −15 dB) from 129 to 135 s — [measured](https://archive.org/details/dailymotion-x7cscee)
- **Arcane:** no full silence. The bed dips (−20 to −26 dB) at 119–126 s under "Are we still sisters?" / "Nothing is ever going to change that." [ASR], climaxes at −10 to −16 dB from 127 to 140 s, and the title (141.6 s) lands on the decay — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
- **The Village:** the first half is VO-led and quiet (peaks about −28 to −36 dB for the first 16 s); the second half holds a steady music bed (about −22 dB) — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)

**Teaser vs. trailer, side by side: the Minecraft pair**
- **The teaser** (80 s, released 4 Sept 2024). In order:
  - 0–8.6 s: a one-shot visual hook (a single block pulls back into the world) under a distorted, then "clarifying", Beatles "Magical Mystery Tour" (captions 2.5–7.9 s);
  - the world, with awe reaction shots;
  - 25–31 s: a three-card run intercut with shots;
  - 42–47 s: a character introduction ("Who are you?" / "I… am Steve.");
  - comic beats;
  - title at 59.6 s;
  - a post-title gag and the end card.

  The teaser has about 8 spoken utterances in total — [measured](https://archive.org/details/youtube-PE2YZhcC4NY); release date per [TheWrap](https://www.thewrap.com/minecraft-movie-trailer-jason-momoa)
- **The trailer** (148 s). In order:
  - a meta cold open ("Minecraft trailer, take two.", 0.5 s);
  - a narrated origin with a world rule (5–48 s);
  - character introductions (56–66 s);
  - a world tour (67–90 s);
  - the stakes (90–97 s);
  - a song-driven montage (99–110 s, the densest cutting);
  - a comic set piece (114–125 s);
  - title (126 s);
  - a post-title button scene (129–146 s) — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)

### Inferences
- In this sample, the full trailer is "title at 94–96%, little or nothing after". The teaser form (Minecraft teaser, and The Village's trailer #1, which behaves like one) is "title at about 75%, then a 13–30 s tail: a gag, a coda line, or a tagline card". The current BUILD LIMIT edit puts the title start at about 45.6 s of about 58 s (about 78%), so its proportions match the teaser pattern.
- Studio logos either open the trailer (Coraline, The Village) or are held back until after a cold open (Knives Out at about 7 s, Maze Runner at about 34 s). A 30-s cold open before any branding is a real, documented option.
- In every measured trailer, cut speed peaks inside montages in the last third (13–20 cuts per 10 s). Act 1 runs at 0–8 cuts per 10 s, and slow-burn mystery trailers (The Village, the Arcane open) can go 10–40 s with almost no hard cuts.

### Gaps
- Derek Lieu's written breakdown of the Matrix trailer's 3-act structure (Medium) returned HTTP 403, so I have his section names but not his own definitions or timings for each section.
- I found no editor interview that gives a numeric "shots per second over time" rule. The per-10-s figures above are my own measurements, not an industry standard.
- I didn't get Woollen's or any other editor's direct comments on silence before the title (the NPR transcript excerpt doesn't cover it).

## 2. Beat-by-beat breakdowns of the requested trailers

### Takeaway
Seven of the ten requested trailers are broken down below with measured timestamps: the Minecraft teaser, the Minecraft trailer, The Village, Knives Out, Arcane, Coraline and The Maze Runner (final trailer). Snowpiercer, The Hunger Games teaser and trailer, and Stranger Things season 1 are covered only by press descriptions, with no verified timestamps. Mystery and closed-society trailers share one spine. They state the world's rule early (by VO or a Q&A), break the rule or reveal a threat midway, raise the stakes in a fast montage, land the title on the climax, and close on a short line or tagline.

### Cited Findings

#### A Minecraft Movie, teaser (79.7 s). Captions are the official YouTube captions in the archive; cards read from frames.
Source: [archived official upload with captions](https://archive.org/details/youtube-PE2YZhcC4NY)

- **0.1–8.6 s.** One shot on black: a single green block grows into a pixel mosaic, then resolves into a world postcard. Music: the Beatles' "Magical Mystery Tour" starts "[distorted]" (2.5 s) and turns "[clarifying]" (5.5 s). VO: "Step right this way!" (7.9 s).
- **8.6–14 s.** A held wide of the Overworld, the four humans walking in. Song: "Roll up for the Mystery Tour" (9.5–19.1 s).
- **14–24 s.** Reaction close-ups in front of the portal, each about 1–2 s. "[baa-ing]" (20.8 s): the pink sheep. "What the hell?" (23.1 s).
- **24.9–30.6 s, the card triplet.** Grey small line over green big line, Minecraft font, each about 1.25 s, alternating with about 1-s shots (a ghast/piglin balloon, a wolf against a square moon):
  - "NEXT / YEAR" (24.9–26.1 s)
  - "LET YOUR / IMAGINATION" (27.1–28.4 s)
  - "RUN / WILD" (29.4–30.6 s)

  Song under the cards: "The Magical Mystery Tour is coming to take you away" (25.9–31.6 s).
- **31.6 s.** "Kadoosh!" (Steve at a crafting table).
- **33.8–37.0 s.** "VOICE: Anything you can dream about here, you can make." "[roaring]" (a Piglin army).
- **40.3–47.3 s.** "Hah!" (40.3 s), "Who are you?" (42.2 s), "I…" (43.9 s), a music drop-out at about 45 s, "am Steve." (45.9 s).
- **47.3–54.7 s.** "[distant cow moo-ing]", "[thunder crash]", "Pfft, okay" (51.5 s), "This guy is such a toolbag." (53.0 s).
- **54.7–62 s.** The song swells ("Ah… The Magical Mystery Tour", 54.7–62.0 s) under a fall and smash-zoom into the title "A MINECRAFT MOVIE" (59.6–62 s).
- **62–75 s.** Post-title gag: a llama; "[confused bleat]" (65.0 s); a blurred charge past the camera, "[Piglins roaring, squealing]" (66.5–70.5 s); the llama reacts.
- **75–78 s.** End card: "ONLY IN THEATERS APRIL 4 / EXPERIENCE IT IN IMAX". VO callback: "Step right this way!" (74.8 s). Silence from 77.5 s.
- **Credits.** Slashfilm attributes "anything you can dream about here, you can make" to Jason Momoa — [Slashfilm](https://slashfilm.com/1656739/minecraft-movie-live-action-trailer-jack-black-jason-momoa). The official trailer gives the same line to Steve (Jack Black) as narration; see the next entry. This is a conflict in attribution.

#### A Minecraft Movie, official trailer (148.2 s). Official captions in the archive.
Source: [archived upload with captions](https://archive.org/details/youtube-gbNzxvz2_H4)

- **0.5 s, meta cold open:** "Minecraft trailer, take two."
- **5.0–21.4 s, narrated hook (Steve):** "I am Steve." (5.0 s) / "As a child, I yearned for the mines." (8.1 s) / "But something always got in the way." (11.3 s) / "Go on, get outta here!" (12.9 s) / "[dramatic music]" (15.1 s).
- **21.4–36.3 s, escalation by repetition:** "But the call of the mines was too strong." (21.4 s) / "So one day, I started digging…" (25.4 s) / "…and digging…" (28.5 s) / "…until I found…" (30.8 s) / "…this." (35.1 s). On screen: a glowing cube in his hands.
- **36.3–47.9 s, the rule:** "[serene music]" / "A wonderland where anything you can imagine is possible." (38.3 s) / "As long as what you imagine…" (43.7 s) / "…can be built out of blocks." (45.9 s).
- **About 53.1–54.4 s:** a one-word card on black, "THIS", in the same Minecraft font. It's the only mid-trailer text card I saw (frames sampled at 4 fps).
- **56.3–66.5 s, character introduction:** "Where are we?" / "Wait, who are you again?" / "Garrett 'The Garbage Man' Garrison. Gamer of the Year, 1989. Whatever. I barely think about it."
- **67.6–79.8 s, world tour:** "Welcome to the Overworld." (67.6 s) / "Anything you can dream about here…" (73.6 s) / "…you can make." (77.7 s). Then the song enters: "♪ Now, let's have some fun ♪" (79.8 s).
- **84.6–96.4 s:** "This place makes no sense." / "Don't I know it?" Then the stakes: "There are dark forces who want to destroy this world." (90.1 s) / "If we wanna stop them, we're gonna need to create something amazing." (92.6–96.4 s).
- **97.9–110 s, montage:** "Let's go to the stash." (97.9 s). Song chorus: "This is our decision… We've got the vision… Now, let's have some fun… Yeah, yeah, yeah" (99.3–114.4 s). These lyrics are from MGMT's "Time to Pretend" (identified from the captions; I didn't check whether it is the original recording or a cover). This is the densest cutting (about 16 cuts in 100–110 s).
- **114.4–124.9 s, comic set piece:** "What's this junk?" / "An ender pearl. Teleports you to wherever you throw it." / "Yeah, right." / "No, don't!" / "[screams]" / "And that was the only one I had. No biggie."
- **126.2–129.1 s, title:** the logo smash-zooms in (about 126–130 s) on the lyric "♪ We were fated to pretend ♪".
- **129.1–146 s, button:** "Oh, yeah. There's one more thing you need to know." (129.1 s) / "[howls]" / "Great. Now it's dark." (134.0 s) / "That feel quick to anyone else?" (135.7 s) / "[rattling]" / "[screams]" (141.5–146.1 s). On screen: sunset, a wolf against a square moon, skeletons.
- **146.5–148 s:** end card, "ONLY IN THEATERS APRIL 4 / Dolby Cinema / IMAX".
- **Reception:** fans noticed that the trailer opens on a meme, "yearning for the mines", from a 2022 tweet — [Sportskeeda](https://www.sportskeeda.com/minecraft/as-child-i-yearned-mines-a-minecraft-movie-trailer-mentions-popular-meme-fans-splits)

#### The Village, Trailer #1 (2004; 137.6 s plus end slate). Dialogue from the official captions; picture measured.
Sources: [captions and video, archived](https://archive.org/details/youtube-sTGyhwvdY6k); [YouTube](https://www.youtube.com/watch?v=sTGyhwvdY6k)

- **0–16 s.** Touchstone logo (1.6–3.6 s). Then slow shots of the village at dusk and dawn, each fading through black. Very quiet music (peaks about −30 dB).
- **16.3–35 s, the rule, as one VO (Edward Walker):** "We have always had, since the day we settled here, a gentle understanding with the creatures who live beyond our borders. We do not stray into their woods. They do not come into our village." Pictures: fields, a lantern against the sky (33–36 s), children (37–39 s), a watchtower (40–42 s).
- **37.5–47 s:** "I have always pictured them in some ways as our protectors. They have allowed us to live here, nestled amongst them, in this untouched place."
- **54.5–64.3 s, the rule is broken:** "By the markings we find this morning on our homes, I feel they were warning us." Pictures: a red slash on a door (58–63 s), then a strobe burst (63.8–64.3 s).
- **65.8–84.3 s, doubt:** "[We] may question ourselves [at] moments such as these. Did we make the right decision to settle here? I fear our days of peace are over." Pictures: night, lanterns, a figure on a floor, a hand reaching.
- **85–101 s:** no dialogue (captions "[Music]"). Darkness, hints of the creatures, cutting at its fastest.
- **About 101–115 s, title:** "M. NIGHT SHYAMALAN'S THE VILLAGE" forms out of bare branches in fog.
- **117–129 s, coda:** Ivy in the yellow cloak in the woods. "You are fearless in a way that I shall never know." (121.0–123.8 s).
- **130–137 s, tagline button:** black, then a red slash wipes across to reveal "THE TRUCE IS ENDING" (about 132.6–136.6 s).

#### Knives Out, trailer 1 (July 2019; 137.1 s). Dialogue [ASR]; cards read from frames.
Sources: [archived Dailymotion copy](https://archive.org/details/dailymotion-x7cscee); first trailer released 2 July 2019 per the [Flickering Myth search result](https://www.flickeringmyth.com/rian-johnsons-star-studded-murder-mystery-knives-out-gets-first-trailer/) (seen only as a search result)

- **0–5.4 s, pre-roll hook:** rapid montage (about 15 cuts in 10 s) under Blanc: "I suspect foul play, and I've eliminated no suspects." Then a one-word card, "Now" (about 5.4 s), and near-silence (6.25–7.0 s).
- **7.6–8.6 s:** Lionsgate and MRC logos.
- **8.1–21.6 s, the setup:** "I am Detective Lieutenant Elliott, and this is Trooper Wagner." / "We just want to ask a few questions." / "The family [has] gathered to celebrate your father's 85th birthday."
- **23.5–31 s, deadpan comedy in silence:** "Um…" / "How was it?" / "The party?" / "Pre-my dad's death?" / "Oh, it was great." (with music drop-outs).
- **35.6–36.8 s:** director card inside a magnifying glass over the house: "from Rian Johnson, the Writer/Director of Star Wars: The Last Jedi and Looper".
- **38.4–52.5 s, the rule of the closed room:** "Ladies and gentlemen, I would like to request that you all stay until the investigation is completed." / "What? Can we ask why? Has something changed?" / "No." / "No, it hasn't changed, or no, we can't ask?"
- **62.5–76.6 s, escalation by repetition:** "…you all love twisting the knife into one another" [ASR, wording uncertain]. Then Ransom's "Eat shit" montage, about five repetitions to different family members (68–76.6 s).
- **80.3–84.2 s, the card sentence across two cards, intercut with shots:** "comes a / Whodunnit" (about 80.3–81.0 s; a falling mug) and "like / No One" (about 83.7–84.2 s; a morphine vial and syringe). I didn't see a third card completing the sentence.
- **88.9–102.5 s:** "You know something." / "Spill it." Then the hook line again, now in its scene and split: "I suspect foul play." (95.5 s) … "I have eliminated no suspects." (100.4 s).
- **105.8–114.6 s, cast roll:** a cast card for each actor, each about 1 s, with a spinning coin. The roll starts at "Chris Evans" (105.8 s), runs through Ana de Armas, Jamie Lee Curtis, Toni Collette, Don Johnson and Michael Shannon among others, and ends on "and Christopher Plummer" (114.6 s).
- **117–125 s, button before the title:** "That's a twisted web, and we are not finished untangling it. Not yet." Near-silence (122.75–123.5 s), then "What is this, CSI: KFC?".
- **131.6–133.6 s, title:** "Knives Out" inside a ring of knife blades, on a music hit.
- **134.6–137 s, end card:** "written and directed by Rian Johnson / Thanksgiving / Text 'Whodunnit' To 94200 To See The Knives Come Out".
- **The sound team's choices** — [Trailaurality](https://trailaurality.squarespace.com/blog/2022/11/6/knives-out-glass-onion):
  - The 2019 trailer is built on "a single piano".
  - The Glass Onion trailer "start[s] with the same note".
  - In the franchise trailers, non-diegetic sounds "temporarily cut the music out — such as what sounds like a sharpening knife right before Blanc delivers a one-liner".
  - "Sound effects [act] as musical punctuation between cuts".

#### Arcane, season 1 official trailer (Netflix, 27 Sept 2021; 151.1 s). Dialogue [ASR]; cards read from frames.
Source: [archived official upload](https://archive.org/details/youtube-OrTyvmQ0KA8)

- **0–10 s, cold open in near-black:** VO (Vi): "When I was a kid, me and my sister, we played a game where we pretended to chase monsters away." (1.9–9.0 s)
- **10.6–14.6 s, cards:** "FROM THE CREATORS OF LEAGUE OF LEGENDS" (about 10.6 s) and "A NETFLIX ANIMATED SERIES" (about 13.6–14.6 s), in an ornate gold Art Nouveau frame.
- **15.4–25.9 s, the past and the inciting loss:** "I'd say no monster's gonna get you when I'm here." / "Then a real monster showed up." / "I have to find her."
- **32.3–52.9 s, the world (Zaun vs. Piltover) and the discovery:** "The world grows smaller every day. Up there on the surface, the topsiders are leaving the undercity further behind." / "I believe I've discovered something incredible. A way to harness magic through science." / "You don't understand what's at stake."
- **55.3–71.1 s, villain thesis:** "Power doesn't come to those who were born strongest… it comes to those who will do anything to achieve it." / "Imagining yourself a hero, then what are you waiting for?" The first montage spike (about 20 cuts in 50–60 s) sits in this stretch.
- **About 75.6–76.6 s:** card "THIS FALL". It burns into the next shot, and the second act opens.
- **77.1–113.8 s, escalation:** "More lives may be lost. The Undercity cannot be controlled." / "Then we have to go in by force." / "What have you done with my sister?" / "I'll give her your regards." / "This cycle of violence will never stop." / "She's too far gone." / "I have to try." / "You've got a good heart. Don't ever lose it." / "Protect the family."
- **118.5–126.3 s, the quiet before the final climax (dip):** "Are we still sisters?" / "Nothing is ever going to change that."
- **127–140 s:** final climax, music at its loudest (about −10 dB) and about 14 cuts in 130–140 s.
- **141.6–150.6 s:** title "ARCANE / LEAGUE OF LEGENDS" (141.6–145.6 s), then "NOVEMBER 6" (146.6–147.6 s) and "ONLY ON NETFLIX" (148.6–150.6 s). There is no button.
- **Song:** "Enemy" (Imagine Dragons and JID) was Arcane's season 1 theme, teased in 15-second spots and released 28 October 2021 — [esports.gg](https://esports.gg/news/league-of-legends/teaser-for-riots-new-song-enemy-builds-hype-for-netflix-show-arcane-imagine-dragons-jid/). ASR found no sung lyrics in this September trailer, so its music is unidentified here.

#### Coraline, official trailer (2008/2009; 147.0 s). Dialogue and narrator [ASR].
Source: [archived Rotten Tomatoes Classic Trailers upload](https://archive.org/details/coraline-2009-official-trailer-dakota-fanning-teri-hatcher-movie-hd-rotten-tomat)

- **0–7.6 s:** green band (silent 0–6.5 s), then the Focus Features and Laika logos.
- **10.7–35.7 s, narrator (old-school trailer voice):** "Coraline Jones always dreamed of finding a better world, a world more exciting than [her own]… But never did she imagine that she'd discover it in her own home." Pictures: the house, the boredom, the small door, the tunnel (38–40 s).
- **42.8–56.7 s, the wonder:** "A parallel place…" / "We've been waiting for you, Coraline." / "…where parents are always fun" / "I love your garden!" / "…and everything is so good."
- **59.9–72.9 s, the turn, via a question:** "Mom?" / "You're just in time for supper, dear." / "You're not my mother." / "My mother doesn't have… b-b-buttons?" / "Do you like them?" / "I'm your other mother, silly."
- **73.6–98.5 s, the rule and the price:** narrator: "You probably think this world is a dream come true… But you're wrong." / "You could stay here forever." / "There's one tiny little thing you need to do." / "Black is traditional." (the buttons and needle) / "She's got this whole world where everything's better, but it's all a trap." / "You may come out when you've learned to be a loving daughter."
- **100.2–106.8 s, the credit as VO, not a card:** "From Henry Selick, the director of The Nightmare Before Christmas, comes a world of extraordinary imagination."
- **109.8–136.5 s, a VO list with montage, cutting accelerating to about 19 cuts in 110–120 s:** "Spooky secrets…" / "Who are you?" / "You're in terrible danger, girl." / "…and daring discoveries." / "I still have to find my parents to set them free." / "This year, when adventure comes knocking…" / "There are some doors that should never be opened." / "I'm not scared!"
- **138.9–145.6 s:** title "Coraline" (139.6–141.6 s), with the VO "Coraline. Written for the screen and directed by Henry Selick", then "Presented in RealD 3D in select theaters" and "February 2009".

#### The Maze Runner, official final trailer (2014; 149.0 s). Dialogue [ASR], corrected where the mishearing is obvious; cards read from frames.
Source: [archived 20th Century Fox upload](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim). This is the final trailer; I couldn't retrieve the March 2014 first trailer ([YouTube](https://www.youtube.com/watch?v=64-iSYVmMVY)).

- **0–3.75 s:** green band, silent.
- **4–24 s, cold open in the dark lift (the Box):** "[Can] you tell me anything about yourself, who you are, where you came from?" / "Can you tell me your name?" Then light floods in and faces look down: "[Day one, Greenie.] Rise and shine." [ASR: "They won't greedy rise and shine"].
- **26–36.7 s, reveal and questions:** "What is this place?" (30.0 s) / "Welcome to the [Glade]." (32.1 s) / "Who put us here?" / "We don't know." The 20th Century Fox logo comes in here (33.6–34.6 s).
- **38.2–59.1 s, the rules by Q&A:** "What's through there?" / "You guys can't just keep me here." / "I can't let you leave." / "Why won't you tell me what's out there?" / "It's the maze." (47.5 s) / "Every morning when those doors open, the runners look for a way out." / "No one has ever survived a night in the maze." (57.2 s)
- **64.1 s:** "We call them [Grievers]."
- **67.6–69.6 s:** card "BASED ON THE BEST-SELLING NOVEL".
- **69.0–85.5 s, the investigation:** "We don't belong here." / "Somebody built the maze." / "I think it's time we find out what we're really up against." / "You're not like the others. You're curious." / "What the hell was that?" / "This is the first real clue you['ve] found." / "Who knows where this might lead us?" A card, "FROM 20th CENTURY FOX" (about 75.4–76.6 s), sits in this stretch.
- **88.5–117.5 s, the rule breaks and the stakes rise:** "It's a go." / "Thomas." / "Everything started changing the moment you showed up." / "What if we were sent here for a reason?" / "The doors aren't closing." (99.7 s) / "They're here." / "They're gonna keep coming back until they kill us all." / "We get out now or we die trying." / "You don't get it. We're already dead." (115.5 s)
- **119.3–126.9 s, cards:** "THIS FALL" (about 119.3–119.9 s) and "UNLOCK THE MYSTERY" (about 126.2–126.9 s).
- **128–136.7 s:** "You sure about this?" / "No." / "I can't leave. They won't let us."
- **137–143 s:** final climax (about −10 to −13 dB).
- **142.6–147.6 s:** title "THE MAZE RUNNER", glitching together (142.6–145.6 s), then "SEPTEMBER 19".

#### Snowpiercer (2014), U.S. trailer. Press descriptions only, no verified timestamps.
- The official U.S. trailer was released on 29 May 2014 by The Weinstein Company and RADiUS-TWC — [Blu-ray.com](https://m.blu-ray.com/news/newsitem.php?id=14105)
- The A.V. Club said the U.S. trailer came "complete with all the wub-wubs, synth string arpeggios, and Hans Zimmer-style brass waaahs", while the international trailer "was soundtracked by a knock-off of the Tron: Legacy score" — [A.V. Club](https://www.avclub.com/all-aboard-the-snowpiercer-trailer-1798269141)
- **The key line conflicts between sources:**
  - TheWrap quotes Chris Evans in the first trailer as "If you control the engine, you control the world", and frames the trailer around "front" vs. "tail" and "keep your place" — [TheWrap](https://www.thewrap.com/chris-evans-leads-train-uprising-futuristic-snowpiercer-first-trailer-96926)
  - CinemaBlend has "We control the engine, we control the world" in an international trailer — [CinemaBlend (search result)](https://cinemablend.com/new/Chris-Evans-Revolts-Snowpiercer-Trailer-38025.html)

#### The Hunger Games (2012), teaser and theatrical trailer. Press descriptions only, no verified timestamps.
- The first teaser was "less than a minute long"; the full theatrical trailer followed — [Christian Science Monitor](https://www.csmonitor.com/Books/chapter-and-verse/2011/1115/The-Hunger-Games-trailer-shows-key-moments)
- The theatrical trailer (about two and a half minutes) debuted on Good Morning America on 14 November 2011 — [Neon Tommy](https://www.neontommy.com/news/2011/11/hunger-games-trailer-released-video.html)
- It shows most of the reaping:
  - Effie drawing the names;
  - Prim's name being chosen and Katniss volunteering;
  - Katniss going onstage with Peeta — [CSM](https://www.csmonitor.com/Books/chapter-and-verse/2011/1115/The-Hunger-Games-trailer-shows-key-moments)
- It ends as a tribute rises to the arena "as an ominous voice counts down to the start of the game". Neon Tommy says it is Peeta who rises; I couldn't verify that, and the tribute may be misidentified — [Neon Tommy](https://www.neontommy.com/news/2011/11/hunger-games-trailer-released-video.html)
- The trailer's back-end music cue is "Deep Shadow" by T.T.L. (Through the Lens: Tying Tiffany and Lorenzo Montanà), from the ZerOKilled music library. The same writer said the trailer "shows nothing of the actual 'game', withholding just enough information to leave the viewer wanting to see more" — [Trailer Music News](https://trailermusicnews.com/2012/02/zerokilled-music-hunger-games-trailer/)

#### Stranger Things, season 1 first trailer (9 June 2016). Press descriptions only, no verified timestamps.
- The trailer "juxtaposes a conversation between Joyce and local law enforcement's Chief Hopper… with creepy scenes of Joyce's son running from an unseen threat". It also shows "men in biohazard suits, lights mysteriously winking on and off, and a buzz cut-sporting little girl who can apparently flip vans with her mind" — [TVLine](https://tvline.com/2016/06/09/stranger-things-trailer-winona-ryder-netflix-video)
- It has "scenes of eerie piano music, dramatic phone drops and 'one strange little girl'" — [Dazed](https://www.dazeddigital.com/artsandculture/article/31496/1/watch-the-trailer-for-winona-ryder-s-netflix-horror-series)
- mOcean, which made teasers and trailers for Stranger Things, says: "The old template telling people how they should interpret what they're watching is less effective… Whenever possible, we try to let the film speak for itself" (Adam Rosenblatt) — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)

### Inferences
- **The closed-society template is consistent across these trailers.** A sentence of law (The Village: "We do not stray into their woods. They do not come into our village."; Maze Runner: "No one has ever survived a night in the maze."; Minecraft: "…can be built out of blocks.") is followed by visual proof that the law is breaking (the red slash; "The doors aren't closing."; "There are dark forces…"). BUILD LIMIT's rule cards ("AT SIXTEEN, YOU JUMP…", "EVERY YEAR / ONE OF US NEVER LANDS") and the "IT WAS NEVER / AN ACCIDENT" turn take the same two slots.
- **Three button shapes, all after the title:** a comic or scare scene (the Minecraft trailer's 17-s night button), a callback VO (the Minecraft teaser's "Step right this way!") and a tagline card (The Village's "THE TRUCE IS ENDING"). Knives Out puts its button line before the title instead. BUILD LIMIT's "That's not an echo." over black after the title sits closest to The Village's tagline and the Minecraft teaser's VO callback.
- **Silence before the reveal line is a repeatable device.** Minecraft drops the music for about 1 s between "I…" and "am Steve."; Knives Out has about 0.75 s of near-silence before "CSI: KFC". The 0.7-s "hush" of black in the BUILD LIMIT edit is the same device.

### Gaps
- I found no complete or verified transcripts or timestamps for Snowpiercer, the Hunger Games teaser or trailer, or the Stranger Things season 1 trailer. YouTube blocked caption download from this environment, and archive.org had no copies.
- The Knives Out, Arcane, Coraline and Maze Runner dialogue is machine transcription. A human should check the wording against captions before quoting it as exact.
- The Maze Runner breakdown is the final trailer (August/September 2014), not the March 2014 first trailer.
- I couldn't confirm what music plays in the Arcane, Knives Out, Maze Runner, Coraline and Snowpiercer U.S. trailers. Song-ID databases (Tunefind) returned 403.

## 3. Sound: how trailer music is built, and how dialogue sits in it

### Takeaway
Trailer cues are written to the act structure:
- a sparse intro over a held pedal or drone;
- a build in which pulses or ticks and then string ostinatos enter;
- a "choppy" climax with holes left for dialogue;
- a break or near-silence just before the last act;
- a short final sting for the title.

Braams, hits (a whoosh or swell plus a transient with sub), risers and "downers" mark the act changes. Editors cut dialogue so that each line is answered immediately by a hit or sound effect. In practice the biggest moments are often a drop-out to silence and a single sound effect.

### Cited Findings
- **Section by section** — [Master the Score](https://www.masterthescore.com/article/how-to-write-trailer-music-a-step-by-step-guide):
  - **Intro:** sparse and atmospheric, often a held bass pedal while the upper voices change.
  - **Build:** rhythm arrives through pulses, percussion and the first hits; short-string ostinatos come in for its second half.
  - **Climax:** the fullest section, but with "holes for dialogue and effects", kept "a little bit choppy" so it stays editable.
  - **Gaps and silence:** bars of near-silence make the next entry feel bigger, and the gaps between acts serve as edit points.
  - **Signature sound:** introduced early and recalled at the end.
- **The sound-design kit** — [Master the Score](https://www.masterthescore.com/article/how-to-write-trailer-music-a-step-by-step-guide):
  - **Hits:** a long diffuse layer (whoosh, boom or cymbal swell) plus a short transient with sub.
  - **Impacts:** hits without the whoosh.
  - **Risers:** often 4, 8 or 16 bars plus a tail bar (example: a 24-semitone pitch ramp).
  - **Downers:** falling effects before a breakdown or climax.
  - **Braams:** low brass-like tones on root, octave and fifth, used to start acts and mark big downbeats, sometimes filtered to hint at tension.
  - **Pulses and ticks:** signal an approaching section.
- **Act 2 drive and the final break.** Ticking, or steady eighth- and quarter-note rhythms, give Act 2 its drive; Act 3 uses "huge drum hits that punctuate certain edits or on-screen actions". The cue often has "a break just before the end and then the music comes back in" — [Richard Pryn](https://richardpryn.com/how-to-structure-trailer-music/)
- **Editing to the music (Derek Lieu):**
  - "the modern trailer editing structure [is] where a line of dialogue is followed immediately by a sound effect or big beat in the music cue that punctuates the story beats."
  - Editors look for "a music cue that has a sense of rising action that periodically has big and strong beats sprinkled in", with slower parts that are easy to shorten or lengthen.
  - "the BRAAAAAAAMs don't all fall on 'big' shots."

  — [Derek Lieu](https://www.derek-lieu.com/blog/2017/12/3/the-inception-braaaaaaam-sound)
- **Braam history** — [The Hollywood Reporter](https://www.hollywoodreporter.com/news/braaams-beginners-how-a-horn-793220):
  - Braams appear as far back as Transformers (2007) and more definitively in the District 9 trailer (2009). The Inception campaign (2010) popularised them.
  - Mike Zarin scored Inception's first teaser from subway foley recordings.
  - Zack Hemsey's "Mind Heist" wove braams into the final trailer's music.
  - Hans Zimmer told Vulture he got the sound with brass players playing into the resonance of a piano in a church, with "a bit of electronic nonsense" added.
  - Trailer houses now craft signature braams, such as one made from a dinosaur roar for the Jurassic World teaser.
  - Trailer Park's head of music, Bobby Gumm: "There's literally not a bigger sound out there… It's the signifier, the call to arms… and it's just one note."
  - Newer devices: "a pulsing sound that feels really big, but it's not horns", and "power-downs", "a deep techno vibrato that accompanies slow-motion shots".
- **Braam instrumentation.** Vulture reported the Inception sound as bassoon, French horn, trombone and tuba playing the same note loudly, with timpani. The sound is commonly called "a foghorn on steroids" — [Wikipedia: BRAAAM](https://en.wikipedia.org/wiki/BRAAAM)
- **Woollen on music and sound:**
  - "Music is like eighty percent what gives a trailer its pulse… It's sometimes the place where we really start to figure out, 'OK, how are we going to start to assemble this?'"
  - He uses non-musical sound as rhythm: the head thudding on a chalkboard in A Serious Man, a locomotive horn in Little Children, DiCaprio's breathing in The Revenant.

  — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **A Serious Man in detail.** The chalkboard sound "became kind of the baseline for the trailer and kind of set the trailer's rhythm". It was then remixed with a secretary's cough and a car crash into "boom, ah, crash" as the story built — [NPR](https://www.npr.org/2015/02/23/388481464/how-the-man-behind-the-trailers-sparks-an-urge-to-see-a-movie)
- **Measured cue shapes:**
  - **Minecraft teaser:** the song starts filtered or distorted and "clarifies" as the picture resolves from one block into the world (2.5–7.9 s). It drops out for about 1 s before "am Steve.", and swells into the title — [measured](https://archive.org/details/youtube-PE2YZhcC4NY)
  - **Minecraft trailer:** "[dramatic music]" for the origin, "[serene music]" for the reveal (36.3 s), "[adventure music]" (53 s), a licensed song for the second half, and the title on the lyric "We were fated to pretend" (126.2 s) — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)
  - **Arcane:** a dip before the last act (119–126 s), climax (127–140 s), title on the decay (141.6 s) — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
  - **Knives Out:** music cut out under deadpan lines, a near-silence before the button, a hit on the title — [measured](https://archive.org/details/dailymotion-x7cscee)
- **Sound effects as punctuation, Knives Out franchise trailers.** In the Glass Onion trailer a gunshot "coincides neatly with the flashing screen transition" and a character's swearing is "cut off in a blackout" — [Trailaurality](https://trailaurality.squarespace.com/blog/2022/11/6/knives-out-glass-onion)

### Inferences
- A practical 60-s teaser cue, read across these sources (my synthesis, not a quoted template), would be:
  - a pedal or drone with a signature sound for the cold open;
  - a pulse or tick entering for the rule cards;
  - a hit or braam answering each line;
  - a riser into near-silence (0.5–1 s) before the reveal;
  - the biggest hit on the title;
  - silence, then a single dry line or sting.

  The current edit's beats (black open, cards, Q&A lines, montage, 0.7-s hush, slow-motion slide, title, black, sting) already line up with these slots.
- A diegetic sound repeated as rhythm, the way Woollen used the head-thud and the train horn, has a natural equivalent in BUILD LIMIT: the bell toll ("DONG"). It would act as the teaser's signature sound.

### Gaps
- **Dialogue mixing (dry vs. reverb, VO placement over black):** I found no trailer mixer or editor saying how dry dialogue should be in a trailer. The only measured evidence is placement: Arcane and The Village run VO over near-black or fades to black, and Knives Out and Minecraft put key lines into music drop-outs. Whether those lines are dry wasn't measured.
- I found no statement from Two Steps From Hell, Mark Petrie or Ninja Tracks themselves on the 3-act cue; the composer guidance above comes from trailer-music educators and a trailer-house music head.

## 4. Dialogue selection and text cards as narration

### Takeaway
Mystery trailers favour questions answered by very short replies ("What is this place?" / "Welcome to the Glade."), sentences that state a rule, one threat line, and a last line that reframes everything. Teasers use very few lines (the Minecraft teaser has about 8 utterances in 80 s), while full trailers use 25 to 40. Text cards are usually 1 to 6 words, stay on screen for about 1 to 2 s, alternate with shots, and often split one sentence across two or three cards (the Minecraft teaser's 2-3-2-word "NEXT YEAR / LET YOUR IMAGINATION / RUN WILD"). Lines are freely lifted from their scenes and reused as a hook, a callback, or with a different speaker.

### Cited Findings
- **How many lines (measured):**
  - Minecraft teaser: about 8 utterances in 80 s, with no speech in the first ~8 s except one VO line ("Step right this way!") — [measured](https://archive.org/details/youtube-PE2YZhcC4NY)
  - The Village: essentially one narrator monologue (about 9 sentences) plus one line after the title — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)
  - Arcane: about 24 lines [ASR] — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
  - Knives Out: about 35 [ASR] — [measured](https://archive.org/details/dailymotion-x7cscee)
  - Maze Runner: about 37 [ASR] — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
  - Coraline: about 35 including the narrator [ASR] — [measured](https://archive.org/details/coraline-2009-official-trailer-dakota-fanning-teri-hatcher-movie-hd-rotten-tomat)
  - Woollen's Schindler's List trailer "only had a line or two of dialogue… It was very impressionistic." — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **Kinds of lines that make the cut (measured examples):**
  - **Questions with short answers:**
    - Maze Runner: "What is this place?" / "Welcome to the Glade." / "Who put us here?" / "We don't know." / "Why won't you tell me what's out there?" / "It's the maze." — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
    - Minecraft: "Who are you?" / "I… am Steve." — [measured](https://archive.org/details/youtube-PE2YZhcC4NY)
    - Knives Out: "Can we ask why? Has something changed?" / "No." — [measured](https://archive.org/details/dailymotion-x7cscee)
    - Arcane: "Are we still sisters?" / "Nothing is ever going to change that." — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
  - **Rule statements:**
    - The Village: "We do not stray into their woods. They do not come into our village." — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)
    - Maze Runner: "Every morning when those doors open, the runners look for a way out." / "No one has ever survived a night in the maze." — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
    - Minecraft: "As long as what you imagine… can be built out of blocks." — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)
    - Coraline: "There are some doors that should never be opened." — [measured](https://archive.org/details/coraline-2009-official-trailer-dakota-fanning-teri-hatcher-movie-hd-rotten-tomat)
  - **Threat or stakes lines:**
    - Maze Runner: "They're gonna keep coming back until they kill us all." — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
    - Arcane: "Power doesn't come to those who were born strongest…" — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
    - Minecraft: "There are dark forces who want to destroy this world." — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)
  - **Reframing last lines:**
    - Maze Runner: "You don't get it. We're already dead." — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
    - The Village: "I fear our days of peace are over." — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)
- **Escalation by repetition (the "rule of three" and beyond):**
  - The Minecraft trailer's VO steps up across beats: "So one day, I started digging…" / "…and digging…" / "…until I found…" / "…this." (25.4–36.3 s) — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)
  - The Minecraft teaser's three cards build one 7-word sentence: NEXT YEAR (2) / LET YOUR IMAGINATION (3) / RUN WILD (2) — [measured](https://archive.org/details/youtube-PE2YZhcC4NY)
  - Knives Out repeats "Eat shit" about five times across the family (68–76.6 s) — [measured](https://archive.org/details/dailymotion-x7cscee)
- **Lines taken out of context:**
  - Knives Out opens on Blanc's "I suspect foul play, and I've eliminated no suspects" as one sentence in a 5-s hook. Later the same lines play in their scene as two beats about 5 s apart (95.5 s and 100.4 s) — [measured](https://archive.org/details/dailymotion-x7cscee)
  - "Anything you can dream about here, you can make" is a disembodied "VOICE" in the teaser, Steve's narration in the trailer, and attributed to Jason Momoa by Slashfilm — [teaser](https://archive.org/details/youtube-PE2YZhcC4NY), [trailer](https://archive.org/details/youtube-gbNzxvz2_H4), [Slashfilm](https://slashfilm.com/1656739/minecraft-movie-live-action-trailer-jack-black-jason-momoa)
  - Woollen: the job is finding "snippets of lines that can be joined and bumped up against each other in a different way" — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **Text cards measured: wording, word count, style:**
  - **Minecraft teaser:** "NEXT / YEAR", "LET YOUR / IMAGINATION", "RUN / WILD". A small grey top line over a big green bottom line, each about 1.25 s on black, alternating with ~1-s shots. End card: "ONLY IN THEATERS / APRIL 4 / EXPERIENCE IT IN IMAX" — [measured](https://archive.org/details/youtube-PE2YZhcC4NY)
  - **Minecraft trailer:** one card, "THIS" (about 53 s) — [measured](https://archive.org/details/youtube-gbNzxvz2_H4)
  - **Knives Out:** "Now" (1 word, pre-roll); "from Rian Johnson / the Writer/Director of / Star Wars: The Last Jedi / and Looper"; "comes a / Whodunnit"; "like / No One"; cast cards; "written and directed by Rian Johnson / Thanksgiving". Small-word-over-big-word layout throughout ("comes a" over "Whodunnit", "like" over "No One") — [measured](https://archive.org/details/dailymotion-x7cscee)
  - **Maze Runner:** "BASED ON THE BEST-SELLING NOVEL" (5), "FROM 20th CENTURY FOX" (4), "THIS FALL" (2), "UNLOCK THE MYSTERY" (3), "SEPTEMBER 19" (2), each about 1–2 s — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
  - **Arcane:** "FROM THE CREATORS OF LEAGUE OF LEGENDS" (6), "A NETFLIX ANIMATED SERIES" (4), "THIS FALL" (2), "NOVEMBER 6", "ONLY ON NETFLIX" — [measured](https://archive.org/details/youtube-OrTyvmQ0KA8)
  - **The Village:** a single tagline after the title, "THE TRUCE IS ENDING" (4 words, about 4 s) — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)
  - **Coraline:** no narrative cards at all. A narrator does the card's job ("From Henry Selick… comes a world of extraordinary imagination", "Spooky secrets… and daring discoveries") — [measured](https://archive.org/details/coraline-2009-official-trailer-dakota-fanning-teri-hatcher-movie-hd-rotten-tomat)
- **Cards replaced the narrator.** Older trailers were carried by narration and copy at every beat. Modern ones rely on juxtaposing image and dialogue — [FLOOD (Woollen)](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)

### Inferences
- Across the cards measured here, the working range is 1–6 words per card (median about 3), 0.7–2 s on screen, often one phrase split across 2–3 cards. Taglines that stand alone at the end hold longer (about 4 s for "THE TRUCE IS ENDING"). BUILD LIMIT's small-line/big-line cards (for example "EVERY YEAR / ONE OF US NEVER LANDS") use the same two-tier layout as the Minecraft and Knives Out cards.
- In the closest analogues, every question line is answered within a second or two by a one- or two-word reply. The current "Which floor?" / "Forty." exchange follows the Maze Runner and Minecraft Q&A pattern.

### Gaps
- I found no editor or study that states a "rule of three" for cards or a recommended card word count. The ranges above come only from the measured trailers.
- I found no source describing how many lines a teaser "should" use. The Minecraft teaser's ~8 lines is one data point, and The Village's single monologue is another.

## 5. What makes viewers say "I need to watch this", and what confuses or spoils

### Takeaway
The documented positives are withholding (show the premise, not the game), one striking or strange image or sound built into a rhythm, and an explicit mystery promise ("UNLOCK THE MYSTERY"). The documented negatives are spoilers ("giving away too much of the story") and, in the Minecraft teaser's case, a teaser that showed a lot of world but "tell[s] little about the plot". That teaser drew more dislikes than likes, while the full trailer, which opens on a fan meme and gives a clear premise, was received far better.

### Cited Findings
- **Withholding.** The first Hunger Games trailer "shows nothing of the actual 'game', withholding just enough information to leave the viewer wanting to see more." — [Trailer Music News](https://trailermusicnews.com/2012/02/zerokilled-music-hunger-games-trailer/)
- **Woollen on knowing little.** He "loves going into a movie knowing as little as possible", and he looks for "what's special about the film". His A Serious Man trailer was built around one five-to-six-second moment — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer); [NPR](https://www.npr.org/2015/02/23/388481464/how-the-man-behind-the-trailers-sparks-an-urge-to-see-a-movie)
- **mOcean on letting the film speak.** "Audiences have become more sophisticated… The old template telling people how they should interpret what they're watching is less effective… we try to let the film speak for itself." — [FLOOD](https://floodmagazine.com/40518/coming-attractions-the-makings-of-the-modern-movie-trailer)
- **Spoilers.** "Plenty of moviegoers complain about trailers giving away too much of the story". The writer argues that fast "money shot" montages give away less story — [CinemaBlend](https://www.cinemablend.com/new/It-Your-Imagination-Movie-Trailers-Way-Faster-Than-They-Used-38195.html)
- **The Minecraft teaser backlash:**
  - It had 32.5 million views and 626,000 likes vs. 1.4 million dislikes "as of Monday", in an article written in the week after the 4 September release. Its world was described as feeling "soulless", compared to the first Sonic trailer — [The Slate](https://theslateonline.com/article/2024/09/a-minecraft-movie-teaser-is-a-disappointing-mess)
  - "The teaser goes on to tell little about the plot besides the idea that the piglins… are invading the Overworld", and it reveals Steve "in underwhelming fashion" — [The Crimson White](https://thecrimsonwhite.com/115701/culture/culture-pick-its-game-over-for-the-minecraft-movie-following-disastrous-teaser-trailer/)
  - One reviewer praised the cube landscapes but found the creature designs unsettling (the pink sheep, a "dead-eyed" pigmen, an "overly expressive llama") — [TechRadar](https://www.techradar.com/streaming/entertainment/the-minecraft-movies-first-teaser-is-here-and-i-cant-decide-if-whats-been-crafted-looks-beautiful-or-horrifying)
- **The Minecraft trailer's reception.** It opened on the "yearned for the mines" meme, and "the gaming community was in splits"; YouTube comments were "ecstatic" — [Sportskeeda](https://www.sportskeeda.com/minecraft/as-child-i-yearned-mines-a-minecraft-movie-trailer-mentions-popular-meme-fans-splits)
- **Mystery promised in so many words.** The Maze Runner final trailer's penultimate card is "UNLOCK THE MYSTERY" (about 126 s), and its dialogue is built from unanswered questions — [measured](https://archive.org/details/the-maze-runner-official-final-trailer-hd-20th-century-fox-trim)
- **Anchor images.** The Village anchors on a single striking image and colour: a red slash on a door, repeated as the wipe that reveals the tagline — [measured](https://archive.org/details/youtube-sTGyhwvdY6k)

### Inferences
- **"I need to watch this" follows a shared pattern** in the trailers best received in this set (The Village, Maze Runner, Knives Out, the Minecraft trailer). It is a premise the viewer can say in one sentence, plus one question the trailer refuses to answer, plus one recurring image or sound.
- **The Minecraft teaser's failure mode** in its own reviews was spectacle with no stated premise or question. Unfamiliar-looking creatures compounded it.
- **The spoiler risk for a mystery** is showing the answer image. For BUILD LIMIT that would be the world under the fog, Ash alive, or the Well moving. Real mystery trailers show the rule and the breach, and hold back the mechanism. Coraline is the exception that shows the most: it reveals the Other Mother's buttons and her price ("Black is traditional"). Even so, it ends on "some doors… should never be opened", not on how the story resolves.
- **Lines usable as the button**, mapped to the Minecraft trailer's post-title reveal or The Village's tagline: "That's not an echo." and "Took you long enough, Buh." Both are lines that raise a question, which fits the teaser role. Whether they spoil anything depends on how the series reveals Ash; that is a story decision, not a trailer-craft finding.

### Gaps
- J.J. Abrams's "mystery box" TED talk (2007) is the usual reference for the mystery-box idea; I didn't fetch it, so nothing from it is quoted here.
- I found no audience-research data (completion rates, intent-to-view scores) comparing withholding teasers with plot-heavy trailers. The evidence here is critics' reactions and like/dislike counts only.
- I found no source on what makes a trailer confusing beyond the Minecraft teaser reviews. I found no editor interview on clarity or confusion.
