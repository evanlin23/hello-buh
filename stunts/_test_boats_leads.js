// The live test of boats, leads and passengers (docs/engine_features.md "Boats, leads and passengers"), ~10 s:
//   1. a man (player actor) walks east over grass holding a lead; on it an oak boat with a baby villager sitting in it
//      slides after him (vanilla 1.21: boats can be leashed; the server pulls it)            t_walk
//   2. he gets into his own boat at the shore and rows a gentle S-bend (K.row: the oars animate, the strokes sound);
//      the led boat follows him onto the water, the kid riding in it                          t_board, t_row
//   3. a third boat tied to a fence post on the bank (a leash knot)                             (all through)
//   ./hb record _test_boats_leads && ./hb still _test_boats_leads t_walk+1 t_row+2 t_row+4.5
const { storyKit, setKit } = require('../lib/story')
const M = require('../lib/movie')

module.exports = {
  name: '_test_boats_leads',
  biome: 'minecraft:plains',
  botTimeout: 300,
  hideHand: true,
  edit: { caption: 'boats, leads and passengers' },
  cast: { Man: 'steve' },
  // one tracking camera on the south side, 6 blocks off the man, looking a little behind him (the led boat in frame)
  shots: {
    track: { subject: ['actor:Man'], follow: 'actor:Man', offset: [-3.6, 3.4, 15.5], lag: 6, look: { of: 'actor:Man', offset: [-3.6, -1.4, 0] }, fov: 62, dof: false }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    // grass from x -26 to 4, a pond from 4 to 40 (3 deep), a bank and a fence post on its south shore
    await c(`/fill ${A(-26, 1, -14)} ${A(40, 12, 22)} air`)
    await c(`/fill ${A(-26, -4, -14)} ${A(40, 0, 22)} grass_block`)
    await c(`/fill ${A(4, -3, -12)} ${A(40, 0, 8)} water`)
    await c(`/setblock ${A(10, 1, 9)} oak_fence`)
    await c(`/setblock ${A(13, 1, 9)} oak_fence`)
    await c(`/fill ${A(-3, 1, 15)} ${A(-1, 3, 17)} grass_block`)   // the camera's knoll
    this.cast = await M.spawnActors(ctx, ['Man'])
    await c('/gamemode survival Man')
    await c('/tag Man add man')
    await M.place(ctx, 'Man', X - 15.5, F + 1, Z + 0.5, -90, 0)
    // the kid's boat, the kid sitting in it (summoned together: Passengers)
    await c(`/summon oak_boat ${X - 17.5} ${F + 1} ${Z + 0.5} {Rotation:[-90f,0f],Tags:["boat_kid"],Invulnerable:1b,Passengers:[{id:"minecraft:villager",Age:-24000,NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["kid"],Rotation:[-90f,0f],VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1}}]}`)
    // his own boat at the shore, floating (summoned at the surface it settles there; under it, it sinks and throws him out)
    await c(`/summon oak_boat ${X + 5.2} ${F + 1} ${Z + 0.5} {Rotation:[-90f,0f],Tags:["boat_man"],Invulnerable:1b}`)
    // a boat tied to the fence post
    await c(`/summon oak_boat ${X + 11.5} ${F + 1} ${Z + 6.5} {Rotation:[0f,0f],Tags:["boat_tied"],Invulnerable:1b}`)
    await ctx.tpCheck(X - 1.5, F + 4, Z + 16.5, 180, 15)
    await bot.waitForTicks(30)
    const K = storyKit(ctx, { line: () => ({ dur: 1, gap: 0 }), gap: 0 }, { X, Z, F })
    this.K = K
    // the lead: he right-clicks the kid's boat holding one (vanilla), and the tied boat's lead goes to the post
    await K.leash('Man', K.entity('oak_boat', [-17.5, 1, 0.5]))
    await K.leash([10, 1, 9], 'boat_tied')
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F, K } = this
    const look = (x, y, z) => bot.lookAt(new ctx.Vec3(X + x, F + y, Z + z))
    // 1. the walk: K.actor moves him at a walk (<= 0.3 blocks a tick) to the shore; the boat comes after him
    const man = K.actor('man', { x: -15.5, z: 0.5, yaw: -90 })
    M.shot(ctx, 'track')
    ctx.mark('t_walk')
    for (let k = 0; k < 80; k++) {
      man.x = Math.min(3.6, -15.5 + k * 0.24)
      look(man.x - 3, 1, 0.5)
      await bot.waitForTicks(1)
    }
    // 2. into his boat (the kit stops moving him: the boat does now) and row an S-bend east
    ctx.mark('t_board')
    await K.board('Man', 'boat_man')
    await bot.waitForTicks(6)
    ctx.mark('t_row')
    const row = K.rowing('Man', [[9, 0.5], [16, -3], [24, 0], [32, -2]], { speed: 0.3 })   // a steady row: the lead pulls the kid's boat without a yank
    let done = false
    row.then(() => { done = true })
    while (!done) {
      const me = bot.players.Man && bot.players.Man.entity
      if (me) look(me.position.x - X - 2, 1, me.position.z - Z)
      await bot.waitForTicks(1)
    }
    const end = await row
    ctx.log('row ended at', JSON.stringify(end))
    await bot.waitForTicks(20)
    return true
  }
}
