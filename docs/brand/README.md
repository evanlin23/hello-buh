# Channel art handoff (from claude/cinematic-default, 2026-11-10)

Rendered with the movie engine from `stunts/brand_art.js` (a floating grass island village over the fog sea, a small
rock north-west of it). Record: `STUNT=brand_art ./scripts/record.sh` (~3 min). The set:
- pair A (lit): a Mannequin Steve ("Buh") + creeper on the main island's west edge at (-19.5, z -0.1 / 0.95), facing west
- pair B (backlit): the recording bot (Steve) + creeper on the rock at (-10.5, 4, z -34.1 / -33.05), facing east

Drafts here (low-res checks except the avatars, which are 800x800 renders):
- `avatar_sunset_backlit.png` (the best: the sun setting behind them):
  `python3 scripts/still.py work/brand_art.rec.json out.png --at 3 --size 800x800 --ss 1.5 --time 12450 --look "$(cat docs/brand/look_golden.json)" --shot '{"at": [-6.6, 5.55, -33.55], "look": [-10.5, 5.4, -33.55], "fov": 31, "drift": 0}'`
- `avatar_golden_lit.png`: `--time 12000`, shot `{"at": [-23.3, 2.6, 0.42], "look": [-19.5, 2.45, 0.42], "fov": 27, "drift": 0}`
- `avatar_moonlight.png`: too dark with look_dusk; `look_moon.json` (brighter, blue) is untested
- banners (text by `scripts/channel_art.py banner art.png out.png --guides`; the red box is the 1546x423 safe band):
  shot `{"at": [66, 7, -16], "look": [-8, 14.5, -16], "fov": 44, "drift": 0, "dof": false}` at `--size 2560x1440`,
  V1 `--time 12650` look_golden, V2 `--time 13050` look_dusk (the best), V3 from the west at sunrise
  `{"at": [-84, 7, -14], "look": [0, 14.5, -14], "fov": 44, ...}` `--time 23400` look_golden.
Not done: the full-res banners, the final picks, the moonlight avatar.
