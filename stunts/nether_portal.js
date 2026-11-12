// "rating every way to light a nether portal 😳" (~18 s, docs/ideas.md #31; replaces the 7 s "your first
// nether portal"). Six obsidian frames in a row on one cleared field, a hard cut between them, each lit (or not)
// a stranger way, each rated with a card:
//   1. flint and steel (the normal way)                                               1/10
//   2. a fire charge                                                                  3/10
//   3. TNT in front of it: explosions don't make fire, the frame just sits there      0/10
//   4. redstone: a button on a dispenser loaded with flint and steel, behind the frame 5/10
//   5. lava: pour a bucket into a pit in front, planks behind; lava sets fire to air next to
//      something flammable (LavaFluid.randomTick)                                     8/10
//   6. the respawn anchor in the Overworld: charge it with glowstone, try to set the spawn... it blows
//      up, and its fire (an explosion that makes fire) lands in the frame: lit (blast protection IV
//      netherite leaves me a few hearts)                                             11/10
// Every lighting is a real vanilla action on the server (use packets, the dispenser's flint and steel, lava's
// random tick, the anchor's explosion); commands only build the set and raise the random tick speed during the
// lava wait (shown x6). Lead 2026-11-11: as short as it reads, the stunt on screen in the first 1.5 s.
const GAP = 16
// the anchor beat is unproven on camera: false ends on lava (8/10) instead (lead 2026-11-11: two tries, then lava)
const ANCHOR = true
const ST = [
  { id: 'flint', sub: 'flint and steel', score: '1/10', w: 2 },
  { id: 'charge', sub: 'fire charge', score: '3/10', w: 2 },
  { id: 'tnt', sub: 'TNT', score: '0/10', w: 2 },
  { id: 'dispenser', sub: 'redstone', score: '5/10', w: 2 },
  { id: 'lava', sub: 'lava', score: '8/10', w: 2 },
  { id: 'anchor', sub: 'respawn anchor', score: '11/10', w: 6 }   // wider: the blast's fire (1 in 3 per cell) lands in the frame
].filter(s => ANCHOR || s.id !== 'anchor')
const LAST = ST.length - 1
const MID = (ST.length - 1) / 2
// owner 2026-11-12 on v3 at 11.0 s: "need faster cuts" (r:r188b46, r:r0f3da0): cut on each rating and move straight on.
// Each method's result (the portal lights, or the TNT's frame stands empty) holds 0.5 s with its card, then a hard cut
// to the next frame (v3 held each one ~1.3 s: the step back and the look at the swirl)
const RESULT_HOLD = 0.5
const speed = []
const TNT = ST.findIndex(s => s.id === 'tnt')
const hold = (i) => i === TNT ? RESULT_HOLD + 0.1 : RESULT_HOLD   // the red 0/10 on black obsidian: a little longer (fix-check)
for (let i = 1; i < ST.length; i++) speed.push([`lit${i - 1}:${hold(i - 1)}`, `cut${i}b`, 'cut'])
// the TNT's fuse: one cut from the lit close-up to the wide 0.35 s before the blast (v4's wide blinked 1.2 s first: fix-check)
speed.push(['fuse_a', 'boom:-0.35', 'cut'])
speed.push(['boom:0.45', `lit${TNT}`, 'cut'])   // the TNT's smoke clearing (0.3 s): its blast reads, then the empty frame
speed.push(['lava_a', 'lava_b', 6])                     // the lava's wait, x6
// the anchor: after the 4th glowstone, the look up at the frame and back (~0.95 s) is cut: the view before and after it
// is the same (on the anchor, yaw -24 pitch -27 on this take), so the click follows the last charge
if (ANCHOR) speed.push(['charge:0.95', `lit${LAST}:-0.1`, 'cut'])   // (lit: 'boom' is the TNT's first)
const SLOT = { obsidian: 0, flint: 1, charge: 2, tnt: 3, lava: 4, glow: 5, hand: 6 }

