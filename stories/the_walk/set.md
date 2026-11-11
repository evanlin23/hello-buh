# the_walk: set plan (r5; world pass 2026-11-11)

- `gullwick` and `grandmas_island` are claimed on main (2026-11-11). The dock's end (-2301, 62, -566), the deck flush
  at sea level, the pier 12 long from the headland's west shore (about (-2293, 62, -559)) out north-west over deep
  water (the sea floor is at y ~23 at the dock's end); the hut ~20 blocks inland on the flat headland (y 62-63).
  **Never dig** on the headland: the stronghold is under it.
  - an open cold-ocean bay (not frozen) with a natural island **92 blocks** from the dock's end (`grandmas_island`,
    (-2374, 62, -630), 13 x 17, sand and grass at sea level: build only the cottage and her boat on it), every block of
    water between them `cold_ocean`;
  - the dock: an oak plank pier, 12 long; an oak boat floating empty beside it at (2, 0, 4) (no lead: leads don't render);
  - a shingle shore at the dock's foot (S08);
  - the library hut: a `room` from lib/sets (no `library` piece exists), its back wall hung with about 60 oak signs (about 300 tally marks),
    an anvil inside, an open door facing the bay;
  - Grandma's cottage on the island: one 3-wide x 2-high glass-pane window facing the dock, its sill at floor level so Grandma shows head to toe, lanterns behind it so
    it reads lit at dusk and dawn; a second oak boat on its beach (hers).
- **S01's timelapse:** the lectern cracking on frame 0, popping on BROKEN, placed again by LECTERN, one more break and place by TIMES (`K.dig` and place, crosshair on the block),
  the librarian losing and regaining her job each time (the vanilla outfit change).
- **S11 needs Frost Walker on a moving player actor:**
  `/item replace entity <actor> armor.feet with leather_boots[enchantments={frost_walker:2}]`. Vanilla forms frosted
  ice in a radius around the boots while the wearer is on the ground; check it fires for the actor, or stamp frosted
  ice per step.

## Claims (the narration and the picture must agree, checked on stills from every shot angle)
| line | claim | the set must show |
|---|---|---|
| L01 | the same lectern, three hundred times | one lectern, in one spot; the tally wall reads as hundreds of marks (about 300) |
| L02 | the librarian holds up a book | the villager holding a glinting enchanted book, in frame |
| L03b | he really hates that librarian | (a misreading: nothing to build) the librarian in frame, jobless |
| L04 | Grandma lives on the island across the bay; her window's lit every night | the island across open water, 92 blocks; the window lit; Grandma's figure in it, readable at phone size (FOV 20 in S04) |
| L05 | he won't take a boat or build a bridge | a boat floating empty and unused; no bridge, no pillar, no blocks between the dock and the island |
| L07 | come back when the sea freezes | open water between them; no ice anywhere before S11 |
| L08 | it never freezes here | the bay is cold_ocean (never frozen_ocean); no ice, no snow layers, no snowfall in any shot before S11 |
| L08 | Mom says never | Mom on screen while she's named |
| L09 | a new book | the same set-up as S02, the book glinting, at dawn |
| reveal | the sea freezes under each step toward her window | frosted ice under each step only; the window lit with her figure at the end of his line |

## Phone-size check (game view 1011 px tall)
- S04, FOV 11 from (2, 3.5, 20), 112 blocks to the window: about 47 px a block; the window about 141 x 94 px; Grandma about 85 px (head to toe); Grandpa at (1.0, 0, 0.5) about 670 px, lower left below the window (eyetrace's vertical FOV on 1080x1920).
- S08, FOV 21 at ~113 blocks: about 24 px a block; the window about 72 x 48 px (lit, reads as a window).
- S11, FOV 28 from (0, 5, 14), ~106 blocks: about 19 px a block; the window about 57 x 38 px; the ice path wide and white.
- (Was FOV 15 / 30 / 40 at 60 blocks; the island is 92 out: the 2026-11-11 world pass narrowed them.)
- Render distance: the island is 92-113 blocks from every camera: renderDistance 8+ is enough; Leo's House in S05 is ~100 east.

## Engine requests
Logged in docs/engine_requests.md (2026-11-11, the_walk): the merchant screen + tooltip, a non-spoken caption chunk, an actor rowing a boat, old-man/old-woman skins, Frost Walker on a walking actor, a flashback grade.
