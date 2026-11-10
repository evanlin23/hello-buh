# The HelloBuh look: visual standards with the evidence (2026-11-10)

Owner, 2026-11-10: "we should optimize like the formatting, and like the best font to use? ... the best color grading
and visuals? ... the best set? the best characters? the best lighting? etc everything should be the best and optimized
in the process." And on the cinematic test THE KEEP: "some parts with the light are a bit blurry."

This page is the evidence. The numbers an agent applies while working are in `.claude/skills/cinematic-style/SKILL.md`
("Standards"), each with its one-line reason. Change a standard only with new evidence (our channel's numbers, or a
measured pattern on the top channels), and say so here.

Stills for the owner: `out/look_ab/` on the box (fonts/, grade/, fx/; not committed, rebuild with the commands below).

## 0. The evidence base
- **Top story Shorts, frame by frame.** YouTube serves three frames from inside every video (`i.ytimg.com/vi/<id>/maxres1|2|3.jpg`,
  at about 25/50/75 % of its length), no bot check. From the 26 channels of `research/narration_2026-11-10_data/channels.csv`:
  the top 2 Shorts of 14 story and Minecraft-animation channels (84 frames: Xenost, Ashyyy, Qubik, Friend, Milo & Chip,
  MSToons, Skytro, Kamui, Michazike, Haminations, Bloopo, narrow, Hapico, Minoku), then all 8 sampled Shorts of six of them
  (141 frames, 189 distinct in all: Xenost, Ashyyy, Skytro, Milo & Chip, Hapico, Kamui). Positions are fractions of the 9:16 frame.
- **Shorts UI safe zones.** YouTube publishes no pixel spec. Creator-tool templates agree on the shape and disagree on
  the size: the right action column about 120 px (PostEverywhere) to 15 % of the width (ToolNudge); the bottom title,
  channel and audio rows 380-480 px (PostEverywhere 380, Ramd 400, ToolNudge 25 %); the top bar 180-200 px.
  Conservative safe box: x 120-960, y 200-1440 at 1080x1920.
