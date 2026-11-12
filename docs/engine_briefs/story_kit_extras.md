# Piece: story-kit extras for Sorry, Dear and The Statue Gets Younger
Read _common.md first. Stories: claude/script-sorry-dear (stories/sorry_dear) and claude/script-statue-younger
(stories/statue_younger): their story.json `engine`, shots.md, set.md.
1. Entity scale for players and mobs in the renderer (vanilla 1.21 `minecraft:scale` attribute; read it from the
   recording or a staged mark), incl. a change mid-shot (Sorry, Dear: the aunt 0.3 -> 0.286 on a mark, the kid 1.0 ->
   0.986; S02's three scales in one frame via jump cuts). Name tags, shadows, held items and eye height scale with it.
2. A mid-shot skin swap on a player actor at a mark (Statue: statue_mom -> statue_mom_1 -> statue_mom_2).
3. A particle trail between two points on a mark (Statue S02 head -> stone, S10 the reverse).
4. A block change on a mark mid-shot (Statue: a wrinkle row to calcite), if the kit doesn't already do it (check
   ctx/K setblock + marks first).
5. An eased head turn on a seated player actor (Statue S11), if the existing pose system can't already.
6. Props for Sorry, Dear: a mug and a teacup (display entities or small block models), static item heaps (an emerald
   pile, flat "cards") without the dropped-item bob/spin. Prefer vanilla display entities (block_display/item_display).
Done: a test stunt for each, phone-size stills, the identity set (incl. fakemod_permission, mobpov_baby_zombie) 0 px.
