# What was on screen: Buhtown's high vs low stop rates, and our openings (2026-11-12)

The owner asked (2026-11-12): "can we also check what was going on the screen for the ones with good hooks vs bad
hooks and see how we can improve?"

**Stop rate** here is YouTube Studio's "viewed" share, the opposite of "swiped". It comes from the Buhtown read of
2026-11-12 (`metrics/studio/2026-11-12.md` in evanlin23/blocky-stories), which covers 20 Shorts. back-row and ep20
come from the 2026-11-02 read, because they aren't in the newer table.

**Files:**
- `hook_frames/storyboard_high_vs_low_0-8s.png`: the 5 highest against the 5 lowest, as a reconstructed storyboard
  at 0, 0.5, 1, 2, 4, 6 and 8 s.
- `hook_frames/real_frames_0-8s.png`: real frames from Buhtown's knock-back and from our Gold for the Portal and
  Light Sleeper.
- `hook_frames/openings_buhtown_22.md`: every Buhtown Short, second by second.

## How this was done, and how much to trust it

- **The films were not reachable for 21 of the 22 Shorts.**
  - The Buhtown mp4s are GitHub Actions artifacts (`film-<story>`). This session can read the repo but can't call its
    API.
  - YouTube asks for a sign-in ("confirm you're not a bot"), and I didn't try to get round that.
  - The one real Buhtown film in the repo is `legacy/knock-back.mp4`. Its detected cuts (2.67, 3.27, 4.60, 6.53,
    7.73 s) match its story.json, which suggests the reconstruction method is sound.