- **Our own renders.** `scripts/look_stats.py` (exposure numbers per frame) and `scripts/grade_preview.py` (a grade on an
  ungraded still, the renderer's finishing pass in numpy) on the published recordings of story_nitwit and
  story_sun_wont_set and the pilot story_good_boy; font metrics measured on the glyphs.
- **Textures.** Mean colours of the cast and set textures from the 1.21.11 client jar, CIELAB distances (section 5).

## 1. Format and captions
**What the top story channels do** (189 distinct frames):
| channel (median views/Short) | layout | captions | on-screen effects |
|---|---|---|---|
| Xenost (4.7M) | full 9:16 | 1 word at a time, white, heavy sans, black stroke; at 14-18 % from the top (over the heads); cap height ~2.8 % of the frame | none; diegetic inserts 2/24 frames (an ON AIR sign, a phone screen) |
| Ashyyy (2.1M) | full 9:16 | 1 word at a time, white heavy grotesk, thick black stroke; at 55-65 %; cap ~3.5 % | none; diegetic inserts 3/24 (a WANTED poster, a "WORDS LEFT: 4" counter, a "20 YEARS" card) |
| Milo & Chip (2.2M, Minecraft) | full | 1-3 words in a bold Minecraft-style pixel font, coloured, dark outline; at 62-70 % | emoji and face stickers in ~7/24 frames |
| Friend (612k, Minecraft) | full | the Minecraft font, coloured, no stroke | little |
| narrow (15M) | full, with a **persistent top title** ("POV: ...") at ~8 % | small dialogue lines | none |
| Qubik (story subset 2-3.6M) | **a black top band with the title** over the picture ("Which one is cute?", key word red) | in the band | none |
| Skytro (3.5M, cinematic Minecraft) | full | **none** | **none**: shallow depth of field, low angles, warm torch-lit grade, faces filling 40-70 % of the frame |
| Kamui (9.4M), Hapico (2.6M) | full | none / big block text ("OH NO") | heavy: IQ meters, hearts, emoji, subscribe cards (~15/24 Kamui frames) |

**Our layout (title band on top, the game 1080x1011 in the middle, black bands) stays.** The owner chose it ("the same
title and then gameplay in the middle"), our best Short (runaway, 3.2 subs per 1k views) used it, and two top channels
keep a persistent title over the picture (narrow, Qubik). The cost is real but bounded: the game is 53 % of the screen,
so a subject is about half the size it would be full-frame. Nothing in the sample isolates layout from niche, art
quality or channel age, so this is not strong evidence for a switch. Optimise within it:
- **Frame bigger.** Top channels fill 40-70 % of the frame height with the subject. In our game view: a medium shot's
  subject fills >= 45 % of the game view's height, a close shot's face >= 25 %, a wide shot's subject >= 12 % (still
  readable at phone size), and the establishing shot is the only one where the subject may be smaller. This answers
  the owner's "too zoomed in" too: wide for places, big for people, never both in the same shot.
- **Captions inside the safe box.** Centred at 0.70 of the game view = y 1163 (60.6 % of the screen, the Ashyyy and
  Milo & Chip zone), 280 px above the bottom UI. **Width 840 px (x 120-960), was 900**: the like/comment column covers
  x > 960 over roughly y 960-1700, and a 900-wide chunk reached x 990. Cost: 13 of 520 existing chunks wrap to two
  lines instead of 7 (still within "never more than two lines").
- **Title band:** Inter ExtraBold 78 px, unchanged (the channel's look on every Short; non-story Shorts must render
  unchanged). Its two lines span y ~185-357, below the top bar (180-200 px).
- **Size:** 96 px (cap height 68 px = 3.5 % of the screen), the same as Ashyyy and larger than Xenost: keep.
- **Stroke 8 px dark ink + soft shadow, pop 0.84 -> 1.06 -> 1.0 over 0.1 s:** matches the narrator channels: keep.
- **Words per chunk: 2-3 (ours) vs 1 (Xenost and Ashyyy, 48/48 frames).** One word at a time is the pure-narrator
  channels' habit at ~4.5 words/s. It is a test, not a rule change: our phrases read as language, which suits the
  serious cinematic tone. Open question for the owner (A/B on the next stories).

## 2. Font
Nine candidates, the same caption ("He NEVER blinks.", key word in the key colour) over the same real frames
(story_good_boy L05 and L02), each at the same cap height (68 px), in the full layout, and at phone size (360x640,
about a phone's width in points). `out/look_ab/fonts/`: `phone_sheet_1.jpg`, `phone_sheet_2.jpg` (two backgrounds),
`phone_captions_1x.png` (the caption strip of each at phone size), `full_<font>.jpg` (1080x1920 each), `metrics.json`.

| font (licence) | px for cap 68 | stem px | width of the caption | **ink per char at phone size** | ink per width |
|---|---|---|---|---|---|
| Schibsted Grotesk Black (OFL), was the caption font | 96 | 31 | 838 | 235 | 0.80 |
| Inter ExtraBold (OFL), the title font | 93 | 26 | 796 | 193 | 0.69 |
| Montserrat Black (OFL) | 96 | 31 | 894 | **265** | 0.85 |
| **Poppins Black (OFL)** | 96 | 31 | 828 | 254 | **0.88** |
| Anton (OFL), condensed | 79 | 20 | 506 | 152 | 0.83 |
| Bangers (OFL), comic caps | 92 | 29 | 516 | 156 | 0.84 |
| Lilita One (OFL) | 96 | 26 | 690 | 194 | 0.80 |
| Minecraft's own font (the jar's ascii.png, scale 10) | - | 10 | - | 130 | 0.45 |
| the same, bold (+1 px, as the game draws bold) | - | 20 | - | 207 | 0.72 |
| Pixelify Sans Bold (OFL) | 105 | 26 | 806 | 177 | 0.63 |

"Ink per char" = pixels of the letters' fill (white or key colour) per character after scaling to phone size: how much
letter survives the outline at the size the viewer sees. **Pick: Poppins Black** (now the default, `assets/fonts/`):
the most ink for its width (0.88), so the heaviest letters that still fit three words in 840 px; the same family of
heavy geometric grotesk as the narrator channels' captions. Montserrat Black has the most ink but is 7 % wider (more
wraps). Condensed (Anton) and comic (Bangers) fonts read lighter at phone size and Bangers is all caps (slower to read,
and it kills the CAPS key-word cue). The Minecraft font is what the Minecraft channels use (Milo & Chip, Friend), but at
the game's 1-px stroke it has half the ink of a heavy sans; bold it reaches 207, close to Inter, and looks like a game,
not a film. Keep it for diegetic text (signs, chat, the death screen), not the narration. Komika was dropped: not OFL.

