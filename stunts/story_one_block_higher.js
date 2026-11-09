// Story Short "every time I sleep, I wake up higher 😳" (stories/one_block_higher, premise 9 in
// docs/stories.md). The narrator's bed sits on a dirt pillar that grows one block every night (the
// BLOCKS UP meter). He thinks his bed is growing. The clues: the farmer's wheat field is a pond, the
// fisherman fishes from his roof, the iron golem stands in the water up to his neck, somebody keeps
// stealing the hill behind his house (a mud trail leads from it to the pillar), the village tells him
// to stay up there, the butcher who brings his dinner up the ladder is always soaking wet, and all
// night he hears digging. On night sixteen he only pretends to sleep and peeks over the edge: the
// village is under water and the ladder is full of villagers passing dirt up. They lift him one more
// block while they stay below. Nobody says it: the game shows it. The last line ("So THAT'S why...")
// loops into the first.
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, actions land on caption
// chunks (at(k)). The pillar really grows (blocks set on the cut), the flood is four /fill layers
// sent while the camera looks at the sky, and the set is a bowl (solid terraces around the clearing)
// so the water stays put.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'one_block_higher')
const CROWD = [[-1.5, -6], [0.5, -7.2], [2.5, -6.2], [-0.6, -9], [1.6, -9.6], [3.6, -8.4]]
const GANG = 8
const FINAL = 16   // the pillar's height on the last night (at 20 the villagers below were specks)

