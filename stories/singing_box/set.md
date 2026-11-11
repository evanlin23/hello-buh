# singing_box: set plan (r1)

**Place:** the lowland under Torch Hill, by the Digger's House (map.json `digger_house`, at (-245, 67, -650),
footprint (-300, -692, -232, -636)). Day 1500. The place is not claimed yet: the build claims `torch_hill_cottages`
(`node scripts/world.js claim`) after reading the ground y off the survey; the numbers below are offsets to confirm.

- **The old torch shaft** (canon stamp `torch_hill`, since 300): air from y 44 to 84 at (-290, -684), a wall torch
  every 4 blocks on the left (west) wall, the torch on the slope at y 85. Her way down. She extends it: a ladder on the
  east wall from y 84 to y -54 (her own; the Digger's torches stay).
- **Her tunnel:** y -54 (deepslate; the lava aquifer level, inside diamond's band), from the shaft foot 12 blocks east to
  the blast face (-278, -54, -684). Lit by her torches on the south wall.
- **The lava pool:** against the north wall, 4-8 blocks east of the shaft foot, 2 deep (natural aquifer lava).
- **The hole:** 1x1 in the north wall at y -52 (two above the floor, above the lava), about (-284, -52, -685). Behind
  it, his note block on his side at (-284, -52, -686).
- **His room:** 3x3x3 at (-285..-283, -54..-52, -689..-686), one block of deepslate between it and her tunnel except
  the hole; his ladder up in its north-west corner to his cottage. Torch-lit. Nothing in it but him and the note block.
- **The cottages:** hers (birch and cobble) by the shaft top; his (spruce) about 8 blocks north-east of hers, his
  window facing the shaft top (S10). Both new.
- **Earshot:** every spot in her tunnel is within 12 blocks of his note block (the face is 6 east of the hole), so the
  allay hears every note (16-block rule) wherever it gathers.

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| 31 found, she never had more than one (L01) | he gets every delivery; her one is the allay's held item, which an allay keeps | count the deliveries in the bible |
| an allay holding a diamond looks for diamonds (L02) | vanilla: it collects items matching its held item | wiki |
| TNT bounces diamonds everywhere (L04) | ore blown by TNT drops its item (diamond ore drops a diamond); the blast happens before the drops spawn | S04 |
| the singing box is where finds go (L05) | vanilla: an allay delivers to a note block it heard | wiki |
| the box sings every time I come close (L07) | he taps it every few seconds; the allay is always within 16 blocks of it | S07 |
| they're gone when I look back (L08) | he picks them up through the hole (a player picks up items within 1 block; the drop lands on his side) | S08 jump cut |
| she climbs out with empty hands (L09) | nothing is ever delivered to her | S09 |
| 31 diamonds on him (S13) | full armour 24 + pickaxe 3 + sword 2 = 29; 2 more never shown (spent) | S13 |

## Vanilla notes for the build
- The allay is NoAI and moved per tick (as every story mob); its deliveries are staged as item throws onto the note
  block. Real tapping: the note block plays on the tap (note particle, `block.note_block.harp`).
- Her pickaxe is iron (she can mine diamond ore; she uses TNT for speed).
