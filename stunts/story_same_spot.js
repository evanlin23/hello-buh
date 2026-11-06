// Story Short "why is my mom ALWAYS in the same spot 😳" (stories/same_spot). A mystery: every time
// the narrator comes home, Mom is standing in the exact same spot at the door, the sheep by the
// door hangs mid-jump, her wheat hasn't grown and his birthday cake still has one bite missing. When
// he walks up, everything starts at once. He tests it at the edge of the village: one step out and
// the whole village freezes, one step in and it all keeps going. The world only runs near him, so
// Mom has only lived the minutes he was home: he left at seven, and for her that was this morning.
// "I'm the only clock she has." He says hi, hugs her and leaves again: the sheep freezes mid-jump
// and the last words ("Which is why") loop into the first line.
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap; actions land on caption
// chunks (at(k)). The frozen things are NoAI/NoGravity mobs we stop moving; anything that has to
// start on a word keeps getting invisible micro-moves while it's "frozen" (an idle mob's first
// move reaches the client ~1 s late, docs/lessons.md "Story Shorts").
const path = require('path')
const { storyLines, storyKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'same_spot')
const CAPTION = 'why is my mom ALWAYS in the same spot 😳'

module.exports = {
  name: 'story_same_spot',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: { caption: CAPTION, red: 'ALWAYS', story: 'stories/same_spot', startAt: 'line:0', endAfter: 'story_end:0' },

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
    await c('/gamerule random_tick_speed 0')            // her wheat really doesn't grow
    for (let y0 = 1; y0 <= 24; y0 += 4) await c(`/fill ${A(-40, y0, -40)} ${A(40, y0 + 3, 40)} air`)
    // the far side of the street gets a long view (no hills behind the village edge)
    for (let y0 = 1; y0 <= 44; y0 += 4) for (const z0 of [41, 71]) await c(`/fill ${A(-40, y0, z0)} ${A(40, y0 + 3, z0 + 29)} air`)
    for (const z0 of [41, 71]) { await c(`/fill ${A(-40, 0, z0)} ${A(40, 0, z0 + 29)} grass_block`); await c(`/fill ${A(-40, -4, z0)} ${A(40, -1, z0 + 29)} dirt`) }
    await c(`/fill ${A(-40, 0, -40)} ${A(40, 0, 40)} grass_block`)
    await c(`/fill ${A(-40, -4, -40)} ${A(40, -1, 40)} dirt`)
    await c('/kill @e[type=!player]')

    const house = async (x0, z0, doorX, doorZ, facing, wall = 'oak_planks') => {
      const x1 = x0 + 5, z1 = z0 + 5
      await c(`/fill ${A(x0, 0, z0)} ${A(x1, 0, z1)} cobblestone`)
      await c(`/fill ${A(x0, 1, z0)} ${A(x1, 3, z1)} ${wall} hollow`)
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) await c(`/fill ${A(x, 1, z)} ${A(x, 3, z)} oak_log`)
      await c(`/fill ${A(x0 - 1, 4, z0 - 1)} ${A(x1 + 1, 4, z1 + 1)} spruce_planks`)
      await c(`/fill ${A(x0, 5, z0)} ${A(x1, 5, z1)} spruce_slab`)
      await c(`/setblock ${A(x0 + 2, 4, z0 + 2)} glowstone`); await c(`/setblock ${A(x0 + 3, 4, z0 + 3)} glowstone`)   // lit inside
      await c(`/fill ${A(x0 + 2, 2, z0)} ${A(x0 + 3, 2, z0)} glass`)
      await c(`/fill ${A(x0 + 2, 2, z1)} ${A(x0 + 3, 2, z1)} glass`)
      await c(`/setblock ${A(doorX, 2, doorZ)} oak_door[half=upper,facing=${facing},open=true]`)
      await c(`/setblock ${A(doorX, 1, doorZ)} oak_door[half=lower,facing=${facing},open=true]`)
    }

    // --- home: Mom's house (x -3..2, z -8..-3), the door on the south wall at x 0
    await house(-3, -8, 0, -3, 'south', 'birch_planks')
    for (const [dx, dz, b] of [[-2, -2, 'poppy'], [2, -2, 'cornflower'], [-3, -1, 'oxeye_daisy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // inside: the birthday cake with one bite gone, and the table where she cuts my bread
    await c(`/setblock ${A(-2, 1, -5)} furnace[facing=east,lit=true]`)
    await c(`/setblock ${A(-2, 2, -5)} furnace[facing=east,lit=true]`)
    await c(`/fill ${A(0, 1, -7)} ${A(1, 1, -6)} oak_slab`)
    await c(`/setblock ${A(-2, 1, -7)} crafting_table`)
    await c(`/setblock ${A(1, 1, -4)} barrel[facing=up]`)
    // her wheat: just planted, east of the house, a water row through it
    await c(`/fill ${A(4, 0, -9)} ${A(9, 0, -2)} farmland[moisture=7]`)
    await c(`/fill ${A(4, 1, -9)} ${A(9, 1, -2)} wheat[age=0]`)
    await c(`/fill ${A(4, 0, -6)} ${A(9, 0, -6)} water`)
    await c(`/fill ${A(4, 1, -6)} ${A(9, 1, -6)} air`)
    await c(`/fill ${A(3, 1, -10)} ${A(10, 1, -10)} oak_fence[east=true,west=true]`)
    await c(`/fill ${A(10, 1, -9)} ${A(10, 1, -1)} oak_fence[north=true,south=true]`)
    // the street south to the edge of the village
    await c(`/fill ${A(-1, 0, -2)} ${A(1, 0, 40)} dirt_path`)
    await house(-9, 6, -4, 8, 'west')
    await house(4, 6, 4, 8, 'east')
    await house(-9, 15, -4, 17, 'west', 'spruce_planks')
    await house(4, 15, 4, 17, 'east', 'spruce_planks')
    for (const [dx, dz] of [[-2, 4], [2, 13], [-2, 22], [2, 30]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    for (const [dx, dz, b] of [[-5, 25, 'poppy'], [6, 27, 'dandelion'], [-7, 29, 'cornflower'], [5, 23, 'oxeye_daisy'], [-3, 12, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // a hay pile and a well in the square
    await c(`/fill ${A(6, 1, 20)} ${A(7, 1, 21)} hay_block`); await c(`/setblock ${A(6, 2, 20)} hay_block`)
    await c(`/fill ${A(-7, 0, 19)} ${A(-5, 0, 21)} water`); await c(`/fill ${A(-8, 1, 18)} ${A(-4, 1, 22)} cobblestone_wall`); await c(`/fill ${A(-7, 1, 19)} ${A(-5, 1, 21)} air`)

    // --- the cast: all NoAI, NoGravity (they only move when a scene moves them)
    const mob = (type, x, y, z, yaw, pitch, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,${pitch}f]${more}}`)
    const vd = (prof, type = 'plains') => `,VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1`
    await mob('villager', 0.5, 1, -1.9, 20, 18, 'mom', vd('farmer'))                    // Mom, frozen at the door
    await mob('sheep', 2.4, 2.25, -1.3, 50, 0, 'dsheep', ',Color:0b')                    // the sheep by the door, mid-jump
    // the village: walkers back and forth, a hopping villager and a hopping sheep
    const W = [['armorer', -4.5, 24.0, 'plains'], ['librarian', 4.5, 26.5, 'taiga'], ['cleric', -3.8, 28.6, 'desert'], ['mason', 5.2, 22.4, 'savanna'], ['shepherd', 3.6, 30.4, 'plains']]
    for (let i = 0; i < W.length; i++) await mob('villager', W[i][1], 1, W[i][2], 90, 0, `w${i}`, vd(W[i][0], W[i][3]))
    await mob('villager', -2.2, 1, 28.6, 180, 0, 'hop', vd('fletcher', 'snow'))
    await mob('sheep', 2.4, 1, 29.4, 0, 0, 'hops', ',Color:14b')
    await mob('sheep', -6.0, 1, 26.8, 90, 0, 'ws0', ',Color:4b')
    await mob('cow', 7.5, 1, 28.5, 90, 0, 'ws1')

    await c('/clear @s')
    await ctx.tpCheck(X, F + 1, Z + 8, 180, 0)
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
    const back = (on) => bot.setControlState('back', on)
    const MOM = [0.5, -1.9]
    const momFace = () => P(MOM[0], 2.55, MOM[1])

    // ---- the village clock: it only runs while `running`; frozen mobs get invisible micro-moves
    let running = true, vt = 0, jig = 0
    const W = [[-4.5, 24.0, 2.6, 0], [4.5, 26.5, 2.2, 1.7], [-3.8, 28.6, 1.8, 3.1], [5.2, 22.4, 2.4, 4.4], [3.6, 30.4, 2.0, 0.8]]
    const HOP = 12   // ticks per hop
    const village = () => {
      if (running) vt++
      jig = (jig + 1) % 4
      const j = running ? 0 : (jig < 2 ? 0.004 : -0.004)
      for (let i = 0; i < W.length; i++) {
        const [cx, cz, amp, ph] = W[i]
        const a = vt / 22 + ph, x = cx + Math.sin(a) * amp + j
        tp(`w${i}`, x, 1, cz, Math.cos(a) > 0 ? -90 : 90)
      }
      const hy = (o) => { const u = ((vt + o) % HOP) / HOP; return 1 + Math.sin(u * Math.PI) * 1.4 }
      tp('hop', -2.2 + j, hy(0), 28.6, 0)
      tp('hops', 2.4 + j, hy(HOP / 2), 29.4, 0)
      const s0 = vt / 30
      tp('ws0', -6.0 + Math.sin(s0) * 1.5 + j, 1, 26.8, Math.cos(s0) > 0 ? -90 : 90)
      tp('ws1', 7.5 - Math.sin(s0 + 1) * 1.2 + j, 1, 28.5, Math.cos(s0 + 1) > 0 ? 90 : -90)
    }
    // the sheep by the door: frozen mid-jump (micro-moves) until L06, then it lands and wanders
    let dsheep = { x: 2.4, y: 2.25, z: -1.3, vy: 0, mode: 'frozen', t: 0, yaw: 50 }
    const doorSheep = () => {
      const s = dsheep
      if (s.mode === 'frozen') { tp('dsheep', s.x + ((s.t++ % 4) < 2 ? 0.004 : -0.004), s.y, s.z, s.yaw); return }
      if (s.mode === 'fall') {
        s.vy -= 0.08; s.y = Math.max(1, s.y + s.vy)
        if (s.y <= 1) { s.mode = 'walk'; s.t = 0 }
      } else if (s.mode === 'walk') {
        s.t++; s.x = 2.4 + Math.min(s.t / 20, 1) + Math.sin(s.t / 25) * 0.6; s.yaw = Math.cos(s.t / 25) > 0 ? -90 : 90
      } else if (s.mode === 'hop') {
        s.t++; s.y = 1 + Math.sin(Math.min(s.t, 6) / 12 * Math.PI) * 1.25      // rises to its apex... and stops there
        if (s.t >= 6) { s.mode = 'frozen'; s.t = 0 }
      }
      tp('dsheep', s.x, s.y, s.z, s.yaw)
    }
    const world = () => { village(); doorSheep() }
    const turn = (from, to, u) => K.turnTo(from, to, u)

    // L01: Mom at the door, frozen, the sheep beside her hanging in the air
    await cut(1.6, 1.6, P(1.2, 2.2, -1.7))
    for (let k = 0; k < 6; k++) { world(); look(k); await bot.waitForTicks(1) }
    await line('L01', async (k) => { world(); K.base = K.aim(P(1.25, 2.25 - Math.min(k, 40) * 0.003, -1.7)); look(k) })
    go(false)
    // L02: same door (wide), same stare (her face), same half a word (side, close)
    await cut(4.6, 3.6, P(0.5, 2.2, -2.6))
    await line('L02', async (k, at) => {
      world()
      if (k === at(1) - 1) await cut(0.9, -0.2, momFace())
      if (k === at(2) - 1) await cut(-1.5, -0.6, momFace())
      look(k)
    })
    // L03: gone three years; her wheat didn't grow one stage
    await cut(6.5, 0.6, P(6.5, 0.9, -6.5))
    await line('L03', async (k, at) => { world(); go(k > at(2) && k < at(2) + 14); K.base = K.aim(P(6.6, 1.0, -7.2)); look(k) })
    go(false)
    // L04: the sheep by the door, mid-jump, still in the air (low, looking up at it)
    await cut(3.6, 0.9, P(2.4, 2.6, -1.3))
    await line('L04', async (k) => { world(); look(k) })
    // L05: the furnace I lit three years ago, still burning (inside)
    await cut(0.6, -4.5, P(-1.5, 2.0, -4.5))
    await line('L05', async (k, at) => {
      world()
      if (k % 5 === 0) ctx.particles('smoke', P(-1.1, 1.5, -4.5), { count: 3 })
      K.base = K.aim(P(-1.5, 2.0 - Math.min(k, 30) * 0.006, -4.5)); look(k, 0, k > at(3) ? -0.04 : 0)
    })
    // L06: I walk up and everything starts at once: the sheep lands, Mom turns, the wheat pops up
    await cut(0.6, 7.5, P(0.6, 2.0, -1.9))
    await line('L06', async (k, at) => {
      if (k === at(2)) {
        dsheep.mode = 'fall'; dsheep.t = 0
        ctx.mark('face_on', { near: [X + MOM[0], Z + MOM[1], 1], head: true })
        say(`/fill ${X + 4} ${F + 1} ${Z - 9} ${X + 9} ${F + 1} ${Z - 7} wheat[age=4]`)
        say(`/fill ${X + 4} ${F + 1} ${Z - 5} ${X + 9} ${F + 1} ${Z - 2} wheat[age=4]`)
        ctx.sound('entity.sheep.ambient', 0.8, 1)
      }
      world(); go(bot.entity.position.z > Z + 1.6); K.base = K.aim(P(1.0, 2.0, -1.9)); look(k)
    })
    go(false)
    // L07: "back already? you just left"
    await cut(1.2, 0.3, momFace())
    await line('L07', async (k, at) => {
      world()
      if (k === at(1)) ctx.sound('entity.villager.ambient', 0.9, 1)
      if (k === at(3)) ctx.sound('entity.villager.yes', 0.9, 1)
      look(k)
    })
    // L08: she still thinks I'm seven (a kid's eye height: standing in a hole, looking up at her)
    say(`/setblock ${X} ${F} ${Z - 1} air`)
    await cut(0.5, -0.5, momFace(), 0)
    await line('L08', async (k) => { world(); look(k) })
    // L09: she still cuts my bread into squares (four loaves on the table)
    say(`/setblock ${X} ${F} ${Z - 1} grass_block`)
    for (const [bx, bz] of [[0.5, -6.5], [1.5, -6.5], [0.5, -5.5], [1.5, -5.5]]) say(`/summon item ${(X + bx).toFixed(2)} ${F + 1.55} ${(Z + bz).toFixed(2)} {Item:{id:"minecraft:bread",count:1},NoGravity:1b,PickupDelay:32767,Age:-32768,Motion:[0d,0d,0d]}`)
    ctx.mark('face_off')
    await cut(-1.0, -4.3, P(1.0, 1.5, -6.0))
    await line('L09', async (k) => { world(); look(k) })
    // L10: so I tested it: down the street to the edge of the village, everyone going about their day
    await cut(0.5, 13.5, P(0.5, 1.6, 30))
    await line('L10', async (k) => { world(); go(true); bot.setControlState('sprint', true); look(k, Math.sin(k / 9) * 0.15) })
    go(false); bot.setControlState('sprint', false)
    // L11: one more step (backwards, facing them), and the whole village froze
    await cut(0.5, 33.0, P(0.5, 1.5, 25))
    await line('L11', async (k, at) => {
      back(k >= at(0) + 2 && bot.entity.position.z < Z + 34.0)
      if (k === at(3)) { running = false; ctx.sound('block.note_block.basedrum', 0.5, 0.6) }
      world(); look(k)
    })
    back(false)
    // L12: one step back in, and it all kept going
    await line('L12', async (k, at) => {
      go(k >= at(0) && bot.entity.position.z > Z + 33.0)
      if (k === at(2)) running = true
      world(); look(k)
    })
    go(false)
    // L13: nothing here moves (step out: frozen) unless I'm close (step in: going)
    await cut(-3.5, 33.0, P(0.5, 1.4, 25))
    await line('L13', async (k, at) => {
      back(k >= at(0) && k < at(1) && bot.entity.position.z < Z + 34.0)
      if (k === at(1)) running = false
      go(k >= at(2) && bot.entity.position.z > Z + 33.0)
      if (k === at(3)) running = true
      world(); look(k)
    })
    go(false); back(false)
    // L14: Mom never waited three years. For her, I left a second ago.
    await cut(1.9, 0.6, momFace())
    ctx.mark('face_on', { near: [X + MOM[0], Z + MOM[1], 1], head: true })
    await line('L14', async (k, at) => { world(); go(k >= at(3) && bot.entity.position.z > Z - 0.2); K.base = K.aim(momFace()); look(k) })
    go(false)
    ctx.mark('face_off')
    // L15: she's only ever lived the minutes I was home (from inside, past her, out the door)
    await cut(0.5, -6.6, P(0.5, 2.2, -1.9))
    await line('L15', async (k) => { world(); look(k, Math.sin(k / 10) * 0.12) })
    // L16: I left at seven. For her, that was this morning. (kid height again)
    say(`/setblock ${X} ${F} ${Z - 1} air`)
    await cut(0.5, -0.5, momFace(), 0)
    ctx.mark('face_on', { near: [X + MOM[0], Z + MOM[1], 1], head: true })
    await line('L16', async (k) => { world(); look(k) })
    say(`/setblock ${X} ${F} ${Z - 1} grass_block`)
    // L17: I'm the only clock she has (close, a slow push in)
    await cut(-0.9, 0.9, momFace())
    await line('L17', async (k) => { world(); go(k > 3 && k < 12); K.base = K.aim(momFace()); look(k) })
    go(false)
    // L18: so I never tell her how long I was gone (beside her, looking out at the world)
    await cut(1.9, -1.1, momFace())
    let from = null
    await line('L18', async (k, at) => {
      world()
      if (k >= at(2) - 3) { from = from || { ...K.base }; turn(from, P(0.5, 2.2, 40), (k - at(2) + 4) / 12) }
      look(k)
    })
    // L19: she asks where I've been. I say, outside. (back to her; a glance away on "outside")
    from = null
    await line('L19', async (k, at) => {
      world()
      if (k < at(3) - 2) { from = from || { ...K.base }; turn(from, momFace(), (k + 1) / 8) }
      else K.base = { yaw: K.base.yaw + 0.012, pitch: Math.max(-0.1, K.base.pitch - 0.01) }
      look(k)
    })
    // L20: I say hi, I hug her, and I leave again (walk off, look back: she and the sheep stop)
    await cut(0.5, 1.6, momFace())
    let phase = 0, tf = null
    await line('L20', async (k, at) => {
      if (k < at(2)) { go(bot.entity.position.z > Z - 0.95); K.base = K.aim(momFace()) }
      else if (k < at(4)) {                               // turn round and walk off down the street
        if (phase === 0) { phase = 1; go(false); tf = { ...K.base } }
        turn(tf, P(0.5, 1.6, 30), (k - at(2) + 1) / 8)
        go(k > at(2) + 5)
      } else {                                             // look back over my shoulder, still backing off: she stops
        if (phase === 1) { phase = 2; go(false); tf = { ...K.base }; dsheep.mode = 'hop'; dsheep.t = 0 }
        back(true)
        turn(tf, P(0.9, 2.1, -1.8), (k - at(4) + 1) / 7)
        if (k === at(4) + 6) { ctx.mark('face_off'); running = false }
      }
      world(); look(k)
    }, 0.25)
    go(false); back(false)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}