module.exports = {
  name: 'nether_portal',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'rating every way to light a nether portal 😳',
  edit: {
    subsY: 0.15, caption: 'rating every way to light a nether portal 😳',
    armor: 20,   // the armour bar over the hearts: full netherite (review r1: surviving the anchor's blast with no armour on the HUD read as fake)
    red: 'every', dropAt: `lit${LAST}`,   // (these two had slipped into the comment above: the drop never landed on the payoff)
    startAt: 'st:-0.05', endAfter: 'settle:-0.65',   // ~1.2 s after the 11/10 card's blast: a text payoff's reading time (pace)   // r:r188b46: this take's settle mark is the old smoke wait (~1.9 s late): end ~1.2 s after the 11/10 card's blast. (was: the anchor's blast smoke drifts over the lit portal for 2.2 s (r:r24d99a): end 0.6 s after it settles, the 11/10 card up the whole time
    // pace r1: silent until 0.73 s: room tone from frame 1; the last light gets a dip + impact over the song (the publish gate)
    // mixcheck r1: under the NCS master the anchor's blast rose only ~4 dB (the room tone kept the level up): the song AND
    // the game duck 0.4 s before that blast (the 2nd boom; the TNT's is the 1st), the impact on it
    sfx: [['pop', 'st', { gain: 0.9 }], ['air', 'start', `lit${LAST}`, { gain: 0.5 }],   // (a pop on the first method's card, frame 0: the opening's hit, r:r0f3da0)
      ['dip', 'boom', 0.4, { nth: 1 }], ['gamedip', 'boom', 0.35, { nth: 1 }], ['impact', 'boom', { gain: 1.4, nth: 1 }]],
    speed,
    subs: [...ST.map((s, i) => ['st', s.sub, 1.4, i]), ['lava_a', 'x6', 0.8, 0]],
    cards: ST.map((s, i) => [`lit${i}`, s.score, i === LAST ? 3.2 : hold(i), i === LAST ? 'gold' : s.id === 'tnt' ? 'red' : i < 2 ? 'white' : 'yellow']),
    punch: ST.map((s, i) => [`lit${i}`, 0, i === LAST ? 1.12 : 1.06]),
    shake: [['boom', 0, 12], ['boom', 1, 20]],
    counter: { at: ST.map((s, i) => ['st', i]), total: ST.length }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    Object.assign(this, { x, z, floor })
    await ctx.defaultRules()
    for (const r of ['/difficulty normal', '/gamerule allow_entering_nether_using_portals false', '/gamerule random_tick_speed 0',
      '/gamerule tnt_explosion_drop_decay true', '/kill @e[type=!player]']) await ctx.cmd(r)
    // one field for all the frames (slabs under the /fill cap), wide and deep enough that no cut edge shows
    const XL = Math.floor(x - MID * GAP - 40), XR = Math.ceil(x + MID * GAP + 40)
    await ctx.cmd(`/forceload add ${XL} ${z - 40} ${XR} ${z + 24}`)
    await ctx.sleep(2000)
    for (let z0 = z - 40; z0 <= z + 24; z0 += 3) {
      const z1 = Math.min(z0 + 2, z + 24)
      await ctx.cmd(`/fill ${XL} ${floor + 1} ${z0} ${XR} ${floor + 24} ${z1} air`)
      await ctx.cmd(`/fill ${XL} ${floor} ${z0} ${XR} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${XL} ${floor - 4} ${z0} ${XR} ${floor - 1} ${z1} dirt`)
    }
    const y0 = floor + 1, pz = z
    this.st = ST.map((s, i) => {
      const cx = Math.round(x + (i - MID) * GAP), x0 = cx - (s.w >> 1)
      return { ...s, i, x0, x1: x0 + s.w + 1, xc: x0 + (s.w + 2) / 2, y0, pz }
    })
    for (const t of this.st) {
      {
        await ctx.cmd(`/fill ${t.x0} ${y0} ${pz} ${t.x1} ${y0 + 4} ${pz} obsidian`)
        await ctx.cmd(`/fill ${t.x0 + 1} ${y0 + 1} ${pz} ${t.x1 - 1} ${y0 + 3} ${pz} air`)
      }
      if (t.id === 'dispenser') {
        // behind the left bottom cell, facing it through the frame, a button on top
        await ctx.cmd(`/setblock ${t.x0 + 1} ${y0 + 1} ${pz - 1} dispenser[facing=south]{Items:[{Slot:4b,id:"minecraft:flint_and_steel",count:1}]}`)
        await ctx.cmd(`/setblock ${t.x0 + 1} ${y0 + 2} ${pz - 1} stone_button[face=floor]`)
      }
      if (t.id === 'lava') {
        // a one-block pit in front of the left bottom cell and planks behind the opening (a raised basin's rim was
        // what the bucket's ray hit: the lava went on top of it and ran out under my feet)
        await ctx.cmd(`/setblock ${t.x0 + 1} ${floor} ${pz + 1} air`)
        await ctx.cmd(`/fill ${t.x0 + 1} ${y0 + 1} ${pz - 1} ${t.x1 - 1} ${y0 + 1} ${pz - 1} oak_planks`)
      }
      if (t.id === 'anchor') await ctx.cmd(`/setblock ${Math.floor(t.xc)} ${y0} ${pz + 2} respawn_anchor[charges=0]`)
    }
    await ctx.cmd(`/forceload remove ${XL} ${z - 40} ${XR} ${z + 24}`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    await ctx.hotbar([['obsidian', 10], 'flint_and_steel', ['fire_charge', 3], 'tnt', 'lava_bucket', ['glowstone', 4], null, ['bread', 12], 'diamond_pickaxe'])
    // (after the hotbar: its /clear took the armour off too) blast protection IV netherite (the armour bar shows it): the anchor's blast leaves a few hearts. Dead, the
    // client never saw the blast's fire land in the frame (5 tries: the opening stayed air under the death screen)
    for (const [slot, item] of [['head', 'netherite_helmet'], ['chest', 'netherite_chestplate'], ['legs', 'netherite_leggings'], ['feet', 'netherite_boots']]) {
      await ctx.cmd(`/item replace entity @s armor.${slot} with ${item}[enchantments={blast_protection:4}]`)
    }
    const t0 = this.st[0]
    await ctx.tpCheck(t0.xc + 0.01, floor + 1, pz + 3.6, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(SLOT.flint)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const floor = this.floor
    let booms = 0
    bot._client.on('explosion', () => { booms++; ctx.mark('boom') })
    const portalIn = (t) => { for (let dx = 1; dx <= t.w; dx++) { const b = bot.blockAt(new Vec3(t.x0 + dx, t.y0 + 1, t.pz)); if (b && b.name === 'nether_portal') return true } return false }
    const solid = (x, y, z) => { const b = bot.blockAt(new Vec3(x, y, z)); return b && b.boundingBox === 'block' }
    // the portals' ambient particles (NetherPortalBlock.animateTick), for every lit frame
    const lit = new Set()
    let pt = 0
    const portalParts = () => {
      if (pt++ % 3) return
      for (const t of lit) ctx.particles('portal', { x: t.x0 + 1 + Math.random() * t.w, y: t.y0 + 1 + Math.random() * 3, z: t.pz + 0.5 }, { count: 4, face: true })
    }
    bot.on('physicsTick', portalParts)
    const tp = async (x, y, z, yaw, pitch) => {
      for (let i = 0; i < 6; i++) {
        await ctx.cmd(`/tp @s ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)} ${yaw} ${pitch}`)   // decimals: a whole number is centred (+0.5)
        await bot.waitForTicks(6)
        const p = bot.entity.position
        if (Math.hypot(p.x - x, p.z - z) < 0.3) return
      }
      ctx.log('tp did not stick')
    }
    // every click is aimed by construction (lib/act.js, owner r:rffba12): the crosshair lands on the exact point
    // on the block it clicks before the packet goes
    const A = require('../lib/act')(ctx)
    // the lava's wait plays x6: its look-around turns at <= 30 deg/s here (180 on screen; owner r:r38374d whip cap)
    const A6 = require('../lib/act')(ctx, { turnSpeed: 30, turnAccel: 150 })
    const look = (p, o = {}) => A.turnTo(p, { tol: 0.03, max: 40, ...o })   // every look round is governed (<= 220 deg/s, eased)
    const place = async (loc, face, cur) => {
      await A.aimAt(new Vec3(loc.x + cur[0], loc.y + cur[1], loc.z + cur[2]), { on: loc, strict: false })
      bot._client.write('block_place', { hand: 0, location: loc, direction: face, cursorX: cur[0], cursorY: cur[1], cursorZ: cur[2], insideBlock: false, worldBorderHit: false, sequence: 0 })   // motion-ok: aimed above (A.aimAt lands on this exact point; the face matters: fire on top)
      bot.swingArm()
    }
    // one governed aim step toward a point (callers loop it every tick): lib/act.js's turner, <= 220 deg/s, eased
    const aimStep = async (p, gov = A) => { await gov.view(p); await bot.waitForTicks(1) }
    // after it lights: the swirl, a short step back with the eyes on it (no still hold)
    const admire = async (t, ticks = 26) => {
      lit.add(t); ctx.sound('block.portal.ambient', 0.5, 1)
      const c = new Vec3(t.xc, t.y0 + 2.4, t.pz + 0.5)
      bot.setControlState('back', true)
      for (let k = 0; k < ticks; k++) {
        if (k === 9) bot.setControlState('back', false)
        await aimStep(c.offset(Math.sin(k / 7) * 0.5, 0, 0))
      }
      bot.setControlState('back', false)
    }
    // a slow look around the opening while we wait (sped up on screen)
    // (r:r38374d: the old look snapped 15% of the way a tick from the pour onto the orbit: 364 deg/s at x6. Now the view
    // lands on the orbit's start before the sped-up span, and the orbit turns on the slow governor)
    const waitFor = async (t, cond, max, a, b, around) => {
      const orbit = (k) => { const f = (k % 160) / 160; return around.offset(Math.sin(f * Math.PI * 2) * 0.7, Math.cos(f * Math.PI * 2) * 0.3, 0) }
      await look(orbit(0), { max: 30 })
      ctx.mark(a)
      for (let k = 0; k < max && !cond(); k++) await aimStep(orbit(k), A6)
      ctx.mark(b)
      return cond()
    }

    for (const t of this.st) {
      const n = t.i
      if (n > 0) {
        ctx.mark(`cut${n}a`)
        await tp(t.xc, floor + 1, t.pz + 3.6, 180, 10)
        await bot.waitForTicks(2)
        ctx.mark(`cut${n}b`)
      }
      ctx.mark('st', { n, id: t.id })
      const bottom = new Vec3(t.x0 + 1.5, t.y0 + 1, t.pz + 0.5)
      const lightBottom = async (slot, sound) => { await place({ x: t.x0 + 1, y: t.y0, z: t.pz }, 1, [0.5, 1, 0.5]); ctx.sound(sound, 1) }

      if (t.id === 'flint') {
        ctx.select(SLOT.flint)
        await look(new Vec3(t.xc - 0.3, t.y0 + 3.6, t.pz + 0.5))
        await look(bottom.offset(0, 0.05, 0))
        await lightBottom(SLOT.flint, 'item.flintandsteel.use')
      } else if (t.id === 'charge') {
        ctx.select(SLOT.charge)
        await look(new Vec3(t.xc + 0.3, t.y0 + 3.6, t.pz + 0.5))
        await look(bottom.offset(0, 0.05, 0))
        await lightBottom(SLOT.charge, 'item.firecharge.use')
      } else if (t.id === 'tnt') {
        // TNT right in front of the opening, lit, then back off and watch: the frame stands, nothing lights
        ctx.select(SLOT.tnt)
        await look(new Vec3(t.x0 + 1.5, t.y0 - 0.05, t.pz + 1.5))
        await place({ x: t.x0 + 1, y: floor, z: t.pz + 1 }, 1, [0.5, 1, 0.5]); ctx.sound('block.grass.place', 1)
        await bot.waitForTicks(5)
        ctx.select(SLOT.flint)
        await bot.waitForTicks(4)
        await place({ x: t.x0 + 1, y: t.y0, z: t.pz + 1 }, 3, [0.5, 0.5, 1]); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
        ctx.mark('primed')
        const litAt = ctx.tick
        await ctx.easeLook(bot.entity.yaw, bot.entity.pitch + 0.15, 250)
        ctx.mark('fuse_a')
        await tp(t.xc, floor + 1, t.pz + 11.5, 180, 8)
        const c = new Vec3(t.xc, t.y0 + 1.8, t.pz + 0.5)
        while (ctx.tick - litAt < 56) await aimStep(c)
        ctx.mark('fuse_b')
        const before = booms
        for (let k = 0; k < 40 && booms === before; k++) await aimStep(c.offset(Math.sin(k / 4) * 0.3, 0, 0))
        // the smoke clears: the frame is still there... and still empty
        for (let k = 0; k < 14; k++) await aimStep(c)
        ctx.mark(`lit${n}`)
        bot.setControlState('forward', true)
        for (let k = 0; k < 18; k++) await aimStep(c.offset(0, -0.3, 0))
        bot.setControlState('forward', false)
        if (portalIn(t)) { ctx.log('TNT lit it?'); return false }
        continue
      } else if (t.id === 'dispenser') {
        // the dispenser behind the frame, then the button on it
        await look(new Vec3(t.x0 + 1.5, t.y0 + 1.5, t.pz - 0.5))
        await look(new Vec3(t.x0 + 1.5, t.y0 + 2.1, t.pz - 0.5))
        ctx.select(SLOT.hand)
        await place({ x: t.x0 + 1, y: t.y0 + 2, z: t.pz - 1 }, 1, [0.5, 0.1, 0.5])
        ctx.sound('block.stone_button.click_on', 1)
        ctx.mark('button')
        await bot.waitForTicks(4)
        ctx.sound('block.dispenser.dispense', 1)
        ctx.particles('smoke', { x: t.x0 + 1.5, y: t.y0 + 1.5, z: t.pz + 0.1 }, { count: 6 })
        ctx.sound('item.flintandsteel.use', 1)
        await look(bottom.offset(0, 0.4, 0))
      } else if (t.id === 'lava') {
        ctx.select(SLOT.lava)
        // the pit's back wall (under the frame): the bucket's own ray from the eye puts the lava in the pit
        await A.aimAt(new Vec3(t.x0 + 1.5, floor + 0.5, t.pz + 1.02), { on: { x: t.x0 + 1, y: floor, z: t.pz }, strict: false })
        bot.activateItem(); bot.swingArm()             // motion-ok: aimed above (a bucket is a use_item, not a use-on-block)
        ctx.sound('item.bucket.empty_lava', 1)
        ctx.mark('poured')
        await bot.waitForTicks(6)
        const pit = bot.blockAt(new Vec3(t.x0 + 1, floor, t.pz + 1))
        if (!pit || pit.name !== 'lava') { ctx.log('the lava missed the pit:', pit && pit.name); return false }
        // lava lights air next to something flammable: the planks behind the opening
        await ctx.cmd('/gamerule random_tick_speed 500')
        const ok = await waitFor(t, () => portalIn(t), 900, 'lava_a', 'lava_b', new Vec3(t.xc, t.y0 + 1.2, t.pz + 0.5))
        await ctx.cmd('/gamerule random_tick_speed 0')
        if (!ok) { ctx.log('lava never lit it'); return false }
      } else if (t.id === 'anchor') {
        const a = new Vec3(Math.floor(t.xc), t.y0, t.pz + 2)
        ctx.select(SLOT.glow)
        await look(new Vec3(t.xc, t.y0 + 3, t.pz + 0.5))
        await look(a.offset(0.5, 1, 0.5))
        const use = () => place(a, 1, [0.5, 1, 0.5])   // async: awaited below
        for (let c = 0; c < 4; c++) {                   // four glowstone: fully charged
          await use(); ctx.sound('block.respawn_anchor.charge', 1, 1 + c * 0.05)
          ctx.mark('charge', { c })
          await bot.waitForTicks(6)
        }
        // an empty hand: right-click sets the spawn... in the Overworld it explodes
        ctx.select(SLOT.hand)
        await look(new Vec3(t.xc, t.y0 + 1.4, t.pz + 0.5))
        await look(a.offset(0.5, 1, 0.5))
        const before = booms
        await use()
        for (let k = 0; k < 20 && booms === before; k++) await bot.waitForTicks(1)
        for (let k = 0; k < 4 && !portalIn(t); k++) await bot.waitForTicks(1)
        for (let k = 0; k < 16 && !portalIn(t); k++) await bot.waitForTicks(1)
        if (!portalIn(t)) {
          const row = []; for (let dx = 0; dx <= t.w + 1; dx++) for (const dy of [0, 1]) row.push(`${dx},${dy}:${bot.blockAt(new Vec3(t.x0 + dx, t.y0 + dy, t.pz))?.name}`)
          ctx.log('the blast did not light it, died', ctx.died, 'booms', booms, row.join(' '))
          return false
        }
        ctx.mark(`lit${n}`)
        await admire(t, 30)                              // knocked back, a few hearts left: the frame is lit
        bot.removeListener('physicsTick', portalParts)
        return !ctx.died
      }
      // wait for the portal (the dispenser lights it a few ticks later)
      for (let k = 0; k < 20 && !portalIn(t); k++) await bot.waitForTicks(1)
      if (!portalIn(t)) { ctx.log('no portal at', t.id); return false }
      ctx.mark(`lit${n}`)
      if (n === LAST) { await admire(t, 30); bot.removeListener('physicsTick', portalParts); return !ctx.died }   // the last frame (lava when ANCHOR is off)
      await admire(t)
    }
    return false
  }
}
