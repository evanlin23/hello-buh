# Story Shorts: narrated, ridiculous first-person Minecraft stories

The owner (2026-11-06): "can we try to ridiculous stories? like the roblox stories (blocky-stories) but with
minecraft instead?" A story Short is a 40-75 s first-person story, told by a fast narrator with big word-chunk
captions, over scenes the bot acts out on the real server. The renderer is POV only, so the narrator is the
camera, and that is the format's best trick: the viewer never sees who "I" am (pilot: `runaway`, where the
narrator turns out to be the creeper).

## Make one
```bash
# 1. the script: stories/<name>/story.json (lines, chunks, key words), see the pilot
# 2. the narration (Kokoro TTS venv, CPU only, set up once per container: see Setup)
~/.hb-tts/bin/python scripts/voice.py stories/<name>        # -> stories/<name>/voice/<id>.wav + voice.json
# 3. the scenes: stunts/story_<name>.js, one scene per line (copy stunts/story_runaway.js)
STUNT=story_<name> ./run.sh                                  # -> out/story_<name>.mp4
# 4. QA (docs/qa.md) as for every Short, then
node scripts/publish.js story_<name> --pass
```
Re-run `voice.py` after any script change (`--only L03,L07` redoes single lines), then re-run the stunt: the scene
lengths come from voice.json, so a new voice means a new recording.

## Setup (once per container)
```bash
apt-get install -y espeak-ng                     # Kokoro's phonemizer for unknown words
python3.11 -m venv ~/.hb-tts
~/.hb-tts/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu torch kokoro soundfile numpy
```
CPU torch only (no CUDA download). The first run fetches the Kokoro-82M weights (Apache 2.0) and spaCy's small
English model. A 17-line story synthesizes in about 30 s on 4 CPUs.

