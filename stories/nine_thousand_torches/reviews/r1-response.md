# nine_thousand_torches: response to round 1 (r2, 2026-11-10)

Files changed: story.json (lines, shots, props, voice, requests), beats.md, bible.md, shots.md and set.md. The words
went from 117 to 118, and the estimate from 36.5 s to about 39.5 s. JSON is valid and there are no ellipses anywhere.

## Critic must-fixes
| # | fix | change |
|---|---|---|
| 1 | The L06 "why?" hole | L06 is now "Every night, / he puts a TORCH / by my door. / Then, / see you TOMORROW." S06 is restaged (sunset): Milo crouches and places a torch on the **door spot** (the grass block one east of our doorstep), and the chat shows `<Milo> see you tomorrow`. The lit village is now that habit done for every night at once. S14's last torch goes on the same spot, along the same camera axis (the rhyme). The bible says why the spot is empty each morning: he picks the torch back up when he logs in. |
| 2 | Originality against light_sleeper | The count is now **six thousand** (L01 "Someone put / SIX THOUSAND / TORCHES / on my village / last NIGHT."; caption "who put 6,000 torches on my village 🔥"). The box shrinks to ~78 x 78 and the dressing targets 6,000-6,300. The folder, name and stunt names are unchanged. L02 is the critic's line: "FENCES. / ROOFS. / HAY bales. / Not one DARK block." S02 gains a tilt up to the ridge torches on 'ROOFS'. |
| 3 | S12-S14 staging | S12 is a POV up a 1-wide strip across the street from our door. The row turns left round the near house's front corner, and on 'GROWING' a torch appears just round the corner with Milo's arm swinging into frame (a real placement), then another. In S13 the follow rounds the corner. The row runs along the house front, then straight north across the street, skipping the dirt path, to one block short of the door spot. On 'MY door' Milo is in frame, crouched at the doorstep. In S14 his one torch closes the row. |

## Critic should-fixes (both taken)
- **S06 vanish.** After L06, Milo's bot quits and the chat adds "Milo left the game". The ordinary night is shown in
  full, so S15's chat ("Milo left the game" with no `<Milo> see you tomorrow`) shows the difference in the game
  itself.
