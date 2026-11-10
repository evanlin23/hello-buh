# dog_hill: continuity bible

## World
- Server world, fixed seed. The plains village at (-160, -864) (a generated village: real houses, fields, villagers
  with their own AI), and the flat-topped hill north-west of it (y 106-111, 27-30 blocks above the village).
- Set origin D = the dog's block on the hill's east edge (about village + (-46, 27, -36)). Everything below is offsets from D.
- Story time: 900 days, shown as a montage, then one night. Order and light:

| line | scene | time (ticks) | weather | sun / moon |
|---|---|---|---|---|
| L01 | the dog on the hill, the village below | 23800 (sunrise) | clear | sun rising east, behind the village (backlight) |
| L02 | rain / a thunderstorm at night / zombies at night | 6000 / 18000 / 18000 | rain / thunder / clear | overcast / lightning / moon |
| L03-L04 | the kid brings the bone; the collar | 1000 (morning) | clear | low east |
| L05-L07 | the patch, the hut, the kid begs | 6000 (noon) to 9000 | clear | high |
| L08-L10 | Grandpa on the hill path | 11500 (golden hour) | clear | low west, behind the hut |
| L11 | sitting with him at dusk, then night | 13000 then 18000 | clear | sunset west, then moon |
| L12-L15 | the reveal and the end | 18000 (midnight) | clear | moon overhead |

- Every number said: 900 days (never shown as a counter); "one empty patch" = exactly one bare grass block in a
  meadow of tall grass and flowers; "a bone every morning" = a pile of bones (item entities) beside the dog.

## Places
| place | where (from D) | what's there | establishing shot | changes |
|---|---|---|---|---|
| the hilltop | D, a meadow ~20 across, natural slopes down to the east | the dog, the patch P (D + (-3, 0, 0)), the hut, flowers, tall grass, two oaks | S01: from the west, low behind the patch, the dog facing camera and the village below behind him | none (it's the same 900 days) |
| the patch P | D + (-3, 0, 0) | one grass block with nothing on it (the meadow around it is tall grass and flowers) | S05 over the dog's back | the player appears on it (L12) and leaves from it (L14) |
| the hut | D + (-10..-6, 0, -3..3) | a 5x5 dirt hut, oak door facing east (toward P and D), a torch by the door, a crafting table and a furnace outside, vines and moss on the walls, a cobweb under the eave | S06 wide | none |
| the hill path | D + (6..14, -6..-14, 6..14) down the east slope | a worn dirt path (coarse dirt), lanterns on fence posts | S08 from the plateau edge | none |
| the village | D + (46, -27, 36) | generated houses, fields, villagers | seen below in S01, S11, S15 | lights at night |

## Cast and costume
| who | mob / skin | look | where | state changes |
|---|---|---|---|---|
| the dog | wolf (pale), tame, red collar, owner = Milo (the player) | sitting, facing west at P, never turns his head | on D always | stands L12 (first time), runs to the player, sits again on "SIT" (L14) |
| Pip (narrator, "me") | baby villager, plains, no profession | small | L03: walks up from the path with a bone; L07: in front of the dog; L11-L15: sitting (still) beside him, on his right (D + (0, 0, 1)) | none |
| Grandpa | villager, plains, cartographer outfit (monocle) | old | on the hill path, D + (8, -5, 9), looking up at the plateau | none |
| Milo (the player) | the recording bot, Steve skin, no armor, empty hands | appears only L12-L14 | on P, then crouches by the dog | logs out (vanishes on the spot) after L14 |
| zombies x2 | zombie, NoAI, walked by /tp | L02 only, night | walk past the dog north to south, 2-3 blocks away | none |

## Props
| prop | first seen | state | where | later |
|---|---|---|---|---|
| bones | L03 | a pile of ~14 bone items + the new one Pip drops | D + (0.5..1.5, 0, 1..2) (the dog's right side) | always there, same pile |
| red collar | L04 (close) | red | on the dog | visible in every dog shot |
| torch by the hut door | S01 | lit | hut front, east wall | lit all story (the night scenes' light) |

## Positions and screen direction
- The dog always faces west (toward P and the hut). Camera "front" shots stand west of P looking east: the village
  is behind the dog. "Back" shots stand east of D looking west: the patch and hut in front of him.
- Pip sits on the dog's right (south) side. In every two-shot Pip is camera-left when shot from the west, right when
  shot from the east: we only shoot Pip+dog from the west after L11 (one side of the line).
- Grandpa talks up the slope to Pip: Grandpa frame-right/below, Pip frame-left/above; cameras stay south of that line.

## Who knows what
| line | Pip knows | Grandpa knows | the viewer can know |
|---|---|---|---|
| L01-L07 | a dog won't move | the dog's owner told him to sit and left | a tamed dog (collar) sitting = ordered to sit by its owner |
| L08 | "only one voice" (thinks it's a riddle) | it's the owner's voice | only the owner can stand a sitting dog |
| L10 | someone said "right back" | he saw the stranger leave | the owner is a player (the dirt hut: a player's first house), offline |
| L12-L14 | the stranger is real | | players reappear where they logged out (on P) and can leave again |

## Clue map
| clue | where | misread as | after the twist |
|---|---|---|---|
| the red collar | L04 close-up | "nobody owns him" | someone does |
| ignores the bones | L03 | he's sad / stubborn | bones only tame wild wolves: he's already someone's |
| the empty patch | L05 | he's staring at nothing | it's where his owner logged out |
| the dirt hut | L06, every front shot | an old ruin | a player's first-night house |
| "only one voice gets him up" | L08 | a riddle | the owner's |
| "said he'd be right back" | L10 | about the dog | the owner said it 900 days ago, and says it again in L14 |
