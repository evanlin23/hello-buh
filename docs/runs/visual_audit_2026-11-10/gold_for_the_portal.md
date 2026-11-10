# Visual audit: gold_for_the_portal (2026-11-10)

An independent audit of the visuals, done before the vNext re-record. Nothing was changed in the story, the stunt or the script.

**Sources:**
- the script: `stories/gold_for_the_portal/script_vNext.md` (r2, adopted on `claude/story-gold-portal` f914924), plus `shots.md`, `set.md` and `bible.md`;
- the stunt: the vNext port, `stunts/story_gold_for_the_portal.js` on that branch;
- the recording: the latest one, `renders/slices/story_gold_for_the_portal.rec.json.gz` on `render/story_gold_for_the_portal`, which predates vNext;
- the latest cut: `renders/out/story_gold_for_the_portal.mp4`, 53.0 s.

The stills are the recorded moments rendered with the vNext stunt's camera shots, so the framings are the ones the re-record will use.

The tools I used:
- `./hb sheet` and `./hb still`, at 540x506 (the game view);
- `./hb describe`, `./hb owner` and `./hb framing`;
- `scripts/look_stats.py`;
- ffmpeg, on the cut.

Two caveats:
- `./hb owner` and `./hb framing` read the vNext line map against the old recording. Where a finding depends on the line text, I only kept it after checking the picture myself.
- Motion findings come from the old recording. The vNext stunt already uses the kit primitives (`K.open`/`K.close`, `K.turnTo` through the governor, `K.warp`, `K.walkTo`), so most of them should be gone. Each one is listed under "verify after re-record".

**The sheet:** `gold_for_the_portal_sheet.jpg`, one still per vNext shot in script order.
- S08 comes from the cut, because the barrel screen is drawn by the edit, not the renderer.
- S06b and S07b are the stunt's extra shots inside L04 and L06.

**The first frame:** `gold_for_the_portal_first_frame.jpg`, frame 0 of the cut, full 1080x1920 layout, scaled down.

## The vNext shot map, as recorded

| vNext | line | shot (stunt) | still at | what it shows |
|---|---|---|---|---|
| S01 | L01 "My GRANDMA has THROWN nine thousand GOLD into a PORTAL" | s01 | 0.0 s | Grandma side-on by the portal. The ingot is a ~15 px speck at her hand. |
| S02 | L02 "One every NIGHT" | s02 crane | 4.9 s | The cottage on its plinth at night. A 1.1 s crane. |
| S03 | L02 "And every MORNING, something comes BACK" | pov | 7.85 s | The cellar, which looks exactly as it did at night. A dark obsidian item lies at the portal's foot. |
| S04 | L03 "Some OBSIDIAN. A little STRING. Ender PEARLS." | pov x3 | 10.3 / 11.4 / 12.7 s | The floor close up, one small item each time. |
| S05 | L03 "A FIREPROOF potion" | s05 | 14.55 s | The back of Steve's head, bottom right. White sky. No potion. |
| S06 / S06b | L04 "...WEARING her gold HELMET, BLUE stripe and ALL" | s06, s06b | 17.8 / 20.75 s | Grandpa, then the close-up on the stripe (reads well). |
| S07 | L05 "GOLD keeps you SAFE ... PIGLINS won't TOUCH you in GOLD" | s07 | 23.3 s | The flashback wide. Grandpa walks into the purple. |
| S07b | L06 "He NEVER came BACK" | s07b | 26.0 s | Grandma from behind, filling 54-60 % of the frame. The portal is off frame. |
| S08 | L07 "I KEEP his GIFTS in a BARREL ..." | pov + screen | 28.6 s (cut) | The barrel screen "Grandpa's Gifts", 528 px wide. |
| S09 | L08 "Mom SAYS he's GONE ..." | pov | 30.0 s | Grandma at the portal, tossing tonight's ingot. |
| S10 | L09 "... SIXTY-FOUR ingots ..." | s10 | 33.2 s | Over his shoulder. The stack is a 10 px glint and the count is not visible. |
| S11 | L10 "She SAW my GOLD. Just ONE ..." | pov | 37.3 s | Grandma waist up, looking at us. Good. |
| S12 | L11 "When SHE went to BED, I threw IN ALL of it" | pov | 43.5 s | The portal, with the hand. |
| S13 | L11 "and SOMETHING stepped OUT" | s13 | 47.5 / 49.8 s | The piglin is 10 % of the frame. The narrator's head sits in the caption band. |
| S14 | (reveal, no line) | s14 | 51.4 s | The piglin in the striped helmet. Strong. A blurred villager arm covers the left quarter. |

