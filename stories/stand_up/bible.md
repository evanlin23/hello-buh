# stand_up: continuity bible

## World
- Java 1.21.11 vanilla rules. An old multiplayer server, now a big player-built town. Difficulty normal.
- One afternoon, continuous, except S06 (my arrival, a few minutes earlier the same afternoon; L06 says so):
  | scene | lines / shots | time (ticks) | sun / light | weather |
  |---|---|---|---|---|
  | arrival (town edge) | L06 / S06 | 7600 | afternoon sun high-west, behind me as I walk E | clear |
  | the square | L01-L05, L07-L13 / S01-S05, S07-S13 | 8000 → 8600 by S13 | late-afternoon, sun in the west (frame left when looking N, behind camera when looking E up the hill) | clear |
  | the hill path | L13 / S14 | 8700 | warm low sun from the west lighting the hill and the hut | clear |
- Numbers said, and what the picture shows:
  - **400** players have tried (L01): the plot's sign reads `MAKE HIM STAND` / `ONE TRY EACH` / `TRIED: 400`.
    About 30 are visible in the queue; nobody says 30.
  - **ten** years sitting (L02) and **ten** years since I logged in (L06): the same ten years.
  - **eight**: my age when I built the hut (L07). So I'm eighteen now (never said).

## Places
| place | where (x,z from origin = the dog's block) | what's there | establishing shot | changes during the story |
|---|---|---|---|---|
| square | 0,0 at the square's east edge, where the hill path starts | the dog's plot: a 5 x 5 fenced square of grass with flowers, a little spruce roof on four posts over the dog (2 lanterns hung from it), a gate on the south side at 0,+3, Pia's barrel at -1,+3, the sign at +1,+3; the queue fence runs west from the gate along z=+4 for 30 blocks; the crater house at 0,-6 (north), half its south wall and roof gone in a creeper-shaped bite, ivy and moss in the crater | S01 (EWS from the W over the roofs, looking E along the queue) | at B1 the dog stands; after S12 the queue breaks up |
| town edge | -90,0, the old forest road coming in from the west | the last big old spruces (2x2 giants) of the forest that used to be here, a cobble road, the town spread out in the valley ahead, the hill on the far side | S06 (EWS from behind me) | none |
| hill path | from +3,0 straight east up the hill | a dirt path climbing a natural hill; at the top, +48,0 at about y+22: the dirt hut | S07 (WS low behind the dog), S14 (EWS) | none |
| the dirt hut | +48,0 on the hilltop | a kid's 5 x 4 x 3 dirt box with a lime wool roof, one door hole, one torch, a crafting table seen through the door. Untouched for ten years. Readable as "a lime dot on the hill" from the square | seen in S01, S07, S11, S14 | none |

## Cast and costume
| who | model / skin | look, held item | name over head | where, each scene | state changes |
|---|---|---|---|---|---|
| me (Theo), the narrator | player actor = recording bot, skin efe | empty hand all story | "Theo" (only seen in S06, S10, S12b, S14 from behind/side) | arrival: walking E on the forest road (S06); square: joins the queue's end at about -28,+5 (S10), reaches the gate at 0,+3 (S11), steps into the plot to face the dog at -1,0 (S12) | none |
| Pia | player actor, skin sunny (scale 0.75 if available) | empty hand; waves people through | "Pia" | on her barrel at -1,+3 by the gate, all story; faces S (the queue) in S05, faces E/NE toward the dog in S09; climbs down in S13 | none |
| the dog (BESTFREND) | tamed wolf, owner = the recording bot's UUID | **lime collar**; name tag `BESTFREND` | `BESTFREND` | sitting at 0,0 facing **east** (up the hill path), body yaw fixed for ten years; head may turn | stands at B1 (S12); walks beside me up the hill in S14 |
| queue players | ~30 mannequins/actors, mixed default skins | some hold a steak, a bone, goat horns (the "band"), roses | default names (short, varied) | in a line along z=+4 from the gate west; shuffle one step forward between some shots | at S12 several turn to look; one drops a steak |

## Props
| prop | first seen | state | exactly where | later |
|---|---|---|---|---|
| the sign | S01 (readable in S05 bg) | `MAKE HIM STAND` / `ONE TRY EACH` / `TRIED: 400` | +1,+3 on the gate post | unchanged (don't update the count on screen) |
| the dog's roof | S01 | spruce slabs on 4 fence posts, 2 lanterns lit | over 0,0 | unchanged; empty in S14 |
| the crater house | S03 | half destroyed, mossy, never rebuilt | 0,-6 | in bg of S09 |
| steak, bone, horns | S04 | held by queue players | at the gate | a steak dropped on the ground in S12b (an item entity) |
| the lime hut | S01 | lime wool roof | +48,0 hilltop | S07, S11 (bg), S14 |

## Positions and screen direction
- **East = up the hill = toward the hut.** The dog always faces east. In every shot looking north (S03, S05), east is
  frame right; the dog's gaze goes frame right.
- **The queue comes from the west.** It runs along z=+4 toward the gate (west → east). In S01 (looking E) it recedes
  toward the plot; in S10 (camera south of the line, looking N, drift E) it moves left to right.
- **Pia and the dog:** Pia on her barrel at the gate (SW of the dog). S05 (camera S of her) and S09 (camera SW of her) are both on the south-west side of the line between Pia and the dog, so the dog is always frame right of Pia and she looks frame right when she looks at him.
- S12b: camera W of Pia (behind her), looking E: Pia's back near, the dog and me in the plot, the hill beyond. S13 is a new
  axis (Pia and me): over my right shoulder, I'm near at frame left, Pia faces camera and looks up at me.
- S14: we walk away from camera (east, up the hill); the empty plot in the foreground.

## The narrator
- Empty hand all story (no food: he isn't trying to tempt the dog, he just clicks). The hand is visible in S11/S12a
  POV. Full hearts, no armor (a returning player who just logged in with nothing).
- He never says "my dog" before the end. He doesn't remember until the dog stands.

## Who knows what
| line | the narrator knows | Pia knows | the viewer can know |
|---|---|---|---|
| L01-L05 | the legend, the rule | the legend, the rule; she has watched hundreds fail | the rule: only the owner |
| L06-L07 | he's back after ten years; his hut is on that hill; lime roof | nothing about him | ten = ten; lime; the hut behind the dog (S01, S07) |
| L08 | BESTFREND, a kid's spelling | | an eight-year-old named this dog |
| L09 | "somebody" left him | she resents "somebody" | it's him |
| L10-L11 | he's just walking past | | dread/hope |
| B1-L12 | the dog stands: it's his; it all comes back | she understands, from his face and the dog | everything |
| L13 | he remembers his promise | | the promise was ten years ago |

## Clue map
See `beats.md` (clue map table).
