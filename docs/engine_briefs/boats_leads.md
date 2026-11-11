# Piece: boats, leads and passengers
1. The lead rope renders (Pulled Away, claude/script-pulled-away): a sagging rope between holder and leashed entity
   like vanilla's leash renderer, including a leashed boat.
2. A leashed boat records and follows: a baby villager seated in a boat, led over grass by a player on foot, then the
   holder rows his own boat and the led boat follows on water (vanilla 1.21: boats can be leashed). Verify the
   recorder captures it; if mineflayer can't, add the cleanest stunt-side way.
3. Passengers move with their boat (runaway's notes: mineflayer doesn't move passengers): the recorder follows
   set_passengers, or the kit moves boat + rider together smoothly.
4. An actor seated in a moving, rowing boat along a path (The Walk's flashback: Grandma rowing away): a kit
   primitive (K.row or similar) with animated oars.
Done: a 10 s test recording showing all four, stills at phone size.