## First frame: NOT a scroll-stopper

This is frame 0 of the cut (`gold_for_the_portal_first_frame.jpg`).

**What works:** the purple portal sheet is the brightest, most saturated thing in frame, and it is centred.

**What fails:**
- **Grandma's face is turned away.** We see her in profile from behind, mid-throw.
- **The gold ingot, the subject of line 1, is a 15 px speck** (1.5 % of the width) beside her hand. It hasn't reached the purple yet.
- **Nothing on screen says "nine thousand".** A muted viewer sees "a villager next to a portal".
- **The frame is dark.** Mean luma 0.24, face 0.29 (it passes the night bar, but only just).

Our bar is that 22 % stay past the opening of our best story, and this frame will not hold anyone who is not already reading the title.

**The fix (BLOCKER B1 below):**
- Put the lens on the throw line, 1.5 blocks behind the ingot and low, so the ingot crosses the purple big (6-8 % of the frame) on frame 1.
- Dress gold in the foreground so gold is the dominant colour of frame 1: 3-4 gold blocks stacked by the frame's foot, or the gold chest pulled into frame left (`set.md` keeps it 77 deg off axis).
- Turn Grandma three-quarter toward the lens after the throw, lit by a lantern 2 blocks to her camera side.

## BLOCKERS (fix before the re-record)

**B1. S01 / the first frame doesn't stop the scroll, and line 1's gold isn't readable.** (camera + dressing)
- `s01: { at: [7.6, 2.0, 6.6], look: [10.9, 2.25, 5.6], fov: 55, push: 0.25 }`: low and closer, on the ingot's path.
- Start the toss in the preroll, so the ingot is 1-1.5 blocks from the purple on frame 1.
- Move or add gold into the foreground: gold blocks at cellar (9, 1, 7) and (9, 2, 7), or the `gold_chest` prop moved into frame left.
- Add a lantern at about (8, 1, 3.5), on Grandma's camera side. Her face currently gets only portal light and the back-wall lanterns.
- Check with `./hb still story_gold_for_the_portal 0` and `look_stats --box` on her face (>= 0.25).

**B2. S05 (L03 "A FIREPROOF potion"): the line's object is never on screen, and the subject sits in the caption band.** (camera + look)
- **The problem:** the camera is 3.5 blocks above his feet (dy 15.5 against his feet at dy 12), looking down to a point 9 blocks below the horizon. Only the back of his head shows, at ~85 % down the game view, under the captions. The drink pose and the bottle are not visible.
- **Exposure:** the sky clips (7.5 % at pure white, `look_stats` WARN).
- **The easter egg:** the boxed bell does not read either.
- **Fix:** an eye-height over-the-shoulder from his right, looking out over the valley: `s05: { at: [3.3, 13.8, 8.4], look: [-16, 12.5, 60], fov: 55, push: 0.2 }`. That puts his head on the upper third, his profile and the bottle at frame left, and the valley and Hushwell's plaza at frame right.
- **The grade:** add `mood: 'village_day', grade: { exposure: 0.97 }` on this shot, or frame less sky, to bring the clip under 2 %.
- **Check:** the bell box must be a visible white speck at 540 px. If it isn't, nudge the yaw rather than pull back.

**B3. S08 (L07 "I KEEP his GIFTS in a BARREL"): the clue can't be read at phone size.** (edit setting + engine bug E1)
- **Why it matters:** the barrel's contents are the twist's evidence. Obsidian, string, pearls, soul sand, quartz, leather and fire-resistance potions are the piglin barter list.
- **The screen is small:** edit.py draws it at GUI scale 3 (`edit.py:38 GUI = 3`). The window is 528 px of the 1080 game view, so each item is ~16 px on a phone.
- **The potions look like water:** the fire-resistance potions draw as untinted water bottles (E1).
- **The caption hides half the screen:** "BARREL." covers the inventory half.
- **Fix:** draw container screens at GUI scale 4 for story Shorts. That makes the screen 704 px wide, inside the 840 px caption-safe width, and vanilla offers scale 4 at this window size. Add it as an `edit.guiScale` (or story default), then fix E1.
- **Captions:** move them over the screen's lower (inventory) third only, or keep them as they are and accept it. The gifts are in the top half.

**B4. Motion problems the owner has already named recur in the current recording.** They are probably fixed by the vNext port; verify with `./hb owner` after the re-record, before rendering. Each one is a blocker if it is still there:

