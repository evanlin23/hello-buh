# red_sheep r3: continuity (pre-build)

Verdict: fix

The time order is right. Every shot's `time` matches the bible and `look.note`, and each jump is spoken ("Last SPRING", "One NIGHT", "Today"). The evoker isn't named or framed before S12 in the text. Size labels alternate, but the measured sizes don't (4).

## Must-fix
1. **World (r1 #1, still open):** `world.js story red_sheep` throws, and map.json has no palisade, gate, pasture or house. The generated village's box covers gate +(-136..+3, -78..+55), and Thirty-One Raids put the square at (-30, 0) and Grandpa's yard at (-8, -6). Fit the 40x30 pasture around them. The evoker (~+55) is past the footprint's edge (+54), so widen it to x ≤ -1975. Birch is 0.01 % of the survey: check that birches stand past the ford, or stamp a grove.
2. **S03:** Dad at (0, 1.6, 0) is the east gate's origin, the house has no coordinates, and its first shot is an MS. Cheapest: drop the house and shoot L03 at the pasture gate (Dad turns from the stray, MS, dye in hand).
3. **S11 to S12:** a trunk that hides the evoker from the kid's eye still hides it 1.5 blocks over. Put it off the line at lamb + (6, 0, 5), outside S11's crop. Then the fangs miss the lamb (on the line now, they bite it). Summon it at S11, not before: S01, S07 and S08 all look at that treeline.
4. **Measured sizes (a lamb is 0.65 high):** S07, S08 (lamb 12 out = 4 %) and S09 are all EWS. S11 (19 %) and S12 measure about the same. Fix: S08 lamb in the gateway 2 blocks ahead (full, 23 %), trotting out on LAMB. S09 Dad 13 blocks out (wide). Relabel S10 ews, S11 wide, S12 full. Keep S01's sheep 14+ blocks from the lens.
5. **S06:** a crossbow across his knees is hidden from behind. Shoot 3/4 rear from 7 blocks, crossbow in his hand against the sky.
6. **Words lead:** in S11 the lamb walks, then stops on STOPPED.
7. **Held item:** cast N says "empty hand". hotbar_note and the bible say shears. Pick one; it shows on S12's shoulder.

## Should-fix
8. L01 says roofs; none are in frame looking east.
9. S02 at eye height sees palisade logs, not the pasture: raise to y 4. Dad "outside" is (1.5, 0, 15).
10. S04 "filing in": the flock lives in the pasture (S01, S09). Write the walk.
11. S05: the red sheep steps in on WOODS and is centred by RED.
12. S12 (-1.5, 1.6, 2) is behind-RIGHT for a kid facing east.
13. On making: Dad's row in canon.md; update stories.md #22 (still Grandpa/Buh).
