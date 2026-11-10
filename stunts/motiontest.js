// Motion-by-construction test stunt (agent/motion-fixes, 2026-11-10): one of every story-kit motion primitive, in
// the story template's shape, on a silent voice (stories/motiontest). Not a Short: it exists to be recorded and
// measured (turn speed, GUI freeze, dig gaps, walking stalls, the cast walking, a cut with a warp).
//   L01 an eased turn to a villager's face (K.aimAt)
//   L02 the villager (a K.actor) walks to a new mark, the camera following its face
//   L03 K.walkTo around a wall and up a full-block step (a straight leg into the wall, and a corner cut into it, are
//       refused first)
//   L04 three K.dig in a row, then a K.place
//   L05 K.open on a chest, a 1 s hold (the aim target changes under the screen: the view must not move), K.close
//   L06 K.warp the villager while it's behind the camera, then a K.cut onto it; a sheep moved with the cut
const path = require('path')
const { storyLines, storyKit, setKit, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'motiontest')
const CAPTION = 'motion test'

module.exports = {
  name: 'motiontest',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: { caption: CAPTION, red: 'motion', story: 'stories/motiontest', startAt: 'line:0', endAfter: 'story_end:0' },
  hideHand: false,          // the hand and the held shovel are part of the test
  look: 'auto',

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await clearSet(ctx, A, 40, 20)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 50, -4, 20)

    await c(`/fill ${A(3, 1, -1)} ${A(3, 2, 1)} cobblestone`)          // the wall the walk goes around
    await c(`/fill ${A(5, 1, 0)} ${A(9, 1, 5)} stone_bricks`)          // the full-block step up (a platform)
    await c(`/fill ${A(8, 2, 1)} ${A(8, 2, 3)} dirt`)                  // three blocks to dig
    await c(`/setblock ${A(6, 2, 4)} chest[facing=north]{Items:[{Slot:13b,id:"minecraft:apple",count:3}]}`)

    await vil(0.5, -4.5, 0, 'farmer', ['vil', 'warm'])
    await mob('sheep', 6.5, 1, -8.5, 90, ['sheep', 'warm'])

    await c('/clear @s')
    await c('/item replace entity @s hotbar.0 with iron_shovel')
    bot.setQuickBarSlot(0)
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + 0.5, F + 1, Z + 0.5, -90, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F } = this
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, look, line, cut } = K

    // L01: start facing east, then an eased turn to the villager's face (90 degrees)
    await cut(0.5, 0.5, P(10, 1.6, 0.5))
    const vil = K.actor('vil', { x: 0.5, z: -4.5, yaw: 0 })
    const sheep = K.actor('sheep', { x: 6.5, z: -8.5, yaw: 90 })
    const vface = () => K.face(P(vil.x, 1, vil.z), 'villager')
    await line('L01', async (k) => {
      if (k === 4) await K.aimAt(vface())
      look(k)
    })

    // L02: the villager walks 4 blocks west at a villager's pace; the camera follows its face
    await line('L02', async (k) => {
      if (k < 22) K.step(vil, -0.18, 0)
      K.base = K.aim(vface())
      look(k)
    })

    // L03: a straight walk through the wall is refused before anything moves; then the path around it and up the step
    try {
      await K.walkTo([P(5.5, 1, 0.5)])
      ctx.log('motiontest: FAIL: K.walkTo walked a leg through the wall')
    } catch (e) { ctx.log('motiontest: walkTo refused the wall leg as expected: ' + e.message) }
    // ...and so is a path whose legs are clear but whose cut corner runs into the wall's corner (the dry run)
    try {
      await K.walkTo([P(2, 1, 2.5), P(4, 1, 2.5), P(6.5, 2, 2.5)])
      ctx.log('motiontest: FAIL: K.walkTo walked a corner it cuts into the wall')
    } catch (e) { ctx.log('motiontest: walkTo refused the tight corner as expected: ' + e.message) }
    await line('L03', async (k) => {
      if (k === 0) await K.walkTo([P(1.5, 1, 3.5), P(4.5, 1, 3.5), P(6.5, 2, 2.5)])
      look(k)
    })

    // L04: three digs in a row (5-tick destroyDelay between), then a block placed where the middle one was
    await line('L04', async (k) => {
      if (k === 0) {
        for (const z of [1, 2, 3]) await K.dig(bot.blockAt(P(8, 2, z)))
        await K.place(P(8, 2, 2), 'oak_planks')
      }
      look(k)
    })

    // L05: the chest: open, hold 1 s while the aim target moves (the view must hold), close
    await line('L05', async (k) => {
      if (k === 0) {
        const w = await K.open(P(6, 2, 4))
        const held = { ...K.base }
        for (let i = 0; i < 20; i++) {
          K.base = { yaw: held.yaw + 0.6 * i / 20, pitch: held.pitch }   // the target drifts 34 deg: nothing should turn
          look(i)
          if (i === 10) { K.warp('vil'); vil.x = 12.5; vil.z = -1.5; vil.yaw = 0 }   // off screen (behind the camera)
          await bot.waitForTicks(1)
        }
        K.close(w)
        K.base = K.aim(P(6.5, 2.5, 4.5))
      }
      look(k)
    })

    // L06: a cut onto the villager at its new mark; the sheep is moved with the cut (it lands on the cut)
    await cut(12.5, 2.5, vface(), 1, { after: () => { sheep.x = 10.5; sheep.z = -1.5 } })
    await line('L06', async (k) => {
      if (k > 6 && k < 20) K.step(vil, 0, 0.1)
      K.base = K.aim(vface())
      look(k)
    })

    ctx.mark('story_end')
    await ctx.bot.waitForTicks(4)
    return true
  }
}