| time (old cut) | the problem | the owner's note | in the vNext stunt |
|---|---|---|---|
| 29.0 s, S08 | The view turns 6.0 deg while the barrel is open. | "the background moving while a chest or barrel is open" | Uses `K.open`. The kit freezes the view while `bot.currentWindow` is set, at `lib/story.js` 580. |
| 29.95 s and 40.35 s, S09 and S10->S11 | The view whips at 321 and 246 deg/s. | "head snaps" | `K.turnTo` over 8 ticks, now capped by the turn governor. Check that the turn toward Grandma stays under 240 deg/s. |
| 31.70 s, S10's cut | Grandma lands 3 ticks after the cut and dashes 3.2 blocks across the new shot. | "mobs teleporting" | `K.warp`, and the renderer snaps a late landing onto engine-3 cuts. |
| 24.65 s, S07 (wide, in frame) | Grandma (flashback) jumps 2.1 blocks in one tick. | "mobs teleporting" | Only her yaw and pitch change inside L05. Verify. |
| 6.65 s, S03 | Walking forward, the player slows from 4.3 to 1.5 blocks/s for 0.35 s, sliding along a block. | "getting stuck on blocks" | The same `K.walkTo([P(4.6,1,3.6), P(6.3,1,4.1)])` path from the ladder's foot, so **likely to recur**. Add a first waypoint clear of the ladder shaft's corner, about `P(3.6, 1, 3.4)`, and read the path off `./hb map`. |

## FIX (should fix)

**F1. S02 crane: too fast, and the set reads as a diorama.** (camera + set)
- **Speed:** the crane drops 22 to 7.5 blocks in ~1.1 s ("One every NIGHT" is a ~1 s chunk at the new voice), which reads as a whip. Start lower and nearer, `path: [[1, 14, 22, 20], [2.2, 7.5, 16.5, 15.5]]`, so it is a slow descent, or give L02's first chunk ≥ 1.8 s of picture.
- **The set:** the end frame shows the cottage on a stone-walled pad with straight cut edges: an 18 x 27 cleared plain at y 85 (`./hb owner` NOTE `flat`; building_guide rules 8 and 12; checklist 8 "no set edge").
- **Landscaping:** fill the slope against the retaining walls with grass, coarse dirt and a few spruce or bushes, so the pad meets the hill.
- **Building-guide score for the cottage on camera: 6.5/10.** It has a pitched overhanging roof, a chimney, a garden, a lit window and lanterns, but the foundation box and the cut terrain show.
- **Light:** the subject reads at 0.20 luma, with flat contrast (0.26). Add the two gate lanterns from the shot list to the crane's end frame and one more by the door.

**F2. S03 "And every MORNING": nothing says morning.**
- **The problem:** at time 1000 the cellar is the same as at night. The subject reads 0.14 and the blacks crush (p1 0.004, `look_stats` WARN). No daylight shaft or patch is in frame, although the shot list asks for "a shaft of morning light on the floor".
- **Fix (camera):** open S03 looking up the ladder at the open hatch (the sky as a bright square), then tilt down to the portal.
- **Fix (dressing):** or dress the patch: a few `light[level=15]` blocks at the ladder's foot (set building, invisible in vanilla) plus the trapdoor open.
- **Fix (grade):** or grade the shot warm (`mood: 'golden_hour'`) so the cut from the night crane reads as a time change.
- **The obsidian on 'BACK':** it lands as a black block at the foot of a black obsidian frame on a dark floor, so it's unreadable. Drop it 1.5 blocks further out, on the lighter floor and nearer the lens.

**F3. S04 gift montage: mostly floor, with small items.**
- **The problem:** 53-62 % of the frame is within 3 blocks (`./hb framing` WARN). The string is a ~6 %-wide smudge, and three near-identical floor frames read as a stutter.
- **Fix:** pitch -40 instead of nearly straight down, items 1.2 blocks out (not ~1.8), and the portal's purple across the top third of every frame, so each morning reads as the place plus the item.

**F4. S06 (L04 "WEARING her gold HELMET"): before it goes on, the helmet is a 1 px gold sliver.**
- **The problem:** Grandpa holds it in his right hand, seen from the front. This is vanilla: `thirdperson_righthand` holds a generated item's plane sideways, so it shows edge-on (crop at 17.8 s).
- **Fix:** move the camera 35 deg to his right, `s06: { at: [6.6, 2.55 + DOWN, 8.0], look: [9.6, 2.35 + DOWN, 5.4] }`, so the sprite reads gold, or skip the hand and go straight to the helmet going on.

