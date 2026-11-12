# Piece: mob poses and held items
1. Skeleton bow draw (The Bell in the Window, claude/script-bell-window; also banked White Horse/Thirteen Songs):
   arms raised with the bow drawn, as vanilla's skeleton aims (charging state), triggered by a staged `pose` mark.
2. Evoker spellcasting (Red Sheep, claude/script-red-sheep): arms raised (the spellcasting pose), the spell particles
   at the hands in the wololo colour, recorded from metadata 17 or a staged mark; the arms drop 1 s after the change.
   Check the evoker model doesn't draw crossed AND free arms at once. Check a sheep's wool colour change mid-shot.
3. Piglin admiring (Saving Up for a Bastion, claude/script-saving-up-bastion): ingot held up in the off hand, head
   down to it (vanilla's admiring pose), for a baby piglin.
4. Allay held item (The Singing Box Next Door, claude/script-singing-box): the allay draws its held item (a
   diamond) with its holding arm pose, as vanilla's ItemInHandLayer on the allay. This is a build BLOCKER for that
   story: do it first.
Done: each pose in a test stunt, stills at phone size, and the stories' engine lists updated.
