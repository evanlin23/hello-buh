# the_walk: continuity bible (r6; world pass 2026-11-11: Gullwick claimed over the stronghold, the island 92 out)

## World
- **Place:** `gullwick` ("Gullwick", claimed on main 2026-11-11): a shore hamlet on the low headland west of Leo's
  lagoon in the West March, **over the world's only stronghold** (its pieces (-2313..-2272, -600..-534) run under the
  headland; never said, never dug, never shown). The dock's end at (-2301, 62, -566). Leo's House is 100 blocks east
  across the lagoon.
  - The library hut (a librarian, a lectern, an anvil), a dock with an oak boat floating empty beside it, a short shingle shore at the
    dock's foot, and **Grandma's Island** (`grandmas_island`, a natural sand-and-grass islet, 13 x 17, at sea level, at
    (-2374, 62, -630)) **92 blocks** out across open cold ocean (survey: every block on the line is `cold_ocean`):
    never frozen_ocean (L08: it never freezes here), no snow on the shore; Frost Walker needs liquid water.
  - Why 92, not 60: the lead asked for one of "the islets over the stronghold". The survey shows no islet over it (the
    land there is a headland joined to the mainland in the north: Grandpa could walk round, which would break L05).
    The nearest true island to the stronghold is this one, and no shore near it is closer than ~86 blocks with open
    water between. So Gullwick stands on the stronghold and Grandma's island faces it. The FOVs are narrowed so every
    phone size holds (set.md).
  - The open question the canon keeps (docs/world/canon.md): what's under Gullwick? Never asked in the Short.
- **Day:** 4000 (the flashback, "ten years" before, is about day 350: canon counts 365 days a year; outside the Long Day 800-1100).
- **Actor height:** outside, an actor at y 0 stands on the deck, feet at y 1; in the hut y 0 is the floor.
- **Coordinates:** outside, dock-relative. (0, 0, 0) is the dock's end, its deck flush at sea level (stand at sea
  level + 1); -z is out to sea (toward the island: north-west in the world). Grandma's window is (0, 3, -92). The
  hut's door is about 20 blocks inland (south-east).
