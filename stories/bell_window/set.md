# bell_window: set plan (r1)

- `world.build(ctx, { story: 'bell_window' })` builds canonical Saltmouth. Stamp the oak on the north rise (`since: 1700`), the bell beam on two fence posts, and his two-storey house. No lantern under the oak: use the night floor.
- **Line-up check before anything else:** on the survey grid, find a house whose upper window, the village bell and
  an 8-11 high rise (the skeleton at most 15 blocks from the window) lie on one line. Record x, z in map.json. If none exists, the story moves to
  another generated plains village, with the critic and continuity agreeing.
- **The skeleton:** summoned under the oak with `PersistenceRequired`. In S06 at noon it stands in the shade (it
  doesn't burn there). Its shot in S08 is cued with a real arrow (`/summon arrow` with motion along the line), so the
  bell rings by vanilla rules.
- **Engine checks:** the skeleton's draw pose (it renders), arrow flight (it renders), the bell's swing (check the
  bell block entity's animation in the renderer; if missing, it's an engine feature).

## Pre-build checklist (from reviews/r1-continuity.md)
1. Add Saltmouth stamps `cliff_oak` (since 1700), `bell_post` and `boy_house` to map.json. Add
   `"bell_window": {"day": 2000, "places": ["saltmouth"], "status": "claimed", "cameos": ["saltmouth_portal"]}`, and
   register `saltmouth_portal` as a cameo (since 0).
2. Engine: the skeleton's bow-draw arms. The bell swing and arrows already render.
3. Cast Mom from a spare voice (not `mom`).