**F5. S07b (L06 "He NEVER came BACK"): the portal he never came back from isn't in the frame.**
- **The problem:** Grandma's back fills 54-60 % (framing WARN: too tight, and the same size as the cut before), and the purple is off frame right. It reads as "a villager in a room".
- **Fix:** `s07b: { at: [5.0, 2.7 + DOWN, 7.6], look: [9.6, 2.4 + DOWN, 5.0], fov: 50 }`. That puts her three-quarter at left third and the purple sheet at right third: the empty portal is the subject.

**F6. S10 (L09 "SIXTY-FOUR ingots"): the count never shows.**
- **The problem:** it's a camera shot, so there is no HUD, and the stack is a 10 px glint at his hip.
- **Fix:** give the line's last chunk a POV beat with slot 1's "64" on the hotbar, or a K.pose that holds the stack up into the light.
- **Keep:** the ceiling beam foreground and the purple-lit back. Good depth.

**F7. S13 ("SOMETHING stepped OUT"): the piglin is too small, and the narrator sits in the caption band.**
- **The problem:** the piglin is ~10 % of the frame (wide bar 12 %). The narrator's head and back sit at 0.62-0.80 of the frame and the frame's lower centre, where the captions go.
- **Fix:** `s13: { at: [2.0, 2.9, 7.6], look: [10.9, 2.0, 5.6], fov: 58 }`. That puts him lower-left and smaller, the portal and the piglin larger at upper-centre right.
- **The light:** the shot's subject reads 0.23 overall, but the faces pass (0.34). Fine.

**F8. S14 (the reveal): a soft villager body covers the left quarter of the payoff frame in the published cut.**
- **In the stunt:** the vNext stunt parks Grandma after the hatch shuts, so she should be gone ("When SHE went to BED" now forbids her being there).
- **In the shot list:** `shots.md` S14 still says "Grandma at the frame's left edge". **Confirm on the re-record that nothing intrudes**, and update the shot list in the story session (not here).
- **Keep:** the piglin itself is the best frame in the Short. The stripe reads in the upper half, the face is lit at 0.37, and the purple sits behind it.

**F9. The bat on the crane.** At 4.9 s and 5.95 s the recording has `mob_hurt` and `mob_death` for the bat summoned over the cottage. `/kill` on it 2 ticks before the cut can show a red-flashing, poof-dying bat at the end of the crane. Instead, `/tp @e[tag=bat] ~ -200 ~` (or kill it after the cut, under the POV).

## NIT

- **The title:** the title band ends in an emoji ("why does grandma feed the nether portal 😶"). STANDARDS 5 says no emoji; that's the story session's call.
- **Repeated cobwebs:** a cobweb sits in the top corners of 9 of the 11 cellar shots. That's fine dressing, but it repeats. Move one so the frames differ.
- **S06b:** a 98 %-height close-up (framing WARN). It is a deliberate insert on 'BLUE stripe' and it works: keep it.
- **Grandpa's skin:** Grandpa (`ari`) reads young and nearly shirtless at phone size. He is a flashback Grandpa 25 years younger, so this is acceptable. Alex or a skin with a coloured shirt would separate better from the bare stone (cast guide).
- **The thrown stack:** the 64-stack thrown in S12 draws as one ingot (engine bug E2). The shot is over in under a second.

## Lighting summary

Measured with `look_stats` (night bar ≥ 0.25):

| shot | measured on | luma | verdict |
|---|---|---|---|
| S01 | the face box | 0.29 | passes |
| S09 | Grandma | 0.34 | passes |
| S13 | faces | 0.34 | passes |
| S14 | the piglin | 0.37 | passes |
| S02 | the cottage | 0.20 | fails (F1) |
| S03 | the frame (by day) | 0.14 | fails, p1 0.004 (F2) |

S05 clips 7.5 % (B2). DoF is used only on S14, a close-up (aperture 0.7), so the sharpness rule holds. No blur problems in the stills.

## Continuity

- **S07 to S07b:** the flashback's grade holds across the cut.
- **The gold:** the 64-stack goes into slot 1 at the end of L06 and is held from L07 to L11, which matches vNext.
- **Golden boots:** visible in S10 and S13; S05 never shows the feet, which is fine.
- **Grandma tonight:** she is at the portal in S09 and mid-cellar in S11 (after walking), then climbs the ladder in S12. The vNext stunt parks her for S13 and S14, so she can't be on screen after "went to BED". Check that the recording agrees (F8).

