# the_walk: set plan (r4)

- Claim `gullwick` on the West March coast:
  - an open cold-ocean bay (not frozen) with a natural island **60 blocks** from the dock's end (from the survey;
    build only the cottage on it), the dock flush at sea level;
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
| L04 | Grandma lives on the island across the bay; her window's lit every night | the island across open water, 60 blocks; the window lit; Grandma's figure in it, readable at phone size (FOV 20 in S04) |
| L05 | he won't take a boat or build a bridge | a boat tied and unused; no bridge, no pillar, no blocks between the dock and the island |
| L07 | walk the water to me | open water between them; no ice anywhere before S11 |
| L08 | Mom says never | Mom on screen while she's named |
| L09 | a new book | the same set-up as S02, the book glinting, at dawn |
| reveal | the sea freezes under each step toward her window | frosted ice under each step only; the window lit with her figure at the end of his line |

## Phone-size check (game view 1011 px tall)
- S04, FOV 15 from (2, 3.5, 20), 80 blocks to the window: about 48 px a block; the window about 144 x 96 px; Grandma about 86 px; Grandpa about 340 px, left and lower third.
- S08, FOV 30 at 75 blocks: about 25 px a block; the window about 75 x 50 px (lit, reads as a window).
- S11, FOV 40 from (0, 5, 14), ~74 blocks: about 19 px a block; the window about 57 x 38 px; the ice path wide and white.

## Engine requests
Logged in docs/engine_requests.md (2026-11-11, the_walk): the merchant screen + tooltip, a non-spoken caption chunk, an actor rowing a boat, old-man/old-woman skins, Frost Walker on a walking actor, a flashback grade.
