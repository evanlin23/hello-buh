// Story Short "who keeps FIXING my house 😳" (stories/put_back). A mystery: a creeper blew up the
// narrator's house three years ago, and every day one more block of it is back, the exact one he
// lost, even the cracked ones. Purple sparkles on the grass, villagers walking past staring at
// their feet, and it started with his brother's room. His brother went to the End to fight the
// dragon and never came back; he used to hum the same song all day. The narrator pretends to nap
// and catches an enderman putting a block back. It turns its whole body away, then hums the song.
// It's his brother, who came back as one of them: if their eyes meet he has to hurt him, so he
// only comes while the narrator's eyes are shut. "So now I nap every day. And I never peek. Which
// is why" loops into "Every day, one more block of my house is back."
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap; actions land on caption
// chunks (at(k)). Every mob is NoAI/NoGravity and moved by /tp; the enderman and the villagers get
// invisible micro-moves while waiting off stage, so their first real move isn't late.
const path = require('path')
const { storyLines, storyKit, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'put_back')
const CAPTION = 'who keeps FIXING my house 😳'
const SONG = [[0, 1.0], [4, 1.26], [8, 1.5], [12, 1.26], [16, 1.0], [22, 0.84], [26, 1.0]]   // his song: [tick, pitch] on the harp