## Engine bugs (reported separately; not fixed here)

**E1. Potions in container screens (and the HUD) draw as untinted water bottles.**
- **Vanilla:** `item/potion` plus `potion_overlay`, tinted by `potion_contents`. Fire resistance is 0xFF9900, orange.
- **Cause:**
  - `lib/harness.js` 619 `slotOf` records a slot as `[name, count(, glint)]`, with no potion colour.
  - `edit.py` 691 `item_icon` draws the bare `item/potion` sprite.
- **Fix:**
  - **The harness:** record the potion's colour as a new key on the slot (a 4th or 5th element, or an object, so old recordings stay unchanged).
  - **edit.py:** tint `potion_overlay` with that colour over the bottle, the same way `renderer/entities.js` 930 already does for thrown potions.
- **Also affects:** the "untinted bottle" nitpick in the original review (`docs/runs/2026-11-10_gold_for_the_portal.md`).

**E2. A dropped or thrown stack draws as one item, whatever its count.**
- **Vanilla:** `ItemEntityRenderer` draws up to 5 copies by count (1; 2 for > 1; 3 for > 16; 4 for > 32; 5 for > 48), jittered from a seed of the item.
- **Cause:** `lib/harness.js` 597 records only `extra.item` (the name) for an `item` entity, never its count, and `render.js` 2656-2670 builds one model.
- **Fix:** record `extra.count` from the item metadata (a new key, so old recordings render as before), then draw the vanilla number of copies in `render.js`. The vanilla offsets are the seeded random offsets of (±0.15, ±0.15, ±0.15) blocks for 3D items, and a 0.09375 z step for flat ones.
- **In this story:** S12's "I threw IN ALL of it", where 64 ingots read as 1.

**E3 (edit setting, not a bug). The container screen is drawn at GUI scale 3.**
- **Where:** `edit.py:38 GUI = 3`.
- **Is it vanilla?** Yes. Vanilla's auto scale for a 1080x1011 window is min(1080/320, 1011/240), which rounds down to 3, so this is correct. But at phone size it's unreadable for a story whose clue is in the screen.
- **Proposal:** a per-story `edit.guiScale` (4 gives a 704 px screen), used by `container_png`, and by the chat if wanted. Default unchanged, so published Shorts stay pixel-identical.

## Verify after the re-record (a checklist)

1. `./hb owner story_gold_for_the_portal`: 0 glitch blockers, specifically:
   - no view movement between `container` and `container_close`;
   - no turn over 240 deg/s;
   - no cast landing after a cut;
   - no `stuck` in S03.
2. `./hb still story_gold_for_the_portal 0` checks B1. Then stills of S05, S07b, S13 and S14 at the vNext moments check B2, F5, F7 and F8.
3. `python3 scripts/look_stats.py`:
   - S01, measured on Grandma's face: ≥ 0.25, with `--box`;
   - S03: with F2 in place, ≥ 0.35 by day;
   - S05: under 2 % clipped.

## Addendum (lead, 2026-11-10): premise-breaking set details and shot variety

**B5. "Nine thousand GOLD" has nothing on screen.**
- Across the whole recording the only gold is the single thrown ingot and Grandpa's helmet in the flashback. The
  cellar has no gold supply, no tally and no gold dust, and Grandma wears none.
- A viewer can't believe 9,000 ingots from what they see, and L09/L10's "SIXTY-FOUR ingots" never shows (F6).
- Fix (dress):
  - stack gold in the cellar: two or three open chests showing gold, a few gold blocks used as a step or table, and
    a tally of 9,000 as signs or item frames on the wall;
  - put the 64-stack in the hotbar in a POV beat on "SIXTY-FOUR".
- Keep it gold-coloured in frame from S01 on. This also fixes B1's first frame.

**B6. 27.5-50.5 s: 23 s on the same cellar angle (lead note).**
- Shots 13-17 all look at the portal from the cellar floor. Shots 15-17 run 4.9, 5.8 and 5.0 s, over the 1.5-4 s
  camera-shot rule (STANDARDS 4.5).
- Shots 4-6 (9.65-13.45 s) are three "close on the set" POVs in a row.
- Fix (camera): cut on every line, and alternate at least three set-ups:
  - the portal from the stairs, high;
  - a low reverse from the portal side, looking at Grandma and the boy;
  - an over-the-shoulder at the barrel or chest.
- Split S10 and S11 at their chunk boundaries.

**Same-framing cuts:** MS → MS at 26.90 s (s07b → s07b) and FS → FS at 34.85 s.
