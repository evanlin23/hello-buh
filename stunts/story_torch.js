// Story Short "there's a torch I never placed 😳" (stories/torch): a narrated first-person story, one scene
// per line (docs/stories.md). A torch stands on the hill behind my house and I never placed it. Mom sighs
// "again?", the librarian sells me 64 torches I never asked for, the dirt under it is soft like someone filled it
// in. I dig: another torch in the wall, then another, all on the LEFT wall (how I place them), forty of them;
// the stone gets warm, something bubbles. "That's when I remembered the ONE rule of Minecraft. NEVER dig
// straight DOWN." On DOWN the pickaxe breaks the block under my feet and I drop into lava. The death screen is
// the reveal (I've dug this forty times; Mom fills it in every time). The torch on the hill loops into line 1.
//
// Minecraft-true: a real 1x1 shaft dug straight down with an iron shovel (dirt) and an iron pickaxe (stone);
// the shaft is soft dirt all the way down (filled in), and every 4 blocks a torch stands in a niche in the west
// wall, which a camera facing north sees on its left. The lava pocket sits right under the stone floor.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'torch')
const SX = 0, SZ = -10            // the shaft column (block coords relative to X, Z)
const TOP = 4                     // the hill's top layer (F + 4); the torch stands at F + 5
const FLOOR = -45                 // the stone floor at the bottom; lava under it (F - 47 .. F - 46)
const NICHES = []                 // the torch niches in the west wall: F - 2, F - 6, ... F - 42
for (let y = -2; y >= -42; y -= 4) NICHES.push(y)

