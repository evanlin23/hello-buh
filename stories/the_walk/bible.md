# the_walk: continuity bible (r5)

## World
- **Place:** a new place to claim, `gullwick` ("Gullwick"): a shore hamlet on the West March coast, within ~200
  blocks of the Ridge tower (-2000, -445), clear of Leo's House and the stronghold islets.
  - The library hut (a librarian, a lectern, an anvil), a dock with an oak boat floating empty beside it, a short shingle shore at the
    dock's foot, and an island **60 blocks** out across open cold ocean: never frozen_ocean (L08: it never freezes here), no snow on the shore; Frost Walker needs liquid water.
- **Day:** 4000 (the flashback, "ten years" before, is about day 350: canon counts 365 days a year; outside the Long Day 800-1100).
- **Actor height:** outside, an actor at y 0 stands on the deck, feet at y 1; in the hut y 0 is the floor.
- **Coordinates:** outside, dock-relative. (0, 0, 0) is the dock's end, its deck flush at sea level (stand at sea
  level + 1); -z is out to sea (west). Grandma's window is (0, 3, -60). The hut's door is about 20 blocks inland.
- **Hut coordinates are hut-local:** (0, 0, 0) is the lectern's block; the librarian at (0, 0, -1.5) facing +z; Grandpa at (-0.6, 0, 1.0) at the counter, (-1, 0, 1.2) when breaking; the kid at (1, 0, 1.2); the tally wall at z -3; the door at (0, 0, 6) facing the bay. The hut is a `room` from lib/sets (15x13x13).
- **Not claimed yet:** survey for real cold_ocean with a natural island 60 blocks out (the example spot (-2190, -380) is land); the Ridge tower needs renderDistance/recordRadius above 192.
- **New canon facts:** Gullwick; Grandpa and Grandma (players, a couple apart for ten years); Mom (their daughter, a
  player) and the kid; the ice path on day 4000 (Frost Walker ice melts, so nothing is stamped after the day).

## Scenes and time
| scene | lines | shots | time |
|---|---|---|---|
| A. the library hut, day | L01-L03b | S01-S03 | 6000 |
| B. the dock, the present | L04, L05 | S04, S05 | dusk 13000 |
| C. the flashback, ten years ago (about day 350) | L06, L07 | S06, S07 | sunset 12000, graded warm and soft; the island window dark (she hasn't arrived yet); no boat tied at the dock |
| D. the shore, the present | L08 | S08 | dusk 13000, the window lit |
| E. this morning | L09, L10 (S09 to 'didn't say', S10 from ANYTHING, 1.3 s hold), reveal | S09, S10 (22800, lantern-lit hut), S11 (23500) | the window still lit at dawn |

## Cast and costume
| who | what | voice | shots |
|---|---|---|---|
| the kid (narrator) | player, the default `kai` skin (not Steve, not zuri); never named; no armour | Pip (`narrator`) | beside the counter S02, S09 (shoulder only); POV screen S10; small next to Mom S08 |
| Grandpa | player actor, a grey-haired old-man skin (to make); iron axe in the hut (S01-S03, S09), empty-handed on the dock and in the flashback; **no boots** until S11, put on at the dock's end, leather with the enchant glint | Iapetus directed old (not `elder`: canon conflict 11), one clause; to audition | S01-S09, S11 |
| Grandma | player actor, a grey-haired old-woman skin (to make) | `grandma_island` (Callirrhoe) | in the boat S06-S07; head to toe in the window (sill at floor level) S04, S08, S11 |
| Mom | player actor, the default `makena` skin | silent | S08 |
| the librarian | plains villager; librarian outfit while a lectern stands, plain after each break (plain in S03) | none | S01-S03, S09 |

## Props
| prop | state | shots |
|---|---|---|
| lectern | broken and placed again; there in every hut shot except mid-break; dropped at Grandpa's feet in S03 | S01-S03, S09 |
| tally signs | about 60 oak signs on the hut's back wall, about 300 tally marks | S01, S03 |
| enchanted book | glinting in the librarian's raised hand; its name never shown before S10 | S02, S09, S10 |
| oak boat | floating empty beside the dock at (2, 0, 4), no lead; NOT there in the flashback | S05, S08 (background) |
| Grandma's boat | the one she rows away in; on the island's beach since | S06, S07 |
| Grandma's window | 3x2 glass panes, lanterns inside; **dark** in the flashback, lit at dusk and dawn | S04, S06 (dark), S08, S11 |
| leather boots | plain in the kid's inventory (S10); on Grandpa's feet, glinting, in S11 | S10, S11 |
| anvil | in the hut, heard (clank) on the cut S10 to S11 | sound only |
| frosted ice | forms under each of Grandpa's steps off the dock's end | S11 |

## Positions and screen direction
- The island is always west, out along the dock (-z). S04, S07, S08, S11 look out to sea; S05 looks back inland
  (the Ridge tower on the skyline: the easter egg); S06 looks across the dock.
- S04: Grandpa at the dock's end at dusk. S05: he walks inland, away from the camera, past the boat. S08: he walks up the shore past Mom, out of frame left. All three are the same dusk.
- S06 to S07: Grandma rows west, away from the dock, and turns back toward Grandpa (east) for her line.

## What the narrator holds
- The kid's inventory (only seen in S10's merchant screen): 64 emeralds, 63 lecterns, plain leather boots, a book,
  bread, a cake, a milk bucket, 67 eggs, a pufferfish. The anvil is in the hut (heard on the S10 cut).

## Who knows what
- **Grandpa** knows all along what he's rolling for.
- **The kid** knows the condition (L07) and Mom's reading (L08), and doesn't connect them to the book until S10.
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
- **Why II, not I:** Frost Walker freezes a radius of 2 + level (I: 3, II: 4): the wider path he wants for 60 blocks of open sea. Never said; the tooltip shows it. (With any level, 300 misses would be about 1 in 230.)

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
