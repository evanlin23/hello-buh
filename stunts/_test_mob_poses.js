// The live test of the mob poses and held items (docs/engine_features.md "Mob poses and held items"), on a real server:
//   - an allay holding a diamond (equipment mainhand: AllayModel's holding arms + ItemInHandLayer) next to an empty one
//   - a baby piglin with a gold ingot in its off hand (the admiring pose, vanilla's own client-side rule)
//   - a skeleton with AI shooting at an (invulnerable) iron golem: recorded aggressive + using its bow (the draw)
//   - a NoAI skeleton drawing on a staged mark (t_bow), the way a story stages it
//   - an evoker with AI in a pen with blue sheep, the player in creative (not a target): the real wololo spell
//     (metadata 17 recorded, a blue sheep turns red); if it hasn't cast in time, the staged { spell: 'wololo' } mark
//   ./hb record _test_mob_poses --no-strict && ./hb still _test_mob_poses t_allay+0.5 t_bow+1.2 t_shoot+1 t_cast+1.5
const { setKit } = require('../lib/story')

module.exports = {
  name: '_test_mob_poses',
  biome: 'minecraft:plains',
  botTimeout: 300,
  hideHand: false,
  edit: { caption: 'mob poses test' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A, mob } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c('/difficulty easy')   // monsters (skeleton, evoker) can't be summoned on peaceful
    await c('/gamerule mob_griefing true')   // the wololo spell needs it (EvokerWololoSpellGoal.canUse)
    await c(`/fill ${A(-14, 1, -6)} ${A(14, 8, 20)} air`)
    await c(`/fill ${A(-14, 0, -6)} ${A(14, 0, 20)} grass_block`)
    // the skeleton's shade (a skeleton with AI burns in the sun) and the golem it shoots at, both in a pen
    await c(`/fill ${A(-9, 4, 3)} ${A(-3, 4, 7)} oak_planks`)
    await c(`/fill ${A(-9, 1, 3)} ${A(-3, 1, 7)} oak_fence hollow`)
    await c(`/summon skeleton ${A(-4, 1, 5).split(' ').map((v, i) => +v + (i === 1 ? 0 : 0.5)).join(' ')} {PersistenceRequired:1b,Invulnerable:1b,Tags:["shooter"],equipment:{mainhand:{id:"minecraft:bow",count:1}}}`)
    // the golem the skeleton shoots: not Invulnerable (an invulnerable mob is no target: LivingEntity.canBeSeenAsEnemy),
    // kept alive by Resistance V and regeneration
    await c(`/summon iron_golem ${A(-8, 1, 5).split(' ').map((v, i) => +v + (i === 1 ? 0 : 0.5)).join(' ')} {NoAI:1b,PersistenceRequired:1b,Tags:["target"],Rotation:[-90f,0f],active_effects:[{id:"minecraft:resistance",amplifier:4b,duration:-1},{id:"minecraft:regeneration",amplifier:4b,duration:-1}]}`)
    // the evoker's pen with three blue sheep
    await c(`/fill ${A(4, 1, 8)} ${A(10, 1, 14)} oak_fence hollow`)
    await c(`/summon evoker ${A(7, 1, 11).split(' ').map((v, i) => +v + (i === 1 ? 0 : 0.5)).join(' ')} {PersistenceRequired:1b,Invulnerable:1b,Tags:["caster"],Rotation:[180f,0f]}`)
    for (const [x, z] of [[5, 9], [9, 13], [5, 13]]) await mob('sheep', x + 0.5, 1, z + 0.5, 0, ['flock'], 'Color:11b')
    // the line-up in front of the player (who stands at the origin facing south, +z)
    await mob('allay', -0.5, 2, 3.5, 180, ['holder'], 'equipment:{mainhand:{id:"minecraft:diamond",count:1}}')
    await mob('allay', 1.5, 2, 3.5, 180, ['empty'])
    await mob('piglin', 0.5, 1, 2.5, 180, ['baby'], 'IsBaby:1b,IsImmuneToZombification:1b,equipment:{offhand:{id:"minecraft:gold_ingot",count:1}}')
    await mob('skeleton', -2.5, 1, 3.5, 160, ['staged'], 'equipment:{mainhand:{id:"minecraft:bow",count:1}}')
    await ctx.tpCheck(X + 0.5, F + 1, Z + 0.5, 0, 10)
    await bot.waitForChunksToLoad()
    await c('/gamemode creative')   // not a target: the evoker casts only with no target, the skeleton shoots the golem
    await bot.waitForTicks(30)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const ent = (name, tagHint) => Object.values(bot.entities).filter(e => e.name === name).sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))
    // what the server says each line-up mob holds (a baby piglin was recorded with wheat seeds in its main hand)
    bot._client.on('entity_equipment', (p) => { const e = bot.entities[p.entityId]; if (e && /piglin|allay/.test(e.name)) ctx.log('equipment packet', e.name, JSON.stringify(p.equipments)) })
    for (const e of Object.values(bot.entities)) if (/piglin/.test(e.name)) ctx.log('piglin equipment at start', JSON.stringify(e.equipment.map(i => i && i.name)))
    const look = async (x, y, z, ticks = 10) => { await bot.lookAt(new ctx.Vec3(X + x, F + y, Z + z)); await bot.waitForTicks(ticks) }   // motion-ok: a test stunt, not a story
    await look(0.5, 1.6, 3.5)
    ctx.mark('t_allay'); await bot.waitForTicks(30)
    const holder = ent('allay')[0]
    ctx.log('allay equipment:', JSON.stringify(holder && holder.equipment && holder.equipment.map(i => i && i.name)))
    // the staged skeleton draws
    const staged = ent('skeleton')[0]
    await look(-2, 1.6, 3.5)
    ctx.mark('t_bow')
    if (staged) ctx.mark('pose', { ids: [staged.id], bow: true }); else ctx.log('no staged skeleton')
    await bot.waitForTicks(40)
    if (staged) ctx.mark('pose_off', { ids: [staged.id] })
    // the AI skeleton shooting at the golem
    await look(-5.5, 2, 5.5)
    ctx.mark('t_shoot')
    let aggr = 0, using = 0
    for (let i = 0; i < 60; i++) {
      const s = ent('skeleton').find(e => e.position.x < X - 3)
      if (s && s.metadata) { if (s.metadata[15] & 4) aggr++; if (s.metadata[8] & 1) using++ }
      await bot.waitForTicks(1)
    }
    ctx.log(`AI skeleton: aggressive ${aggr}/60 ticks, using its bow ${using}/60`)
    // the evoker: wait for the real wololo, else stage it
    await look(7.5, 2, 11.5)
    let cast = null
    for (let i = 0; i < 300 && !cast; i++) {
      const ev = ent('evoker')[0]
      if (ev && ev.metadata && ev.metadata[17] > 0) cast = ev
      else await bot.waitForTicks(1)
    }
    if (cast) { ctx.log('real spell, id', cast.metadata[17]); ctx.mark('t_cast', { real: true }) } else {
      const ev = ent('evoker')[0]
      ctx.log('no cast in 15 s: staging it')
      ctx.mark('t_cast', { real: false })
      if (ev) ctx.mark('pose', { ids: [ev.id], spell: 'wololo' })
      await bot.waitForTicks(40)
      await ctx.cmd(`/data merge entity @e[type=sheep,tag=flock,limit=1,sort=nearest] {Color:14b}`)
    }
    await bot.waitForTicks(80)
    // the baby piglin admiring
    await look(0.5, 1.2, 2.5)
    ctx.mark('t_piglin'); await bot.waitForTicks(30)
    ctx.mark('t_end')
    return true
  }
}
