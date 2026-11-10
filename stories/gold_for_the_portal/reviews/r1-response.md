# gold_for_the_portal r1: response (r2)

## Critic must-fixes
1. **The requests (the owner's drift rule, Pip's recipe).** The narrator now uses two single-speaker requests: r1
   (L01-L06) and r2 (L07, L09-L11). Both use Leda on `gemini-3.8-flash-lite-tts`, with Pip's direction verbatim and
   identical (`[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery,
   breathy or soft]`). Grandma has her own request (r3, L08, Gacrux). "True story" is gone. Per-line narrator
   directions are renamed `note`, so they aren't sent and the direction can't drift. *Conflict:* the critic asked for
   one narrator request, and the brief caps a character at about 6 lines per request. The split keeps both rules,
   because the direction text is identical. Merge r1 and r2 unchanged if a single take is wanted.
2. **S01 (muted hook).** The camera is now 4 blocks west of the portal, full figure (medium-wide), with Grandma head to
   foot. Her throw starts in the preroll, so the ingot is crossing the purple on frame 1 and is gone by about 0.4 s.
   *Conflict with continuity's note* ("one ingot can't be in the air from frame 1 to 'PORTAL'"): both are met. The
   ingot crosses on frame 1, and the rest of the line is a push on Grandma and the portal, with no second ingot.

## Continuity breaks
1. **S11/L08:** Grandma now stands mid-cellar, 3 blocks away (about x6, z4), on her way to the ladder. In S12 she is
   already climbing.
2. **S10:** Grandma walks out of frame left toward the ladder.
3. **The 64 gold:** it sits in slot 1 from S08 (visible in the barrel screen's inventory) and is held S09-S12. It is
   thrown on "ALL", and the slot empties on the throw. Updated in the bible.
4. **S13:** the camera is at about (1.3, F+2.5, 9.7), FOV 70, aimed north-east, so the ladder sits on the left edge.
   Check this on a still. The fallback is her steps on the ladder and the trapdoor sound on "OUT".
5. **S05:** the camera is now north of the gate, looking south over the valley, with the cottage corner at frame right
   and the village on the far hill.
6. **S01:** "the ladder at frame left" is removed from story.json, the bible, shots.md and set.md. The ladder is behind
   the camera.

## Continuity notes, also applied
- The `gifts_barrel` is at z 3 everywhere, at frame left in S12.
- The ender pearls are one stack of 3: a single barter drop on the third morning.
- S12: the portal is 4 blocks away.
- S02 is at time 14500, so the moon is low, not overhead.
- Set: x=11 is cleared (bookshelf, brewing stand, cauldron). The frame's bottom row sits at y -6 with no dip. The
  centre table, the lantern at (4,_,5) and the cobweb at the ladder's foot are moved.
- L03's look now uses `actor:HelloBuh` instead of `self`.

## Should-fixes applied
- **S14:** Grandma is in frame at the left edge, head and throwing arm, so the last ingot is visibly hers.
- **S04:** one gift per morning: three quick mornings, cut on the three words.
- **The trim** is pinned to `sentry` / `lapis` in the bible's cast table and staging notes. S06 and S14 must match.
- **L07** is now "So he's ALIVE. / I KNOW it."
- **S09:** the snort is clearly audible over the hum (sfx note).

## Not done
- **Ship order against One More Eye** is a scheduling call for the producer. Recommendation: don't ship them back to
  back, and keep the cellar looking different (spruce and portal glow here, the end portal frame there).

## Numbers
113 spoken words, about 42.9 s of speech and about 43.8 s with the 0.9 s hold. Valid JSON, and no ellipsis in any file I wrote.

## r2 fixes (from r2-continuity.md and r2-critic.md)
- **S13:**
  - Milo now sits on the bed's north-east corner (about x2.9, z9.0), facing the portal (east-south-east), his back to
    the lens.
  - The camera is at about (1.3, F+2.0, 9.7), FOV 70, aimed 40 degrees east of north, pitch -10. Milo lines up with
    the portal, and Grandma on the ladder lands about 6 degrees inside the left edge.
  - The fallback stays: her steps on the ladder and the trapdoor sound on "OUT". Check on a still before the build.
- **S14:** Grandma stands at about (8.8, F+1, 4.8), 1.3 blocks in front of the lens on the left edge. She stays in
  frame for the last ingot, which is now "one more ingot", not "tonight's". The same wording is in the ending beats,
  the twist, the bible and beats.md.
- **S11:** Grandma is at about x6 z3, outside S10's frame.
- **S01:** the gold chest is out of frame and dropped from the frame text, the bible's L01 row and shots.md. The portal
  is centred behind Grandma.
- **S12:** the ladder is 5 blocks west. Milo steps back to about x7.
- **S07:** the camera is at about (0.5, z2.8), aimed 95 degrees, so the ladder rungs sit on the left edge.
- **S05:** a note to confirm the garden is at least 6 blocks deep north of the gate, or else move the camera along the
  fence.
- **`gold_chest`:** the prop now has `at: [8,1,1]`.
