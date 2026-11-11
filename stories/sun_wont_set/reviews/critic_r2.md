Verdict: REVISE. One must-fix is still open: the voice.

**Round-1 must-fixes**
1. S01 now opens on the zombies under the tree, the lever and the sun. Resolved.
2. L05 now reads "Will the sun go DOWN today?" Resolved.
3. L12 now reads "Let the night COME. YOU need SLEEP, kid." with the direction "full voice". Resolved.
4. L08 now has its own direction. Resolved.
5. The butcher line and S03 are cut. S10 shows the white bed in his hand beside the red bed. Resolved.
6. S16 now sits 4 east and 2 down the slope. Resolved.
7. S17 has the moon, the circle of phantoms, a diver filling a third of the frame, two hits and the death screen. Resolved.
8. The canon is done: conflict 18, timeline 1100, the Grandpa row, the lever stamps, Gary from 1101. The re-voice is **not** done. `voice/voice.json` is still the old Kokoro am_adam take with the old text ("in my world", "The butcher fell asleep standing up"), and its line ids no longer match. Record r_a, r_gp, r_b and r_c (Leda and Rasalgethi) before the build.

**Should-fix (new, stale references)**
- L05's `look.word` is "TONIGHT", a word the line no longer has. Change it to "DOWN".
- `ending.after` is "L17". The last line is now L16.
- S05's frame says "he says L06" and S11's says "he says L13". They should say L05 and L12.
- The S17 sfx has "hurt x3" but the ending has two hits. Make it x2.
- L03 and S04 repeat what S01 already shows (the zombies in the shade). Cut L03, or make S04 a different angle with new information.
- canon.md's table still has `gary` "1100 on" while map.json says 1101. Link 5 still says the rewatch "gains a farmer".
- L08 shares request r_b with five other lines. The note asks for its own take.

Once the voice is re-recorded with the r3 text, this is approve.
