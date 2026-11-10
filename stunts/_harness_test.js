// The harness's live test (docs/engine_features.md): records, on a real server, what the engine draws from
// recorded data. Equipment (an actor with a crossbow, a torch in the off hand and armour), actors really using items
// (a potion drunk, a golden apple eaten: LivingEntity flags), the POV opening a chest with items in it (container
// marks), a warden spawned by a sculk shrieker (it emerges: Pose.EMERGING), and the story kit's K.bury air pocket and
// K.park. Marks to still at: t_use, t_chest, t_warden, t_end.
//   ./hb record _harness_test && ./hb still _harness_test t_use+1 t_chest+0.5 t_warden+2 t_warden+5
const { storyKit, setKit, clearSet } = require('../lib/story')
const M = require('../lib/movie')

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

module.exports = {
  name: '_harness_test',
  biome: 'minecraft:plains',
  cast: { Grandpa: 'efe', Boy: 'kai', Girl: 'alex', Kid: 'noor' },
  hideHand: true,
  botTimeout: 300,
  edit: { caption: 'harness test' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A, mob } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/difficulty normal')
    await clearSet(ctx, A, 64, 24)
    await c('/kill @e[type=!player]')
    // a chest with items in it, 3 south of the camera's start
    await c(`/setblock ${A(0, 1, 3)} chest[facing=north]{Items:[{Slot:0b,id:"minecraft:diamond",count:5},{Slot:4b,id:"minecraft:bread",count:12},{Slot:13b,id:"minecraft:iron_sword",count:1},{Slot:26b,id:"minecraft:emerald",count:64}]}`)
    // the shrieker, 12 north; the Kid jumps on it (4 warnings 10 s apart, then the warden digs up next to it)
    await c(`/setblock ${A(0, 0, -12)} sculk_shrieker[can_summon=true]`)
    // the kit's parked / buried cast: two NoAI pigs
    await mob('pig', 3.5, 1, -4.5, 0, ['bury_me'])
    await mob('pig', -3.5, 1, -4.5, 0, ['park_me'])

    this.cast = await M.spawnActors(ctx, ['Grandpa', 'Boy', 'Girl', 'Kid'])
    for (const n of ['Grandpa', 'Boy', 'Girl', 'Kid']) await c(`/gamemode survival ${n}`)
    await M.place(ctx, 'Grandpa', X - 2.5, F + 1, Z - 5.5, 0)
    await M.place(ctx, 'Boy', X + 0.5, F + 1, Z - 5.5, 0)
    await M.place(ctx, 'Girl', X + 2.5, F + 1, Z - 6.5, 0)
    await M.place(ctx, 'Kid', X + 0.5, F + 1, Z - 11.5, 0)
    await M.give(ctx, 'Grandpa', 'crossbow')
    await M.giveOff(ctx, 'Grandpa', 'torch')
    await c('/item replace entity Grandpa armor.head with iron_helmet')
    await c('/item replace entity Grandpa armor.chest with leather_chestplate')
    await c('/item replace entity Girl armor.feet with golden_boots')
    await M.give(ctx, 'Boy', 'potion[potion_contents={potion:"minecraft:water"}]')
    await M.give(ctx, 'Girl', 'golden_apple')
    await M.giveOff(ctx, 'Girl', 'shield')
    await c('/effect give @a minecraft:resistance infinite 255 true')   // the warden is real: no deaths mid-test

    await c('/clear @s')
    await ctx.tpCheck(X + 0.5, F + 1, Z + 0.5, 180, 0)   // look north (yaw 180 in /tp = north) at the cast
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    // start the shrieks now: the 4th lands ~30 s in, the warden ~5 s after it, inside perform
    this.cast.Kid.setControlState('jump', true)
    this.jumpStart = Date.now()
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const K = storyKit(ctx, null, { X, Z, F })
    const at = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const lookAt = (p) => bot.lookAt(p, true)
    await lookAt(at(0, 1.5, -6))
    await bot.waitForTicks(10)

    // 1. using items: the Boy drinks (32 ticks), the Girl eats (32 ticks)
    ctx.mark('t_use')
    this.cast.Boy.activateItem()
    this.cast.Girl.activateItem()
    // the kit: one pig buried (an air pocket 30 under), the other parked in the air
    K.bury('bury_me')
    K.park('park_me')
    await bot.waitForTicks(50)

    // 2. the chest, behind the camera: turn, open it, hold, close
    await lookAt(at(0.5, 1.5, 3.5))
    await bot.waitForTicks(10)
    const chest = bot.blockAt(at(0, 1, 3))
    ctx.log('chest block:', chest && chest.name)
    const win = await bot.openContainer(chest)
    ctx.mark('t_chest')
    ctx.log('chest opened:', win.type, win.containerItems().map(i => `${i.name}x${i.count}`).join(' '))
    await bot.waitForTicks(50)
    win.close()
    await bot.waitForTicks(10)

    // 3. the warden: look at the shrieker and wait for it (at most ~45 s after the first jump)
    await lookAt(at(0.5, 1.2, -12))
    let warden = null
    const deadline = this.jumpStart + 48000
    while (!warden && Date.now() < deadline) {
      warden = Object.values(bot.entities).find(e => e.name === 'warden')
      if (!warden) await bot.waitForTicks(5)
    }
    this.cast.Kid.setControlState('jump', false)
    if (warden) {
      ctx.log('warden spawned by the shrieker after', ((Date.now() - this.jumpStart) / 1000).toFixed(1), 's, metadata pose', warden.metadata && warden.metadata[6])
      ctx.mark('t_warden', { real: true })
    } else {
      // fallback: a /summon'd warden never emerges by itself: the staged mark
      ctx.log('no warden from the shrieker: summoning one and staging the emerge')
      await ctx.cmd(`/summon warden ${X + 2.5} ${F + 1} ${Z - 12.5} {NoAI:1b,Rotation:[0f,0f]}`)
      await bot.waitForTicks(4)
      warden = Object.values(bot.entities).find(e => e.name === 'warden')
      ctx.mark('t_warden', { real: false })
      if (warden) ctx.mark('pose', { ids: [warden.id], emerge: true })
    }
    for (let i = 0; i < 150; i++) { if (warden && warden.isValid !== false) await lookAt(warden.position.offset(0, 1.5, 0)); await bot.waitForTicks(1) }
    ctx.mark('t_end')
    await bot.waitForTicks(4)
    M.quitActors(ctx)
    return true
  }
}
