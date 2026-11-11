# Engine requests

Features a story needed that the renderer couldn't draw yet (owner, 2026-11-10: "build the renderer out to allow all
of these, and more when they come up"). Build them (docs/engine_features.md). Add a line when you stage around a gap.

| date | story | needed | status |
|---|---|---|---|
| 2026-11-11 | the_walk | merchant (villager trade) screen in edit.py, with the vanilla item tooltip on hover ("Frost Walker II") | open (script stage; not built) |
| 2026-11-11 | the_walk | a non-spoken caption chunk (on-screen text in the band captions' style and key colour, timed to a shot) | open |
| 2026-11-11 | the_walk | an actor seated in a moving, rowing boat (kit primitive: mount, row along a path; paddles are recorded) | open |
| 2026-11-11 | the_walk | grey-haired old-man and old-woman player skins (skins/ has none; the default skins all read young) | open |
| 2026-11-11 | the_walk | an actor walking off a block edge onto water with Frost Walker (kit walk over water; verify the server forms frosted ice for the actor, else stamp it per step) | open |
| 2026-11-11 | the_walk | a flashback grade (warm, soft) as a per-shot look | open |
| 2026-11-11 | the_walk | lead ropes / leash knots (dropped from the script for now) | open, not needed |
| 2026-11-10 | thirty_one_raids | actor sit pose; drink/use pose; off-hand item | building (agent/ergonomics) |
| 2026-11-10 | thirty_one_raids | chest contents (as the vanilla chest GUI on open) | building (agent/ergonomics) |
| 2026-11-10 | thirty_one_raids | campfire smoke | building (agent/ergonomics) |
| 2026-11-10 | light_sleeper | warden emerge animation | building (agent/ergonomics) |

## Backlog (lead, 2026-11-10 night): next engine round, by value to the stories (worked by agent/engine-2, 2026-11-10)
| # | needed | why | status |
|---|---|---|---|
| 1 | Lava and dark scenes read black (nitwit review), smooth dusk/dawn lighting in the shader instead of relight steps | owner's "blurry/dark" notes, night stories | DONE (engine-2, opt-in `look.smoothLight`): the lightmap runs in the shader, sunsets smooth with no re-mesh (3x faster), `look.moonlight` / `look.torchGlow` for black nights; lava-black was vanilla obsidian (docs/lessons.md). docs/engine_features.md "Light in the shader" |
| 2 | Lightning bolt + thunder flash (open since worker 18) | storms are a staple of eerie stories | DONE: the bolt and sky flash were drawn (worker 18); now the bolt lights the world and the mobs too (LightTexture sky darken 1), with `look.smoothLight` |
| 3 | Held-torch / lantern dynamic light around the player and actors | night interiors are flat and dark | DONE (with `look.smoothLight`): torches, lanterns, glowstone... held by the narrator, actors or mobs light blocks and entities to level - distance; placed ones already lit faces (block light engine), `look.torchGlow` for more |
| 4 | Visible sun/moon discs with phases, lens flare, drifting fog | cinematic skies (THE KEEP notes) | PARTLY: sun/moon/stars were drawn; moon phases added (`stunt.moonPhase`, or the day's phase on engine-2 recordings), drifting patchy fog (`fogSea.drift` / `wisps`). Lens flare: not done (god rays `look.rays` exist) |
| 5 | Motion blur on whips and timelapses (roadmap 3b.6) | fast moves strobe on phones | DONE (opt-in `look.motionBlur`): camera reprojection blur for whips/pans, `trail` afterimage for time-lapses; moving mobs aren't blurred |
| 6 | Villager and mob life: villager work/sleep/panic animations, head-turn to look at a speaker, mob idle variety | the cast looks frozen | DONE: `stunt.lookAtSpeaker`, `look_at` marks (`M.headTo`), staged `sleep` / `shake` for mobs; vanilla villagers have no work/panic animation (record them running); idle variety was `idleLife` |
| 7 | Name tags over heads (optional per actor) | who's who in a crowd; pairs with caption colours | DONE: `stunt.nameTags` (true or a list of names) |
| 8 | Nether and End dimension looks (sky, fog, portal particles verified) | premises set there | OPEN: Nether/End sky, fog and the End sky box were already drawn (page.js); biome ambient particles (ash, spores) not done |
| 9 | Faster stills: cache the meshed world between `./hb still` calls (3 min -> seconds) | agents iterate on cameras | DONE: the first mesh is cached between `./hb still` calls (work/hb/meshcache; story_nitwit 56 s -> 25 s) |
| 10 | Mob coverage audit: every 1.21 mob renders with its animations (list what's missing) | stories pick mobs freely | AUDITED (`scripts/mob_audit.js`): 76 of 89 drawn; added bogged, parched, illusioner, glow squid, trader llama (engine 2). Next: goat, camel, axolotl, armadillo, breeze, creaking |
| 11 | Weather on screen: snow, rain splashes, puddle-free wet look | mood | OPEN: rain columns, splashes and snow in cold biomes were already drawn (worker 11); a wet look not done |
| 12 | Vertical-first camera helpers: auto-centre the subject in the 1080 crop, taller cranes | THE KEEP vertical notes | OPEN: not started |