## How it fits together
| piece | file | what |
|---|---|---|
| script | `stories/<name>/story.json` | `lines`: `{"id": "L03", "text": "I tell / the farmer / his wheat / looks GREAT."}`. ` / ` splits caption chunks (2-3 words), CAPS words are key words (drawn in `key_color`, read lower-case so Kokoro doesn't spell them). `gap`: seconds of air after each line. |
| narrator | `scripts/voice.py` | Kokoro `am_adam`, tempo 1.03, sped up 1.45x (pitch up with it): the blocky-stories narrator, ~290 wpm. Writes each line's wav and `voice.json` (each line's `dur`, and every chunk's start/end from Kokoro's word timestamps). |
| kit | `lib/story.js` | `storyLines(dir)`: `line(id).dur`, `line(id).at(k)` (tick where chunk k starts), `gap`. `storyKit(ctx, S, {X, Z, F})`: `cut(dx, dz, target)` (a teleport that arrives already aimed), `line(id, scene, extra)`, `look(k)` (aim + sway, zero on a cut's first tick), `turnTo`, `flee(tag, speed)`, `aim`, `P`. Set helpers: `clearSet(ctx, A, 64)` (a wide flat clearing), `plainsBiome(ctx, A)` + `resendChunks(ctx, X, Z)` (one grass colour; mineflayer needs the chunks again), `house(...)` (a real lit room). |
| scenes | `stunts/story_<name>.js` | sets every scene up front in `setup` (all mobs NoAI, tagged per scene), then for each line: a cut (teleport), `ctx.mark('line', { id })`, and a per-tick scene function for exactly `dur + gap` seconds. Actions land on a chunk with `at(k)` ("They SLAM" closes the door on that word). |
| edit | `edit.py --story stories/<name>` (from `edit.story`) | lays each line's wav on its `line` mark (snapped to the camera cut), draws the captions (`scripts/story_track.py`), and mixes: voice -15 LUFS, game -27, song bed -31, master corrected to -14 LUFS. Optional: a rule meter (story.json `"meter": {"label": "VILLAGERS"}` + `ctx.mark('meter', { value })`), white flashes (`ctx.mark('flash')`). |
| stunt options | top level of the stunt module | `hideHand: true` (no first-person hand: a narrator who isn't Steve), `time`, `weather` ('rain'/'thunder'), `brightness`; mid-stunt `ctx.setTime(n)`, `ctx.setWeather(w)`. Set `/gamerule log_admin_commands false` for per-tick `execute as` moves. |
| song | `scripts/add_song.py` (via publish.js) | for a story stunt the NCS track is a quiet bed under the voice (-31 LUFS), not the -13 lead the stunt Shorts use. |

Captions: Schibsted Grotesk Black (OFL, `assets/fonts/`) at 96 px, white with a dark outline and a soft shadow,
key words in the story's colour, centred at 70% of the game view's height (under the crosshair, above the
hearts), each chunk popping in on its own first word. The top band keeps the channel's caption (the hook).

## House rules (from blocky-stories RULES.md, the ones that transfer)
- **The first line is a concrete mystery or threat to me, with something countable** ("All FOURTEEN villagers
  in my village RUN when they see ME."), over the picture it describes, in the first second.
- **The twist turns the whole story over,** planted at least twice where a rewatch catches it, and said plainly
  in one short line, or shown by the game itself. Owner, 2026-11-07, on runaway: "the big reveal ... just boom,
  ending ... don't say I'm the creeper, it's just the explosion." So the creeper twist ends on the blast and the
  death message "blown up by Creeper" (held ~1.3 s to read, the world pushing in behind it), no spoken reveal after it. The POV
  camera is the twist machine: who "I" am is never shown.
- **The last line loops into the first:** as one sentence, or as cause and effect (runaway now ends "...when I'm
  HAPPY?" [BOOM] -> "All FOURTEEN villagers RUN when they see ME").
- **Something new on screen every 1-2 s, nothing still over 1 s.** One scene per line, a cut on almost every
  line, and inside each scene the camera sways, walks or turns and the cast moves on the line's key word.
- **One quotable line** that's short enough to type ("Even the CHICKENS pack up and LEAVE.").
- **Write like a person:** short sentences, no em dashes or semicolons, US English, no AI words. Fiction,
  never "true story". Nothing aimed at kids in the title or description.
- **Captions 2-3 words, key words in CAPS and colour,** never more than two lines.
- **Leave 0.2-0.3 s between the last word and the end** so the loop cut lands clean.

## Staging lessons (pilot)
- Every scene is built and cast in `setup` and the per-line code only moves things, so a cut costs 1-3 ticks.
  Cast mobs are `NoAI:1b,Silent:1b,Invulnerable:1b` and moved by `/tp` every tick (ops aren't chat-limited).
- Run away from the camera: `execute as @e[tag=T] at @s facing entity <bot> feet rotated ~180 0 positioned ^ ^ ^SPEED
  run tp @s ~ <y> ~ facing ^ ^ ^5`. The recorded yaw follows, because the mob moves every tick.
- Entity moves reach the client a few ticks late: start a scene's motion ~10 ticks before the line's mark if it
  has to be moving on the first frame.
- **mineflayer doesn't move passengers:** a villager riding a boat stays where it mounted in the recording.
  Teleport the boat and the "passenger" side by side instead.
- `face_on` windows are sequential (one open at a time): `face_off` before the next `face_on`.
- A summoned TNT with `fuse:0s` at the camera gives "HelloBuh blew up" on the death screen (a creeper would
  say "was blown up by Creeper"). Set `/difficulty normal` before summoning a creeper, or it's refused.
- No block entities render (beds, bells, chests, signs): build sets without them.
- Cuts carry their aim in the `/tp` (`storyKit.cut` does it); never look before the teleport lands.
- Pre-roll motion that must start on a word (mobs idle for a while update ~1 s late), keep the camera out of
  crowds, and set `/gamerule log_admin_commands false` for per-tick `execute as` moves.
- Captions switch on the cut. A death screen needs something moving behind it.
- Chickens render broken and boats draw ~1.1 blocks high (both reported); see docs/lessons.md "Story Shorts".
- Move cast between scenes with a >64-block hop (`put`): shorter teleports glide on camera like the vanilla client.
- After a death, the next shot can be the respawn itself: `/spawnpoint` there with yaw and pitch before the death.
- Don't put a death on a teleport's landing tick; carry aims as numbers on every `/tp`.
- `punch` nth counts from 0. A push-in on the payoff word keeps a death-screen ending moving.

## Premise bank: mysteries (owner 2026-11-06: "I think we should focus a lot of mysteries")
Each one: **a mystery stated plainly in line 1, clues that build, a twist that makes every clue click, a sting, and
a last line that loops into line 1.** Original premises only. Never remake the owner's examples (the coma town, the
repeating birthday, the mirror showing tomorrow). No coma or dream twist, no door to the past.
**Claiming:** put your worker number in the status (`building: worker 8`) and push before you start. One premise,
one worker. When it ships, mark it `made` with the Short's name.

| # | premise | hook (line 1) | clues | twist | sting / loop | status |
|---|---|---|---|---|---|---|
| 1 | **Respawn Tax** | "Every time I respawn, one villager in my village disappears." | a VILLAGERS meter counting down; empty doorways; the librarian keeps giving me bread "just in case"; the iron golem always stands on my spawn | they volunteer: a respawn costs one life, and the village has paid for mine since I was born; the golem keeps the line | the last one left is the librarian who raised me, already on my spawn; I die again; "go on. Respawn." loops into line 1 | building: worker 5 (`respawn_tax`) |
| 2 | **The First Player in 3,000 Years** | "The farmer has harvested the same wheat for 3,000 years. Today he dropped his hoe and cried when he saw me." | villagers frozen mid-step until I get close; cobwebs in every house; a road that ends in fog | a world only runs while a player is in it; nobody has loaded this one since its maker left, and the village has been stuck in one tick | I have to log off; they freeze mid-wave, waiting again | next: worker 5 |
| 3 | **The Sheep That Stares** | "My sheep has stared at the same dirt block for 412 days." | the block won't break; villagers call me "the new one"; torches I never placed | that block is where the last player died; I'm his respawn after the world forgot him, and the sheep was his | I dig: his things, my name on them | open |
| 4 | **The Chunk Next Door** | "Every night the chunk next to my house unloads, and something walks out of the fog." | footsteps at render distance; my trades get done for me; the golem lets it pass | it's my best friend who quit two years ago; players who stop logging in wait at the edge of render distance | I log out: now I'm the one in the fog | open |
| 5 | **Every Block I Place** | "Every block I place, a villager forgets one thing." | a ridiculous castle going up; villagers forgetting jobs, names, the way home | the last block makes my mom forget me | I start breaking the castle one block at a time | open |
| 6 | **The Torch I Didn't Place** | "There's a torch on the hill behind my house. I don't remember placing it." | under it, another torch; under that, another; 40 of them in a column going down | each one is mine: every time I die I forget, and every time I dig here something at the bottom kills me, so I leave a torch | I place the 41st torch... and start digging | open |
| 7 | **One More Eye** | "Every morning, the end portal in my basement has one more eye in it." | 11 of 12 eyes; ender pearls on my doorstep; scratches on the frame from the inside | my brother jumped in years ago and has been filling it from the other side to come home | the 12th eye is in tonight, and what climbs out isn't him | open |
| 8 | **More Golems Every Morning** | "Every morning there's one more iron golem in my village. Nobody builds them." | villagers won't look at me; doors barred at sunset; a golem waiting outside my door | golems spawn when villagers are scared: at night I'm a zombie, and I don't remember | tonight there are twenty of them at my door | building: `more_golems` |
| 9 | **One Block Higher** | "Every time I sleep, I wake up one block higher." | a dirt pillar under my bed; muddy villager footprints; the sea looks closer every day | the sea is rising; every night the villagers lift me above it, one block at a time, while they stay below | I look down for the first time | open |
| 10 | **The Sun Won't Set** | "The sun hasn't set in my world for 300 days." | villagers yawning; a bed nobody sleeps in; my grandpa asks every day if tonight's the night | I froze the time (`advance_time false`) because zombies come at night and grandpa is too slow to run | grandpa asks me to let the night come | open |
| 11 | **The Nitwit Knows** | "The nitwit in my village has said 'hmm' 4,096 times. Today he said my name." | he always stands where something bad is about to happen; the other villagers avoid him | he's a villager from a world that already ended, sent back to warn this one, and "hmm" is all the game lets him say | he says the date of the end, and it's today | open |
| 12 | **Last Seen** | "My friend's armor stand has stood at the village gate for 900 days. Today it turned around." | his armor gets one more scratch a day; a bed still warm; the golem salutes it | (armor stands don't render yet: needs an engine model) | | parked: engine |

## Format: "Who do you trust?" (interactive mystery). Owner, 2026-11-06
Owner, describing a Short he liked: someone turns 13 and gets a call from themselves 10 years in
the future. Others' calls saved them. His call says "don't go to the basement", Mom smiles, but
they've never had a basement. He locks himself in, and a second call says the opposite. "you pose
the question for the user to figure out, and ask them who to trust. I think this sort of
interactive is good. And the clues are in all different directions so its ambigous."

We build **original** stories in this structure. Don't retell the one he watched.

**Beats (30-50 s, narrated, with clues on screen):**
1. **The rule, line 1, in under 2 s.** A strange law of this world, stated plainly ("Every player
   gets one sign from their future self on their first night.").
2. **Proof the rule is real: 2-3 bursts of about 3 s each.** Other people's messages came true
   and saved them. This builds trust in the rule, so the betrayal lands.
3. **Our message.** It warns us, and one detail contradicts reality (the creepy hook: "we never had
   a basement"). Someone close reacts wrong (Mom smiles).
4. **We hide.** Tension, a locked room, a sound outside.
5. **A second message, also "from us", saying the opposite** and giving a reason to doubt the
   first.
6. **The question card:** "WHO DO YOU TRUST? 1 = the first message, 2 = the second. Comment." End
   on the card, under 1 s after the question (the question is the payoff).

**The clue rule:** plant at least 2 clues for each side, each visible on screen. The best clue
supports both readings (e.g. the second message knows something only we know: proof it's us, or
proof something has been watching us). Write down the intended answer and why in the stunt file,
in case a part 2 answers it. The Short itself never answers.
**Part 2** (optional, later): "you voted 2..." resolves it and loops back to line 1.
**Retention tools:** worker 10's `cards` for the question card, `dip` + `scratch` SFX on the
contradiction, `counter` not needed, `hook` can flash the question card at the start.

**Original premises (Minecraft-native):**
- **The Sign by the Bed.** *(worker 8, building as `sign_by_bed`: a barrel instead of the chest)* Every player finds a sign from their future self on their first night.
  Proof: Steve's said "don't dig down" (lava under him); Alex's said "pet the wolf" (it saved her).
  Ours: "DON'T OPEN THE CHEST UNDER YOUR BED." We never placed a chest. Our villager mom watches
  from the doorway, not blinking. We lock the door. A new sign appears INSIDE the locked room, in
  our handwriting: "OPEN IT. THAT ISN'T MOM. SHE'S IN THE CHEST." Clues for 1: sign 2 appeared
  through a locked door (who can do that?), and it misspells our name. Clues for 2: sign 1 is placed
  where only mom could reach, and mom's shadow is wrong / she never blinks. Ask: which sign do you
  trust?
- **The Respawn Voice.** On your first death you hear one sentence from your future self. Proof:
  two players whose sentence saved them. Ours: "Don't sleep in the new bed." Dad just built us a
  new bed. That night a second voice (also us, but we're alive): "Sleep in the bed, or you'll
  respawn somewhere that isn't home." Clues both ways: the bed's respawn point (vanilla mechanics!),
  dad nailing the door shut "for safety", the first voice sounding older than 10 years.
- **Two Ender Pearls.** On your 13th birthday an ender pearl lands at your feet with a note from
  future you. Proof bursts. Ours: "Don't follow the enderman home." There are no endermen in our
  village... until tonight, when one stands at the window holding our house's door. A second pearl
  lands inside the house: "Follow him. He's the only one who remembers you." Clues both ways.

## Format: "The rule that erases you" (twist ending). Owner, 2026-11-07

The owner's reference (someone else's story, so never retold, only its shape): a town where a rumor
comes true once 500 of its 900 people believe it. The rule is shown with fun examples (a monster, a
twin), then a rumor says the hero is dead. He fails several times, then wins with a loophole: he
makes everyone believe "rumors don't come true anymore", and every rumor reverses. But he keeps
fading. His grandma, there from the start, admits that years ago she told everyone she had a good
grandson. He was a rumor too.

The shape, beat by beat (30-45 s narrated, like story_runaway):
1. **The rule, plainly and countably** in the first 3 s ("500 of 900 believe it, it's true"). Numbers make it real.
2. **Proof**: 2-3 quick, fun examples that teach the rule and plant things that come back later.
   The person who delivers the twist is introduced here, as background (grandma watering flowers).
3. **The rule turns on the hero**: the fun rule is now the threat.
4. **Escalating attempts that fail**, each one teaching one more thing about the rule.
5. **The clever loophole that wins**: the rule is used to kill the rule. Payoff montage: the
   earlier examples reverse (the monster gone, the twin gone).
6. **The twist that turns the win into the loss**: the fix itself dooms him, through the clue planted
   in beat 2. End on the reveal line, no explanation after it (the owner's "end as soon as the payoff comes").

What makes it work: the twist follows from the rule the viewer already learned, and the clue was on
screen from the start ("it was there the whole time" = rewatches). Check every draft against that:
if the twist needs new information, it's the wrong twist.

Original premises in this shape (ours; never retell the reference):
- **"Every sign is law."** On this server, anything written on a sign comes true once three players
  read it: diamonds rain, sheep turn gold. Someone writes "HelloBuh was banned" and he loses his
  permissions block by block (can't break, can't place, can't open doors). He wins with a sign: "signs
  do nothing". Twist: his best friend on the server (shown building with him in beat 2) was a sign
  someone wrote years ago, and now he's fading too.
- **"Respawn has a price."** Each respawn costs one memory, written in the village ledger. He dies
  again and again saving the village, then burns the ledger so nobody pays again. Twist: the ledger
  was the only record he ever lived there, and the librarian (stamping its pages in beat 2) doesn't
  know him anymore.
- **"The villager who trades in truths."** Whatever you trade this villager becomes true: a creeper
  attack traded away, the rain traded away. Someone trades "HelloBuh never existed". He wins by trading
  away the villager's power. Twist: he was the first thing the villager ever traded into being (the
  "first trade" sign on the stall in beat 2).

Staging notes: the rule needs a visible count (a sign or scoreboard "beliefs: 512/900", or a
ledger), so the viewer can track it without narration. Fading = a staged vanilla effect we can render:
invisibility-potion particles around a vanishing player (only what the engine draws: check with worker 11
before scripting a "fade"). The montage of reversals is cuts between the beat-2 locations.
