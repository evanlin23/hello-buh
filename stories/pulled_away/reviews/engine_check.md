# pulled_away: engine check (r1, 2026-11-11)

What the story needs, checked against renderer/, lib/ and docs/ on main (faacd6b). Nothing built here (script only).

| need | shots | exists? | evidence / what's missing |
|---|---|---|---|
| **a lead drawn from the man's hand to the boat's bow** | S01, S02, S03, S04, S07, S07b, S09 | **missing** | no leash/lead rendering anywhere in renderer/ (`grep -i leash renderer/` finds nothing; the_walk's set.md: "no lead: leads don't render"). Must-change 3's answer: vanilla-true in 1.21, but it does **not draw**. Needed: a sagging line (vanilla LeashRenderer: 24 segments, alternating brown shades) between the holder's hand and the boat's lead point. Without it S01 reads as a boat sliding on its own. Likely well under 2 h (STANDARDS 11: build it). |
| **does a leashed boat record?** | same | **unverified** | the server moves a leashed boat (1.21); the recorder sees the boat entity. Not tested here (no server run in a script session): needs a 10 s test stunt (summon boat, villager in it, lead it to an actor, walk 10 blocks on grass, then swim). |
| a villager (baby) riding a boat, moving with it | S01-S10 | **risky** | stories/runaway's stunt notes "mineflayer doesn't move passengers, so he isn't one: both are teleported together". The renderer draws boats (renderer/entities.js BOAT_PARTS) and baby villagers (poseBaby); the passenger's position following the boat is the gap: either the recorder follows set_passengers, or the stunt moves boat and villager together each tick (Runaway's workaround, which must stay smooth: the owner's "no teleporting" rule). |
| a boat sliding on grass (on land) | S01-S08 | partly | the boat model renders anywhere; its motion comes from the server (leashed) or the stunt. Sound `entity.boat.paddle_land` is vanilla. |
| a player actor swimming (head above water, strokes) | S09 | **check** | no swim pose in renderer/poses.js; vanilla surface swimming is the walk animation with the body in the water. Check how an actor in water renders; may need a "swim" pose or just the walk cycle sunk to the shoulders. |
| villagers walking home at dusk, in doorways | S10 | exists | villagers with AI walk to beds at dusk (vanilla); the canon stamps use NoAI, so the new villagers need AI on (or kit paths). |
| villager professions: fletcher, butcher, librarian; plains type | S07, S07b, S11 | exists | renderer/entities.js composites `entity/villager/profession/<p>`. |
| a head turn on a villager (the librarian "waves": dropped, she turns) | S11 | exists | actor head turns via the kit; villagers have no wave in vanilla (not used). |
| lit windows at dusk (lanterns inside) | S04, S10, S11 | exists | block light renders (renderer/light.js). |
| flashback grade | S07, S07b | exists | used by the_walk (`grade: flashback`). |
| Fernbank switching dark (S04, 12000) to lit (S10, 13000) on the same day | S04, S10 | **new stamp** | a story stamp `fernbank_alive` (since 6000) plus a per-shot override for S04 (new cottages unlit, villagers inside). world.build supports stamps with since/until; a within-day switch is staged by the stunt. |
| new cottages at Fernbank (forty must look possible) | S10 | build | lib/sets pieces (cottage) placed on Fernbank's slopes; a map.json pieces addition with since 6000 (~5800). |
| Oakend's lane, cottages, bank | S01-S08 | **unbuilt** | map.json `oakend` has no pieces yet (names_in_the_woods claimed it). Its pieces must be placed (shared with Names in the Woods if that is made). |
