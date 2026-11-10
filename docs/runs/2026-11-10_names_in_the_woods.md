# Run report: Names in the Woods (story_names_in_the_woods), 2026-11-10

**Premise** (writers' room, critic r2 8.0/10): every night three zombies named TOMAS, GRETA and OLD BEN walk out of the
woods and stare at Mom over the hamlet's fence. A named villager keeps its tag when a zombie converts it: they are the
neighbours Mom has failed to cure (only a player can throw the potion). Tonight a fourth wears ROSA, still holding the
apple, and her son throws the cure: "I CAN. Potion, then APPLE."

## Day 1 (10:55-12:45 UTC): set, engine, staging; voice blocked on quota

| stage | active | waiting | notes |
|---|---|---|---|
| setup | 10 min | 15 min | fresh container: npm ci, assets, the TTS venv (torch, transformers, faster-whisper, resemblyzer), the videos worktree |
| world | 15 min | 3 min | the bible's spot (-512, -1030) is flat and falls to the WEST (62-68, a mixed oak/birch wood, not dark oak). Read the ground off a `_world_build` probe recording (the survey grid isn't in a fresh container): moved Oakend to the gate (-505, 63, -1054), where the meadow rises ~5 blocks west to the treeline and the inlet is 45 blocks east. Claimed on main (`2cf174f`); 7 pieces in map.json (cottage x5 / house2 / well, heights from the probe) |
| engine | 40 min | 10 min | built and merged to main (`a522cb2`): a villager's held item over its crossed arms (CrossedArmsItemLayer, engine >= 2), mob off-hand items (recorded + drawn), the narrator's nameplate in camera shots (`selfName` in `nameTags`), the selected item's name over the hotbar (`edit.itemNames`); owner.js: a block subject no longer "hides itself". Rule zero: nitwit, thirty_one_raids, the pose fixture: 6 stills pixel-identical |
| voice | 5 min | 15 min | 15 lines; speaker check 15/15 ok; drift gate BLOCK on 4 narrator lines (L03, L09, L11, L12). The first re-take of L03 hit a 429 on the locked narrator model (gemini-3.8-flash-lite-tts): stopped, no model mixing; resumes after the 08:00 UTC reset. Mom (L05, her only line) is on gemini-3.1-flash-tts-preview |
| stunt + recording | 50 min | 25 min | 11 recordings, 0 failed tries after the first fix. rec_check now 0 blockers |
| trial render | 5 min | 15 min | Actions run 42812833665 with the current takes, to find edit problems before the final |

### What the checks found and what changed
- `setblock ... replace air` isn't a mode (`keep` is): the first record failed in setup.
- The "Mom" `look` names nothing in the game (her tag is ROSA): story.json looks now say `actor:ROSA`.
- My `actor()` helper dropped explicit heights: the indoor Mom stood on the roof.
- Cast popping in 0.15 s after a cut (a /tp reaches the client late): Mom is two villagers, each placed during the line
  before, out of that shot's view (`tail`); Hugo and Pia likewise. Two zombies seen through S04's window still pop in:
  placing them earlier puts them in daylight in S03 and they'd burn into the night shot.
- The kitchen chest stood behind the hearth's campfire: moved to the front window.
- S01/S11 cameras sat below the meadow's rise (the zombies hid behind it): raised to 6 up.
- A lilac covered Mom at the brewing stand: cleared.
- The gate toggled with nobody near it (owner "glitch"): it opens once, with Mom in it (L07), and stays open.
- Trial render pace gate: silence until 0.37 s (the take's lead-in: `startAt: 'line:0.27'`), the end 3.6 s past the
  payoff (now a `payoff` mark on the shatter, an impact and a punch, `endAfter: story_end:-0.15`), 5.5 s of one
  picture in L01 (a tags shot cuts in on "named TOMAS"), gaps up to 0.7 s (story gap 0.3 -> 0.12).

### Open
- The 4 drifting narrator lines, after the quota reset. Then re-record, render, pace, panel, short-review, publish.
- Length: ~50 s with the tighter gaps (pace WARNs over 45 s): the approved script is 15 lines.
- The hamlet's ground by the inlet is flat (owner check WARN, "flat plain"): every shot has the meadow's rise, the
  treeline, the inlet or the buildings in it.