module.exports = {
  name: 'story_torch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: "there's a torch I never placed 😳",
  edit: { caption: "there's a torch I never placed 😳", red: 'torch', story: 'stories/torch', startAt: 'line:0', endAfter: 'death:1.4', deathScreen: true, onFire: 'burn:death', zoom: [['hook:0', 'hook:2.9', 1.45], ['broke:0', 'death:1.4', 1.06]] },
  expectDeath: true,
  time: 12950,              // sunset: the torch on the hill glows against an orange sky

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/gamerule random_tick_speed 0')      // the grass on the filled-in column stays dirt, nothing grows or spreads
    await c('/difficulty normal')
    await clearSet(ctx, A, 64, 24)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 24)

    // --- the ground under the hill: solid stone from the floor's lava pocket up (no caves cutting into the shaft)
    for (let y0 = FLOOR - 5; y0 <= -1; y0 += 8) await c(`/fill ${A(SX - 5, y0, SZ - 5)} ${A(SX + 5, Math.min(-1, y0 + 7), SZ + 5)} stone`)
    await c(`/fill ${A(SX - 5, -4, SZ - 5)} ${A(SX + 5, -1, SZ + 5)} dirt`)
    await c(`/fill ${A(SX - 1, FLOOR - 2, SZ - 1)} ${A(SX + 1, FLOOR - 1, SZ + 1)} lava`)
    // warm stone near the bottom: magma in the walls from F - 30 down (dim orange, and it hums)
    for (let y = -30; y >= FLOOR + 1; y -= 2) {
      await c(`/setblock ${A(SX + 1, y, SZ)} magma_block`)
      await c(`/setblock ${A(SX, y - 1, SZ - 1)} magma_block`)
      if (y % 4 === 0) await c(`/setblock ${A(SX, y, SZ + 1)} magma_block`)
    }
    // --- the hill behind the house: a stepped mound of grass, 4 high, over stone
    const layers = [[1, 6], [2, 5], [3, 3], [4, 1]]
    for (const [y, r] of layers) await c(`/fill ${A(SX - r, y, SZ - r)} ${A(SX + r, y, SZ + r)} grass_block`)
    for (const [y, r] of layers.slice(0, 3)) await c(`/fill ${A(SX - r + 1, y, SZ - r + 1)} ${A(SX + r - 1, y, SZ + r - 1)} stone`)
    for (const [y, r] of layers.slice(0, 3)) await c(`/fill ${A(SX - r, y, SZ - r)} ${A(SX + r, y, SZ + r)} grass_block replace air`)
    // the filled-in column: soft dirt from the hilltop all the way to the floor (the top block shows it: a dirt
    // square under the torch, in the grass)
    await c(`/fill ${A(SX, TOP, SZ)} ${A(SX, FLOOR + 1, SZ)} dirt`)
    // the torch niches: one block into the west wall, a torch standing in each (hidden until the dirt beside it goes)
    for (const y of NICHES) { await c(`/setblock ${A(SX - 1, y - 1, SZ)} stone`); await c(`/setblock ${A(SX - 1, y, SZ)} torch`) }
    await c(`/setblock ${A(SX, TOP + 1, SZ)} torch`)

    // --- home, south of the hill: the door on its north wall, facing the hill
    await house(ctx, A, -3, 6, -1, 6, 'north', true)
    for (const [dx, dz, b] of [[-5, 5, 'poppy'], [3, 5, 'dandelion'], [4, 8, 'oxeye_daisy'], [-6, 9, 'cornflower']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // the librarian's lectern, east of the house
    await c(`/setblock ${A(9, 1, 2)} lectern[facing=south]`)
    await c(`/fill ${A(10, 1, 1)} ${A(10, 2, 1)} bookshelf`); await c(`/fill ${A(8, 1, 1)} ${A(8, 2, 1)} bookshelf`)
    await c(`/fill ${A(-14, 1, 14)} ${A(-14, 2, 14)} oak_fence`); await c(`/setblock ${A(-14, 3, 14)} lantern`)

    // --- the cast: all NoAI, moved only by the scenes
    const vil = (x, z, yaw, prof, tag) => c(`/summon villager ${(X + x).toFixed(2)} ${F + 1} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}","warm"],Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    await vil(-0.5, 4.2, 0, 'none', 'mom')                 // Mom, outside the front door, facing north (toward the camera on the hill side)
    await vil(9.5, 1.6 + 1.1, 0, 'librarian', 'lib')       // behind... in front of the lectern, facing south
    // the dog: a wolf sitting at the hill's foot (L01), then on the hilltop at the hole's edge (L06)
    await c(`/summon wolf ${X + 2.5} ${F + 1} ${Z - 3.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Sitting:1b,Tags:["dog","warm"],Rotation:[150f,0f]}`)

    await c('/clear @s')
    await ctx.hotbar(['iron_shovel', 'iron_pickaxe'])
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + 0.5, F + 1, Z - 0.5, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, say, look, line, cut } = K
    const setMeter = (v) => ctx.mark('meter', { value: v })
    const cx = X + SX + 0.5, cz = Z + SZ + 0.5
    // keep idle actors awake (a long-idle mob's first move reaches the client ~1 s late)
    const wake = (k) => say(`/execute as @e[tag=warm] at @s run tp @s ~${k % 2 ? 0.002 : -0.002} ~ ~`)
    const hold = async (slot) => { bot.setQuickBarSlot(slot); await bot.waitForTicks(1) }

    // dig the block under my feet, without awaiting (the scene keeps ticking); returns false if one is going
    let digging = null
    const digDown = () => {
      if (digging) return false
      const b = bot.blockAt(bot.entity.position.offset(0, -0.5, 0).floored())
      if (!b || b.name === 'air' || b.name === 'lava') return false
      digging = bot.dig(b, 'ignore').catch(e => ctx.log('dig', e.message)).finally(() => { digging = null })
      return true
    }
    // stand in the shaft with feet at F + dy (the column above cleared): a cut, looking straight down, north up
    const down = { yaw: 0, pitch: -1.42 }
    const shaft = async (dy, clearFrom) => {
      if (clearFrom !== undefined && clearFrom > dy) say(`/fill ${X + SX} ${F + dy} ${Z + SZ} ${X + SX} ${F + clearFrom} ${Z + SZ} air`)
      await bot.waitForTicks(1)
      ctx.mark('cut')
      say(`/tp @s ${cx.toFixed(3)} ${(F + dy).toFixed(3)} ${cz.toFixed(3)} 180 ${(-down.pitch * 180 / Math.PI).toFixed(2)}`)
      for (let i = 0; i < 10; i++) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.y - (F + dy)) < 0.1) break }
      K.base = { ...down }
      await look(0)
    }
    // dig on a schedule: one block at each tick in `ticks` (k from the line's start)
    const digOn = (k, ticks) => { if (ticks.includes(k)) digDown() }
    const spread = (a, b, n) => Array.from({ length: n }, (_, i) => Math.round(a + (b - a) * (n === 1 ? 0 : i / (n - 1))))

    setMeter(1)
    // L01: the hill behind the house, the torch on top against the dusk; walk toward it, the dog at its foot
    // 8 blocks back: closer, the hill's steps hide the torch; the edit zooms in on it (`hook` mark)
    await cut(SX + 0.9, SZ + 8.3, P(SX + 0.5, TOP + 1.45, SZ + 0.5))
    ctx.mark('hook')
    await line('L01', async (k) => { wake(k); K.base = K.aim(P(SX + 0.5, TOP + 1.45, SZ + 0.5)); look(k) })
    // L02: Mom at the front door. She sighs on "sighed" (turns half away and back, a villager's grumble)
    await cut(-0.5, 0.3, P(-0.5, 1.6, 4.2))
    ctx.mark('face_on', { near: [X - 0.5, Z + 4.2, 1.5], head: true })
    await line('L02', async (k, at) => {
      wake(k)
      if (k === at(3)) ctx.sound('entity.villager.no', 0.7, 0.9)
      if (k >= at(3) && k < at(3) + 14) say(`/tp @e[tag=mom,limit=1] ${X - 0.5} ${F + 1} ${Z + 4.2} ${(Math.sin((k - at(3)) / 14 * Math.PI) * 50).toFixed(1)} 0`)
      if (k === at(5)) ctx.sound('entity.villager.ambient', 0.6, 0.8)
      look(k)
    })
    ctx.mark('face_off')
    // L03: the librarian at his lectern; on "64 TORCHES" a stack of torches pops out toward me
    await cut(9.5, 6.4, P(9.5, 1.5, 2.7))
    ctx.mark('face_on', { near: [X + 9.5, Z + 2.7, 1.5], head: true })
    await line('L03', async (k, at) => {
      wake(k)
      if (k === at(2)) {
        say(`/summon item ${X + 9.5} ${F + 2.0} ${Z + 3.4} {Item:{id:"minecraft:torch",count:64},PickupDelay:32767,Motion:[0.0,0.22,0.16]}`)
        ctx.sound('entity.villager.trade', 0.8, 1)
      }
      look(k, 0, k >= at(2) ? -Math.min(0.12, (k - at(2)) * 0.012) : 0)
    })
    ctx.mark('face_off')
    say(`/kill @e[type=item]`)
    // L04: on the hilltop, already a block into the dirt, looking down, digging: the dirt is soft
    say(`/setblock ${X + SX} ${F + TOP + 1} ${Z + SZ} air`)
    await hold(0)
    await shaft(3, TOP)
    const L4 = S.line('L04')
    await line('L04', async (k, at) => {
      digOn(k, spread(at(0) + 2, Math.round(L4.dur * 20) - 4, 4))   // F+2, F+1, F, F-1
      look(k)
    })
    // L05: the last dirt before the first niche goes on "ANOTHER": the torch in the wall, on my left
    let from5 = null, k5 = 0
    await line('L05', async (k, at) => {
      if (k === at(2) - 5) digDown()
      if (k === at(2)) { setMeter(2); from5 = { ...K.base }; k5 = k }
      if (from5) K.turnTo(from5, new ctx.Vec3(X + SX - 0.4, F - 2 + 0.45, cz), (k - k5) / 8)   // the torch in the west wall, close
      look(k)
    })
    // L06: I look up the shaft: the square of sky, and the dog's head over the edge, whining
    say(`/tp @e[tag=dog,limit=1] ${cx.toFixed(3)} ${F + TOP + 1} ${(cz + 0.85).toFixed(3)} 180 40`)
    let from6 = null
    await line('L06', async (k, at) => {
      wake(k)
      if (!from6) from6 = { ...K.base }
      K.turnTo(from6, new ctx.Vec3(cx, F + TOP + 1.3, cz + 0.35), k / 14)
      if (k === at(2)) ctx.sound('entity.wolf.whine', 0.9, 1)
      if (k === at(4)) ctx.sound('entity.wolf.whine', 0.7, 1.1)
      look(k)
    })
    // L07: deeper, digging fast, torches passing on the left wall. TEN. TWENTY.
    await shaft(-23, -3)
    const from7 = { ...K.base }
    await line('L07', async (k, at) => {
      if (k === at(0)) setMeter(10)
      if (k === at(1)) setMeter(20)
      // from my feet up the shaft: torches lining the left wall up to a square of sky
      K.turnTo(from7, new ctx.Vec3(cx + 0.05, F + TOP + 1, cz - 0.25), k / 16)
      look(k)
    })
    // L08: deeper still: the walls glow (magma), the stone hums, something bubbles below
    await shaft(-28, -24)
    const L8 = S.line('L08')
    await line('L08', async (k, at) => {
      if (k === at(0)) setMeter(30)
      if (k >= 2 && k % 8 === 2 && k < Math.round(L8.dur * 20) - 4) digDown()
      if (k === at(3)) ctx.sound('block.lava.ambient', 0.9, 0.9)
      if (k === at(5)) ctx.sound('block.lava.pop', 1, 0.8)
      look(k, 0, Math.sin(k / 4) * 0.02)
    })
    // L09: FORTY. The last dirt; I land on stone and stop. A look at the left wall's torch on "the ONE rule"
    await shaft(-41, -29)
    let from9 = null, k9 = 0
    await line('L09', async (k, at) => {
      if (k === at(0)) setMeter(40)
      if (k >= 2 && k < at(3) && bot.entity.onGround) { const b = bot.blockAt(bot.entity.position.offset(0, -0.5, 0).floored()); if (b && b.name === 'dirt') digDown() }   // dirt to the stone floor (a dig mid-fall did nothing)
      if (k === 18) ctx.sound('block.lava.pop', 0.8, 0.9)
      if (k >= at(3) - 4 && !from9) { from9 = { ...K.base }; k9 = k }
      if (from9) K.turnTo(from9, new ctx.Vec3(X + SX - 0.5, F - 42 + 0.6, cz), (k - k9) / 10)
      look(k)
    })
    // L10: NEVER dig straight DOWN. Pickaxe out, look down, and the stone under my feet breaks on "DOWN"
    if (digging) { bot.stopDigging(); await bot.waitForTicks(2) }
    await hold(1)
    const from10 = { ...K.base }
    const floor = bot.blockAt(new ctx.Vec3(X + SX, F + FLOOR, Z + SZ))
    const digT = Math.max(2, Math.ceil(bot.digTime(floor) / 50))
    let broke = false, burnAt = 0
    await line('L10', async (k, at) => {
      K.turnTo(from10, new ctx.Vec3(cx, F + FLOOR, cz), k / 8)
      if (!broke && k === Math.max(1, at(3) - digT)) { digDown(); broke = true }
      if (broke && !burnAt && bot.entity.position.y < F + FLOOR + 0.6) { burnAt = k; ctx.mark('broke'); ctx.mark('burn') }
      look(k)
    }, 0.6)
    // in the lava: the fire overlay burns, the death comes quick (the game's own message is the reveal)
    for (let i = 0; i < 40 && !ctx.died; i++) {
      if (!burnAt && bot.entity.position.y < F + FLOOR + 0.6) { burnAt = 1; ctx.mark('broke'); ctx.mark('burn') }
      if (burnAt && i >= 10 && !ctx.died) say('/damage @s 100 minecraft:lava')
      look(i, Math.sin(i * 0.9) * 0.03, Math.sin(i * 0.7) * 0.02)
      await bot.waitForTicks(1)
    }
    if (!ctx.died) say('/damage @s 100 minecraft:lava')
    for (let i = 0; i < 50; i++) await bot.waitForTicks(1)
    ctx.mark('story_end')
    return ctx.died
  }
}
