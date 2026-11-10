# bell_window: set plan (r1)

- `world.build(ctx, { story: 'bell_window' })` builds canonical Saltmouth. Stamp the oak on the north rise
  (`since: 1700`) and a lantern under it.
- **Line-up check before anything else:** on the survey grid, find a house whose upper window, the village bell and
  a 15+ block rise lie on one line within ~40 blocks. Record x, z in map.json. If none exists, the story moves to
  another generated plains village, with the critic and continuity agreeing.
- **The skeleton:** summoned under the oak with `PersistenceRequired`. In S06 at noon it stands in the shade (it
  doesn't burn there). Its shot in S08 is cued with a real arrow (`/summon arrow` with motion along the line), so the
  bell rings by vanilla rules.
- **Engine checks:** the skeleton's draw pose (it renders), arrow flight (it renders), the bell's swing (check the
  bell block entity's animation in the renderer; if missing, it's an engine feature).