module.exports = {
  name: 'story_one_block_higher',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every time I sleep, I wake up higher 😳',
  edit: { caption: 'every time I sleep, I wake up higher 😳', red: 'higher', story: 'stories/one_block_higher', startAt: 'line:0', endAfter: 'story_end:-0.05', punch: [['pop', 0, 0.07], ['lift', 0, 0.08]], zoom: [['seen:0.1', 'story_end', 1.3]] },
  botTimeout: 480,

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
    await c('/gamerule log_admin_commands false')   // per-tick `execute as` tps flood the bot with op broadcasts
    await c('/gamerule block_drops false')          // the flood washes flowers away: no item rain
    await c('/gamerule random_tick_speed 0')        // grass under the water and the wheat stay as built
    await clearSet(ctx, A, 64, 26)
    for (const y of [1, 2, 3]) await c(`/fill ${A(-64, y, -64)} ${A(64, y, 64)} air replace gravel`)   // gravel from a cut hillside lands on the set as grey heaps
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 30)
    // the bowl: clearSet's terraces made solid (ring i is 2 wide and i high), so flood layer n is held by ring n
    for (let i = 1; i <= 8; i++) {
      const a0 = 64 + 2 * i - 1, a1 = 64 + 2 * i
      for (const [x0, z0, x1, z1] of [[-a1, -a1, a1, -a0], [-a1, a0, a1, a1], [-a1, -a0, -a0, a0], [a0, -a0, a1, a0]]) {
        await c(`/fill ${A(x0, -2, z0)} ${A(x1, i - 1, z1)} dirt`)
        await c(`/fill ${A(x0, i, z0)} ${A(x1, i, z1)} oak_leaves[persistent=true]`)   // a leafy bank: from the ground a terrace of grass blocks shows only its dirt sides, a brown wall round the whole set
      }
    }

    // --- the sea, north of the village: three deep, inside the clearing's dirt
    await c(`/fill ${A(-62, -2, -62)} ${A(62, 0, -34)} water`)
    // the fisherman's house, two blocks down in it, out from the shore: only the top of the walls and the roof are above the water (door shut, or it floods)
    await house(ctx, (dx, dy, dz) => A(dx, dy - 2, dz), 10, -46, 10, -44, 'east', false)
    // a shelf under the golem: two deep there, so the water is at his neck
    await c(`/fill ${A(-14, -2, -39)} ${A(-12, -2, -37)} dirt`)

    // --- the village: a path north from the pillar to the shore, four houses, mine east of the pillar
    await c(`/fill ${A(0, 0, -33)} ${A(1, 0, -2)} dirt_path`)
    for (const z0 of [-17, -26]) {
      await house(ctx, A, -9, z0, -4, z0 + 2, 'west')
      await house(ctx, A, 4, z0, 4, z0 + 2, 'east')
    }
    await house(ctx, A, 4, -1, 4, 1, 'east')
    for (const [dx, dz, b] of [[-2, -12, 'poppy'], [3, -22, 'dandelion'], [-2, -29, 'cornflower'], [3, -9, 'oxeye_daisy'], [-3, 5, 'poppy'], [3, 7, 'dandelion']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    for (const [dx, dz] of [[-2, -14], [3, -30]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }

    // --- the farmer's field (L03): a fenced pond now, one last row of wheat, a hay bale in the water
    await c(`/fill ${A(-30, 0, -14)} ${A(-23, 0, -4)} water`)
    await c(`/fill ${A(-22, 0, -14)} ${A(-22, 0, -4)} farmland[moisture=7]`)
    await c(`/fill ${A(-22, 1, -14)} ${A(-22, 1, -4)} wheat[age=7]`)
    await c(`/fill ${A(-31, 1, -15)} ${A(-31, 1, -3)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(-21, 1, -15)} ${A(-21, 1, -3)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(-30, 1, -15)} ${A(-22, 1, -15)} oak_fence[east=true,west=true]`)
    await c(`/fill ${A(-30, 1, -3)} ${A(-22, 1, -3)} oak_fence[east=true,west=true]`)
    await c(`/setblock ${A(-31, 1, -15)} oak_fence[south=true,east=true]`); await c(`/setblock ${A(-21, 1, -15)} oak_fence[south=true,west=true]`)
    await c(`/setblock ${A(-31, 1, -3)} oak_fence[north=true,east=true]`); await c(`/setblock ${A(-21, 1, -3)} oak_fence[north=true,west=true]`)
    await c(`/setblock ${A(-28, 0, -12)} hay_block`); await c(`/setblock ${A(-27, 0, -6)} hay_block`)

    // --- the hill behind my house (L06), a big bite dug out of it, and the mud trail from the bite to the pillar
    const hill = [[14, 29, -8, 8], [15, 28, -7, 7], [16, 27, -6, 6], [18, 25, -4, 4], [20, 23, -2, 2]]
    for (let i = 0; i < hill.length; i++) { const [x0, x1, z0, z1] = hill[i]; await c(`/fill ${A(x0, i + 1, z0)} ${A(x1, i + 1, z1)} grass_block`) }
    for (let i = 1; i < hill.length; i++) { const [x0, x1, z0, z1] = hill[i]; await c(`/fill ${A(x0, i, z0)} ${A(x1, i, z1)} dirt`) }
    await c(`/fill ${A(14, 1, -8)} ${A(21, 5, -2)} air`)
    await c(`/fill ${A(14, 0, -8)} ${A(21, 0, -2)} coarse_dirt`)
    await c(`/fill ${A(2, 0, -4)} ${A(13, 0, -4)} mud`)
    await c(`/fill ${A(1, 0, -4)} ${A(1, 0, -2)} mud`)
    await c(`/fill ${A(12, 0, -5)} ${A(13, 0, -5)} mud`)
    for (const [dx, dz] of [[10, -5], [6, -3], [15, -4], [17, -6]]) await c(`/setblock ${A(dx, 1, dz)} dirt`)   // blocks they dropped

    // --- the sheep pen south of the pillar (L01: something small to look down on)
    await c(`/fill ${A(-10, 1, 15)} ${A(-1, 1, 22)} oak_fence`)
    await c(`/fill ${A(-9, 1, 16)} ${A(-2, 1, 21)} air`)
    await c(`/setblock ${A(-3, 1, 20)} hay_block`)
    for (const [dx, dz, b] of [[1, 17, 'poppy'], [2, 20, 'dandelion'], [0, 23, 'oxeye_daisy'], [-11, 18, 'cornflower']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    for (let i = 0; i < 4; i++) await c(`/summon sheep ${(X - 8 + i * 1.7).toFixed(2)} ${F + 1} ${(Z + 17 + (i % 2) * 2.6).toFixed(2)} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["sheep","warm"],Rotation:[${i * 75}f,0f]}`)

    // --- the pillar: 2 x 2 of dirt, eight high for now. I stand on the north row (z 0), the bed is on the
    // south row (z 1), the ladder runs up the north face
    await c(`/fill ${A(0, 1, 0)} ${A(1, 8, 1)} dirt`)
    await c(`/setblock ${A(1, 9, 1)} red_bed[part=head,facing=east]`)
    await c(`/setblock ${A(0, 9, 1)} red_bed[part=foot,facing=east]`)
    await c(`/fill ${A(0, 1, -1)} ${A(0, 8, -1)} ladder[facing=north]`)

    // --- the cast, all NoAI. The ones a later scene brings in wait buried under the set
    const vil = (x, y, z, yaw, prof, tags) => c(`/summon villager ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:[${tags.map(t => `"${t}"`).join(',')}],Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    await vil(-24.5, 0, -9.5, -90, 'farmer', ['farmer', 'warm'])              // L03: knee-deep in his field
    await vil(12.0, 3.5, -43.5, 0, 'fisherman', ['fisher', 'warm'])           // L04: on his roof
    await c(`/summon iron_golem ${X - 12.5} ${F - 1} ${Z - 37.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["golem","warm"],Rotation:[-70f,0f]}`)   // L05
    for (const t of ['fish1', 'fish2']) await c(`/summon salmon ${X + 8.5} ${F - 1.5} ${Z - 54.5} {NoAI:1b,NoGravity:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["${t}","fish","warm"]}`)
    const profs = ['librarian', 'cleric', 'armorer', 'fletcher', 'shepherd', 'mason', 'toolsmith', 'cartographer', 'leatherworker', 'weaponsmith']
    for (let i = 0; i < CROWD.length; i++) await vil(CROWD[i][0], -30, CROWD[i][1], 0, profs[i], ['crowd', `c${i % 2}`, `cr${i}`, 'warm'])   // L10: at the foot of the pillar
    await vil(0.5, -30, -0.6, 0, 'butcher', ['butcher', 'warm'])               // L12: up the ladder with my dinner
    for (let i = 0; i < GANG; i++) await vil(0.5, -32 - i * 0.01, -0.5, 0, ['butcher', 'farmer', 'librarian', 'fisherman', 'cleric', 'mason', 'shepherd', 'toolsmith'][i], ['gang', `g${i}`, 'warm'])   // L15: the ladder
    await vil(6.0, -34, 0.6, 0, 'armorer', ['roof', 'r0', 'warm'])
    await vil(7.6, -34, 2.4, 0, 'fletcher', ['roof', 'r1', 'warm'])
    await vil(21.5, -34, 0.5, 0, 'cartographer', ['roof', 'r2', 'warm'])
    await c('/item replace entity @e[tag=gang] weapon.mainhand with dirt')
    await c('/item replace entity @e[tag=roof] weapon.mainhand with dirt')
    await c('/item replace entity @e[tag=butcher] weapon.mainhand with bread')

    await c('/clear @s')
    // mineflayer ignores the biome-update packet: go out of range and back so the chunks come again with plains
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + 0.9, F + 9, Z + 0.35, 0, 40)
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
    const { P, say, look } = K
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    const go = (on) => bot.setControlState('forward', on)
    const setMeter = (v) => ctx.mark('meter', { value: v })
    const setTime = (n) => { say(`/time set ${n}`); ctx.dayTime = n; ctx.mark('time', { time: n }) }
    const thunk = (v = 1) => ctx.sound('block.gravel.place', v, 0.8)   // dirt's place sound
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 }

    // --- the pillar. level n: dirt at y 1..n, the bed at n + 1 on the south row, feet at n + 1 on the north row
    let level = 8
    const top = (n) => F + n + 1
    const grow = (n) => {
      if (n <= level) return
      say(`/fill ${A(0, level + 1, 0)} ${A(1, n, 1)} dirt`)   // takes the old bed with it
      say(`/setblock ${A(1, n + 1, 1)} red_bed[part=head,facing=east]`)
      say(`/setblock ${A(0, n + 1, 1)} red_bed[part=foot,facing=east]`)
      say(`/fill ${A(0, level + 1, -1)} ${A(0, n, -1)} ladder[facing=north]`)
      level = n
    }
    // the teleport goes first and the blocks follow a tick or two later: hold the feet at the new height until the
    // block under them is there (a fall of 0.08 a tick would end inside the new dirt)
    const pin = { until: -1, x: 0, y: 0, z: 0 }
    bot.on('physicsTick', () => {
      if (ctx.tick > pin.until) return
      const e = bot.entity
      if (Math.abs(e.position.y - pin.y) > 0.6 || Math.abs(e.position.x - pin.x) > 0.5) return   // not landed yet
      const b = bot.blockAt(new ctx.Vec3(Math.floor(pin.x), Math.round(pin.y) - 1, Math.floor(pin.z)))
      if (b && b.name !== 'air') { pin.until = -1; return }
      e.position.y = pin.y; e.velocity.y = 0; e.onGround = true
    })
    // a cut to any spot (x, y, z are absolute), arriving already aimed at `target`; it waits for the position AND
    // the angle, so a cut on the spot (a new aim only) and a one-block rise both land before the next look
    const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return Math.abs(d) }
    const cutTo = async (dx, y, dz, target, after = null) => {
      const x = X + dx, z = Z + dz
      const d = target.minus(new ctx.Vec3(x, y + 1.62, z))
      const nb = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
      const yaw = nb.yaw + K.swayY(), pitch = nb.pitch + K.swayP()
      ctx.mark('cut')
      say(`/tp @s ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)} ${(180 - yaw * 180 / Math.PI).toFixed(2)} ${(-pitch * 180 / Math.PI).toFixed(2)}`)
      if (after) after()
      for (let i = 0; i < 10; i++) {
        await bot.waitForTicks(1)
        const p = bot.entity.position
        if (Math.abs(p.x - x) < 0.05 && Math.abs(p.z - z) < 0.05 && Math.abs(p.y - y) < 0.6 && angDiff(bot.entity.yaw, yaw) < 0.03 && Math.abs(bot.entity.pitch - pitch) < 0.03) break
        K.look(0)
      }
      K.base = nb
      await K.look(0)
    }
    // wake up on the pillar at level n (it grows on the cut)
    const rise = (n, target, cx = 0.5, cz = 0.5) => {
      Object.assign(pin, { until: ctx.tick + 12, x: X + cx, y: top(n), z: Z + cz })
      return cutTo(cx, top(n), cz, target, () => grow(n))
    }
    // one line: mark it, run scene(k, at) every tick for its spoken length + gap + extra. The idle cast is nudged
    // every tick (a long-idle mob's first move reaches the client ~1 s late)
    const line = async (id, scene, extra = 0) => {
      const L = S.line(id)
      const ticks = Math.round((L.dur + S.gap + extra) * 20)
      ctx.mark('line', { id })
      for (let k = 0; k < ticks; k++) {
        say(`/execute as @e[tag=warm] at @s run tp @s ~${k % 2 ? 0.002 : -0.002} ~ ~`)
        await scene(k, L.at, ticks); await bot.waitForTicks(1)
      }
    }
    const bury = (tag) => say(`/tp @e[tag=${tag}] ${X + 0.5} ${F - 30} ${Z + 0.5}`)

    // L01: on top, the bed at my feet, the sheep pen far below. On "ONE block" I'm a block higher: eight becomes nine
    setMeter(8)
    const hookView = P(-2.5, 1, 19)
    await rise(8, hookView, 0.9, 0.35)
    await line('L01', async (k, at) => {
      if (k >= at(3) && level < 9) { thunk(); setMeter(9); ctx.mark('pop'); await rise(9, hookView, 0.9, 0.35) }
      look(k, Math.sin(k / 14) * 0.05, 0)
    }, -0.05)

    // L02: the pillar from the ground: nine blocks of dirt, the bed on top
    await cutTo(4.5, F + 1, 16.5, P(1, 2.5, 1.5))
    const f2 = { ...K.base }
    await line('L02', async (k, at, n) => {
      go(k > 1 && k < 24)
      K.turnTo(f2, P(1, 10.2, 1.5), k / (n - 6)); look(k)
    })
    go(false)

    // L03: the farmer, knee-deep in his field. He turns his back and wades off
    await cutTo(-19.4, F + 1, -9.5, P(-24.5, 1.3, -9.5))
    ctx.mark('face_on', { near: [X - 24.5, Z - 9.5, 1.2], head: true })
    let fx = -24.5, f3 = null
    await line('L03', async (k, at) => {
      const off = at(3) + 2
      if (k === off) ctx.mark('face_off')
      if (k >= off) {
        fx = Math.max(-28.7, fx - 0.065)
        say(`/tp @e[tag=farmer,limit=1] ${(X + fx).toFixed(3)} ${F} ${(Z - 9.5).toFixed(3)} 90 0`)
        if (k % 4 === 0 && fx > -28.7) { ctx.particles('splash', P(fx, 0.95, -9.5), { count: 5, spread: 0.7 }); if (k % 8 === 0) ctx.sound('entity.generic.swim', 0.35, 1) }
      }
      if (k >= at(5) - 2) { f3 = f3 || { ...K.base }; K.turnTo(f3, P(-25.5, 0.6, -7.5), (k - at(5) + 2) / 22) } else K.base = K.aim(P(fx, 1.3, -9.5))
      look(k)
    })

    // L04: the fisherman paces his roof out in the sea; on "the fish come to HIM" two salmon jump clean over it
    await cutTo(12.5, F + 1, -30.6, P(13, 2.6, -43.5))
    let px = 12.0, pd = 1
    const leap = (tag, u, x0, z0, x1, z1) => {   // one salmon's arc, u 0..1; back under the sea after it
      if (u < 0 || u > 1.08) return
      if (u > 1) { say(`/tp @e[tag=${tag}] ${X + 8.5} ${F - 1.5} ${Z - 54.5}`); return }
      const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, y = 0.6 + Math.sin(u * Math.PI) * 5.6
      say(`/tp @e[tag=${tag}] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${x1 > x0 ? -90 : 90} ${(-Math.cos(u * Math.PI) * 55).toFixed(1)}`)
    }
    const splashAt = (x, z, v = 0.5) => { ctx.particles('splash', P(x, 0.95, z), { count: 14, spread: 1.0 }); ctx.sound('entity.generic.splash', v, 1.1) }
    await line('L04', async (k, at) => {
      go(bot.entity.position.z > Z - 32.2)
      px += 0.04 * pd; if (px > 14.4 || px < 11.6) pd = -pd
      say(`/tp @e[tag=fisher,limit=1] ${(X + px).toFixed(3)} ${F + 3.5} ${(Z - 43.5).toFixed(3)} ${pd > 0 ? -90 : 90} 0`)
      const a = at(3) - 2, b = at(4) - 4
      leap('fish1', (k - a) / 16, 7.4, -42.0, 18.6, -42.6)
      leap('fish2', (k - b) / 16, 18.8, -44.8, 7.2, -44.2)
      if (k === a) splashAt(7.4, -42.0); if (k === a + 16) splashAt(18.6, -42.6)
      if (k === b) splashAt(18.8, -44.8); if (k === b + 16) splashAt(7.2, -44.2)
      K.base = K.aim(P(13 + (px - 13) * 0.4, 2.8, -43.5)); look(k)
    })
    go(false)
    say(`/tp @e[tag=fish] ${X + 8.5} ${F - 1.5} ${Z - 54.5}`)

    // L05: the iron golem in the sea up to his neck. His head turns to me; he looks fine
    await cutTo(-12.5, F + 1, -30.4, P(-12.5, 0.9, -37.5))
    ctx.mark('face_on', { near: [X - 12.5, Z - 37.5, 1.5], head: true })
    await line('L05', async (k, at) => {
      go(bot.entity.position.z > Z - 32.3)
      const u = ease((k - at(1)) / 20)
      say(`/tp @e[tag=golem,limit=1] ${X - 12.5} ${(F - 1 + Math.sin(k / 7) * 0.03).toFixed(3)} ${Z - 37.5} ${(-70 + 70 * u).toFixed(1)} 0`)
      if (k % 7 === 0) ctx.particles('splash', P(-12.5 + Math.sin(k) * 0.7, 0.95, -37.5 + Math.cos(k * 1.3) * 0.7), { count: 3, spread: 0.5 })
      K.base = K.aim(P(-12.5, 0.9, -37.5)); look(k, 0, k >= at(5) ? Math.sin(Math.min(1, (k - at(5)) / 10) * Math.PI) * -0.07 : 0)
    })
    go(false)
    ctx.mark('face_off')

    // L06: the hill behind my house, a bite dug out of it. The camera follows the mud trail from the bite to the pillar
    await cutTo(10.5, F + 1, -11.0, P(18.5, 2.4, -5))
    let f6 = null
    await line('L06', async (k, at) => {
      go(k < 9)
      if (k >= at(3) - 3) { f6 = f6 || { ...K.base }; K.turnTo(f6, P(1.5, 2.5, -1), (k - at(3) + 3) / 20) }
      look(k)
    })
    go(false)

    // L07: night ten, eleven, twelve: a jump cut a number, the village dropping away under me
    const roofView = (n) => P(0.5, 1, -15)   // north, down the path through the village
    setMeter(10); thunk(0.8)
    await rise(10, roofView(10), 0.5, 0.3)
    await line('L07', async (k, at) => {
      for (const [ch, n] of [[1, 11], [2, 12]]) if (k >= at(ch) && level < n) { setMeter(n); thunk(0.8); await rise(n, roofView(n), 0.5, 0.3) }
      look(k)
    }, -0.15)

    // L08: I think my bed is growing (a close look along it, foot to pillow)
    await cutTo(1.0, top(12), 0.4, P(0.5, 13.35, 1.5))
    const f8 = { ...K.base }
    await line('L08', async (k, at, n) => { K.turnTo(f8, P(1.75, 13.4, 1.55), k / (n - 2)); look(k) })

    // L09: so I slept on the ground (dusk, down in the grass)... and woke up in my bed, one block higher
    setTime(12300)
    await cutTo(-3.5, F + 1, 3.5, P(-2.0, 0.2, 5.5))
    let woke = false, f9 = null, f9b = null, crowdUp = false
    await line('L09', async (k, at) => {
      if (!woke) {
        bot.setControlState('sneak', true)
        if (k >= at(1)) { f9 = f9 || { ...K.base }; K.turnTo(f9, P(-2.6, 14, 4.2), (k - at(1)) / (at(3) - at(1) + 2)) }   // lying back: up to the dusk sky
        if (k >= at(3)) {
          woke = true; bot.setControlState('sneak', false)
          setTime(6000); thunk(0.8)
          await rise(13, P(1.1, 14.3, 1.6), 1.0, 0.4)
        }
      } else {
        if (!crowdUp) { crowdUp = true; for (let i = 0; i < CROWD.length; i++) say(`/tp @e[tag=cr${i}] ${(X + CROWD[i][0]).toFixed(2)} ${F + 1} ${(Z + CROWD[i][1]).toFixed(2)} 0 -40`) }
        if (k === at(5)) setMeter(13)
        if (k >= at(5)) { f9b = f9b || { ...K.base }; K.turnTo(f9b, P(1.0, 1, 8), (k - at(5)) / 26) }   // and over the bed to the ground: higher
      }
      look(k)
    }, -0.1)

    // L10: everyone at the foot of the pillar, looking up: stay up there (they hop on it)
    ctx.mark('face_on', { near: [X + 1, Z - 7.8, 4.6] })
    await cutTo(0.5, top(13), 0.25, P(0.8, 2.0, -7.8))
    let f10 = null, t10 = 0
    await line('L10', async (k, at) => {
      for (const g of [0, 1]) {
        const h = k >= at(1) - 2 && k < at(3) ? Math.abs(Math.sin((k - at(1) + 2) * 0.42 + g * 1.5)) * 0.45 : 0
        say(`/execute as @e[tag=c${g}] at @s run tp @s ~ ${(F + 1 + h).toFixed(3)} ~`)
      }
      if (k >= at(3) - 2) { f10 = f10 || { ...K.base }; K.turnTo(f10, P(1.5, 1.5, -48), t10++ / 40) }
      look(k)
    })
    ctx.mark('face_off')
    // L11: it IS better: the pan lands on the sea, right behind the village (the fisherman's roof, the golem's head)
    await line('L11', async (k, at) => {
      if (t10 < 44) K.turnTo(f10, P(1.5, 1.5, -48), t10++ / 40)
      if (k === at(2)) say(`/tp @e[tag=butcher] ${X + 0.5} ${F + level - 2.2} ${Z - 0.6} 0 0`)   // the butcher starts up the ladder, under the frame
      look(k, Math.sin(Math.max(0, k - at(1)) / 16) * 0.12, 0)
    })

    // L12: the butcher at the top of the ladder with my dinner, dripping
    await cutTo(1.5, top(13), 0.45, P(0.55, 14.55, -0.6))
    ctx.mark('face_on', { near: [X + 0.5, Z - 0.6, 0.8], head: true })
    let by = level - 2.2
    await line('L12', async (k, at) => {
      by = Math.min(level - 0.15, by + 0.2)
      say(`/tp @e[tag=butcher] ${X + 0.5} ${(F + by + Math.sin(k / 5) * 0.03).toFixed(3)} ${Z - 0.6} 0 0`)
      if (k === at(2) || k === at(2) + 5) { say(`/item replace entity @s hotbar.4 with bread ${k === at(2) ? 1 : 2}`); ctx.sound('entity.item.pickup', 0.4, 1.4) }   // not in the hand: it filled the corner of every shot after
      if (k % 2 === 0) ctx.particles('splash', P(0.5, by + 0.5 + Math.random() * 1.2, -0.6), { count: k >= at(3) ? 4 : 2, spread: 0.5 })
      look(k, 0, k >= at(3) ? -0.14 * ease((k - at(3)) / 10) : 0)
    })
    ctx.mark('face_off')

    // L13: night sixteen. In bed, the dusk sky; down below, digging and splashing. The sea comes in under the frame
    setTime(12300); setMeter(FINAL); thunk(0.8)
    for (const t of ['crowd', 'butcher', 'farmer', 'fisher', 'fish', 'sheep']) bury(t)
    await rise(FINAL, P(-16, FINAL + 1 + 24, -26), 1.5, 0.5)
    const flood = (n) => say(`/fill ${A(-62 - 2 * n, n, -62 - 2 * n)} ${A(62 + 2 * n, n, 62 + 2 * n)} water replace air`)
    const dig = (k) => {
      if (k % 5 === 0) ctx.sound(['block.gravel.break', 'block.gravel.hit', 'block.gravel.place', 'item.shovel.flatten'][(k / 5) % 4 | 0], 0.3 + Math.random() * 0.2, 0.8 + Math.random() * 0.3)
      if (k % 13 === 0) ctx.sound('entity.generic.swim', 0.3, 1)
    }
    let f13 = null
    await line('L13', async (k, at) => {
      if ([2, 12, 22, 32].includes(k)) flood([2, 12, 22, 32].indexOf(k) + 1)
      if (k >= at(4) - 4) dig(k)
      if (k >= at(5)) { f13 = f13 || { ...K.base }; K.turnTo(f13, P(1.5, FINAL + 1 + 9, -44), (k - at(5)) / 22) }
      look(k, k * 0.004, 0)
    })
    say('/kill @e[type=item]')

    // L14: tonight I only pretended to sleep: ducked down, eyes on the horizon, the digging louder. Under the frame
    // the chain forms: two on the ladder, six chest-deep in a line from the hill to the pillar (along the mud
    // trail), two on my roof, one on what's left of the hill
    const gpos = (i, k, still) => {
      const b = still ? 0 : Math.sin(k * 0.4 + i * 1.3)
      return i < 2 ? [0.5, FINAL - 2.0 - i * 5.2 + b * 0.2, -0.5] : [2.5 + (i - 2) * 2.1, 3.4 + b * 0.12, -3.5]
    }
    const gangMove = (k, still) => { for (let i = 0; i < GANG; i++) { const [x, y, z] = gpos(i, k, still); say(`/tp @e[tag=g${i}] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)}`) } }
    for (let i = 0; i < GANG; i++) { const [x, y, z] = gpos(i, 0, true); say(`/tp @e[tag=g${i}] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${i < 2 ? 0 : 90} 0`) }
    say(`/tp @e[tag=r0] ${X + 6.0} ${F + 5.5} ${Z + 0.6} 100 -60`); say(`/tp @e[tag=r1] ${X + 7.6} ${F + 5.5} ${Z + 2.4} 110 -55`); say(`/tp @e[tag=r2] ${X + 21.5} ${F + 6} ${Z + 0.5} 90 -30`)
    const f14 = { ...K.base }
    await line('L14', async (k, at, n) => {
      bot.setControlState('sneak', true)
      dig(k + 2); if (k % 9 === 4) ctx.sound('entity.villager.ambient', 0.25, 1)
      gangMove(k, false)
      K.turnTo(f14, P(1.5, FINAL + 1 + 3.2, -40), k / (n - 1))
      look(k)
    })

    // L15: and I peeked over the edge: the village under water, the chain of villagers passing dirt from the hill
    // to my ladder. They all look up. Then one more block goes in and I go up with it
    let f15 = null, seen = false, lifted = false
    const L15 = S.line('L15'), liftK = Math.round((L15.dur + S.gap) * 20) + 7
    await line('L15', async (k, at) => {
      go(bot.entity.position.z > Z + 0.02 && !lifted)
      f15 = f15 || { ...K.base }
      K.turnTo(f15, P(7, 4.5, -4), k / (at(2) + 2))
      if (!seen && k >= at(2) + 4) { seen = true; ctx.mark('face_on', { near: [X + 6.5, Z - 2, 9.5] }); ctx.sound('entity.villager.ambient', 0.8, 1); ctx.mark('seen') }
      if (!seen) dig(k)
      gangMove(k, seen)
      if (k === liftK) {
        lifted = true; go(false)
        ctx.mark('lift'); thunk(1); setMeter(FINAL + 1)
        const p = bot.entity.position
        Object.assign(pin, { until: ctx.tick + 12, x: p.x, y: top(FINAL + 1), z: p.z })
        say(`/tp @s ${p.x.toFixed(3)} ${top(FINAL + 1).toFixed(3)} ${p.z.toFixed(3)}`)   // no cut mark: the view rides up the one block
        grow(FINAL + 1)
      }
      look(k)
    }, 0.8)
    // L16: so THAT'S why... (into line 1)
    await line('L16', async (k) => { gangMove(k, true); if (k % 3 === 0) ctx.particles('splash', P(2.5 + Math.random() * 10, 4.95, -3.5), { count: 2, spread: 0.8 }); look(k, 0, -0.03 * ease(k / 14)) }, 0.14)
    ctx.mark('story_end')
    bot.setControlState('sneak', false)
    await bot.waitForTicks(4)
    return true
  }
}