- **Hut coordinates are hut-local:** (0, 0, 0) is the lectern's block; the librarian at (0, 0, -1.5) facing +z; Grandpa at (-0.6, 0, 1.0) at the counter, (-1, 0, 1.2) when breaking; the kid at (1, 0, 1.2); the tally wall at z -3; the door at (0, 0, 6) facing the bay. The hut is a `room` from lib/sets (15x13x13).
- **Claimed** 2026-11-11 (map.json `gullwick`, `grandmas_island`; the story's entry, day 4000, no cameo). The Ridge
  tower easter egg is dropped: it's 315 blocks from the dock, past any render distance we use. S05's inland view has
  Leo's stone cottage across the lagoon instead (geography, never named; a fan of One More Eye will know it).
- **Costume (canon conflict 19, resolved on main):** the kid wears the original `walk_kid` skin (was `kai`, Jonah's).
- **New canon facts:** Gullwick; Grandpa and Grandma (players, a couple apart for ten years); Mom (their daughter, a
  player) and the kid; the ice path on day 4000 (Frost Walker ice melts, so nothing is stamped after the day).

## Scenes and time
| scene | lines | shots | time |
|---|---|---|---|
| A. the library hut, day | L01-L03b | S01-S03 | 6000 |
| B. the dock, the present | L04, L05 | S04, S05 | dusk 13000 |
| C. the flashback, ten years ago (about day 350) | L06, L07 | S06, S07 | sunset 12000, graded warm and soft; the island window dark (she hasn't arrived yet); no boat tied at the dock |
| D. the shore, the present | L08 | S08 | dusk 13000, the window lit |
| E. this morning | L09, L09b (S09 to 'a', S10 from NEW, S11 on 'And Grandpa'), L10 the reveal + L11 | S09, S10, S11 (22800, lantern-lit hut), S12 (23500) | the window still lit at dawn |

## Cast and costume
| who | what | voice | shots |
|---|---|---|---|
| the kid (narrator) | player, the original `walk_kid` skin (not Steve, not zuri); never named; no armour | Pip (`narrator`) | beside the counter S02, S09 (shoulder only); POV screen S10; not in S11 (the book is in Grandpa's hand); small next to Mom S08 |
| Grandpa | player actor, a grey-haired old-man skin (to make); iron axe in the hut (S01-S03, S09, S11; lowered, unswung in S11), empty-handed on the dock and in the flashback; **no boots** until S12, put on at the dock's end, leather with the enchant glint | Iapetus directed old (not `elder`: canon conflict 11), one clause; to audition | S01-S09, S11 |
| Grandma | player actor, a grey-haired old-woman skin (to make) | `grandma_island` (Callirrhoe) | in the boat S06-S07; head to toe in the window (sill at floor level) S04, S08, S12 |
| Mom | player actor, the default `makena` skin | silent | S08 |
| the librarian | plains villager; librarian outfit while a lectern stands, plain after each break (plain in S03) | none | S01-S03, S09, S11 |

## Props
| prop | state | shots |
|---|---|---|
| lectern | broken and placed again; there in every hut shot except mid-break; dropped at Grandpa's feet in S03 | S01-S03, S09, S11 |
| tally signs | about 60 oak signs on the hut's back wall, about 300 tally marks | S01, S03 |
| enchanted book | glinting in the librarian's raised hand; its name never shown before S10 | S02, S09, S10 |
| oak boat | floating empty beside the dock at (2, 0, 4), no lead; NOT there in the flashback | S05, S08 (background) |
| Grandma's boat | the one she rows away in; on the island's beach since | S06, S07 |
| Grandma's window | 3x2 glass panes, lanterns inside; **dark** in the flashback, lit at dusk and dawn | S04, S06 (dark), S08, S12 |
| leather boots | on Grandpa's feet, glinting, in S12 | S12 |
| anvil | in the hut, behind Grandpa in S11; its clank on the cut S11 to S12 | S11 |
| frosted ice | forms under each of Grandpa's steps off the dock's end | S12 |

## Positions and screen direction
- The island is always west, out along the dock (-z). S04, S07, S08, S12 look out to sea; S05 looks back inland
  (Gullwick's headland, and Leo's House across the lagoon); S06 looks across the dock.
- S04: Grandpa at the dock's end at dusk. S05: he walks inland, away from the camera, past the boat. S08: he walks up the shore past Mom, out of frame left. All three are the same dusk.
- S06 to S07: Grandma rows west, away from the dock, and turns back toward Grandpa (east) for her line.

## What the narrator holds
- The kid's inventory (only seen in S10's merchant screen): 64 emeralds, 63 lecterns, a lantern, a book,
  bread, a cake, a milk bucket, 67 eggs, a pufferfish. The anvil is in the hut (seen in S11, heard on the S11 cut).

## Who knows what
- **Grandpa** knows all along what he's rolling for.
- **The kid** knows the condition (L07) and Mom's reading (L08), and doesn't connect them to the book even at the end: L10 only says what they see (boots, dock, the sea froze) and L11 is an understatement ("For a walk."); the viewer makes the jump.
- **Mom** thinks it means never (the sea here never freezes).
- **The viewer** can connect "the sea FREEZES" and the book from L07 on.

## The narration's claims (set.md checks each on stills)
See set.md "Claims".

## Accuracy
- Rerolling a librarian by breaking her lectern before any trade is vanilla Java; Frost Walker is a treasure
  enchantment librarians sell, max level II.
- **Three hundred, not three thousand** (critic r3, accuracy outranks): Frost Walker II comes up about 1 roll in 110
  (2/3 an enchanted book x 1/37 x 1/2), so 300 rolls without it is about a 7% streak (unlucky but real); 3,000 would
  be about 1 in 10^12. The tally wall shows about 300.
- **Why II, not I:** Frost Walker freezes a radius of 2 + level (I: 3, II: 4): the wider path he wants for 92 blocks of open sea. Never said; the tooltip shows it. (With any level, 300 misses would be about 1 in 230.)

## Voices (owner audit 2026-11-11: to audition, nothing voiced yet)
Every candidate is a Gemini voice no other character uses (`voices/cast.json` and every story.json checked:
Charon, Achird, Algenib, Schedar, Fenrir, Orus, Puck, Gacrux, Autonoe, Pulcherrima, Leda, Laomedeia, Despina and
Aoede are taken; Alnilam is proposed for Red Sheep's Dad). Audition each saying its real line, measured against Pip
(pitch and speaker distance), the owner picks (STANDARDS 7a).

**Grandpa** ("Not THAT one."), direction "[An old man in his seventies, flat and tired]":
1. **Iapetus** (recommended): "measured, polite man" (cast.json spares); a low adult male, far from Pip. Caveat:
   it's the GPT voice in the AI Shorts, a different series.
2. **Sadaltager** ("knowledgeable"): matched the old-man brief next to Iapetus and Schedar in the voice search
   (docs/voice_search.md row 7, 0.50-0.51); used by no character.

**Grandma** ("Come BACK when the SEA FREEZES."), direction "[An old woman, stubborn, a dare]":
- **Does she need her own voice?** Recommended yes. `grandma` (Autonoe) is Gold for the Portal's Grandma, a
  different woman in a different family; by canon conflict 11's rule for grandpas (one voice per grandpa) and
  STANDARDS 7a ("never shared by two characters a viewer could confuse"), two grandmas a viewer may watch back to back
  shouldn't share one voice. The catch: Autonoe was the only candidate that read as an old woman (Gacrux and
  Vindemiatrix read as men), so a new pick must pass that test too. If none does, keep Autonoe.
1. **Kore** (recommended): "crisp, firm woman" (cast.json spares), suits "stubborn, a dare". Caveat: the AI Shorts'
   Gemini voice, a different series. Must read old, not just firm.
2. **Callirrhoe** ("easy-going"): used by no character; a warmer reading, so the dare sounds fond.

**Decided (owner, 2026-11-11):** Grandma is `grandma_island` (Callirrhoe, "calirrhoe is fine"), her own voice. Grandpa still to audition (Iapetus vs Sadaltager).
