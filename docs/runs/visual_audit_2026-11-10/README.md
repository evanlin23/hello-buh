# Visual audit of the 5 held stories (2026-11-10)

This audit covers the picture only, done before the vNext re-record. The narrator voice was out of Gemini quota until
08:00 UTC, so every visual fix can land first.

## Method

- **Materials.** Each story's latest recording (`renders/slices/*.rec.json.gz` on its render branch, engine 2, old
  script) was rendered with its story branch's vNext stunt: the vNext cameras, set and look. New cameras that were
  never recorded (light_sleeper `hook` and `meadow`) were rendered by adding their `shot` marks to a copy of the old
  recording, in the same world.
- **Tools.** `./hb sheet`, `./hb still`, `./hb describe`, `./hb owner/framing/continuity/motion` and
  `scripts/look_stats.py`.
- **What was not done.** No voice, no new recording, no Minecraft server, no script, stunt or story.json changes.

## Results

| story | blockers | fixes | first frame | report | sheet |
|---|---|---|---|---|---|
| light_sleeper | 3 | 8 | **pass with the new `hook`** (the old POV first frame is weak) | `light_sleeper.md` | `light_sleeper_sheet.jpg` |
| dog_hill | 6 | 10 | **fail**: a small dog on a flat lawn, a daisy the brightest thing | `dog_hill.md` | `dog_hill_sheet.jpg`, `dog_hill_stills.jpg` |
| thirty_one_raids | 2 | 10 | **fail**: a dim brown room, Grandpa's back | `thirty_one_raids.md` | `thirty_one_raids_sheet.jpg`, `thirty_one_raids_cut_frames.jpg` |
| gold_for_the_portal | 4 | 9 | **fail**: Grandma turned away, the ingot a 15 px speck | `gold_for_the_portal.md` | `gold_for_the_portal_sheet.jpg` |
| good_boy (rework) | 8 | 11 | **fail** (the old cut); the rework's frame 0 is specified | `good_boy.md` | `good_boy_sheet.jpg`, `good_boy_problems.jpg`, `good_boy_candidates.jpg` |

## Patterns across the five

These repeat the owner's past notes:

- **Faces at night under 0.25 luma.** dog_hill, thirty_one_raids L10, the light_sleeper reveal, good_boy. Each needs a
  lantern within 4 blocks of the face, on the camera's side.
- **Fixed warm or 'tense' looks used at night.** These should be `mood: 'auto'`, or `eerie_night` + contrast.
- **Depth of field on wide or full shots ("blurry light").** light_sleeper s07, thirty_one_raids S04/S09, dog_hill,
  good_boy.
- **Cameras in leaves or plants.** The light_sleeper meadow, the good_boy crane, dog_hill's flowers and the good_boy
  wheat.
- **Lines whose named subject isn't on screen.** The light_sleeper doghouse, dog_hill Grandpa, the gold potion and
  "64", the thirty_one_raids raid count.
- **Motion notes in the old recordings.** Head whips over 240 deg/s, a view moving while a GUI is open, cast landing 3
  ticks after a cut. The vNext ports use the kit (`K.dig`, `K.open`, `K.warp`). Verify with `./hb owner` after each
  re-record.

## Engine bugs, fixed on `agent/visual-fixes`

Tests are in `npm test`, which passes 44/44. Published recordings render pixel-identical.

1. **The first-person hand and held item were cut off at the right edge of every POV frame in a wide-master story.**
   - Cause: the page computed HAND_X from the 1797-wide master (giving 1), so the rest point sat 561 px from the centre
     of a 540 px half-crop.
   - Fix: HAND_X from the output width (`lib/wide_hand.js`). The hand lands on the same pixel as a 1080x1011 render.
   - On for new recordings (`rec.wideHand`, written by the harness), `stunt.wideHand` or `WIDE_HAND=1`.
   - `engine_wide_hand_before_after.jpg` shows before, after and the plain render.
   - Checked: gold_for_the_portal and good_boy, main vs branch, 0 pixels differ.
2. **A dropped stack drew one item for any count; vanilla draws 1-5.**
   - The harness records `extra.count`; `lib/item_stack.js` follows vanilla's getRenderedAmount and
     renderMultipleFromCount.
   - This is what made the 64 ingots in gold_for_the_portal read as one. See `engine_item_stack_before_after.jpg`.
   - Old recordings have no count and are unchanged (0 pixels).
3. **`./hb` cached the unzipped recording by stunt name.** A second recording of the same stunt (a render slice, a
   probe) silently rendered the first one. The cache is now keyed per source file.
4. **`./hb owner` flagged "no fog" on a story whose fog is the Darkness.** A recorded darkness effect now counts as fog.

## Engine items reported, not fixed

All six are fixed on `agent/visual-engine-2` (docs/engine_features.md "Potions, phone-readable screens, on-screen
teleports, the Darkness phase, lightning light"; stills `engine2_*.jpg`). The original notes:


- **Potions draw untinted in container screens and the HUD** (gold B3).
  - Cause: `lib/harness.js` `slotOf` records `[name, count, glint]` with no potion contents, and `edit.py item_icon`
    draws the bare sprite.
  - Fix: record the `potion_contents` colour per slot, then tint `potion_overlay` as `renderer/entities.js` does for
    thrown potions.
  - Not fixed blind: it needs a live server to confirm mineflayer's component shape.
- **GUI and chat scale for phones** (gold B3, good_boy B8).
  - `edit.py GUI = 3` is vanilla's auto scale for 1080x1011, but container screens and the "Buh left the game" chat
    line are unreadable on a phone.
  - Proposal: an opt-in `edit.guiScale` (4-6) per story; the default stays unchanged.
- **The story kit has no on-screen teleport** (good_boy B2).
  - `K.actor` walks a jump over 12 blocks, and `K.warp` works off-screen only.
  - Proposal: a `K.blink` that writes a `teleport_ok` mark; the renderer already snaps such jumps.
- **The Darkness pulse phase follows the absolute recording tick** (cos(t*PI*0.025), as vanilla's player.tickCount).
  So a pulse "on the word" must be timed in the stunt (light_sleeper F8). An optional phase mark would make it easy.
- **Lightning lights the world only with `look.smoothLight`** (dog_hill). Possibly by design; check before relying on
  it.
- **`./hb owner` counts far-away hidden villagers (40-60 blocks, behind the hill) as teleporting** (dog_hill).
  - Fix: skip entities that are hidden or more than 32 blocks away.