- **Everything else is rebuilt from the edit.** I recomputed each film's timeline with the same maths as
  `blocky/timeline.py`: line onsets from `voice-timings.json`, caption chunks, shot cuts from `at` references, cues
  and effects. Each shot's picture comes from the story's shot list (script.md, the generator's comments, reviews).
  Face sizes are inferred from the camera position and lens.
  - So "what's on screen" is what the edit asked for. A render bug would not show (e.g. ep48's one blank-lawn
    frame, knock-back's fade-in that never shows).
- **The measured craft numbers** (cuts per 10 s, faces, motion) are in `docs/research/craft-metrics-ours.json` and
  `qa/<story>.json` there. I used the cut counts. Their `measure.py` needs the film for its picture blocks, so I
  didn't re-run it.
- **There is very little data:**
  - 22 Shorts, with 5 "high" (81% or more).
  - Stop rate also moves with:
    - **TV share.** TV is 33-39% of watch time on the top three, and there's no swipe on a TV.
    - **Which audience the feed tested.**
    - **The premise itself**, which the picture can't separate from.
  - Read every difference below as a lead, not a law.
  - One check is honest: if a pattern holds in the 5 highs but also in several lows, I say so.

**The numbers in the brief, corrected.** The brief's lows for ep38 (61.3%), knock-back (63.1%) and ep20 (64.7%) are
from the **2026-11-02** read. On 2026-11-12, ep38 is **64.1%** and knock-back **71.4%**. ep20 isn't in the newer
table. The four 2026-11-12 highs are confirmed: Shadow 85.4, HALF 84.3, Blackout 82.2, Elevator 81.9. back-row's 82.6
is from 2026-11-02.

| Group | Shorts (stop rate) |
|---|---|
| **High (81%+)** | Shadow/HAPPIEST 85.4 · HALF a Mark 84.3 · back-row 82.6 · Blackout/Ben 82.2 · Elevator FIVE 81.9 |
| Middle | REFLECTION 78.8 · GATE 77.6 · ZERO feet 74.2 · knock-back 71.4 · Diary 71.1 · Echo 69.7 · HUMS 68.6 · Goodbye wave 68.0 · Uncle 67.1 · 13 button 66.4 · ep20 64.7 · ep38 SEE 64.1 |
| **Low** | Rule Three 56.6 · WARM shoes 56.4 · Card/FRIENDS 52.7 |
| No stop rate yet | Future Me (Nov 11) · Nine Rooms (Nov 11) |

## The opening of every Short, in one table

This table gives the first frame, the time until the odd thing shows in the picture, when the key word is spoken,
the number of cuts in 0-8 s, what 4-8 s does, and the biggest retention drop in 4-8 s (from the Studio read).

| Short | Stop | Frame 1 (subject) | Face in frame 1 | Odd in picture | Key word spoken | Cuts 0-8 s | 4-8 s does | 4-8 s drop |
|---|---|---|---|---|---|---|---|---|
| Shadow / HAPPIEST | 85.4 | my feet, shadow stuck to them (body) | no | 1.85 s (a stranger's lone shadow) | SHADOW 0.25, HAPPIEST 2.78 | 4 | new people, the rule at work | −6.8 |
| HALF a Mark | 84.3 | Ros's glowing half-mark hand, her face behind | yes | 0 s | HALF 0.78 | 6 | new people (strangers, café, brothers) | −5.4 |
| back-row | 82.6 | the empty night-bus aisle, back row | no | subtle (dent, swaying strap) | BACK ROW 1.42 | 4 | routine and who's who (driver) | −14 at 4.1 s* |
| Blackout / Ben | 82.2 | Ben's flashlit face, offering me a sandwich | yes (close) | the swap at 6.66 s; "too nice" from 0 s | NICE 0.66, YOURS 1.70 | 6 | the rule explained, then at work on a neighbour | −9.8 (3-5), −6.2 |
| Elevator FIVE | 81.9 | mirror doors: five faces, four backs | yes (5) | 0 s | FIVE 1.76 | 6 | who's who (A-D tags) | −14.5 |
| REFLECTION | 78.8 | a stranger in a mirror pane, nobody in front | yes (in glass) | 0 s | REFLECTION 1.59 | 4 | new examples | −15.9 |
| GATE / green | 77.6 | an empty chair at a gate, with a moss pad in a person's shape | no (person-shaped) | 0 s | GATE 1.33 | 5 | new people (hedge man, flower on nose) | −9.3 |
| ZERO feet | 74.2 | me on the couch, phone shows 0 | yes | only a number | ZERO 0.25 | 7 | explains, then Grandpa's example | n/a |
| knock-back | 71.4 | dark empty kitchen floor (Y≈34) | no | no (dust at 1.6 s) | KNOCKS 1.51 | 5 | explains the layout, near-black shot | −15.2 |
| Diary ANSWERS | 71.1 | open diary, ink writing itself | no | 0 s (prop) | BACK 1.42; ANSWERS never | 4 | backstory (Grandma's diaries) | −15.3 |
| Echo TWICE | 69.7 | my face at the canyon rail | yes | none (sound only) | ONE 1.27; TWICE never | 8 | explains, then who's who | n/a |
| HUMS | 68.6 | me and my ring between two faces | yes | 0 s | 64 / 63 0.25-1.42 | 4 | explains the ring | −13.5 |
| Goodbye wave | 68.0 | the creature in the tank, eyes shut | creature | 0 s | WAVE GOODBYE 0.51; DANGEROUS never | 4 | the setting, who's who | −11.2 |
| Uncle NEVER lies | 67.1 | a shopper's coat with tags | yes | 0 s | LIE 0.62, COVERED 3.30 | 7 | new person (tag drops off) | −5.3 |
| 13 button | 66.4 | the lit 13 button | no | 0 s (prop) | ITSELF 0.87 | 6 | explains, then an example | −10.9 |
| ep20 photo strip | 64.7 | a photo strip on a bench | in the photo | ~1 s (prop) | CLOSER 0.66 | 4 | who's who, the setting | n/a |
| ep38 SEE | 64.1 | a couple with silhouettes overhead | yes | 0 s | MISS 2.09 | 5 | new examples | −11.1 |
| Rule Three TORN | 56.6 | a torn page stub in a rulebook | no | 0 s (prop, mild) | MISSING 0.63; TORN never | 4 | new examples (dodging the question) | n/a |
| WARM shoes | 56.4 | a pair of steaming shoes on the mat | no | 0 s (prop) | WARM 1.48 | 5 | a list of shoes (objects) | −14.5 |
| Card / FRIENDS | 52.7 | a card in my hand, 9:14 | no (hand) | none (only the narration makes it odd) | ENDS 1.94 | 10 | examples (mail, Dad's card) | −6.9 |

\* back-row's drop is from the 2026-11-03 curve study (`2026-11-03-our-retention.md`). The rest are 2-second
windows from the 2026-11-12 Studio read.

## What the high openings did differently (the clearest 7, with how strong each is)

### 1. The first frame is a person, or a person's body, that the rule acts on. It is never a prop on a table
- **What frame 1 shows in the highs:**
  - five faces in a mirror;
  - Ben's face offering a sandwich;
  - Ros's marked hand with her face beyond it;
  - my feet with the shadow stuck to them;
  - back-row's empty-but-occupied seats, which is a place for people.
- **What it shows in the 3 lowest:** a card in a hand, a pair of shoes, a torn page. All three are still lifes of a
  small prop.
- **Across all 20 Shorts with a number:**
  - The 7 that open on a prop close-up (card, shoes, page, 13 button, photo strip, diary, knock-back's empty floor)
    average **62.8%** (median 64.7, best 71.4). **None reached 75%.**
  - The other 13 average **75.7%** (median 77.6).
- **Strength:** the strongest split in the data, but still small-n. It is confounded with the premise: the lows'
  *premises* are about objects. The fix is the same either way: open on the person the rule is happening to.

### 2. The strange fact is about a person being doubled, split or replaced
This is a premise point, but it is what's on screen in frame 1.
- **The top 6 by stop rate are all doubles or extra people:**
  - a shadow that leaves you;
  - half of you is in someone else;
  - an extra rider on the bus;
  - a brother swapped for another version;
  - an extra face in the mirror;
  - a reflection that stays behind.
- **Others of that kind:**
  - ZERO feet (someone unseen at zero distance) is 7th at 74.2.
  - Echo (your own voice answering) is the exception, at 69.7.
- **Object rules sit at the bottom:** a card with an end time, shoes, a rulebook, a button, a diary.
- **Strength:** strong pattern, n = 22. It is a premise finding, not a camera finding.
- **On screen:** when the oddity is on a body (shadow, hand, face in glass), the very first picture carries it. When
  it's on an object, the picture is a prop.

### 3. "Odd from frame 1" is not enough on its own
- **Odd in the picture at 0 s, yet low:**
  - WARM shoes (steam);
  - Rule Three (the torn page);
  - 13 button (lit by itself);
  - Diary (ink writing itself).
- **High although the impossible image came late:** Blackout's impossible swap first shows at **6.66 s**. What it
  showed at 0 s was a *person behaving wrongly*: Ben too kind, with the crusts cut off.
- **Strength:** clear counter-examples on both sides.
- **The lesson:** a person acting strangely beats a prop being strange.

### 4. The hook's key word is spoken by 1.8 s, and it is the title's CAPS word
- **In the highs:**

  | Short | Key word spoken at |
  |---|---|
  | Blackout | NICE 0.66 s (YOURS 1.70 s) |
  | HALF | HALF 0.78 s |
  | Shadow | SHADOW 0.25 s (HAPPIEST 2.78 s) |
  | back-row | BACK ROW 1.42 s |
  | Elevator | FIVE 1.76 s |

  Each one is also the caption's big word at that moment.
- **Never spoken: the title's CAPS word**
  - Rule Three: TORN.
  - Goodbye wave: DANGEROUS.
  - Diary: ANSWERS.
  - Echo: TWICE.
  - Future Me: NOTHING.
- **The pace:** all of Buhtown speaks line 1 at about 4.3-4.7 words a second, so line 1 is done by 2.3-2.8 s.
- **Strength:** medium. The timing alone doesn't separate the groups (Card's ENDS lands at 1.94 s), but no high
  missed it.

### 5. The first cut lands on the key word and shows the second half of line 1
- **The highs:**
  - Elevator holds S01 until FIVE (1.76 s), then cuts closer.
  - Blackout punches in on YOURS (1.70 s).
  - Shadow cuts at 1.85 s to "everyone else's" shadow.
  - HALF cuts at 1.45 s to strangers whose halves bloom whole on REST (1.91 s).
- **Shot 1 lasts 1.45-2.18 s in every high.**
- **The lowest cut most:** Card/FRIENDS cut **3 times inside 2 s on the same card** (1.19, 1.62, 1.94 s) and has
  the most cuts in 0-8 s of any Short (10). Picture changes without new information didn't help.
- **Strength:** medium. Cut count alone doesn't separate the groups: the highs have 4-6 cuts, the lows 4-10.

### 6. 4-8 s: a new person under the rule loses less than backstory, layout, who's who or a list of objects
Every Short drops at 4-8 s. This shapes retention more than the stop rate, but it matters.
- **Smallest drops:**
  - Uncle −5.3 (the café man owns up and his tag drops off);
  - HALF −5.4 (strangers, a café table, two brothers);
  - Blackout −6.2 (a neighbour swaps);
  - Shadow −6.8 (strangers' shadows).
- **Biggest drops:**
  - REFLECTION −15.9 (examples, but in a dark violet night);
  - Diary −15.3 (Grandma's backstory);
  - knock-back −15.2 (the cellar layout, and a nearly black under-floor shot at Y≈28);
  - Elevator −14.5 (A-D tags: who's who);
  - WARM shoes −14.5 (a list of shoes);
  - back-row −14 (the driver's description).
- **Strength:** medium. REFLECTION is the exception.

### 7. Look: the two lowest are the two most saturated orange sunsets; a fade from black doesn't explain anything
- **The two lowest** use the warmest, most saturated grades in the set: Card (sunset peach, saturation 1.3) and WARM
  shoes (orange sky, 1.14).
- **The highs:** cool grey (Elevator), pale blue (HALF), lavender day (Shadow), blue night with a flashlight
  (Blackout), dark night (back-row).
- **A fade from black:** 4 of the 5 highs fade up from black and all 3 lowest don't. But HUMS, ep20 and ep38 also
  fade and sit at 64-69%, so I don't think it matters.
- **Strength:** weak (n = 2 for the colour).

## Our two openings: what Buhtown's data says they do wrong

The frames are real (`hook_frames/real_frames_0-8s.png`, the live assets `…5ecb120b2a78de45.mp4` and
`…d9c2fb3e13de7613.mp4`). I measured cuts and brightness on the game view (the frame cropped to the picture).

**First, the format is different.** Buhtown fills the whole 9:16 frame, with no title band. Captions are 84 px at
mid-height. Our game view is 1080 x 1011, about 53% of the frame:
- the 2-line title band sits above it;
- about 450 px of black sits below.

Every subject is drawn at half Buhtown's size before we choose a lens. Buhtown never ran a title band, so their data
can't say whether ours helps or hurts. It is the biggest untested difference.

### Gold for the Portal (live), 0-8 s
| t | On screen | Face | Odd in picture | Caption | Narration |
|---|---|---|---|---|---|
| 0 | Grandma (villager) full-figure, side-on and from behind, ~15% of the game view's width, beside the portal; a tiny ingot | side profile, small | no (throwing gold into a portal is normal Minecraft) | (none) | (silence, then "My…") |
| 0.5-1 | same, a slow push | same | no | My GRANDMA | "My grandma has thrown" |
| 2 | cut at 1.75: a close of a gold block stack beside the portal (a prop) | none | no | nine thousand GOLD | "nine thousand gold ingots" |
| 4 | cut at 4.2: the portal and gold blocks | none | no | into a PORTAL. | "into a PORTAL" (PORTAL lands at about 4.0-4.3 s) |
| 6 | cut at 5.5: first-person with the HUD, a gold ingot in hand, the cellar | none | no | And every MORNING, | "One every night. And every morning," |
| 8 | same POV | none | no ("something comes back" isn't shown until about 9 s: an obsidian block on the floor) | something comes BACK. | "something comes back" |

- **Brightness and colour:** game-view luma 97-127, then 78-86 (a dim cellar). Saturation 16-36 is low, about half
  of Light Sleeper's.
- **What it does wrong, against the data:**
  1. **Frame 1 is a transaction with a prop.** Gold goes into a portal, then a still life of gold blocks
     (finding 1). The person the story is about, Grandpa (the double: the piglin in his helmet), isn't in the
     opening at all.
  2. **The odd thing isn't in the picture by 8 s.** "Something comes back" first shows at about 9 s (finding 3).
  3. **The key word lands at about 4.3 s, not by 1.8 s.** Line 1 is 11 words at about 2.6 words a second, where
     Buhtown runs about 4.5 (finding 4). The title band says it in text from frame 1, but the ear hears the point at
     4 s.
  4. **4-8 s is first-person POV with the HUD, holding an ingot.** That is an object and no face, the
     "list/layout" kind of beat (finding 6).
  5. **Grandma's face** is never bigger than about 1/6 of the game view, which is about 1/12 of the screen.

### Light Sleeper ("My village is covered in 9,000 carpets"), 0-8 s
| t | On screen | Face | Odd in picture | Caption | Narration |
|---|---|---|---|---|---|
| 0-2 | one extreme wide of the village, every surface carpeted in stripes; one tiny figure; **static, no cut until 3.1 s** | none | yes, from frame 1 (carpet on everything) | My VILLAGE / is COVERED in / nine thousand CARPETS. | "My village is covered in nine thousand carpets" (CARPETS at about 2.5 s) |
| 4 | cut at 3.1: a carpeted road, a lone villager far off | none | yes | The road? CARPET. | "The road? Carpet." |
| 6 | cut at 5.9: the carpeted doghouse, a small dog | the dog's | yes | The DOGHOUSE? | "The doghouse?" |
| 8 | cut at 7.8: the bell boxed in wool, POV with the HUD | none | yes | Even the BELL | "Even the bell wears a sweater" |

- **Brightness and colour:** luma about 130-143, bright. Saturation about 40-58, multicolour.
- **What it does wrong:**
  1. **A 3.1 s static extreme wide.** That is the longest opening shot in all 24 openings; every Buhtown high cuts
     by 1.45-2.18 s. Nothing in it is a person.
  2. **The premise is an object rule** (carpet), the kind that sits at the bottom of Buhtown's table (finding 2). The
     person it's for, whoever the "light sleeper" is, isn't in the opening.
  3. **4-8 s is a list of carpeted objects** (road, doghouse, bell): the WARM shoes shape (−14.5 at 4-8 s).
  4. **What it does right:** the odd thing is visible and big from frame 1, and the picture is bright.

**Both openings** use the same line-1 shape ("My X has / is … 9,000 Y") and the same band form. Buhtown's own rule
caps any one opening shape at 1 in 3 uploads (`opening-variety.md`).

## Opening-shot rules for our Shorts (from the above)

1. **Frame 1 is a person or a body that the rule is acting on.** The face should be at least 1/4 of the game view's
   width, given our letterbox; in the frame-1 picture it should be a medium shot or a close-up, never a wide or a full
   figure. Never open on a prop still life, a block stack, a chest or a screen.
2. **The odd thing is in the picture on frame 1 and already moving** (thrown, falling, popping). If the rule is about
   an object, show it on or next to a person, reacting.
3. **Line 1 is at most about 2.5 s spoken. The key word is spoken by 1.8 s, and it is the title's CAPS word,** shown
   as the caption's big word on that beat. At our pace, that means at most about 7 words before the key word.
4. **Shot 1 holds until the key word (1.4-2.2 s), then the cut reveals the second half of line 1:** the count, the
   contrast, the extra one. Don't cut the same subject several times inside 2 s.
5. **2-4 s gives the personal stake with a face:** mine, me, my family, "find the extra one".
6. **4-8 s is the rule at work on a new person every 1.2-1.6 s.** No backstory, no layout, no who's who, no list of
   objects, no POV with the HUD and no near-black frame. Keep the grade cool or neutral and bright; avoid a saturated
   orange sunset in the opening.
7. **The title band:** at most 7 words, carrying the title's CAPS word. Buhtown never used a band, so whether a band
   that repeats line 1 helps is unknown. A/B it: the line-1 band against a question band on two uploads.

## 0-8 s shot plans for our 5 high-potential scripts

Times assume line 1 is re-voiced to land the key word by about 1.8 s, which means tightening each line 1 as written
below. The current lines are on `claude/script-*` and in the `claude/batch4-blocky` pitches. Each plan has its band
and the caption's big words.

### Pulled Away (`claude/script-pulled-away`, L01 now "A man is KIDNAPPING / my whole VILLAGE / One at a TIME / In a BOAT / On the GRASS", 15 words)
- **Band:** "He takes us in a BOAT. I'm #40"
- **Line 1 tightened:** "A man is KIDNAPPING my village. In a BOAT. On the GRASS." Line 2: "Today I got in myself. I'm number FORTY."

| t | On screen | Caption |
|---|---|---|
| 0-1.6 | Medium shot, low beside the boat. The kid's face (villager) at about 1/3 of the width, sitting in an oak boat already sliding across the grass. The man's arm and the taut lead at the frame's right. | A man is / KIDNAPPING |
| 1.6 (cut on VILLAGE) | Wide: the boat on the grass, the man leading, Bramble Hollow's shut doors behind. | my VILLAGE. |
| 2.4-3.4 | Ground-level close on the boat's hull scraping over the grass blocks, the kid's legs in it. | In a BOAT. / On the GRASS. |
| 3.4-5.4 | S02, tracking medium shot: the kid looking ahead. On FORTY the man glances back over his shoulder (an eased head turn): two faces. | I'm number / FORTY. |
| 5.4-6.6 | S07 flashback: Mom in the boat on the grass, the kid small in the doorway. | He took MOM |
| 6.6-8 | S07b: Uncle in the boat. Cut his "They must LOVE it there" picture from shut doors to the kid's hopeful face. | And my UNCLE. |

### The Honey Thief (`claude/script-honey-thief`, L01 now "A GIANT / has ROBBED my family / FIFTY-TWO times. / And he plants us FLOWERS.")
- **Band:** "He robbed us 52 times. Then FLOWERS?"
- **Line 1 tightened:** "A GIANT robbed my family FIFTY-TWO times. Then planted us FLOWERS."

| t | On screen | Caption |
|---|---|---|
| 0-1.8 | Bee POV, a medium close on the giant's face and bottle at the dripping hive. His face is at least 1/4 of the width, the honey drip moving on frame 1. Not a wide at 4 blocks (35% of the height is too small inside our letterbox). | A GIANT / ROBBED my family |
| 1.8 (cut on FIFTY-TWO) | A fast pull-back over his shoulder: the hive tiny, the flower field running to the horizon behind him. That is 52 rows, the picture of the count. | FIFTY-TWO times. |
| 2.6-3.4 | The giant crouched placing one more flower, his face turned toward us. | planted us / FLOWERS. |
| 3.4-5.2 | S02: close on the bee sisters' faces drifting sleepy in the smoke (faces, not the campfire). | SMOKE. / SLEEPY. |
| 5.2-6.2 | S03 CLINK: the bottle fills. Keep it at 0.8 s or less, since it's a prop. | CLINK. / honey GONE. |
| 6.2-8 | S03/S04: the giant placing the row fast, then a close on his face on "he feels BAD". | one ROW / he feels BAD. |

### Saving Up for a Bastion (`claude/script-saving-up-bastion`, L01 "I'm a BABY, / and I'm the RICHEST / pig in the NETHER.")
- **Band:** "Gold keeps falling on this BABY"
- **Line 1:** keep it; it's 11 words with RICHEST early. Start the voice at 0.2 s.

| t | On screen | Caption |
|---|---|---|
| 0-1.4 | Close on the baby piglin behind the cell glass. Its face is at least 1/3 of the width (not 35% of the height). An ingot is already falling into frame on frame 1 and bounces off its head. | I'm a BABY, |
| 1.4 (cut on RICHEST) | Pull out and reveal the farm the baby can't read: the dropper overhead, glass walls, hoppers under the floor, a pile of barters. This is what the viewer sees and the baby doesn't. | the RICHEST / pig in the NETHER. |
| 2.6-4.2 | S02: adult piglins' faces turning up to the window on STARE (faces). | The grown-ups / STARE at me. |
| 4.2-5.0 | The baby's smug face, hugging its ingot. | They're just / JEALOUS. |
| 5.0-6.6 | The baby beside its gold pile in the cell, with the bastion visible through the glass (person plus object, not the empty EWS over the lava lake). | Four HUNDRED gold. / my own BASTION |
| 6.6-8 | S04: the player tossing one ingot by the hole, adults and the baby racing for it. Bodies in motion. | A guy up there / threw the first one. |

### The Statue Gets Younger (batch4 A, line 1 per the critic)
- **Band:** "Our statue is getting YOUNGER"
- **Line 1 tightened:** "Nobody in my village gets OLD. Except the statue. And it's getting YOUNGER." Line 2: "One wrinkle a day."

| t | On screen | Caption |
|---|---|---|
| 0-1.5 | Close on the giant stone face, a villager at its chin for scale. On frame 1 a wrinkle line of blocks is already popping off (motion, the odd thing). | Nobody here / gets OLD. |
| 1.5 (cut on OLD) | Wide on the hamlet: smooth young faces everywhere and one grey head, Dad's (a player actor with a grey skin), in the middle of them. | Except / the STATUE. |
| 2.4-3.4 | Back on the stone face, closer. A wrinkle vanishes on YOUNGER. | getting / YOUNGER. |
| 3.4-4.4 | A time-cut of three mornings on the same face, one wrinkle less each time. | One wrinkle / a DAY. |
| 4.4-6.0 | The rule at work on a person: a villager on her birthday touches the statue, and a year (a wrinkle) leaves her face for the stone. | (line 3) |
| 6.0-8 | Mom slipping out before sunrise, her face in profile in the blue dawn. Keep it lit, never near black. | Mom slips out / before SUNRISE. |

### Sorry, Dear (batch4 H)
- **Band:** "Every SORRY shrinks you an inch"
- **Line 1 tightened:** "My aunt is the size of a MUG." Line 2: "Here, every SORRY shrinks you an inch."

| t | On screen | Caption |
|---|---|---|
| 0-1.3 | Eye-level close across the table. The aunt at 0.3 scale stands beside a mug of the same height, her face at least 1/4 of the width, grinning, cards in her tiny hand. | My aunt is / the size of a |
| 1.3 (cut on MUG) | Two-shot: the kid's big face looming over her and the mug. Scale is the joke. | MUG. |
| 1.9-3.4 | The rule at work on a stranger: a villager in the lane bumps someone, says sorry, and pops an inch shorter on SORRY. | every SORRY / shrinks you an INCH. |
| 3.4-5.0 | The aunt waving to neighbours from the windowsill, "sorry, sorry", shrinking twice. | the politest lady / ALIVE. |
| 5.0-6.6 | The aunt standing beside a teacup that is just taller than her (the stakes). | one more inch: / a TEACUP. |
| 6.6-8 | The card game set up: an emerald pile for the score, not readable cards (the critic's fix), and her smile on "Oh, sorry, dear". | Oh, SORRY, / DEAR. |

## What to measure next
- **Pull the Buhtown films and check them against this.** With API access to evanlin23/blocky-stories' `film-*`
  artifacts, measure each first frame for face area, subject size and luma, and rerun their `measure.py`. 21 of the
  22 here are reconstructed.
- **Get our own stop rates.** Gold for the Portal is live: its stop rate is the first test of rules 1-6 on our
  format. Read it in Studio's Advanced mode (viewed vs swiped), next to the letterboxed frame.
- **A/B the title band** (rule 7) on two uploads before making it a rule.
