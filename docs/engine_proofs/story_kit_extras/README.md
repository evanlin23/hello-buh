# Story-kit extras: proofs (claude/engine-story_kit_extras, 2026-11-12)

From the live test `stunts/_test_story_kit_extras.js` (`./hb record _test_story_kit_extras --no-strict`, a real 1.21.11
server), `./hb still ... --size 1080x1011` in a 1080 x 1920 frame, and a 300 px-wide thumbnail of each:

| file | what | how |
|---|---|---|
| 1_table_aunt_0.3_mug_teacup_heap_cards | the aunt (player actor) at scale 0.3 beside a mug her height, the teacup, the emerald heap, two fans of cards; her name tag at her scaled height | `/attribute Aunt minecraft:scale base set 0.3` (recorded), `KX.propCommands` (block_display / item_display) |
| 2_aunt_0.286_after_the_inch | after `K.scale('Aunt', 0.286, { secs: 0.25 })` | staged mark, eased |
| 3_jumpcut_aunt_1.22, 4_jumpcut_aunt_0.8 | S02's jump-cut sizes on the same locked-off frame (shadow scales too) | `K.scale(..., 1.22)`, `0.8` at once |
| 5_trail_mom_to_stone, 7_trail_stone_to_mom | the vanilla trail particle head -> stone, then the reverse | `K.trail` |
| 6_wrinkle_calcite_skin_swap_1 | the wrinkle row turned to calcite on the mark, Mom's skin swapped on the same tick | `K.setBlocks`, `K.skin` |
| 8_skin_swap_2 | the second swap | `K.skin` |
| 9_dad_seated_before_turn, 10_dad_head_turned_to_mom | Dad seated (`sit`), his head eased to Mom over 0.8 s | `M.headTo(ctx, 'Dad', 'Mom', { secs: 0.8 })` |

The kid's 1.0 -> 0.986 (Sorry, Dear L12) is in the recording too (`t_kid`); 1.4% doesn't show on a still this wide,
the unit test checks the eased value (lib/hb/test/kit_extras.test.js).

## Rule zero: before (origin/main 91b3243) vs after (this branch): 18 stills, every one 0 px different
fakemod_permission (100, 300, 430), sandart_tnt (60, 200, 320), logic_minecraft (100, 400, 630), cooked_bedrock (50, 150,
250), mobpov_baby_zombie (30, 120, 210), story_nitwit (120, 450, 800). edit.py is unchanged by this piece, so the
`--still` meme overlays and fakemod_permission's `edit.popup` are unchanged too. Published recordings carry none of the
new keys (`extra.entScale`, `extra.display`, `scale` marks, `look_at` `ticks`): they are written from this branch on.
