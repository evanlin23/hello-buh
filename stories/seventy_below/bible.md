# seventy_below: continuity bible (r3, 2026-11-11; lines and shots renumbered L01-L16 / S01-S16)

## World
- **Place:** Ravenford (docs/world/map.json `ravenford`): Grandpa's house and yard just inside the east gate (stamp
  `grandpa_house`: house x -2059..-2049, z -502..-494, floor y 72, door south at x -2054; yard south of it to the fence
  at z -487). New, story-made (map.json stamps `seventy_room`, `seventy_hole`, `grandpa_bed`, since day 2000):
  **the room** under the house and yard, **the hole** in the yard, **the bed** in the house.
- **Day:** 2200. The room was finished about day 2000 ("two hundred nights"). Thirty-One Raids (1900) is before it, so
  that Short's tower hunts are unaffected. Red Sheep (2300) comes after: its Ravenford nights show no monsters, which
  this story explains (never said).
- **Who:** the general is Grandpa (Ravenford), `zuri` skin, his canon voice `elder` (Charon). Never named, never called
  Grandpa (conflict 11), never shown above the waist except as a dark head in the 1x1 hole against the sky. Buh is not
  shown; nobody says his name; who else sleeps in the house is not said.
- **Gary** (Stillwater's farmer) is not used; no zombie is named.

## The mechanic (vanilla Java 1.21, exactly)
Sources: [Mob spawning#Java Edition mob cap](https://minecraft.wiki/w/Mob_spawning#Java_Edition_mob_cap),
[Mob spawning#History](https://minecraft.wiki/w/Mob_spawning#History) (per-player caps, 1.18 / 21w38a),
[Mob spawning#Despawning](https://minecraft.wiki/w/Mob_spawning#Despawning), [Bed#Sleeping](https://minecraft.wiki/w/Bed),
[Zombie](https://minecraft.wiki/w/Zombie) (sunlight, drops, item pick-up), [Name Tag](https://minecraft.wiki/w/Name_Tag).
Code names for the checker: `NaturalSpawner.createState` / `LocalMobCapCalculator` / `Mob.checkDespawn` /
`Player.startSleepInBed` / `Monster.isPreventingPlayerRest`. Critic r2 checked items 1-6 as correct.

1. **The cap.** The monster category's cap is **70**. Since 1.18 it's also counted per player: a monster that counts
   is added to the count of every player within 128 blocks of its chunk, and a chunk may spawn monsters only if some
   player near it is under 70 (plus the global cap, 70 x spawnable chunks / 289, which a lone player also fills at 70).
   With seventy counted zombies under his house, Grandpa's count is 70, so no natural monster spawns in any chunk
   within 128 blocks of him. Any other player in Ravenford (the shepherd family) is within 128 blocks of the room
   too, so their counts are full as well: the whole village is covered.
2. **Why un-named.** A persistent mob (`PersistenceRequired`: name-tagged, or one that has picked up an item) does
   **not** count toward the cap. So the seventy have no name tags (the pitch's twist had it backwards) and nothing to
   pick up: empty hands, no armour, nothing on the floor.
3. **How they stay counted (and stay).** Un-named mobs despawn at random once no player has been within 32 blocks for
   30 s (1/800 per tick), and at once beyond 128. Within 32 blocks of a player they never despawn. Every cell of the
   room is under 17 blocks from the bed ((-2058, 73, -500) to the far corner (-2050, 65, -489): 15.9), so while he's
   home, asleep or in his yard, they stay. That's why "he never goes far" (L04). (From day ~2000 he no longer hunts at
   the tower; canon note.)
4. **Why 8 below the bed.** A player can't sleep with any monster (every hostile, zombies included) inside a box 8
   blocks out and 5 up/down from the bed ("You may not rest now; there are monsters nearby"). The bed is at y 73; the
   room floor is y 64, so a zombie's feet are at y 65 and its head top at y 66.95, under the box's bottom (y 68). He
   sleeps right above them.
5. **No spawns inside the room.** Monsters never spawn within 24 blocks of a player; every cell of the room is within
   24 of the bed and the yard, so when the count dropped to 69 new monsters spawned out in the dark, not in the room.
6. **The burn.** A zombie burns when, in daylight, the block at its eyes sees the sky. The lid is a full grass block
   (opaque; a trapdoor would let sky light down and burn one every day). On the sleepy night (L08, S08) he goes
   straight to bed and doesn't open the hole; sleeping skips the night, so he counts in the morning (L09): the shaft
   (x -2057, z -492, air y 68..71 once the lid is broken: 4 deep) is open to the sky. A zombie that sees the player
   through it walks toward him into the cell under the shaft (-2057, 65, -492) and burns. It stays under him, looking
   up, until it dies: about 20 s (fire 1 damage a second, 20 health); S11 skips that with a hard time cut on 'Then'.
   A burnt zombie drops 0-2 rotten flesh, and a zombie that picks one up turns persistent and stops counting: the
   shown roll is the zero-drop one (record S11 with doMobLoot off). Difficulty Normal (on Hard a burning zombie can
   call reinforcements). Visible cause (STANDARDS 4b): S08, he goes to bed without counting.
7. **The spider.** At 69 the cap is open: a spawn attempt can bring a pack (up to 4), most of them out of sight. The
   story claims only that the narrator heard one spider on his wall, the first ever. Spiders hunt players at night
   and climb walls; it climbs toward his lit window. While it's within 8 blocks of the bed he can't sleep (S13: he's
   awake). It wanders off by day and despawns, or the village golem gets it (never said).
8. **The new one.** The next night, after the spider is gone, one of the night's spawns (a pack of up to 4) is a zombie
   and follows him (zombies chase players within 35 blocks); the others despawn or wander. Zombies path around a drop, so at the hole he hits it once (knockback) and it tips
   in: 7 blocks (feet y 72 to 65), 4 damage, it lives. Seventy again.
9. **Not stopped by the cap (never said, theory bonus):** raids, pillager patrols, phantoms (he sleeps anyway), zombie
   sieges, and spawners. So Thirty-One Raids' raids could still come.

## Scenes and time
| scene | lines | time | light |
|---|---|---|---|
| A. tonight's count | L01, L02, L05, L06, L07, L16 (13200); L03 bedtime after it (13500) | per shot | the room is dark; moonlight down the shaft is the only light |
| B. the bench | L04 | 6000 | midday sun in the yard |
| C. the sleepy night | L08 | 12800 | lanterns indoors, dusk in the window; he sleeps, the night skips |
| D. the morning of the burn | L09-L12 | 1000 | a hard square of daylight under the shaft, the rest of the room black |
| E. the nights after | L13 (14000, awake), L14 (13600), L15 (13000) | per shot | the door lantern, the lit windows; S15 the village and the pasture under the moon |

Time runs forward except scene A, which is tonight (the frame story): L01-L07 and L16 are tonight, L08-L15 the memory
of the last few days. Every count happens before bed (sleep skips the night).

## Places
| place | where (world coordinates; x east, z south) | establishing shot |
|---|---|---|
| the room | air x -2058..-2050, y 65..67, z -501..-489 (9 x 13); stone floor y 64; ceiling y 68 (the house's cobblestone foundation under the house, stone under the yard) | S01 (MS widening to WS), S07 (WS, the whole length) |
| the hole | 1x1 shaft x -2057, z -492, air y 68..70, lid = the yard's grass block at y 71 | S05 |
| Grandpa's bedroom | inside the house, the bed head north at (-2058, 73, -500) against the bookshelf column | S03 (WS) |
| the yard | x -2062..-2048, z -493..-487: the bench (spruce stairs) by the door, grindstone (-2050, -490), barrel (-2048, -492), lantern post (-2059, -488), the west fence | S04, S13, S14 |
| Ravenford at night | the pasture, the generated house's roof, the road, Grandpa's south wall, the palisade | S15 (EWS) |

## Cast and costume
| who | look | where | voice |
|---|---|---|---|
| the narrator | a baby zombie, vanilla, un-named, no tag, empty hands | the room, front row under the hole | `narrator` (Leda, Pip's recipe, plain_say, one take) |
| the general | Grandpa (Ravenford): player, `zuri` skin, the slow walk; waist down, or a dark head in the hole; his crossbow in hand (S04); name tag off (`stunt.nameTags` is opt-in) | his house, yard, the hole | `elder` (Charon), gemini-3.8-flash-tts |
| the seventy | 69 adult zombies + the baby; no armour, no items, no name tags | the room | silent (vanilla groans) |
| Brother Seventy | an adult zombie, no helmet | the cell under the hole (S10-S11) | silent |
| the spider | vanilla spider | his south wall, S13 only | vanilla |
| the new one | an adult zombie | the yard, then the hole (S14) | vanilla groan |

**Count:** 70 (69 adults + baby) up to S11. S10-S11: Brother Seventy is one of the 69 adults. After S11: 69. After S14:
70. S01, S07 and S16 show seventy.

## Props
| prop | state | shots |
|---|---|---|
| the lid (grass block, (-2057, 71, -492)) | shut S04, S08, S13, S15; open S05, S06, S09-S12, S14, S16; put back at the end of S12 and S16 | |
| the bed | red bed, head north at (-2058, 73, -500), foot (-2058, 73, -499) | S03, S08 |
| his crossbow | in his hand across his knees on the bench | S04 |
| the blue flock | lying down in the pasture | S15 (the easter egg) |
| windows | lit at night (the house's glowstone ceiling, the lanterns) | S13, S15 |

## Positions and screen direction
- The room's long axis runs north (under the house) to south (under the yard); the hole is near its south-west end at
  (-2057, -492), with three rows of the room south of it. Room cameras sit south-east of the hole looking north-west
  into the crowd's faces (S01, S09, S10, S11), at the north end looking south down the length (S07), or nearly
  straight up the shaft (S05, S16; S06 and S12 inside it). The general is always above: up-frame in room shots.
- Yard shots look north at the house (S04 north-east, S13, S15) or east across the hole (S14). The general enters S14
  from frame right; the zombie follows him from frame right.

## Who knows what
- **The narrator:** believes they're an army, the general loves them, the world is full of them, the spider came for
  Brother Seventy, monsters fear them. Never afraid, never knowing (STANDARDS 0a). Doesn't know what the sun does.
  Underground, it only HEARS the wall (L13, L15).
- **The general:** knows exactly what they're for. Says only numbers.
- **The viewer:** told nothing; gets it from 69 -> the first spider ever, 70 -> nothing.

## Numbers the picture must match
- 70 zombies in the room in S01, S07 and S16 (count them on the stills; the baby is one); 69 after S11 until S14.
- 3 numbers in L06; 69 in L12; 70 in L16. "two hundred nights" (L01): a canon fact (built ~day 2000).
- One spider (S13). One new zombie (S14). The drop is 7 blocks; the shaft is 4 deep once open.

## The narrator
A baby zombie, the house narrator voice (Pip), bright and proud the whole way, a soldier who loves its general. The
burn is "glowy" and "gone": a puzzle, not a grief. It never says "zombie", "spawn" or "cap". Eerie comes from the
picture and the old man's quiet numbers, not from the kid.

## Voices
- Narrator: `narrator` (Leda, gemini-3.8-flash-lite-tts), Pip's recipe verbatim, one request (rN).
- The general: Grandpa's canon `elder` (Charon, gemini-3.8-flash-tts), his own request (rG), one bracket:
  "[An old man in his seventies, counting quietly to himself, slow and low]" (13 words). (cast.json's `elder` profile
  is longer: the brief's one-clause rule wins; same text in all three lines.)
- No new speaking character, so no audition is needed. If the owner would rather the general NOT be Grandpa's voice
  (an unknown old man), two candidates no character uses (voices/cast.json, canon.md, every script-* branch):
  **Enceladus** (the only male Gemini voice no one uses or auditions) and **Algieba** (unused, but on Pulled Away's
  audition list: whichever that story doesn't take), each with the same bracket, auditioned against Pip. Schedar is
  taken.

## Changes from the pitch (round-3 must-fixes and why)
- Line 1: "SEVENTY of us stand in one dark ROOM, and not one of us has MOVED in 500 nights." became "SEVENTY of us
  stand in the DARK. We've been WAITING two hundred NIGHTS." Zombies shuffle even packed in, so "not one has moved"
  is false on screen; 500 nights would put the room at day 1700, before Thirty-One Raids (1900), whose Grandpa hunts
  at the tower 60 blocks away, which would despawn the room.
- The zombies are un-named (persistent mobs don't count). The room is within 32 blocks of the bed and 8 below it.
- The lid is a grass block, not a trapdoor (sky light passes a trapdoor: one would burn every morning).
- The burn is kept (the critic's key clue; the brief allows it), shown as vanilla: the fire overlay, then after a time
  cut the empty light and the last smoke; no drops, no gore. The spider is never killed on screen.
- "Gary" is not used.