## 3. Grade and lighting
### Measured problems (ungraded published stories, `look_stats.py`)
| frame | subject luma | black point p1 | contrast p5-p95 | mean saturation |
|---|---|---|---|---|
| nitwit 1.5 s, village day | 0.37 | 0.105 | 0.14-0.72 | 0.52 |
| nitwit 34.4 s, villager close | 0.33 | 0.102 | 0.14-0.64 | 0.49 |
| nitwit 24.2 s, night by a campfire | **0.18** | **0.000** | 0.00-0.42 | 0.37 |
| sun_wont_set 24.9 s, zombies under a tree | **0.18** | 0.057 | 0.09-0.76 | 0.57 |
| sun_wont_set 33.2 s, dusk | **0.11** | 0.021 | 0.04-0.39 | 0.42 |

Two findings: **vanilla night crushes to zero** (1 % of the frame at pure black: YouTube's encode bands it, a phone
in daylight shows nothing) and the subject sits at 0.18, unreadable; **vanilla is already saturated** (0.49-0.57 mean
HSV saturation), so "saturation up" means a few percent, not the +14 % the pilot used.

### The moods (`renderer/looks.js`)
- `look: 'auto'` (**the story default**, in `stunts/_story_template.js`): the grade follows the game clock frame by
  frame: village_day until 11000, golden_hour 12000-12700, eerie_night 13600-22400, golden_hour again 23200-23600, day
  from 600; linear in between. A cut that changes the time changes the grade on its own frame; a time-lapse glides.
  `{ mood: 'auto', bloom: 0.3 }` adds the rest of a look.
- `look: 'golden_hour'` (one mood for every frame) or `look: { mood: 'tense', vignette: 0.5 }` (a mood, overridden).
- A camera shot's `mood: 'tense'` (in `stunt.shots`) grades that shot only: the beat before the twist, the chase.
- A `look` without `mood` is used exactly as written (every existing stunt renders unchanged).
A mood sets only colour: exposure, contrast, saturation, temperature (lift/gamma/gain) and the vignette. Bloom, god
rays, haze, depth of field and grain are left to the cinematic look's sharp defaults (section 7).
| mood | when (time of day) | exposure | contrast | saturation | temperature (gain R/B) | lift (blacks) | vignette |
|---|---|---|---|---|---|---|---|
| `village_day` | 1000-11000 | 1.07 | 0.14 | 1.06 | 1.11 (~5500 K, neutral-warm) | 0.012-0.018 | 0.22 |
| `golden_hour` | 12000-12600, 23200-23600 | 1.06 | 0.12 | 1.08 | 1.27 (~3500 K, warm) | 0.01-0.02 | 0.32 |
| `eerie_night` | 18000 (moon up) | 1.35, gamma 1.12-1.18 | 0.14 | 0.90 | 0.85 (cool, moonlit) | 0.015-0.045 (blue) | 0.38 (+ cloudNight 0.42, handLift 0.35) |
| `tense` | any; at night `{ mood: 'eerie_night', grade: { contrast: 0.22 }, vignette: 0.48 }` | 1.04 | 0.24 | 0.88 | 0.97 (cool-neutral) | 0.006-0.02 | 0.45 |

Why these numbers:
- **Exposure / subject luma.** A face must read at phone size: by day the subject 0.35-0.70 luma (Minecraft's lit
  skins and robes measure 0.35-0.55 ungraded; a mid-grey key sits ~0.45), at night >= 0.25. Night needs +35 % exposure
  plus a gamma lift (shadows up more than highlights): the campfire villager goes 0.18 -> 0.29.
