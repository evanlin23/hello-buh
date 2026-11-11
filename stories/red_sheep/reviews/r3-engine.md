# red_sheep r3: engine check (what the story needs vs what exists, 2026-11-11)

Checked in renderer/entities.js, renderer/poses.js, renderer/particles.js, renderer/entity_models.json,
lib/harness.js and docs/engine_features.md. Nothing was built.

| need | shots | status | where |
|---|---|---|---|
| sheep, dyed wool colour (blue, white, red) | all | **exists** | harness records `extra.color` from Sheep DATA_WOOL_ID per sample (lib/harness.js ~606); renderer tints wool + undercoat (entities.js ~781, ~997) |
| a sheep's colour CHANGING mid-shot (white to blue S02, blue to red S12) | S02, S12 | **verify** | the colour is recorded per sample; the undercoat mesh is only added when the sheep is first built with a non-white colour (entities.js ~997), so white-to-blue in S02 may miss the undercoat. Check on a shot sheet |
| baby sheep (the lamb) | S01-S12 | **exists** | `BABY.sheep` (entities.js ~797), `extra.baby` |
| player actors, `alex` / `kai` skins, sit pose, crossbow held | S02-S06, S09 | **exists** | lib/movie.js skins, poses.js `sit` |
| dyeing a sheep (player uses dye on it) | S02 | **probably exists** | a real interact; the swing and the colour change come from the recording; `item.dye.use` sound to check in the sfx table |
| **evoker model** | S12 | **exists, check the arms** | entity_models.json `evoker` (bones head, nose, body, arms, leg0/1, rightArm, leftArm). IllagerModel shows EITHER the crossed `arms` OR the separate arms; nothing in entities.js picks one for the evoker, so it may draw both. Check on a line-up (`node scripts/pose_fixture.js --mobs`) |
| **evoker spellcasting pose** (both arms raised and waving: IllagerModel.setupAnim, IllagerArmPose.SPELLCASTING) | S12 | **MISSING** | the harness does not record SpellcasterIllager's DATA_SPELL_CASTING_ID (metadata 17), and no pose draws it. Needs: record the spell id per sample, show the separate arms and hide the crossed ones while casting, the SPELLCASTING angles (zRot ±2.356 with a cos(age*0.6667)*0.25 wave) |
| **spell particles** (wololo brownish-orange 0.7/0.5/0.2, fangs purplish-grey 0.4/0.3/0.35, from the hands) | S12 | **MISSING** | particles.js has splash/block/portal/happy/angry/heart/poof/smoke/dust/potion/explosion/firework, no `entity_effect` spell kind. The client spawns these itself, so they must come from the spell id above |
| **evoker fangs: the rise-and-bite animation** | S12 | **MISSING (model only)** | entity_models.json `evoker_fangs` exists; no code for the warm-up (invisible), entity event 4 (the attack) or EvokerFangsModel's jaws rising out of the ground and snapping over its 22-tick life |
| evoker head turning to the camera | S12 | **probably exists** | generic head yaw from the recording |
| sounds: prepare_wololo, cast_spell, prepare_attack, evoker_fangs.attack, sheep ambient | S07, S11, S12 | **check** | vanilla sound events; confirm the audio mixer has them (docs/audio.md) |
| AI timing (the real wololo then fangs) vs staged | S12 | **staging choice** | prefer real AI (set.md); fallback NoAI + `/data` colour + hand-placed sounds on vanilla timing |

**Missing, plainly:** the evoker's casting arms (plus recording its spell state), the spell particles, and the fangs'
bite animation. To verify: the colour change mid-shot (S02's undercoat) and the evoker's crossed-vs-free arms.
Without the three missing pieces the reveal frame doesn't read (no raised arms, no particles, static fangs).