module.exports = {
  name: 'story_put_back',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: { caption: CAPTION, red: 'FIXING', story: 'stories/put_back', startAt: 'line:0', endAfter: 'story_end:0' },

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
    await clearSet(ctx, A, 64, 28)              // a wide flat clearing (lib/story.js)
    await plainsBiome(ctx, A, 64, -4, 30)       // one grass colour over the set
    await c('/kill @e[type=!player]')

    // --- my house: stone bricks (x -3..3, z -8..-2), the south-east corner still blown open
    await c(`/fill ${A(-3, 0, -8)} ${A(3, 0, -2)} cobblestone`)
    await c(`/fill ${A(-3, 1, -8)} ${A(3, 3, -2)} stone_bricks hollow`)
    for (const [dx, dy, dz] of [[-3, 1, -5], [-1, 3, -8], [1, 2, -8], [3, 2, -6], [-2, 2, -2], [-3, 3, -3], [0, 1, -8], [3, 1, -7]]) await c(`/setblock ${A(dx, dy, dz)} cracked_stone_bricks`)
    for (const [dx, dy, dz] of [[-3, 2, -7], [2, 3, -8], [-1, 1, -2], [3, 3, -5]]) await c(`/setblock ${A(dx, dy, dz)} mossy_stone_bricks`)
    await c(`/fill ${A(-1, 2, -2)} ${A(-1, 2, -2)} air`)                       // a window...
    await c(`/fill ${A(-3, 4, -8)} ${A(3, 4, -2)} spruce_planks`)
    await c(`/setblock ${A(-1, 4, -6)} glowstone`); await c(`/setblock ${A(-2, 4, -4)} glowstone`)
    // the blast: the corner, the roof over it and a crater in the floor and the grass
    await c(`/fill ${A(1, 1, -4)} ${A(3, 4, -2)} air`)
    await c(`/fill ${A(2, 3, -5)} ${A(3, 4, -5)} air`)
    await c(`/fill ${A(0, 4, -3)} ${A(0, 4, -2)} air`)
    await c(`/fill ${A(1, 0, -3)} ${A(4, 0, 0)} coarse_dirt`)
    await c(`/fill ${A(2, -1, -2)} ${A(3, 0, -1)} air`)
    await c(`/fill ${A(2, -2, -2)} ${A(3, -2, -1)} coarse_dirt`)
    // ... and the blocks that are already back: the first two wall blocks of the corner
    await c(`/setblock ${A(1, 1, -2)} stone_bricks`)
    await c(`/setblock ${A(1, 1, -3)} cracked_stone_bricks`)
    // where I nap: a red wool bed with a white pillow against the north wall
    await c(`/fill ${A(-2, 1, -7)} ${A(-1, 1, -7)} red_wool`); await c(`/setblock ${A(-2, 1, -6)} white_wool`)
    await c(`/setblock ${A(-2, 1, -7)} white_wool`)
    await c(`/setblock ${A(-1, 1, -6)} red_wool`)
    await c(`/setblock ${A(0, 1, -7)} crafting_table`)

    // --- my brother's room: a dark oak annex on the west side, rebuilt first, so it's perfect
    await c(`/fill ${A(-9, 0, -8)} ${A(-4, 0, -3)} spruce_planks`)
    await c(`/fill ${A(-9, 1, -8)} ${A(-4, 3, -3)} dark_oak_planks hollow`)
    await c(`/fill ${A(-10, 4, -9)} ${A(-3, 4, -2)} dark_oak_slab`)
    await c(`/setblock ${A(-7, 4, -6)} glowstone`); await c(`/setblock ${A(-6, 4, -5)} glowstone`)
    await c(`/fill ${A(-7, 1, -3)} ${A(-6, 2, -3)} air`)                       // its open front
    await c(`/fill ${A(-8, 2, -8)} ${A(-7, 2, -8)} glass`)
    await c(`/setblock ${A(-8, 1, -7)} note_block`)
    await c(`/fill ${A(-8, 1, -5)} ${A(-8, 1, -4)} blue_wool`)
    await c(`/fill ${A(-7, 1, -7)} ${A(-5, 1, -5)} light_blue_carpet`)
    await c(`/setblock ${A(-5, 1, -7)} bookshelf`)
    await c(`/setblock ${A(-5, 2, -7)} flower_pot`)

    // --- the street in front, flowers, and the End portal he went through (south-west)
    await c(`/fill ${A(-14, 0, 2)} ${A(14, 0, 4)} dirt_path`)
    for (const [dx, dz, b] of [[-5, 0, 'poppy'], [5, 1, 'dandelion'], [-2, 1, 'cornflower'], [7, -3, 'oxeye_daisy'], [-11, -1, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    const PX = -10, PZ = 12
    await c(`/fill ${A(PX - 3, 0, PZ - 3)} ${A(PX + 3, 0, PZ + 3)} stone_bricks`)
    await c(`/fill ${A(PX - 1, 1, PZ - 2)} ${A(PX + 1, 1, PZ - 2)} end_portal_frame[facing=south,eye=true]`)
    await c(`/fill ${A(PX - 1, 1, PZ + 2)} ${A(PX + 1, 1, PZ + 2)} end_portal_frame[facing=north,eye=true]`)
    await c(`/fill ${A(PX - 2, 1, PZ - 1)} ${A(PX - 2, 1, PZ + 1)} end_portal_frame[facing=east,eye=true]`)
    await c(`/fill ${A(PX + 2, 1, PZ - 1)} ${A(PX + 2, 1, PZ + 1)} end_portal_frame[facing=west,eye=true]`)
    await c(`/fill ${A(PX - 1, 1, PZ - 1)} ${A(PX + 1, 1, PZ + 1)} end_portal`)

    // --- the cast, all NoAI and NoGravity, waiting off stage
    const mob = (type, x, y, z, yaw, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,0f]${more}}`)
    await mob('enderman', 20, 1, 20, 0, 'ender')
    const vd = (prof, type) => `,VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1`
    for (let i = 0; i < 3; i++) await mob('villager', -22 - i * 1.6, 1, 3.0, -90, `v${i}`, vd(['farmer', 'librarian', 'mason'][i], ['plains', 'taiga', 'savanna'][i]))

    await resendChunks(ctx, X, Z)               // mineflayer ignores biome updates: reload the chunks
    await c('/clear @s')
    await ctx.tpCheck(X, F + 1, Z + 8, 180, 0)
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
    const tp = (tag, x, y, z, yaw, pitch = 0) => say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} ${pitch}`)
    const go = (on) => bot.setControlState('forward', on)
    const put = (dx, dy, dz, block) => {                  // a block comes back: puff of purple, a soft place sound
      say(`/setblock ${X + dx} ${F + dy} ${Z + dz} ${block}`)
      ctx.particles('portal', P(dx + 0.5, dy + 0.5, dz + 0.5), { count: 40 })
      ctx.sound('block.stone.place', 1, 0.9)
    }
    const song = (k0, k, pitchMul = 1, vol = 0.7) => { for (const [t, p] of SONG) if (k === k0 + t) ctx.sound('block.note_block.harp', vol, p * pitchMul) }

    // the enderman and the villagers: state that's re-sent every tick (micro-moves while idle)
    let jig = 0
    const E = { x: 20, y: 1, z: 20, yaw: 0 }
    const V = [0, 1, 2].map(i => ({ x: -22 - i * 1.6, z: 3.0 }))
    const cast = () => {
      jig = (jig + 1) % 4
      const j = jig < 2 ? 0.004 : -0.004
      tp('ender', E.x + j, E.y, E.z, E.yaw)
      for (let i = 0; i < 3; i++) tp(`v${i}`, V[i].x + j, 1, V[i].z, -90, 45)   // heads down: nobody looks at it
    }

    // L01: close on the blown-open corner; on "is BACK" one more block pops into the wall
    await cut(1.7, 0.6, P(1.5, 1.6, -2))
    await line('L01', async (k, at) => {
      cast()
      if (k === at(3)) put(1, 2, -2, 'stone_bricks')
      K.base = K.aim(P(1.5, 2.0 - Math.min(k, 30) * 0.004, -2)); look(k)
    })
    // L02: a creeper blew it up three years ago (wide, the crater; the blast flashes on "blew it up")
    await cut(6.5, 7.5, P(0.5, 1.6, -4))
    await line('L02', async (k, at) => {
      cast()
      if (k === at(1)) { ctx.particles('explosion', P(2.5, 1.5, -2.5), { radius: 3 }); ctx.sound('entity.generic.explode', 0.6, 1) }
      look(k, k > at(1) && k < at(1) + 8 ? Math.sin(k * 1.9) * 0.02 : 0)
    })
    // L03: the exact ones I lost, even the cracked ones (along the west wall)
    await cut(-5.2, -0.6, P(-3, 2.0, -3.5))
    await line('L03', async (k, at) => { cast(); if (k >= at(3) - 2) { K.base = K.aim(P(-2.6, 2.6 + Math.min(k - at(3), 8) * 0.01, -3)) } look(k) })
    for (let i = 0; i < 3; i++) V[i].x = -9 - i * 1.7   // into place off shot, a line early
    // L04: purple sparkles on the grass, every day (low, in front of the crater)
    await cut(4.6, 2.6, P(2.5, 0.9, 0))
    await line('L04', async (k, at) => {
      cast()
      if (k % 6 === 0) ctx.particles('portal', P(2.6 + Math.sin(k) * 0.8, 1.05, 0.2 + Math.cos(k * 1.3) * 0.8), { count: 18 })
      if (k === at(1)) ctx.particles('portal', P(2.5, 1.1, 0.5), { count: 50 })
      look(k)
    })
    // L05: the villagers walk past it staring at their feet
    await cut(4.5, 7.5, P(-9.5, 1.6, 3))
    await line('L05', async (k) => {
      for (let i = 0; i < 3; i++) V[i].x += 0.16
      cast(); K.base = K.aim(P(V[1].x + 0.5, 1.6, 3)); look(k)
    })
    for (let i = 0; i < 3; i++) V[i].x = -30 - i * 1.6
    // L06: and it started with my brother's room (the annex, perfect)
    await cut(-6.5, 1.0, P(-6.5, 1.7, -6))
    await line('L06', async (k) => { cast(); go(k > 3 && bot.entity.position.z > Z - 2.4); look(k) })
    go(false)
    // L07: he went to the End to fight the dragon (the portal); he never came back
    await cut(-10.5, 8.4, P(-9.5, 1, 12.5))
    await line('L07', async (k, at) => { cast(); K.base = K.aim(P(-9.5, 1.2, 12.5 - Math.min(k, 50) * 0.01)); look(k, 0, k > at(4) ? -0.08 : 0) })
    // L08: he used to hum the same song all day (his room, the note block)
    await cut(-5.5, -4.2, P(-7.5, 1.4, -6.5))
    await line('L08', async (k, at) => { cast(); song(at(1), k); look(k) })
    // L09: so today I pretended to nap (on my bed, looking up, then out at the open corner)
    E.x = 6; E.z = 2.5; E.yaw = 45
    await cut(0.5, -5.5, P(-1.5, 1.2, -6.5))
    let from = null
    await line('L09', async (k, at) => {
      cast()
      if (k >= at(2) - 2) { from = from || { ...K.base }; K.turnTo(from, P(2.4, 2.0, -1.5), (k - at(2) + 3) / 12) }
      look(k)
    })
    // L10: something tall walked up to the wall (out through the hole: it comes into view)
    await line('L10', async (k) => {
      if (E.x > 3.0) { E.x -= 0.11; E.z -= 0.035 } else E.yaw = 150
      cast(); look(k)
    })
    // L11: and put a block back
    await line('L11', async (k, at) => { cast(); if (k === at(2)) put(2, 1, -2, 'cracked_stone_bricks'); look(k) })
    // L12: an enderman (cut outside, close, it stands at the wall facing it)
    E.x = 2.6; E.z = -0.6; E.yaw = 180
    await cut(5.5, 1.2, P(2.6, 2.6, -0.6))
    await line('L12', async (k) => { cast(); look(k) })
    // L13: I opened my eyes a little (it faces me)... it turned its whole body away
    await cut(2.1, 3.4, P(2.6, 2.6, -0.6))
    await line('L13', async (k, at) => {
      if (k < at(3)) E.yaw = 0                              // facing me (south)
      else E.yaw = Math.min(180, (k - at(3)) * 30)          // swings round to the wall
      cast(); look(k, 0, k >= at(3) ? -0.04 : 0)
    })
    // L14: and then it hummed: the song my brother always hummed (lower, with its warble)
    await line('L14', async (k, at) => {
      cast()
      if (k === at(1)) ctx.sound('entity.enderman.ambient', 0.5, 1.2)
      song(at(1) + 4, k, 0.84)
      look(k, Math.sin(k / 8) * 0.05)
    })
    // L15: it's him (closer on his back)
    await cut(2.6, 1.3, P(2.6, 2.4, -0.6))
    await line('L15', async (k) => { cast(); look(k) })
    // L16: he came back from the End (the portal), as one of them (him again)
    await cut(-10.5, 8.6, P(-10.5, 1.0, 12.5))
    await line('L16', async (k, at) => {
      cast()
      if (k === at(3) - 1) await cut(4.4, 2.6, P(2.6, 2.6, -0.6))
      look(k)
    })
    // L17: if our eyes meet he has to hurt me (his head starts to turn; I look away fast)
    await cut(1.0, 2.4, P(2.6, 2.7, -0.6))
    await line('L17', async (k, at) => {
      if (k >= at(1) && k < at(3)) E.yaw = 180 - Math.min(70, (k - at(1)) * 6)
      if (k === at(3)) ctx.sound('entity.enderman.stare', 0.25, 1)
      if (k >= at(3)) { E.yaw = 180; K.base = { yaw: K.base.yaw + 0.06, pitch: Math.max(-1.1, K.base.pitch - 0.08) } }
      cast(); look(k)
    })
    // L18: so he only comes when my eyes are shut (back on the bed, eyes down to the floor)
    E.x = 2.6; E.z = -0.6; E.yaw = 180
    await cut(0.5, -5.5, P(2.4, 2.0, -1.5))
    await line('L18', async (k, at) => {
      cast()
      if (k >= at(2)) K.base = { yaw: K.base.yaw, pitch: Math.max(-1.4, K.base.pitch - 0.07) }
      look(k)
    })
    // L19: he's been fixing our home one block a day (wide: he sets another one in)
    E.x = 4.5; E.z = -3.5; E.yaw = 90
    await cut(8.5, 4.5, P(3.5, 2, -3.5))
    await line('L19', async (k, at) => { cast(); if (k === at(3)) put(3, 1, -4, 'mossy_stone_bricks'); look(k) })
    // L20: so now I nap every day, and I never peek (on the bed, looking at the ceiling; purple drifts in)
    E.x = 20; E.z = 20
    await cut(0.5, -5.5, P(-0.6, 4.0, -5.2))
    await line('L20', async (k, at) => {
      cast()
      if (k % 7 === 0) ctx.particles('portal', P(0.8 + Math.sin(k) * 0.6, 2.6, -4.6 + Math.cos(k) * 0.5), { count: 12 })
      look(k)
    })
    // L21: which is why... (the sound of a block going back in, purple at the corner)
    say(`/setblock ${X + 1} ${F + 2} ${Z - 2} air`)   // the gap is open again, as in L01
    await cut(1.7, 0.6, P(1.5, 1.8, -2))
    await line('L21', async (k) => { cast(); if (k === 4) ctx.particles('portal', P(1.6, 3.0, -1.6), { count: 30 }); look(k) }, 0.25)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}