- **Black point.** p1 >= 0.015: lifted blacks keep shadow detail through YouTube's 8-bit encode; night's lift is blue,
  so the dark reads as moonlight, not as a broken render (the classic day-for-night grade: cool, lifted, darker mids).
- **Contrast** +0.12-0.24 over the neutral 0.08: phones are watched in daylight at small size, where a flat picture
  looks washed out; `tense` pushes it (hard shadows read as threat), night keeps it moderate so the blacks don't crush.
- **Saturation** +6-8 % by day (vanilla is already near 0.55), -10 % at night (the eye sees less colour in the dark),
  -12 % for tense (colour drains when the story turns).
- **Temperature.** Warm for safety and home (village day, golden hour), cool for threat and night. Gain R/B ratio:
  1.11 village, 1.27 golden, 0.85 night, 0.97 tense.
- **Vignette** pulls the eye to the centre where the subject is (0.22 by day, up to 0.48 for tense). It never covers
  the captions' line, which sits inside the bright centre.

Before/after, `out/look_ab/grade/` (left as published, right graded, numbers on each): `nitwit_village_day_1.5s.jpg`,
`nitwit_village_day_34.4s.jpg`, `nitwit_eerie_night_24.2s.jpg`, `nitwit_eerie_night_30.1s.jpg`,
`sun_wont_set_golden_32.0s.jpg`, `sun_wont_set_tense_24.9s.jpg`, `sun_wont_set_tense_dusk_33.2s.jpg`,
`good_boy_golden_4.2s.jpg`, `good_boy_golden_15.5s.jpg`, and `overview.jpg`. Made with `scripts/grade_preview.py`
(the renderer's finishing pass in numpy) on frames rendered with `LOOK=0`; checked against a real render of the same
look with bloom and grain off (section 8).

What the grade can't fix (the stills show it): the zombies under the tree stay at 0.18 with any grade, because the
tree's shade is in the world. That is lighting and staging, below.

### Lighting in the world
- **Time of day per mood:** the table above. Golden hour: the sun low in the west, so the camera sits west of a face to
  light it (east of it to backlight). Avoid noon for faces: the sun straight down lights tops, not fronts.
- **Night: a light within 3-4 blocks of every face.** Block light drops 1 level per block (taxicab) and the game's
  brightness curve is steep: level 15 = 1.0, 12 = 0.50, 11 = 0.41, 10 = 0.33, 8 = 0.22 of full. A lantern or campfire
  (15) within 4 blocks keeps the face >= 11; a torch (14) within 3; a soul lantern (10) only for an eerie rim, never as
  the key. Shoot-through: the light between the camera and the subject, to the side (a three-quarter key), never only
  behind the subject (a silhouette) unless the shot wants one.
- **Faces out of shade by day.** Under trees, roofs and overhangs, sky light drops and the face goes dark (the zombie
  shot). Move the subject 1-2 blocks into the open or the camera under the tree looking out.
- **Face the camera along north-south when you can.** Vanilla shades block faces by direction (top 1.0, north/south
  0.8, east/west 0.6) and lights entities from two fixed directions near the north-south axis: a wall or a face seen
  along north-south reads about a third brighter than along east-west. Check with `look_stats.py` before relying on it.
- **Dark gaps between lights** give a night frame its shape (building_guide.md rule 14): no glowstone grids.
- **Check every night shot** with `python3 scripts/look_stats.py <still> --night`: subject >= 0.25, p1 >= 0.015.

## 4. Sets: what reads on camera
The build rules are docs/building_guide.md. What the frames add: the winners' sets are simple, saturated and **big
in frame**; the cinematic one (Skytro) shoots close and low with a soft background, so the set is mostly texture and
light behind the face. Our sets were too small in frame and too flat, never too plain. The camera-readability
checklist (building_guide.md section 4) is the gate for every planned shot.

## 5. Characters: casting for the phone
Mean colour of each texture's visible front (head, body, legs) from the jar, and its CIELAB distance (dE) to the set
materials; dE < 20 (bold) blends in, 20-35 separates, > 35 pops. Full table (40 rows): `python3 scripts/cast_contrast.py`.
The useful rows:
| cast | colour, luma | grass | oak planks | spruce planks | cobblestone | dirt path | sand | day sky | night |
|---|---|---|---|---|---|---|---|---|---|
| Steve | #4e6574, 0.38 | 42 | 47 | 39 | **16** | 47 | 53 | 47 | 34 |
| Alex | #a79f7b, 0.62 | 29 | **17** | 29 | 23 | 20 | **17** | 69 | 66 |
| any plains villager (all 13 professions) | #6c4d3f-#8c6f62, 0.32-0.46 | 25-38 | 21-29 | **10-18** | 15-24 | 21-28 | 37-50 | 62-70 | 37-47 |
| zombie | #306b63, 0.37 | 30 | 45 | 39 | 24 | 44 | 51 | 62 | 43 |
| creeper | #69b260, 0.62 | 31 | 45 | 55 | 54 | 44 | 41 | 96 | 87 |
| skeleton | #a8a7a7, 0.66 | 43 | 35 | 40 | **15** | 38 | 27 | 49 | 61 |
| enderman | #0f0f0f, 0.06 | 52 | 61 | 43 | 48 | 59 | 82 | 80 | **13** |
| witch | #43363e, 0.23 | 45 | 47 | 31 | 29 | 46 | 64 | 63 | **19** |
| iron golem | #baac97, 0.68 | 39 | 25 | 36 | 21 | 28 | **16** | 61 | 67 |
| allay | #3ac4ee, 0.67 | 67 | 71 | 73 | 43 | 73 | 58 | 36 | 73 |
| fox | #c47a47, 0.53 | 47 | 20 | 28 | 46 | 22 | 40 | 89 | 74 |
| white sheep | #eeeeee, 0.94 | 62 | 50 | 62 | 40 | 54 | 26 | 55 | 87 |
| default skins Kai, Makena, Noor, Zuri | browns, 0.29-0.41 | 32-43 | 20-29 | **7-17** | 24-36 | 18-27 | 44-54 | 71-83 | 42-53 |

**Casting guide:**
- **Steve is the hero** (owner). His teal-and-blue reads against every wood, grass, path and sand set (dE 39-53); his
  one weak spot is grey stone (cobblestone 16): don't stage him against a stone wall without light on him.
- **Villagers are all brown robes** (luma 0.32-0.46): every profession blends into spruce (dE 10-18) and darkens into a
  shadow. Tell them apart by **silhouette and hat**, not body colour, and put them against grass, sky or light planks.
  Read at phone size (hat and apron silhouettes): **farmer** (wide straw hat), **fisherman** (bucket hat), **shepherd**
  (white wool hat), **fletcher** (feathered cap), **librarian** (red-trimmed cap and book), **butcher** (white apron,
  red headband), **cleric** (purple robe: the only villager with a strong body colour), **armorer/weaponsmith**
  (black eyepatch or mask: menace). Weak at phone size: toolsmith, mason, leatherworker, cartographer (detail too
  small). The **nitwit** (plain green robe) reads as "the odd one" by having no badge. Two villagers in one shot:
  different hats and one in the cleric's purple, or different biome types (desert, snowy, taiga robes).
- **Mobs that read instantly:** creeper (bright green, the brand's own icon: dE 31-96 against everything), allay (cyan),
  zombie (teal on green and wood), iron golem (big pale mass; it melts into sand), sheep (white). **Night-only mobs
  need a light:** enderman (dE 13 to the night) and witch (19) disappear in the dark; the enderman's eyes glow (the
  renderer draws enderman_eyes), so frame them as two purple dots and a lit face. Skeletons read on grass and against
  the sky, not against stone (15).
- **Actor skins for a second human:** Alex (light: separates from Steve, luma 0.62 vs 0.38) or a bright-shirted skin;
  avoid the brown-toned defaults (Kai, Makena, Noor, Zuri: dE 7-17 to spruce) on wooden sets. Two humans in one shot
  differ in luma by >= 0.15.
- **Silhouette and size.** Readable at phone size = the subject is >= 12 % of the game view's height in a wide shot,
  and its outline is not broken by a same-value background (a dark mob on a dark wall, a pale golem on sand).
- **Colour coding** across a story: one colour per character (their caption colour, owned by docs/voices.md), and it
  should agree with what they wear (the cleric's lines purple, the butcher's red).

## 6. On-screen effects (owner: "on screen sfx as well, if needed/maybe")
**What the top channels do:** the serious narrator channels (Xenost, Ashyyy: 0/48 frames) and the cinematic Minecraft
channel (Skytro: 0/21) use **no** onomatopoeia, emoji or stickers; they use diegetic inserts (a sign, a phone screen,
a counter: 5/48). The kid-comedy Minecraft animation channels use them heavily (Kamui ~15/24 frames, Milo & Chip ~7/24,
Hapico's "OH NO"). The owner's direction is "serious ... super professional and high quality".

Options made over one real frame (`out/look_ab/fx/`, a still and a 1.5 s clip each, the hit at 0.5 s, `fx_sheet.jpg`):
`A_clean`, `B_onomatopoeia` ("BONK!" text pop), `C_emoji` (an emoji pop), `D_punchin_shake_flash` (a 15 % punch-in over
4 frames, a decaying 6-frame shake, a 3-frame white flash).

**Recommendation: no onomatopoeia, no emoji stickers** (they read as kids' comedy and fight the cinematic look). Use
the camera effects that film uses, sparingly; they exist already in edit.py's retention toolkit (`edit.punch`,
`edit.shake`, `edit.flash`, `edit.zoom`), with story-sized values:
- **punch-in:** at most 2 per Short, on the reveal or the payoff, scale 0.06-0.10 (the toolkit's default 0.12 is for
  stunt Shorts). respawn_tax used 0.08 and 0.10.
- **shake:** only on a physical impact the viewer sees (a hit, a blast, a fall landing), 6-10 px (default 16 is a stunt
  value), never on dialogue.
- **flash:** on a time jump or the twist's cut only, alpha 0.4-0.5 (default 0.7).
- **diegetic text** (a sign, a book, chat, the death screen, a rule meter) is the right way to put words in the world.

## 7. Sharpness (a hard rule; owner on THE KEEP: "some parts with the light are a bit blurry")
- Glow never blurs block edges or the subject's textures: bloom only on true highlights (lights, the sun, the sky).
- No depth of field on wide or establishing shots; DoF only on medium and close camera shots, the subject in focus.
- A sharpen after the grade, and the encode at crf <= 18.
- The moods set none of bloom, rays, haze, DoF or grain; those defaults are the cinematic look's (agent/cinematic is
  fixing them). A stunt that adds them answers to this rule in review.

## 8. Tools and checks
- `python3 scripts/look_stats.py still.png [--night] [--box x0,y0,x1,y1]`: subject luma, black point, clipping,
  contrast, saturation, warmth; WARN lines and exit 1 when a frame misses the standard.
- `python3 scripts/grade_preview.py raw.png out.png --look <mood or JSON> [--side]`: a grade in a second on a frame
  rendered once with `LOOK=0 ./hb still ...`. Checked against real renders (nitwit, 1080x1011): eerie_night with bloom
  and grain off differs by 0.001 levels on average (99th percentile 0); `look: 'auto'` in one render graded the day
  frame as village_day and the night frame as eerie_night (mean difference 0.0001).
- `./hb still <stunt> T --look golden_hour` (or `--look '{"mood": "tense", "vignette": 0.5}'`): the real thing.
- Non-story Shorts and stunts whose `look` has no `mood` render exactly as before: boat_clutch and tnt at 2 s and 6 s,
  and story_good_boy (its own look) at 15.5 s, rendered on main and on this branch: 0 pixels differ.

## 9. Open questions for the owner
1. **Font:** Poppins Black is the new caption default (most legible for its width). Keep, or prefer Montserrat Black
   (a touch heavier and wider) or the old Schibsted? See `out/look_ab/fonts/phone_sheet_1.jpg`.
2. **Words per caption:** test one word at a time (what Xenost and Ashyyy do) against our 2-3 on the next 4 stories?
3. **Layout:** keep the black bands (no strong evidence against), or try the blurred bands (`--bands blur`, built) on a
   pair of stories?
4. **Effects:** OK to keep stories free of text/emoji pops, with punch-ins and shakes only on the payoff?
