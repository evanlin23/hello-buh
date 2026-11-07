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
    await c('/difficulty normal')                      // an enderman is a monster: refused on peaceful (spawn_mobs stays off)
    await clearSet(ctx, A, 64, 64)              // a wide flat clearing (lib/story.js), high (no cut hillsides)
    await plainsBiome(ctx, A, 80, -4, 30)       // one grass colour over the set
    await c('/kill @e[type=!player]')

    // --- my house: stone bricks (x -3..3, z -8..-2), the south-east corner still blown open
    await c(`/fill ${A(-3, 0, -8)} ${A(3, 4, -2)} stone_bricks hollow`)   // y0-y4 shell: a room y1-y3 (from y1, hollow left one air layer)
    await c(`/fill ${A(-3, 0, -8)} ${A(3, 0, -2)} cobblestone`)
    for (const [dx, dy, dz] of [[-3, 1, -5], [-1, 3, -8], [1, 2, -8], [3, 2, -6], [-2, 2, -2], [-3, 3, -2], [0, 3, -2], [-2, 1, -2], [0, 1, -8], [3, 1, -7]]) await c(`/setblock ${A(dx, dy, dz)} cracked_stone_bricks`)
    for (const [dx, dy, dz] of [[-3, 2, -7], [2, 3, -8], [-1, 1, -2], [3, 3, -5]]) await c(`/setblock ${A(dx, dy, dz)} mossy_stone_bricks`)
    await c(`/fill ${A(-1, 2, -2)} ${A(-1, 2, -2)} air`)                       // a window...
    await c(`/fill ${A(-3, 4, -8)} ${A(3, 4, -2)} spruce_planks`)
    await c(`/setblock ${A(-1, 4, -6)} glowstone`); await c(`/setblock ${A(-2, 4, -4)} glowstone`)
    // the blast: the corner, the roof over it and a crater in the floor and the grass
    await c(`/fill ${A(1, 1, -4)} ${A(3, 4, -2)} air`)
    await c(`/fill ${A(2, 3, -5)} ${A(3, 4, -5)} air`)
    await c(`/fill ${A(0, 4, -3)} ${A(0, 4, -2)} air`)
    await c(`/fill ${A(1, 0, -3)} ${A(4, 0, 0)} dirt`)
    await c(`/fill ${A(2, -1, -2)} ${A(3, 0, -1)} air`)
    await c(`/fill ${A(2, -2, -2)} ${A(3, -2, -1)} dirt`)
    // ... and the blocks that are already back: the first two wall blocks of the corner
    await c(`/setblock ${A(1, 1, -2)} stone_bricks`)
    await c(`/setblock ${A(1, 1, -3)} cracked_stone_bricks`)
    // where I nap: a red wool bed with a white pillow against the north wall
    await c(`/fill ${A(-2, 1, -7)} ${A(-1, 1, -7)} red_wool`); await c(`/setblock ${A(-2, 1, -6)} white_wool`)
    await c(`/setblock ${A(-2, 1, -7)} white_wool`)
    await c(`/setblock ${A(-1, 1, -6)} red_wool`)
    await c(`/setblock ${A(0, 1, -7)} crafting_table`)

    // --- my brother's room: a dark oak annex on the west side, rebuilt first, so it's perfect
    await c(`/fill ${A(-9, 0, -8)} ${A(-4, 4, -3)} dark_oak_planks hollow`)
    await c(`/fill ${A(-9, 0, -8)} ${A(-4, 0, -3)} spruce_planks`)
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
    // a sunken stone-brick room (a stronghold's portal room, dug open), frames on its floor (y -5)
    await c(`/fill ${A(PX - 4, -6, PZ - 4)} ${A(PX + 4, 0, PZ + 4)} stone_bricks`)
    await c(`/fill ${A(PX - 3, -5, PZ - 3)} ${A(PX + 3, 0, PZ + 3)} air`)
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) await c(`/setblock ${A(PX + dx, -5, PZ + dz)} torch`)
    for (const [dx, dy, dz] of [[-4, -2, 0], [4, -3, 1], [0, -1, 4], [-2, -4, -4], [2, -1, -4]]) await c(`/setblock ${A(PX + dx, dy, PZ + dz)} cracked_stone_bricks`)
    for (const [dx, dy, dz] of [[-4, -4, 2], [4, -1, -2], [1, -3, 4]]) await c(`/setblock ${A(PX + dx, dy, PZ + dz)} mossy_stone_bricks`)
    await c(`/fill ${A(PX - 1, -5, PZ - 2)} ${A(PX + 1, -5, PZ - 2)} end_portal_frame[facing=south,eye=true]`)
    await c(`/fill ${A(PX - 1, -5, PZ + 2)} ${A(PX + 1, -5, PZ + 2)} end_portal_frame[facing=north,eye=true]`)
    await c(`/fill ${A(PX - 2, -5, PZ - 1)} ${A(PX - 2, -5, PZ + 1)} end_portal_frame[facing=east,eye=true]`)
    await c(`/fill ${A(PX + 2, -5, PZ - 1)} ${A(PX + 2, -5, PZ + 1)} end_portal_frame[facing=west,eye=true]`)
    await c(`/fill ${A(PX - 1, -5, PZ - 1)} ${A(PX + 1, -5, PZ + 1)} end_portal`)

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
    const { P, say, look, line } = K
    const cut = (...a) => { ctx.mark('cut'); return K.cut(...a) }   // K.cut teleports by bot.chat, which doesn't mark the cut
    const tp = (tag, x, y, z, yaw, pitch = 0) => say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} ${pitch}`)
    const go = (on) => bot.setControlState('forward', on)
    const put = (dx, dy, dz, block) => {                  // a block comes back: puff of purple, a soft place sound
      say(`/setblock ${X + dx} ${F + dy} ${Z + dz} ${block}`)
      ctx.particles('portal', P(dx + 0.5, dy + 0.5, dz + 0.5), { count: 40 })
      ctx.sound('block.stone.place', 1, 0.9)
    }
    const carry = (block) => say(`/data merge entity @e[tag=ender,limit=1] {carriedBlockState:{Name:"minecraft:${block}"}}`)   // arms out, a block in them
    const song = (k0, k, pitchMul = 1, vol = 0.7) => { for (const [t, p] of SONG) if (k === k0 + t) ctx.sound('block.note_block.harp', vol, p * pitchMul) }

    // the enderman and the villagers: state that's re-sent every tick (micro-moves while idle)
    let jig = 0
    const E = { x: 20, y: 1, z: 20, yaw: 0 }
    const V = [0, 1, 2].map(i => ({ x: -22 - i * 1.6, z: 2.4 + i * 0.9 }))
    const cast = () => {
      jig = (jig + 1) % 4
      const j = jig < 2 ? 0.004 : -0.004
      tp('ender', E.x + j, E.y, E.z, E.yaw)
      if (E.x < 12 && jig === 0) ctx.particles('portal', P(E.x, 1.6 + Math.random(), E.z), { count: 4 })   // endermen trail purple
      for (let i = 0; i < 3; i++) tp(`v${i}`, V[i].x + j, 1, V[i].z, -90, 45)   // heads down: nobody looks at it
    }

    // L01: close on the blown-open corner; on "is BACK" one more block pops into the wall
    await cut(2.6, 2.6, P(1.8, 2.0, -2))
    await line('L01', async (k, at) => {
      cast()
      if (k === at(1)) put(1, 2, -2, 'stone_bricks')
      bot.setControlState('forward', k > 2 && k < 6)
      K.base = K.aim(P(1.8, 2.0, -2)); look(k)
    })
    bot.setControlState('forward', false)
    // L02: a creeper blew it up three years ago (wide, the crater; the blast flashes on "blew it up")
    await cut(6.5, 7.5, P(0.5, 1.6, -4))
    await line('L02', async (k, at) => {
      cast()
      if (k === at(1)) { ctx.particles('explosion', P(2.5, 1.5, -2.5), { radius: 3 }); ctx.sound('entity.generic.explode', 0.6, 1) }
      look(k, k > at(1) && k < at(1) + 8 ? Math.sin(k * 1.9) * 0.02 : 0)
    })
    // L03: the exact ones I lost, even the cracked ones (along the west wall)
    await cut(-1.6, -0.6, P(-1.5, 1.6, -2))
    await line('L03', async (k, at) => {
      cast()
      if (k === at(3) - 1) await cut(0.6, -0.9, P(0.5, 3.4, -2))      // "even the cracked ones": up at the top row
      go(k > 2 && k < 8)
      look(k)
    })
    for (let i = 0; i < 3; i++) V[i].x = -9 - i * 1.7   // into place off shot, a line early
    // L04: purple sparkles on the grass, every day (low, in front of the crater)
    await cut(4.6, 2.6, P(2.5, 0.9, 0))
    await line('L04', async (k, at) => {
      cast()
      if (k % 6 === 0) ctx.particles('portal', P(2.6 + Math.sin(k) * 0.8, 1.05, 0.6 + Math.cos(k * 1.3) * 0.8), { count: 6 })
      if (k === at(1)) ctx.particles('portal', P(2.5, 1.1, 0.8), { count: 20 })
      look(k)
    })
    // L05: the villagers walk past it staring at their feet
    await cut(-3.5, 7.0, P(-8.5, 1.4, 3.3))
    await line('L05', async (k) => {
      for (let i = 0; i < 3; i++) V[i].x += 0.16
      cast(); K.base = K.aim(P(V[1].x + 0.5, 1.4, 3.3)); look(k)
    })
    for (let i = 0; i < 3; i++) V[i].x = -30 - i * 1.6
    // L06: and it started with my brother's room (the annex, perfect)
    await cut(-6.5, 1.0, P(-6.5, 1.7, -6))
    await line('L06', async (k) => { cast(); go(k > 3 && bot.entity.position.z > Z - 2.4); look(k) })
    go(false)
    // L07: he went to the End to fight the dragon (the portal); he never came back
    await cut(-9.5, 7.5, P(-9.5, -4.2, 12.5))
    await line('L07', async (k) => { cast(); go(k > 2 && bot.entity.position.z < Z + 7.9); K.base = K.aim(P(-9.5, -4.2, 12.5)); look(k) })
    // L08: he used to hum the same song all day (his room, the note block)
    await cut(-5.5, -4.2, P(-7.5, 1.4, -6.5))
    await line('L08', async (k, at) => { cast(); song(at(1), k); go(k > 2 && k % 2 === 0 && bot.entity.position.x > X - 6.6); K.base = K.aim(P(-7.5, 1.4, -6.5)); look(k) })
    // L09: so today I pretended to nap (on my bed, looking up, then out at the open corner)
    E.x = 6; E.z = 2.5; E.yaw = 45
    await cut(0.5, -5.5, P(-1.5, 1.2, -6.5))
    let from = null
    await line('L09', async (k, at) => {
      cast()
      if (k < at(2) - 2) K.base = { yaw: K.base.yaw, pitch: K.base.pitch - 0.006 }   // eyes drifting shut...
      if (k >= at(2) - 2) { from = from || { ...K.base }; K.turnTo(from, P(3.0, 2.6, 1.0), Math.min(1, (k - at(2) + 3) / 22)) }   // ...then a peek out the hole
      look(k)
    })
    // L10: something tall walked up to the wall (out through the hole: it comes into view), carrying a block
    carry('cracked_stone_bricks')
    await line('L10', async (k) => {
      const dx = 2.5 - E.x, dz = -0.9 - E.z, d = Math.hypot(dx, dz)   // to its spot at the wall, facing it
      if (d > 0.11) { E.x += dx / d * 0.11; E.z += dz / d * 0.11; E.yaw = Math.atan2(-dx, dz) * 180 / Math.PI } else E.yaw = 180
      K.base = K.aim(P(E.x, 2.6, E.z)); cast(); look(k)
    })
    // L11: and put a block back
    E.yaw = 180
    await cut(6.2, -2.6, P(2.5, 1.8, -1.4))
    await line('L11', async (k, at) => { cast(); if (k === at(2)) { put(2, 1, -2, 'cracked_stone_bricks'); carry('air') } look(k) })
    // L12: an enderman (cut outside, close, it stands at the wall facing it)
    E.x = 2.6; E.z = -0.9; E.yaw = 180
    await cut(5.5, 1.2, P(2.6, 2.6, -0.9))
    await line('L12', async (k) => { cast(); look(k) })
    // L13: I opened my eyes a little (it faces me)... it turned its whole body away
    await cut(2.1, 3.4, P(2.6, 2.6, -0.6))
    await line('L13', async (k, at) => {
      if (k < at(3)) E.yaw = 100                            // side on, never looking at me
      else E.yaw = Math.min(180, 100 + (k - at(3)) * 8)     // and it turns its whole body away, smoothly
      cast(); look(k, 0, k >= at(3) ? -0.04 : 0)
    })
    // L14: and then it hummed: the song my brother always hummed (lower, with its warble)
    await line('L14', async (k, at) => {
      cast()
      if (k === at(1)) ctx.sound('entity.enderman.ambient', 0.5, 1.2)
      song(at(1) + 4, k, 0.84)
      go(k % 3 === 0 && bot.entity.position.z > Z + 2.3)      // creeping closer as it hums
      look(k, Math.sin(k / 5) * 0.05, Math.sin(k / 4) * 0.02)
    })
    // L15: it's him (closer on his back)
    await cut(2.6, 1.3, P(2.6, 2.4, -0.6))
    await line('L15', async (k, at) => { cast(); go(k >= at(1) && k < at(1) + 5); look(k) })
    // L16: he came back from the End (the portal), as one of them (him again)
    await cut(-13.5, 12.5, P(-9.5, -4.2, 12.5))
    await line('L16', async (k, at) => {
      cast()
      if (k === at(3) - 1) await cut(4.4, 2.6, P(2.6, 2.6, -0.6))
      look(k)
    })
    // L17: if our eyes meet he has to hurt me (his head starts to turn; I look away fast)
    await cut(1.0, 2.4, P(2.6, 2.7, -0.6))
    await line('L17', async (k, at) => {
      if (k >= at(1) && k < at(3)) E.yaw = 180 - Math.min(60, (k - at(1)) * 4)   // it starts to turn...
      if (k === at(3)) ctx.sound('entity.enderman.stare', 0.25, 1)
      if (k >= at(3)) { E.yaw = Math.min(180, E.yaw + 10); K.base = { yaw: K.base.yaw + 0.03, pitch: Math.max(-0.55, K.base.pitch - 0.04) } }   // ...and turns back as I look away
      cast(); look(k)
    })
    // L18: so he only comes when my eyes are shut (back on the bed, eyes down to the floor)
    E.x = 2.6; E.z = -0.6; E.yaw = 180
    await cut(0.5, -5.5, P(2.4, 2.0, -1.5))
    await line('L18', async (k, at) => {
      cast()
      if (k >= at(2)) K.base = { yaw: K.base.yaw, pitch: Math.max(-0.9, K.base.pitch - 0.035) }
      look(k)
    })
    // L19: he's been fixing our home one block a day (wide: he sets another one in)
    E.x = 4.5; E.z = -3.5; E.yaw = 90
    for (let i = 0; i < 3; i++) { cast(); await bot.waitForTicks(1) }
    await cut(8.5, 4.5, P(3.5, 2, -3.5))
    await line('L19', async (k, at) => { cast(); if (k === 0) carry('mossy_stone_bricks'); if (k === at(3)) { put(3, 1, -4, 'mossy_stone_bricks'); carry('air') } look(k) })
    // L20: so now I nap every day, and I never peek (on the bed, looking at the ceiling; purple drifts in)
    E.x = 20; E.z = 20
    await cut(0.5, -5.5, P(-1.5, 2.6, -7))
    let pitch0 = null
    await line('L20', async (k, at) => {                  // face down into the pillow, eyes shut; behind me, purple and a block going in
      cast()
      if (pitch0 === null) pitch0 = K.base.pitch
      K.base = { yaw: K.base.yaw, pitch: Math.max(-1.45, pitch0 - k * 0.05) }
      if (k >= at(3) && k % 5 === 0) ctx.particles('portal', P(0.2 + Math.sin(k) * 0.4, 2.2, -6.2), { count: 10 })
      if (k === at(3)) ctx.sound('block.stone.place', 0.6, 0.9)
      song(at(3) + 2, k, 0.84, 0.35)
      look(k)
    })
    // L21: which is why... (the sound of a block going back in, purple at the corner)
    say(`/setblock ${X + 1} ${F + 2} ${Z - 2} air`)   // the gap is open again, as in L01
    await cut(2.6, 2.6, P(1.8, 2.0, -2))                // the opening shot again
    await line('L21', async (k) => { cast(); bot.setControlState('forward', k > 2 && k < 6); if (k === 4) ctx.particles('portal', P(1.6, 3.0, -1.6), { count: 30 }); look(k) })
    bot.setControlState('forward', false)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}