- **L12 want.** L12 is now "One row / was still GROWING. / I had to know WHO." To keep the count under 120, L09, L11,
  L13 and L14 were tightened ("This morning, his STUFF was in OUR chest." / "His HOUSE was GONE. Just TORCHES." / "I
  followed it to MY door." / "Milo put the LAST one THERE. And WAVED.").

## Continuity fixes
| # | break | change |
|---|---|---|
| 1 | Door to cottage 48 vs 12-15 blocks | Our door is at about (-24, 6), **14 blocks** east of Milo's door at (-38, 4), the same in the bible, set.md and S08. |
| 2 | S05: Milo a speck | The crane now ends 11 blocks from Milo with the garden fence and gate lanterns in front and the west hills behind. The size is `wide`. |
| 3 | Flashback patch | Replaced by a **whole-box swap**: two `/clone` stashes (B: no story torches, cottage standing; A: all torches, no cottage), with `commandModificationBlockLimit` raised. Each swap is one command on the cut, so the S10 window can't race a restore. Both states are checked on the shot sheet before recording. |
| 4 | S09 opens on a CU | S09 is now `full`: a POV walk into the room (the largest house in the village), and the chest screen opens on 'STUFF'. No close-ups remain. |
| 5 | S10 below the sill | The kid hops onto the bed under the window as S10 opens (eye ~1.4 above the floor). |
| 6 | S12-S13 route | As critic fix 3: the strip is across the street from our door, S12 looks north, and the row runs to the doorstep with a gap at the dirt path. |
| 7 | Milo pops in at S14 | S13 shows Milo crouched at the doorstep on 'MY door'. |
| 8 | Milo still holds torches | In S13 he holds exactly one (`/item replace entity Milo weapon.mainhand with torch 1`). It's placed on 'LAST' and his hand is empty after. |
| 9 | S11 looks like the rest | S11 matches S05's angle and skyline. The footprint is 9 x 9 **coarse dirt** with a torch on every block. The size is `wide`. |
| notes | taken | S14/S15 now say the sun is out of frame (light from the right). Two villagers walk the street in S05 as the flashback cue. "fog" is gone from S04 (the dawn sky). The S11 street fence is in set.md. The strip is 1 wide. **Kneel and wave are replaced by sneak and arm swings everywhere.** |

## Where the critic and continuity overlapped, and how both are met
- **S12-S14.** The critic asked for a row growing round a corner with an arm; continuity asked for a strip across the
  street with the row running straight to the doorstep and a gap at the path. Both hold: the row goes up the strip,
  round the corner where the arm is seen, along the house front, then straight across the street (skipping the dirt
  path) to the door spot. A ~7 s time skip at the S12 → S13 cut covers Milo placing the rest.
- **The kneeling.** The critic wrote "kneeling at the door"; continuity said kneel and wave aren't vanilla player
  moves. Milo **crouches (sneak)** to place and **swings his arm twice** for the wave. L14 still says "WAVED", which
  is how players wave.

## Every-story must-fix (voice-drift rule and Pip's recipe)
- All 15 lines are the narrator's, in three **single-speaker** requests (5 lines each; owner: ≤ ~6 lines a request).
  Each uses **gemini-3.8-flash-lite-tts**, Leda, no post filter, and the recipe's direction verbatim and identical in
  every request: `[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not
  whispery, breathy or soft]`. story.json `voice` records the model, voice, recipe and rule.
- There is no other speaker (Milo is quoted, or his words are chat text), and no "true story" anywhere. The per-line
  notes are now short emotion tags.

## Also changed
- S04 is now `ews`, so no two cuts in a row are the same size (ews, ms, full, ews, wide, full, ms, wide, full, ms,
  wide, full, wide, full, ms).
- The chest no longer holds 64 torches: it's his stuff, and he used his torches.
- The engine list in set.md adds Milo's chat line (white) to the planned chat overlay, plus the bot reconnecting
  between S06 and S07.

## r2 polish (after both reviewers approved; reviews/r2-continuity.md notes, r2-critic.md should-fixes 1-3)
- **S05/S06 sizes:** S06 is now our_door's establishing `wide` (9 blocks out, the whole house front, roof and lamp
  post; the kid at frame right, nearer the lens than the door spot). S05's crane now ends 7 blocks from Milo at
  `full`, so the size still changes at every cut.
- **Name tag while sneaking:** set.md's engine row now draws a sneaking player's name dimmer, never hidden (vanilla),
  so Milo's name reads crouched in S13-S14. The bible says the same.
- **Chat and torch across the S06 → S07 cut:** the chat overlay clears (a `syschat_clear` mark) and the S06 torch is
  removed from the door spot at that cut (set.md, the bible, S06's frame).
- **Time of day:** each shot inside a scene now starts at the previous shot's end tick. A: S01 23000, S02 23060, S03
  23120, S04 23185. C: S09 23250, S10 23296, S11 23328. D: S12 23450, then a ~7 s skip at the cut, then S13 23652,
  S14 23688, S15 23742 as one continuous moment (story.json, bible.md, shots.md, set.md).
- **L15 look:** the look on 'He' is now `prop:door_spot`, since Milo vanishes on that word. L14 adds
  `prop:last_torch` on 'THERE'.
- **Critic should-fix 1:** L06 is now "Every night, / he puts a TORCH / by my door. / Then he says, / see you
  TOMORROW." L15 echoes it word for word.
- **Critic should-fix 2:** L15 has no `say`, so no `<short pause>` tag. The 0.8 s hold is built in the edit.
- **Critic should-fix 3:** Milo is pinned in S12 at block (-22, 9) facing east, placing on (-20, 9) then (-21, 9),
  his body hidden by the east wall at x -20. Test on the shot sheet; the provisional row coordinates are in the bible
  (confirm at the scout).
- **Also:** set.md now says to check at the scout that our room is at least 7 x 7 inside.
- **Count:** 120 spoken words (inside 90-120), about 39.8 s. JSON is valid; there are no ellipses in any file.
