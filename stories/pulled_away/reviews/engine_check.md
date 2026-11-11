# pulled_away: engine check (r2, 2026-11-11)

What the story needs, checked against renderer/, lib/ and docs/ on main (faacd6b). Nothing built here (script only).

| need | shots | exists? | evidence / what's missing |
|---|---|---|---|
| **a lead drawn from the man's hand to the boat's bow** | S01, S02, S03, S06, S07, S07b, S09 | **missing** | no leash/lead rendering anywhere in renderer/ (`grep -i leash renderer/` finds nothing; the_walk's set.md: "no lead: leads don't render"). Must-change 3's answer: vanilla-true in 1.21, but it does **not draw**. Needed: a sagging line (vanilla LeashRenderer: 24 segments, alternating brown shades) between the holder's hand and the boat's lead point. Without it S01 reads as a boat sliding on its own. Likely well under 2 h (STANDARDS 11: build it). |
| **does a leashed boat record?** | same | **unverified** | the server moves a leashed boat (1.21); the recorder sees the boat entity. Not tested here (no server run in a script session): needs a 10 s test stunt: summon a boat, a baby villager in it, lead it to an actor, walk 10 blocks on grass, then the actor gets in a second boat and rows 15 blocks (r2: he tows her boat from his own; check the led boat follows a holder who is riding). |
| a villager (baby) riding a boat, moving with it | S01-S10 | **risky** | stories/runaway's stunt notes "mineflayer doesn't move passengers, so he isn't one: both are teleported together". The renderer draws boats (renderer/entities.js BOAT_PARTS) and baby villagers (poseBaby); the passenger's position following the boat is the gap: either the recorder follows set_passengers, or the stunt moves boat and villager together each tick (Runaway's workaround, which must stay smooth: the owner's "no teleporting" rule). |
| a boat sliding on grass (on land) | S01-S08 | partly | the boat model renders anywhere; its motion comes from the server (leashed) or the stunt. Sound `entity.boat.paddle_land` is vanilla. |
| a player actor rowing his own boat | S09 | exists | boats render with paddles animated (renderer/entities.js poseBoatPaddle); the actor's sit pose (renderer/poses.js `sit`). r2 dropped the swim. |
| villagers walking home at dusk, in doorways | S10 | exists | villagers with AI walk to beds at dusk (vanilla); the canon stamps use NoAI, so the new villagers need AI on (or kit paths). |
| villager professions: fletcher, butcher, librarian; plains type | S04b, S07, S07b, S11 | exists | renderer/entities.js composites `entity/villager/profession/<p>`. |
| a head turn on a villager (the librarian "waves": dropped, she turns) | S11 | exists | actor head turns via the kit; villagers have no wave in vanilla (not used). |
| lit windows at dusk (lanterns inside) | S04, S10, S11 | exists | block light renders (renderer/light.js). |
| flashback grade | S07, S07b | exists | used by the_walk (`grade: flashback`). |
| Fernbank old (S04 flashback, ~day 5700) and alive (S11, day 6000) | S04, S11 | **new stamp** | r2: no same-day switch. A story stamp `fernbank_alive` (since 6000) and the librarian stamp `until: 6000`; the S04 flashback is built at its own day (world.build by day). |
| new cottages at Fernbank (forty must look possible) | S10 | build | lib/sets pieces (cottage) placed on Fernbank's slopes; a map.json pieces addition with since 6000 (~5800). |
| Oakend's lane, cottages, bank | S01-S08 | **unbuilt** | map.json `oakend` has no pieces yet (names_in_the_woods claimed it). Its pieces must be placed (shared with Names in the Woods if that is made). |
