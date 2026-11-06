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
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

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
    await clearSet(ctx, A, 64, 28)              // a wide flat clearing (lib/story.js)
    await plainsBiome(ctx, A, 64, -4, 30)       // one grass colour over the set
    await c('/kill @e[type=!player]')
    // the edge of the village: a line of oaks past the end of the street
    for (let x = -36; x <= 36; x += 6) if (Math.abs(x) > 8) await c(`/place feature minecraft:oak ${A(x, 1, 40)}`)   // clear of the edge camera
    for (const x of [-6, 6]) await c(`/place feature minecraft:oak ${A(x, 1, 44)}`)
    for (let z = -6; z <= 30; z += 6) { await c(`/place feature minecraft:oak ${A(-34, 1, z)}`); await c(`/place feature minecraft:oak ${A(34, 1, z)}`) }

    const home = (x0, z0, doorX, doorZ, facing, wall = 'oak_planks') => house(ctx, A, x0, z0, doorX, doorZ, facing, true, wall)

    // --- home: Mom's house (x -3..2, z -8..-3), the door on the south wall at x 0
    await home(-3, -8, 0, -3, 'south', 'birch_planks')
    await c(`/setblock ${A(-2, 4, -4)} glowstone`); await c(`/setblock ${A(1, 4, -7)} glowstone`)   // brighter inside
    for (const [dx, dz, b] of [[-2, -2, 'poppy'], [2, -2, 'cornflower'], [-3, -1, 'oxeye_daisy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // inside: the furnace I lit, and the table where she cuts my bread
    await c(`/setblock ${A(-2, 1, -5)} furnace[facing=east,lit=true]`)
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
    await home(-9, 6, -4, 8, 'west')
    await home(4, 6, 4, 8, 'east')
    await home(-9, 15, -4, 17, 'west', 'spruce_planks')
    await home(4, 15, 4, 17, 'east', 'spruce_planks')
    for (const [dx, dz] of [[-2, 4], [2, 13], [-2, 22], [2, 30]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    for (const [dx, dz, b] of [[-5, 25, 'poppy'], [6, 27, 'dandelion'], [-7, 29, 'cornflower'], [5, 23, 'oxeye_daisy'], [-3, 12, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // a hay pile and a well in the square
    await c(`/fill ${A(6, 1, 20)} ${A(7, 1, 21)} hay_block`); await c(`/setblock ${A(6, 2, 20)} hay_block`)
    await c(`/fill ${A(-7, 0, 19)} ${A(-5, 0, 21)} water`); await c(`/fill ${A(-8, 1, 18)} ${A(-4, 1, 22)} cobblestone_wall`); await c(`/fill ${A(-7, 1, 19)} ${A(-5, 1, 21)} air`)

    // --- the cast: all NoAI, NoGravity (they only move when a scene moves them)
    const mob = (type, x, y, z, yaw, pitch, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,${pitch}f]${more}}`)
    const vd = (prof, type = 'plains') => `,VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1`
    await mob('villager', 0.5, 1, -1.9, 20, 18, 'mom', vd('farmer'))                    // Mom, frozen at the door
    await mob('sheep', 3.6, 2.2, -0.6, 50, 0, 'dsheep', ',Color:0b')                    // the sheep by the door, mid-jump
    // the village: walkers back and forth, a hopping villager and a hopping sheep
    const W = [['armorer', -5.0, 24.0, 'plains'], ['librarian', 4.5, 26.5, 'taiga'], ['cleric', -4.5, 28.6, 'desert'], ['mason', 5.5, 22.4, 'savanna'], ['shepherd', 5.5, 30.4, 'plains']]
    for (let i = 0; i < W.length; i++) await mob('villager', W[i][1], 1, W[i][2], 90, 0, `w${i}`, vd(W[i][0], W[i][3]))
    await mob('villager', 0.2, 1, 28.0, 0, 0, 'hop', vd('fletcher', 'snow'))
    await mob('sheep', -1.8, 1, 30.2, 0, 0, 'hops', ',Color:14b')
    await mob('sheep', -6.0, 1, 26.8, 90, 0, 'ws0', ',Color:4b')
    await mob('cow', 7.5, 1, 28.5, 90, 0, 'ws1')

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
    const { P, say, line } = K
    const tp = (tag, x, y, z, yaw, pitch = 0) => say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} ${pitch}`)
    const ctl = (name, on) => bot.setControlState(name, on)
    const go = (on) => ctl('forward', on)
    const back = (on) => ctl('back', on)
    const MOM = [0.5, -1.9]
    const momFace = () => P(MOM[0], 2.55, MOM[1])
    const ticks = (id) => Math.round((S.line(id).dur + S.gap) * 20)

    // camera: a sway on a global clock that eases in after every cut (no lurch on the first frames)
    let g = 0, since = 0
    const look = (k, dyaw = 0, dpitch = 0) => {
      g++; since++
      const a = Math.min(1, since / 14)
      return bot.look(K.base.yaw + dyaw + Math.sin(g / 21) * 0.08 * a, K.base.pitch + dpitch + Math.sin(g / 29 + 1) * 0.03 * a, true)
    }
    const cut = async (dx, dz, target, dy = 1) => {
      for (const c of ['forward', 'back', 'left', 'right', 'sprint']) ctl(c, false)
      since = 0
      await K.cut(dx, dz, target, dy)
    }
    const aimAt = (p) => { K.base = K.aim(p) }
    const turn = (from, p, u) => K.turnTo(from, p, Math.max(0, Math.min(1, u)))   // u clamped (past 1 it swung back)

    // ---- the village clock: it only runs while `running`; frozen mobs get invisible micro-moves
    let running = true, vt = 0, jig = 0
    const W = [[-5.0, 24.0, 2.0, 0], [4.5, 26.5, 2.2, 1.7], [-4.5, 28.6, 1.8, 3.1], [5.5, 22.4, 2.0, 4.4], [5.5, 30.4, 1.5, 0.8]]
    const hops = { hop: { x: 0.2, z: 28.0, t: -1 }, hops: { x: -1.8, z: 30.2, t: -1 } }
    const hopUp = () => { for (const h of Object.values(hops)) h.t = 0 }   // a single jump, ~0.6 s; apex 6 ticks in
    const village = () => {
      if (running) vt++
      jig = (jig + 1) % 4
      const j = running ? 0 : (jig < 2 ? 0.004 : -0.004)
      for (let i = 0; i < W.length; i++) {
        const [cx, cz, amp, ph] = W[i]
        const a = vt / 22 + ph, x = cx + Math.sin(a) * amp + j
        tp(`w${i}`, x, 1, cz, -90 * Math.max(-1, Math.min(1, Math.cos(a) * 3)))   // turns through facing south, not a snap
      }
      for (const [tag, h] of Object.entries(hops)) {
        if (h.t >= 0 && running) h.t++
        const y = h.t >= 0 ? 1 + Math.sin(Math.min(h.t, 12) / 12 * Math.PI) * 1.2 : 1
        if (h.t >= 12) h.t = -1
        tp(tag, h.x + j, y, h.z, 0)
      }
      const s0 = vt / 30
      tp('ws0', -6.0 + Math.sin(s0) * 1.5 + j, 1, 26.8, -90 * Math.max(-1, Math.min(1, Math.cos(s0) * 3)))
      tp('ws1', 7.5 - Math.sin(s0 + 1) * 1.2 + j, 1, 28.5, 90 * Math.max(-1, Math.min(1, Math.cos(s0 + 1) * 3)))
    }
    // the sheep by the door: frozen mid-jump (micro-moves) until L06, then it lands and wanders
    const dsheep = { x: 3.6, y: 2.2, z: -0.6, vy: 0, mode: 'frozen', t: 0, yaw: 50 }
    const doorSheep = () => {
      const s = dsheep
      if (s.mode === 'frozen') { tp('dsheep', s.x + ((s.t++ % 4) < 2 ? 0.004 : -0.004), s.y, s.z, s.yaw); return }
      if (s.mode === 'fall') {
        s.vy -= 0.08; s.y = Math.max(1, s.y + s.vy)
        if (s.y <= 1) { s.mode = 'walk'; s.t = 0 }
      } else if (s.mode === 'walk') {
        s.t++; s.x = 3.6 + Math.min(s.t / 20, 1) * 0.6 + Math.sin(s.t / 25) * 0.5; s.yaw = 50 - 140 * Math.max(-1, Math.min(1, Math.cos(s.t / 25) * 3)) / 2
      } else if (s.mode === 'hop') {
        s.t++; s.y = 1 + Math.sin(Math.min(s.t, 6) / 12 * Math.PI) * 1.2      // rises to its apex... and stops there
        if (s.t >= 6) { s.mode = 'frozen'; s.t = 0 }
      }
      tp('dsheep', s.x, s.y, s.z, s.yaw)
    }
    const world = () => { village(); doorSheep() }

    // L01: Mom at the door, frozen, the sheep beside her hanging in the air; a push in, then her face
    const OPEN = [2.4, 3.8], OPEN_AIM = P(2.0, 2.3, -1.2)
    await cut(OPEN[0], OPEN[1], OPEN_AIM)
    for (let k = 0; k < 4; k++) { world(); look(k); await bot.waitForTicks(1) }
    await line('L01', async (k, at) => {
      world()
      if (k === at(4) - 1) await cut(1.2, 0.5, momFace())
      if (k < at(4) - 1) { go(k > 2 && k < 11); aimAt(OPEN_AIM) }
      look(k)
    })
    // L02: same door (wide), same stare (her face), same half a word (side, close)
    await cut(4.6, 3.6, P(0.5, 2.2, -2.6))
    await line('L02', async (k, at) => {
      world()
      if (k === at(1) - 1) await cut(0.9, -0.2, momFace())
      if (k === at(2) - 1) await cut(-1.5, -0.6, momFace())
      look(k)
    })
    // L03: gone three years; her wheat didn't grow one stage
    await cut(6.5, 0.6, P(6.6, 1.0, -7.2))
    await line('L03', async (k, at) => { world(); go(k > at(2) && k < at(2) + 14); aimAt(P(6.6, 1.0, -7.2)); look(k) })
    // L04: the sheep by the door, mid-jump, still in the air (low, from the side, sliding past)
    await cut(5.2, 0.6, P(3.6, 2.0, -0.6))
    await line('L04', async (k) => { world(); ctl('left', k > 2 && k < 22); aimAt(P(3.6, 2.0, -0.6)); look(k) })
    // L05: the furnace I lit three years ago, still burning (inside)
    await cut(1.4, -4.5, P(-1.5, 1.5, -4.5))
    await line('L05', async (k) => {
      world()
      if (k === 3) ctx.sound('block.furnace.fire_crackle', 1, 1)
      go(k > 2 && bot.entity.position.x > X - 0.2)
      aimAt(P(-1.5, 1.5, -4.5)); look(k)
    })
    // L06: I walk up and everything starts at once: the sheep lands, Mom turns to me
    await cut(0.6, 7.5, P(1.8, 2.0, -1.4))
    await line('L06', async (k, at) => {
      if (k === at(2)) {
        dsheep.mode = 'fall'; dsheep.t = 0
        ctx.mark('face_on', { near: [X + MOM[0], Z + MOM[1], 1], head: true })
        ctx.sound('entity.sheep.ambient', 0.8, 1)
      }
      world(); go(bot.entity.position.z > Z + 2.4); aimAt(P(1.8, 2.0, -1.4)); look(k)
    })
    // L07: "back already? you just left"
    await cut(1.4, 1.0, momFace())
    await line('L07', async (k, at) => {
      world()
      go(k > 2 && k < 7)
      if (k === at(1)) ctx.sound('entity.villager.ambient', 0.9, 1)
      if (k === at(3)) ctx.sound('entity.villager.yes', 0.9, 1)
      aimAt(momFace()); look(k)
    })
    // L08: she still thinks I'm seven (a kid's eye height: standing in a hole, looking up at her)
    say(`/setblock ${X} ${F} ${Z - 1} air`)
    await cut(0.5, -0.5, momFace(), 0)
    await line('L08', async (k) => { world(); aimAt(P(0.5, 2.5 + Math.min(k, 30) * 0.008, -1.9)); look(k, Math.sin(k / 9) * 0.05) })
    ctx.mark('face_off')
    // L10: so I tested it: down the street to the edge of the village, everyone going about their day
    await cut(0.5, 13.5, P(0.5, 1.6, 30))
    say(`/setblock ${X} ${F} ${Z - 1} dirt_path`)   // the hole goes once I'm out of it
    const t10 = ticks('L10')
    await line('L10', async (k) => { world(); go(k < t10 - 6); ctl('sprint', k < t10 - 6); look(k, Math.sin(k / 9) * 0.15) })
    // L11: one more step (backwards, facing them), and the whole village froze, two of them mid-jump
    await cut(0.5, 33.0, P(0.5, 1.5, 25))
    await line('L11', async (k, at) => {
      back((k >= at(0) + 2 && bot.entity.position.z < Z + 34.0) || (k > at(3) && k % 10 < 2))
      if (k === at(3) - 6) hopUp()
      if (k === at(3)) { running = false; ctx.sound('block.note_block.basedrum', 0.6, 0.6) }
      world(); look(k, k > at(3) ? Math.sin(k / 6) * 0.04 : 0)
    })
    back(false)
    // L12: one step back in, and it all kept going (the two land)
    await line('L12', async (k, at) => {
      go(k >= at(0) && bot.entity.position.z > Z + 32.6)
      if (k === at(2)) running = true
      world(); look(k)
    })
    go(false)
    // L13: Mom never waited three years. For HER (back to the very first framing), I left a second ago.
    await cut(1.9, 0.6, momFace())
    ctx.mark('face_on', { near: [X + MOM[0], Z + MOM[1], 1], head: true })
    await line('L13', async (k, at) => {
      world()
      if (k === at(5) - 1) { await cut(OPEN[0], OPEN[1], OPEN_AIM); ctx.sound('block.note_block.basedrum', 0.6, 0.6) }
      if (k < at(5) - 1) { go(k > 2 && k < 6); aimAt(momFace()) } else aimAt(OPEN_AIM)
      look(k)
    })
    ctx.mark('face_off')
    // L14: she's only ever lived the minutes I was home (from inside, past her, out the door)
    await cut(-0.5, -6.5, P(0.5, 2.2, -1.9))
    await line('L14', async (k) => { world(); go(k > 2 && bot.entity.position.z < Z - 4.4); look(k, Math.sin(k / 12) * 0.08) })
    // L15: I left at seven (beside her: the empty street). For her, that was this morning (turn to her).
    await cut(1.6, -1.6, P(0.5, 1.7, 26))
    ctx.mark('face_on', { near: [X + MOM[0], Z + MOM[1], 1], head: true })
    let from = null
    await line('L15', async (k, at) => {
      world()
      if (k >= at(3) - 4) { from = from || { ...K.base }; turn(from, momFace(), (k - at(3) + 5) / 20) }
      look(k)
    })
    // L16: I'm the only clock she has (close, a slow push in)
    await cut(-0.9, 0.9, momFace())
    await line('L16', async (k, at) => { world(); if (k === at(1)) ctx.sound('block.note_block.chime', 0.7, 0.8); go(k > at(1) && k < at(1) + 9); aimAt(momFace()); look(k) })
    // L17: so I never tell her how long I was gone (beside her, a slow look out at the world)
    await cut(1.9, -0.9, momFace())
    from = null
    await line('L17', async (k, at) => {
      world()
      if (k >= at(1)) { from = from || { ...K.base }; turn(from, P(0.5, 2.0, 40), (k - at(1)) / 26) }
      look(k)
    })
    // L18: I say hi, I hug her, and I leave again (down the street, past the line)... which is why
    // (I look back from the street: Mom and the sheep stop, mid-jump)
    await cut(0.5, 1.6, momFace())
    const END = P(2.0, 2.3, -1.2)
    let phase = 0, tf = null
    await line('L18', async (k, at) => {
      if (k < at(2)) { go(bot.entity.position.z > Z - 0.95); aimAt(momFace()) }
      else if (k < at(3)) {                               // turn round
        if (phase === 0) { phase = 1; go(false); tf = { ...K.base } }
        turn(tf, P(0.5, 1.6, 30), (k - at(2) + 1) / 6)
      } else if (k < at(5) - 6) {                         // walking off down the street (a cut: further along)
        if (phase === 1) { phase = 2; await cut(0.5, 7.5, P(0.5, 1.6, 30)) }
        go(true)
      } else {                                             // look back: the sheep jumps and stops
        if (phase === 2) { phase = 3; go(false); tf = { ...K.base }; dsheep.mode = 'hop'; dsheep.t = 0 }
        back(true)
        turn(tf, END, (k - at(5) + 7) / 7)
        if (k === at(5)) { ctx.mark('face_off'); running = false; ctx.sound('block.note_block.basedrum', 0.6, 0.6) }
      }
      world(); look(k)
    }, 0.15)
    back(false)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}
