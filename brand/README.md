# Channel art (avatar + banner)

Rendered with the cinematic movie engine from THE KEEP's castle recording (`renders/keep/lapse_castle.rec.json.gz`,
branch `agent/cinematic`): no server and no new recording. The look comes from `stunts/cinematic_keep.js` (bloom, grade,
god rays, fog sea, depth of field, shadows) with per-shot overrides in the scene files.

| file | what |
|---|---|
| `avatar_golden.png` | **pick.** Buh (Steve) and the creeper shoulder to shoulder, the sunset behind them and the castle out of focus |
| `avatar_moon.png` | the same pair by moonlight, cool grade |
| `avatar_dawn.png` | the same pair at sunrise, warm sky and the fog low on the ground |
| `banner_fogsea.png` | **pick.** The castle rising out of a fog sea at sunrise, the sun behind the keep |
| `banner_moon.png` | the castle in the fog by moonlight, the moon behind the keep |
| `banner_sunset.png` | golden hour from the east, high angle |
| `contact.jpg` | all six: each avatar at 176 / 88 / 40 px circles, each banner with the desktop strip and the safe band outlined |

Banners: 2560x1440. The title ("HELLO BUH", Inter ExtraBold, with "minecraft stories, stunts & mysteries") and the
castle both sit inside the centred 1546x423 band, so phones, desktop and TV all show them. Avatars: 800x800.

## Re-make
```bash
python3 brand/make_avatar_rec.py                                                         # castle recording + two posed pairs
python3 scripts/cinematic.py brand/avatar_scene.json --sheet --at 0.5 --scale 1.5        # 2880x1620 stills
python3 scripts/cinematic.py brand/banner_scene.json --sheet --at 0.5 --scale 1.33334    # 2560x1440 stills
python3 brand/compose.py                                                                 # crops, title, contact sheet
```
- The avatar characters are injected entity rows (a `mannequin` named Buh, skinned by `stunts/brand_art.js` `cast`, and
  a `creeper`), standing 100 blocks east of the castle facing east and 131 blocks west facing west, so the sun or moon
  is behind them in every shot. Move or turn them in `make_avatar_rec.py`.
- Cameras, hours (`day`), fog and grades are in `avatar_scene.json` / `banner_scene.json` (cinematic.py clip format).
  In Minecraft the sun and the moon always rise due east (+x) and set due west, so a backlit shot looks along x.
- Known: `banner_sunset.png` shows fog-sheet stripes along the bottom, which only TVs show. Past x 140 east of the
  castle the camera ends up in terrain.
