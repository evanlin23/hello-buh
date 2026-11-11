# Mob poses and held items: proofs (claude/engine-mob_poses, 2026-11-11)

From the live test `stunts/_test_mob_poses.js` (`./hb record _test_mob_poses --no-strict`, a real 1.21.11 server), each still
at phone size (the 1080 x 1011 game view in a 1080 x 1920 frame) and a 300 px-wide thumbnail:

| file | what | how it got there |
|---|---|---|
| allay_diamond | an allay holding a diamond (AllayModel holding arms, the item in front of its chest) beside an empty one | recorded: `equipment:{mainhand:diamond}` |
| piglin_baby_admiring | a baby piglin admiring a gold ingot in its off hand (head down, the ingot up to its face) | recorded: `equipment:{offhand:gold_ingot}`, vanilla's own rule |
| skeleton_staged_full_draw | a NoAI skeleton at full draw, profile | staged: `pose { bow: true }` at tick 71, still at tick 100 (bow_pulling_2 from tick 89) |
| skeleton_ai_drawing | a skeleton with AI shooting at an iron golem | recorded: aggressive 60/60 ticks, using its bow 20 of every 60 |
| evoker_idle_crossed | an idle evoker: only the crossed arms (main drew crossed AND free arms) | engine 2+ |
| evoker_real_wololo | the real wololo spell: arms up, spell particles at the hands, a sheep turned red | recorded: metadata 17 = 3 over ticks 42-101 |
| evoker_staged_wololo | the same, staged | `pose { spell: 'wololo' }` at tick 506, `/data` Color:14b at +40 |

## Rule zero: before (origin/main 28554cb2) vs after (this branch, rebased on it)
`./hb still` on each, both trees, 30 frames: **every one 0 px different**.
- HelloBuh: sandart_tnt (ticks 60, 200, 320), logic_minecraft (100, 400, 640), cooked_bedrock (50, 150, 250), creeper (40, 150),
  guess_sound_2 (the allay: 611, 300), guess_sound_3 and interrupt_lamps (bow skeletons: 326; 253), rainbow_sheep (266).
  edit.py is unchanged, so the `--still` meme overlays of sandart_tnt / logic_minecraft / cooked_bedrock are too.
- Buh Stories: story_nitwit (120, 450, 800), story_light_sleeper (bow skeleton: 569, 600), story_gold_for_the_portal
  (piglins: 1006), story_thirty_one_raids (pillagers with crossbows: 864), story_dog_hill (actors: 300).
- Fixtures: pose_fixture --staged (2, 40, 75), --armor (piglin, skeleton: 5, 40), --life (20).
Published recordings scanned for the new keys: no allay holds an item, no piglin has an off-hand item, no evoker
appears; skeletons hold bows but never get the staged/recorded aim keys (they're new).
