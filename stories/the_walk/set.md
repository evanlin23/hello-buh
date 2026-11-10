# the_walk: set plan (r1)

- Claim `gullwick` on the West March coast:
  - an open cold-ocean bay with a natural island ~120 blocks out (from the survey; don't build an island unless none
    exists);
  - the dock: an oak plank pier, 12 long;
  - the library hut: a plains `library` set piece from `lib/sets`;
  - Grandma's house on the island: a small cottage, its window lit with a lantern.
- **S01's timelapse:** break and place the lectern 3 times in 2 s (`K.dig` and place), with the librarian losing and
  regaining her job (the vanilla hat change).
- **S09 needs Frost Walker on a moving player actor.** Vanilla forms frosted ice in a radius around the boots each
  tick on water; the renderer draws frosted ice. Check that the actor's equipment applies the enchant on the
  server (it should: `/item replace entity <actor> armor.feet with leather_boots[enchantments={frost_walker:2}]`).
- **Engine checks:**
  - the trade screen GUI with an enchanted book tooltip (check the story track can overlay it, or the renderer's
    GUI).

## Pre-build checklist (from reviews/r1-continuity.md)
1. Claim `gullwick` within ~200 blocks of the Ridge tower (-2000, -445). The bay must be cold_ocean (unfrozen),
   with a natural island 50-70 blocks out and the dock flush at sea level.
2. Add `"the_walk": {"day": 2300, "places": ["gullwick"], "status": "claimed", "cameos": ["raven_tower"]}`.
3. Engine features: the merchant screen GUI and the item tooltip (the renderer has neither yet).
4. Shot sheet: the island window must read at 300 px (narrow the field of view in S04 and S06).
