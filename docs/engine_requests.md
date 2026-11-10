# Engine requests

Features a story needed that the renderer couldn't draw yet (owner, 2026-11-10: "build the renderer out to allow all
of these, and more when they come up"). Build them (docs/engine_features.md). Add a line when you stage around a gap.

| date | story | needed | status |
|---|---|---|---|
| 2026-11-10 | thirty_one_raids | actor sit pose; drink/use pose; off-hand item | building (agent/ergonomics) |
| 2026-11-10 | thirty_one_raids | chest contents (as the vanilla chest GUI on open) | building (agent/ergonomics) |
| 2026-11-10 | thirty_one_raids | campfire smoke | building (agent/ergonomics) |
| 2026-11-10 | light_sleeper | warden emerge animation | building (agent/ergonomics) |

## Backlog (lead, 2026-11-10 night): next engine round, by value to the stories
| # | needed | why | status |
|---|---|---|---|
| 1 | Lava and dark scenes read black (nitwit review), smooth dusk/dawn lighting in the shader instead of relight steps | owner's "blurry/dark" notes, night stories | queued |
| 2 | Lightning bolt + thunder flash (open since worker 18) | storms are a staple of eerie stories | queued |
| 3 | Held-torch / lantern dynamic light around the player and actors | night interiors are flat and dark | queued |
| 4 | Visible sun/moon discs with phases, lens flare, drifting fog | cinematic skies (THE KEEP notes) | queued |
| 5 | Motion blur on whips and timelapses (roadmap 3b.6) | fast moves strobe on phones | queued |
| 6 | Villager and mob life: villager work/sleep/panic animations, head-turn to look at a speaker, mob idle variety | the cast looks frozen | queued |
| 7 | Name tags over heads (optional per actor) | who's who in a crowd; pairs with caption colours | queued |
| 8 | Nether and End dimension looks (sky, fog, portal particles verified) | premises set there | queued |
| 9 | Faster stills: cache the meshed world between `./hb still` calls (3 min -> seconds) | agents iterate on cameras | queued |
| 10 | Mob coverage audit: every 1.21 mob renders with its animations (list what's missing) | stories pick mobs freely | queued |
| 11 | Weather on screen: snow, rain splashes, puddle-free wet look | mood | queued |
| 12 | Vertical-first camera helpers: auto-centre the subject in the 1080 crop, taller cranes | THE KEEP vertical notes | queued |
