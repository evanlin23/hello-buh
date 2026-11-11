# seventy_below: continuity bible (r2, 2026-11-11)

## World
- **Place:** Ravenford (docs/world/map.json `ravenford`): Grandpa's house and yard just inside the east gate (stamp
  `grandpa_house`: house x -2059..-2049, z -502..-494, floor y 72, door south at x -2054; yard south of it to the fence
  at z -487). New, story-made: **the room** under the house and yard, **the hole** in the yard, **the bed** in the house.
- **Day:** 2200. The room was finished about day 2000 ("two hundred nights"). Thirty-One Raids (1900) is before it, so
  that Short's tower hunts are unaffected. Red Sheep (2300) comes after: its Ravenford nights show no monsters, which
  this story explains (never said).
- **Who:** the general is Grandpa (Ravenford), `zuri` skin, his canon voice `elder` (Charon). Never named, never called
  Grandpa (conflict 11), never shown above the knees except as a dark head in the 1x1 hole against the sky. Buh is not
  shown; nobody says his name; who else sleeps in the house is not said.
- **Gary** (Stillwater's farmer) is not used; no zombie is named.

## The mechanic (vanilla Java 1.21, exactly)
Sources: [Mob spawning#Java Edition mob cap](https://minecraft.wiki/w/Mob_spawning#Java_Edition_mob_cap),
[Mob spawning#History](https://minecraft.wiki/w/Mob_spawning#History) (per-player caps, 1.18 / 21w38a),
[Mob spawning#Despawning](https://minecraft.wiki/w/Mob_spawning#Despawning), [Bed#Sleeping](https://minecraft.wiki/w/Bed),
[Zombie](https://minecraft.wiki/w/Zombie) (sunlight, item pick-up), [Name Tag](https://minecraft.wiki/w/Name_Tag).
Code names for the checker: `NaturalSpawner.createState` / `LocalMobCapCalculator` / `Mob.checkDespawn` /
`Player.startSleepInBed`.

1. **The cap.** The monster category's cap is **70**. Since 1.18 it's also counted per player: a monster that counts
   is added to the count of every player within 128 blocks of its chunk, and a chunk may spawn monsters only if some
   player near it is under 70 (plus the old global cap, 70 x spawnable chunks / 289, which a lone player also fills
   at 70). With seventy counted zombies under his house, Grandpa's count is 70, so no natural monster spawns in any
   chunk within 128 blocks of him. Any other player in Ravenford (the shepherd family) is within 128 blocks of the room
   too, so their counts are full as well: the whole village is covered.
2. **Why un-named.** A mob that is persistent (`PersistenceRequired`: name-tagged, or one that has picked up an item)
   does **not** count toward the cap. So the seventy have no name tags (the pitch's twist had it backwards) and nothing
   to pick up: empty hands, no armour, nothing on the floor. Seen as the cast note says: no name over any zombie.
3. **How they stay counted (and stay).** Un-named mobs despawn at random once no player has been within 32 blocks for
   30 s (1/800 per tick), and at once beyond 128. Within 32 blocks of a player they never despawn. Every cell of the
   room is under 17 blocks from the bed ((-2058, 73, -501) to the far corner (-2050, 65, -489): 16.5), so while he's
   home, asleep or in his yard, they stay. That's why "he never goes far" (L04): if he left for long, the room would
   empty. (From day ~2000 he no longer hunts at the tower; canon note.)
4. **Why 8 below the bed.** A player can't sleep with a monster that targets players inside a box 8 blocks out and 5
   up/down from the bed ("You may not rest now; there are monsters nearby"). The bed is at y 73; the room floor is
   y 64, so a zombie's feet are at y 65 and its head top at y 66.95, under the box's bottom (y 68). He sleeps right on
   top of them, 8 blocks above.
5. **No spawns inside the room.** Monsters never spawn within 24 blocks of a player; every cell of the room is within
   24 of the bed and the yard, so when the count dropped to 69 the new monster spawned out in the dark village, not in
   the room. (The room is also too crowded to spawn in.)
6. **The burn.** A zombie burns when, in daylight, the block at its eyes sees the sky. The lid is a full grass block
   (opaque: no sky light through it; a trapdoor would let sky light down and burn one every day). Opened in the
   morning, the 1x1 shaft is open to the sky; a zombie that sees the player through it walks toward him, into the
   cell under the shaft (-2057, 65, -490), and burns. It stays under him, looking up, until it dies (fire 1 damage a
   second, 20 health). Visible cause: he opened it in daylight (STANDARDS 4b).
7. **The spider.** At 69 there's one free slot. That night a spider spawns in the dark somewhere 24-128 blocks from
   him and, since spiders hunt players at night, climbs his south wall toward the lit window (spiders climb walls).
   With the spider the count is 70 again, so nothing else spawns while it's near. It wanders off by day and despawns
   (more than 32 blocks from anyone) or the village golem gets it: "never came back" is not said; L14 says only that
   nothing climbed the wall after that (true: the new zombie fills the slot).
8. **The new one.** The next night, after the spider is gone, a zombie spawns in the free slot and follows him (zombies
   chase players within 35 blocks). He walks it across his yard to the open hole; it drops 6 blocks (3 damage, it
   lives) into the room. Seventy again.
9. **Not stopped by the cap (never said, theory bonus):** raids, pillager patrols, phantoms (he sleeps every night
   anyway), zombie sieges, and spawners. So Thirty-One Raids' raids could still come.

## Scenes and time
| scene | lines | time | light |
|---|---|---|---|
| A. the count (tonight) | L01, L02, L05, L06, L15 | 18000 | the room is dark; moonlight down the 1x1 shaft is the only light |
| B. the general | L03 (13500, his bedroom), L04 (6000, the bench) | per shot | lanterns indoors; midday sun in the yard |
| D. the morning of the burn | L08-L11 | 1000 | a hard square of daylight under the shaft; the rest of the room black |
| E. the nights after | L12 (14000), L13 (15000), L14 (16000) | per shot | the door lantern, the lit windows; S14 the village and the pasture under the moon |

Time runs forward except scene A, which is tonight (the frame story): L01-L06 and L15 are the same night, L08-L14 the
memory of the last few days. L05/L06's count and L15's count are the same ritual on different nights; the picture is
the same.

## Places
| place | where (world coordinates; x east, z south) | establishing shot |
|---|---|---|
| the room | air x -2058..-2050, y 65..67, z -501..-489 (9 x 13); stone floor y 64; ceiling y 68 (the house's cobblestone foundation under the house, stone under the yard) | S01 (MS widening to WS) |
| the hole | 1x1 shaft x -2057, z -490, air y 68..70, lid = grass block at y 71 | S05 |
| Grandpa's bedroom | inside the house, the bed head north at (-2058, 73, -501) | S03 (WS) |
| the yard | x -2062..-2048, z -493..-487: bench (spruce stairs) by the door, grindstone (-2050, -490), barrel (-2048, -492), lantern post (-2059, -488), the west fence | S04, S12, S13 |
| Ravenford at night | the pasture south of the road, the generated house's roof, Grandpa's south wall, the palisade | S14 (EWS) |

## Cast and costume
| who | look | where | voice |
|---|---|---|---|
| the narrator | a baby zombie, vanilla, un-named, no tag, empty hands | the room, front row under the hole | `narrator` (Leda, Pip's recipe, plain_say, one take) |
| the general | Grandpa (Ravenford): player, `zuri` skin, the slow walk; knees down or a dark head in the hole; name tag hidden | his house, yard, the hole | `elder` (Charon), gemini-3.8-flash-tts |
| the seventy | 69 adult zombies + the baby; no armour, no items, no name tags | the room | silent (vanilla groans) |
| Brother Seventy | an adult zombie, no helmet | the cell under the hole (S09-S10) | silent |
| the spider | vanilla spider | his south wall, S12 only | vanilla |
| the new one | an adult zombie | the yard, then the hole (S13) | vanilla groan |

**Count:** before the burn 70 (69 adults + baby). S09-S10: Brother Seventy is one of the 69 adults. After S10: 68 adults
+ baby = 69. After S13: 69 adults + baby = 70. S15 shows 70.

## Props
| prop | state | shots |
|---|---|---|
| the lid (grass block) | shut S04, S12, S14; broken (open) S05, S06, S08-S11, S13, S15; put back at the end of S11 and S15 | |
| the bed | red bed, head north, by the lantern; he gets in at S03 | S03 |
| the bench and his crossbow | the crossbow leans on the bench (his own, from Thirty-One Raids) | S04 |
| the totem wall | the house as it is (32 frames, the north wall); its lowest row glints in S03's background | S03 (set, not the cameo) |
| the blue flock | lying down in the pasture | S14 (the easter egg) |
| windows | lit at night (the house's glowstone ceiling, the lanterns) | S12, S14 |

## Positions and screen direction
- The room's long axis runs north (under the house) to south (under the yard); the hole is at its south-west end.
  Room shots look north-west toward the light (S01, S08, S10, S15) or straight up (S06, S11). The general is always
  above: up-frame in the room shots.
- Yard shots look north at the house (S04 north-east, S12, S14) or east across the hole (S13). The general enters S13
  from frame right; the zombie follows him from frame right.

## Who knows what
- **The narrator:** believes they're an army waiting for orders, that the general loves them, that the spider came for
  Brother Seventy, that monsters fear them. Never afraid, never knowing (STANDARDS 0a). Doesn't know what the sun does.
- **The general:** knows exactly what they're for. Says only numbers.
- **The viewer:** told nothing; gets it from 69 -> the first spider ever, 70 -> nothing.

## Numbers the picture must match
- 70 zombies in the room in S01 and S15 (count them on the stills; the baby is one); 69 after S10 until S13.
- 3 numbers in L06 ("sixty-eight, sixty-nine, seventy"); 69 in L11; 70 in L15.
- "two hundred nights" (L01): not shown, a canon fact (built ~day 2000).
- One spider (S12). One new zombie (S13).

## The narrator
A baby zombie, the house narrator voice (Pip), bright and proud the whole way, a soldier who loves its general. The
burn is "glowy" and "gone": a puzzle, not a grief. It never says "zombie", "spawn", "cap" or "count us to seventy"
for a reason. Eerie comes from the picture and the old man's quiet numbers, not from the kid.

## Voices
- Narrator: `narrator` (Leda, gemini-3.8-flash-lite-tts), Pip's recipe verbatim, one request (rN).
- The general: Grandpa's canon `elder` (Charon, gemini-3.8-flash-tts), his own request (rG), one bracket:
  "[An old man in his seventies, counting quietly to himself, slow and low]" (13 words).
- No new speaking character, so no audition is needed. If the owner would rather the general NOT be Grandpa's voice
  (an unknown old man), two candidates no other character uses or is auditioning for (voices/cast.json, canon.md
  "Planned characters", every script-* branch): **Enceladus** (the only male Gemini voice no one uses or auditions) and
  **Algieba** (unused, but on Pulled Away's audition list for its player: whichever that story doesn't take), each with
  the same bracket, auditioned against Pip. Schedar is taken (voices/cast.json).

## Changes from the pitch (round-3 must-fixes and why)
- Line 1: "SEVENTY of us stand in one dark ROOM, and not one of us has MOVED in 500 nights." became "SEVENTY of us
  stand in the DARK. We've been WAITING two hundred NIGHTS." Zombies wander a little even packed in, so "not one has
  moved" is false on screen; 500 nights would put the room at day 1700, before Thirty-One Raids (1900), whose Grandpa
  hunts at the tower 60 blocks away, which would despawn the room.
- The zombies are un-named (persistent mobs don't count). The room is within 32 blocks of the bed and 8 below it.
- The lid is a grass block, not a trapdoor (sky light passes trapdoors: one would burn every morning).
- The burn is kept (the critic's key clue; the brief allows it), shown as vanilla: the fire overlay and the smoke puff,
  no drops, no gore. The spider is never killed on screen.
