// The "underdog" format (docs/formats.md, r:r8dcdb4: "...but what about him?"): a fast list of every mob the game
// lets you heal or fix, each one really hurt and really healed with vanilla mechanics, one beat each with its own
// sound hit; then the caption flips to the one mob nothing can fix, alone, played for sympathy (a soft sad NCS track:
// edit.ncsMood 'sad', scripts/add_song.py).
//
// A subject module gives the beats and the forgotten one; this file does the set, the cuts and the edit:
//   makeStunt({ name, caption, red, twist, biome, time, beats: [BEAT...], forgotten: FORGOTTEN })
//   BEAT = { id, card, mob: 'wolf', nbt: '{...}' (summon NBT; {owner} is replaced by the bot's UUID int array),
//            dist: blocks from the mob to the eye (3.2), aimY: where on the mob to aim (0.5 of its height),
//            hurt: damage dealt as the beat opens (the red flash; 0 for none), hurtSound,
//            feeds: [[item, sound], ...] one right-click each (lib/act.js A.useOn), fixedSound: [name, vol, pitch]
//            (played on the last feed: the 'fixed_<id>' mark the edit's ding lands on),
//            cure: true (the zombie villager: a thrown splash potion of weakness, a golden apple, the shaking, then
//            the conversion, its wait cut short: a 'later' sub over it),
//            roof: true (a sandstone canopy over the mob: a zombie villager burns in daylight) }
//   FORGOTTEN = { mob: 'snow_golem', nbt, dist, card, tryItem: the item it is offered in vain (useOn: nothing),
//                 calm: ticks before it starts melting (its 4 hp last ~1.5 s in a hot biome), hurtSound, deathSound }
//
// Layout (set offsets; +x east, +z south): the beats' stations along x every SPACING blocks at z 0, each mob at
// (x, 0) and the eye `dist` blocks south of it looking north; the forgotten one FX blocks east of the last station,
// the eye west of it looking east, up into the morning sun (the stations behind the camera). Each station is its own cut (a teleport: the 'cut' mark), the camera still on both sides.
const SPACING = 12
const HEIGHT = { wolf: 0.85, cat: 0.7, horse: 1.6, iron_golem: 2.7, zombie_villager: 1.95, villager: 1.95, snow_golem: 1.9 }
const POTION = 'splash_potion[potion_contents={potion:"minecraft:weakness"}]'
const FX = 24      // the forgotten one's spot, east of the last station

function makeStunt (S) {
  const beats = S.beats, F_ = S.forgotten
  return {
    name: S.name,
    beats,
    biome: process.env.BIOME || S.biome || 'minecraft:desert',
    caption: S.caption,
    time: S.time ?? 500,      // early morning: the sun low in the east, right behind the forgotten one in its shot
    renderDistance: 10, recordRadius: 96,
    botTimeout: 600,
    edit: {
      caption: S.caption, red: S.red, song: null,
      ncsMood: 'sad',                       // the soft sung track (music/ncs.json mood 'sad'), not a phonk bed
      startAt: `beat_${beats[0].id}:-0.05`,
      endAfter: 'settle:1.0',               // the forgotten one's death poof (its clouds drift ~1 s past the settle mark) gone: the empty desert (r:r24d99a)
      dropAt: 'twist',
      cards: [...beats.map(b => [`beat_${b.id}`, b.card, 1.15, b.color || 'white', 0, null, { y: 0.16 }]),
        ['twist', S.twist, 2.6, 'yellow', 0, null, { y: 0.16 }]],
      subs: beats.filter(b => b.cure).map(b => [`later_${b.id}`, b.later || '5 minutes later...', 1.0]),
      punch: ['twist'],
      // a sound hit on every fix (a ding over the mob's own sound), a record scratch on the flip; on the death the
      // song dips and a soft hit lands (the final mix needs a real hit on the payoff: ./hb mixcheck)
      sfx: [...beats.map(b => ['ding', `fixed_${b.id}`, { gain: 0.8 }]), ['scratch', 'twist'],
        ['dip', 'melted', 0.4], ['heart', 'melted', { gain: 1.0 }], ...(S.sfx || [])],
      ...(S.edit || {})
    },

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      const hs = require('./hide_seek')
      const site = await hs.findSite(ctx, this.biome, { tries: 10, good: 16 })
      const x1 = (beats.length - 1) * SPACING, fx = this.fx = x1 + FX
      // the set's middle on the site: the stations west of it, the forgotten one east
      const X = site.X - Math.round(fx / 2), Z = site.Z, F = site.F
      Object.assign(this, { X, Z, F })
      for (const r of ['random_tick_speed 0', 'mob_drops false', 'mob_griefing false', 'log_admin_commands false', 'natural_health_regeneration false']) await ctx.cmd(`/gamerule ${r}`, { mayFail: true })
      await ctx.cmd('/difficulty easy')   // a zombie villager despawns on peaceful
      // a cleared desert field around the whole set (sand on sandstone, the desert biome), the hills past it cut in
      // terraces (lib/hide_seek.js): the first take's strip left a cut dirt bank and floating tree tops in view
      await hs.clearField(ctx, { X: site.X, Z, F, hill: site.hill || 24 }, { r: Math.round(fx / 2) + 30, biome: this.biome, top: 'sand', under: 'sandstone', taper: 3 })
      // clearField lays the sand before the sandstone under it: over low ground it fell, leaving holes (the bot
      // stood a block low at a station). Refill the surface once the falling sand has landed
      {
        const r = Math.round(fx / 2) + 30
        await ctx.sleep(2500)
        await ctx.cmd('/kill @e[type=minecraft:falling_block]', { mayFail: true })
        for (let z0 = Z - r; z0 <= Z + r; z0 += 40) {
          const z1 = Math.min(z0 + 39, Z + r)
          await ctx.cmd(`/fill ${site.X - r} ${F - 4} ${z0} ${site.X + r} ${F - 1} ${z1} sandstone replace air`, { mayFail: true })
          await ctx.cmd(`/fill ${site.X - r} ${F} ${z0} ${site.X + r} ${F} ${z1} sand replace air`, { mayFail: true })
        }
      }
      const P = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
      // a little relief and dressing in the views: low dunes north of the stations and east past the forgotten one
      const dunes = [[-6, -14, 4], [9, -18, 5], [26, -15, 4], [40, -20, 6], [fx + 14, -6, 4], [fx + 18, 7, 5], [fx + 26, -1, 6]]
      for (const [dx, dz, r] of dunes) {
        for (let h = 1; h <= 2; h++) await ctx.cmd(`/fill ${P(dx - r + h * 2, h, dz - Math.round(r / 2) + h)} ${P(dx + r - h * 2, h, dz + Math.round(r / 2) - h)} sand`)
      }
      await ctx.cmd('/kill @e[type=!minecraft:player]', { mayFail: true })
      // the bot's UUID as NBT's int array (a tamed mob's Owner)
      const hex = String(bot.player.uuid).replace(/-/g, '')
      const owner = `[I;${[0, 8, 16, 24].map(i => (parseInt(hex.slice(i, i + 8), 16) | 0)).join(',')}]`
      // desert dressing north of each station (what the camera sees behind the mob): cacti and dead bushes
      const deco = [[-5, -7, 'cactus', 3], [4, -8, 'dead_bush', 1], [-2, -12, 'dead_bush', 1], [7, -13, 'cactus', 2]]
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i], sx = i * SPACING
        for (const [dx, dz, blk, h] of deco) {
          const ddx = ((i * 5) % 3) - 1 + dx
          for (let y = 1; y <= h; y++) await ctx.cmd(`/setblock ${P(sx + ddx, y, dz)} ${blk}`)
        }
        if (b.roof) {   // a sandstone canopy on four posts (a zombie villager burns in daylight)
          for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) await ctx.cmd(`/fill ${P(sx + dx, 1, dz)} ${P(sx + dx, 3, dz)} cut_sandstone`)
          await ctx.cmd(`/fill ${P(sx - 2, 4, -2)} ${P(sx + 2, 4, 2)} smooth_sandstone_slab`)
        }
        const nbt = (b.nbt || '{}').replace('{owner}', owner)
        const tagged = nbt.replace(/^\{/, `{Tags:["ud_${b.id}"],PersistenceRequired:1b,Rotation:[0f,0f],`).replace(/,\}$/, '}')
        await ctx.cmd(`/summon ${b.mob} ${P(sx, 1, 0).split(' ').map((v, k) => k === 1 ? v : +v + 0.5).join(' ')} ${tagged}`)
      }
      // the forgotten one: alone on the pad east of the stations, facing the camera (west); its cell is a cool biome
      // until its beat (it melts from its first tick in a hot one: 4 hp, ~1.5 s), then the desert again
      const fb = (F_.nbt || '{}').replace(/^\{/, `{Tags:["ud_forgotten"],PersistenceRequired:1b,Rotation:[90f,0f],`).replace(/,\}$/, '}')
      await ctx.cmd(`/fillbiome ${P(fx - 1, -2, -1)} ${P(fx + 1, 6, 1)} minecraft:plains`)
      await ctx.cmd(`/summon ${F_.mob} ${X + fx + 0.5} ${F + 1} ${Z + 0.5} ${fb}`)
      await ctx.hotbar(this.hotbarItems())
      await ctx.cmd('/attribute @s minecraft:entity_interaction_range base set 6')
      await ctx.cmd('/gamemode survival')
      // park at the first station (mineflayer can miss a big /fill's block updates until the harness's chunk refresh
      // after setup, so the checked teleport onto it comes first thing in perform, before the Short's first frame)
      await ctx.cmd(`/tp @s ${X + 0.5} ${F + 2} ${Z + 3.5} 180 0`)
      await bot.waitForTicks(30)
      return { x: X + Math.round(fx / 2), y: F, z: Z }
    },

    // [[item, count], ...]: everything used is in the hotbar from the first frame, a stack per item
    hotbarItems () {
      const n = new Map()
      const add = (it, c = 1) => n.set(it, (n.get(it) || 0) + c)
      for (const b of beats) for (const [it] of (b.feeds || [])) add(it)
      if (beats.some(b => b.cure)) { add(POTION); add('golden_apple') }
      if (F_.tryItem) add(F_.tryItem, 16)
      if (n.size > 9) throw new Error('underdog: more than 9 hotbar items')
      return [...n.entries()].map(([it, c]) => [it, Math.max(c, it === F_.tryItem ? 16 : c)])
    },
    slotOf (item) { return this.hotbarItems().findIndex(([it]) => it === item) },

    mob (ctx, tag) {
      const want = tag === 'forgotten' ? F_.mob : beats.find(b => b.id === tag).mob
      const x = this.X + (tag === 'forgotten' ? this.fx : beats.findIndex(b => b.id === tag) * SPACING) + 0.5
      return Object.values(ctx.bot.entities).filter(e => e.name === want && Math.abs(e.position.x - x) < 3 && Math.abs(e.position.z - this.Z - 0.5) < 3)
        .sort((a, b) => Math.abs(a.position.x - x) - Math.abs(b.position.x - x))[0]
    },

    // a held tick count with the camera drifting slowly across the mob in view (this.focus: its centre, a pan of
    // focus.span blocks over focus.len ticks, ~7 deg/s): a NoAI mob and a still camera read as a held shot (rec_check)
    async hold (ctx, A, n) {
      for (let k = 0; k < n; k++) {
        const f = this.focus
        if (f) {
          const u = Math.min(1, f.k++ / f.len)
          A.view(f.c.offset(f.ux * f.span * (u - 0.5), f.uy * u, f.uz * f.span * (u - 0.5)))
        }
        await ctx.bot.waitForTicks(1)
      }
    },
    focusOn (m, H, aimY, o = {}) {
      this.focus = { c: m.position.offset(0, H * aimY, 0), k: 0, len: o.len ?? 40, span: o.span ?? 0.7, ux: o.ux ?? 1, uz: o.uz ?? 0, uy: o.uy ?? 0 }
    },

    // teleport to station i (the 'cut' mark: harness), eyes exactly on its mob so no turn follows the cut
    async goStation (ctx, i, cut = true) {
      const b = beats[i], { X, Z, F } = this
      const H = HEIGHT[b.mob] || 1
      const d = b.dist || 3.2, ey = F + 1 + 1.62, ty = F + 1 + H * (b.aimY ?? 0.5)
      const pitch = -Math.atan2(ty - ey, d) * 180 / Math.PI
      await this.tp(ctx, X + i * SPACING + 0.5, F + 1, Z + 0.5 + d, 180, pitch)
    },
    // a teleport that waits only until it lands (ctx.tpCheck holds 20 ticks: a dead second after every cut)
    async tp (ctx, x, y, z, yaw, pitch) {
      const { bot } = ctx
      for (let i = 0; i < 3; i++) {
        await ctx.cmd(`/tp @s ${x} ${y} ${z} ${yaw} ${pitch}`)
        for (let k = 0; k < 20; k++) {
          await bot.waitForTicks(1)
          const p = bot.entity.position
          if (Math.abs(p.x - x) < 0.05 && Math.abs(p.y - y) < 0.1 && Math.abs(p.z - z) < 0.05) return
        }
      }
      const p = bot.entity.position
      throw new Error(`teleport did not stick: at ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}, wanted ${x} ${y} ${z}`)
    },

    async perform (ctx) {
      const { bot } = ctx
      const A = require('./act')(ctx)
      const hold = (n) => this.hold(ctx, A, n)
      const hp = (e) => e && e.metadata && typeof e.metadata[9] === 'number' ? e.metadata[9] : null
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i]
        const first = (b.feeds && b.feeds[0] && b.feeds[0][0]) || (b.cure ? POTION : null)
        if (first) { ctx.select(this.slotOf(first)); await hold(2) }
        this.focus = null
        await this.goStation(ctx, i); await hold(i ? 1 : 6)
        ctx.mark(`beat_${b.id}`)
        const m = this.mob(ctx, b.id)
        if (!m) { ctx.log('no mob for', b.id); return false }
        this.focusOn(m, HEIGHT[b.mob] || 1, b.aimY ?? 0.5, { len: b.cure ? 80 : 36, span: b.cure ? 2.4 : b.mob === 'iron_golem' || b.mob === 'horse' ? 0.9 : 0.6 })
        await hold(3)
        if (b.hurt) {
          await ctx.cmd(`/damage @e[tag=ud_${b.id},limit=1] ${b.hurt} minecraft:generic`)
          ctx.mark(`hurt_${b.id}`)
          if (b.hurtSound) ctx.sound(...[].concat(b.hurtSound))
          await hold(b.hurtHold ?? 8)
        }
        ctx.log(b.id, 'hp before', hp(m))
        if (b.cure) { if (!await this.cure(ctx, A, b, m)) return false; continue }
        for (let k = 0; k < b.feeds.length; k++) {
          const [item, sound] = b.feeds[k]
          ctx.select(this.slotOf(item))
          await A.useOn(m, { delay: b.feedGap ?? 6, tol: 0.6 })
          ctx.mark(`feed_${b.id}`, { n: k })
          if (sound) ctx.sound(...[].concat(sound))
          if (k === b.feeds.length - 1) { ctx.mark(`fixed_${b.id}`); if (b.fixedSound) ctx.sound(...b.fixedSound) }
          await hold(2)
          ctx.log(b.id, 'hp after feed', k, hp(m))
        }
        await hold(b.after ?? 10)
      }
      return this.forgottenBeat(ctx, A)
    },

    // the zombie villager: weakness, a golden apple, the shaking; the cure's wait is cut short by command (a sub says so)
    async cure (ctx, A, b, m) {
      const { bot } = ctx
      const hold = (n) => this.hold(ctx, A, n)
      // the splash potion at its feet (thrown along the view: aim just below the knees)
      await A.aimAt(m.position.offset(0, 0.3, 0), { max: 20, tol: 0.03 })
      bot.activateItem(); bot.swingArm('right')
      ctx.sound('entity.splash_potion.throw', 0.6, 0.45)
      ctx.mark(`throw_${b.id}`)
      let hit = false
      const onWE = (d) => { if (d.effectId === 2002) hit = true }
      bot._client.on('world_event', onWE)
      for (let k = 0; k < 30 && !hit; k++) await hold(1)
      bot._client.removeListener('world_event', onWE)
      if (!hit) { ctx.log('the potion never splashed'); return false }
      ctx.sound('entity.splash_potion.break', 1, 1)
      await hold(10)
      ctx.select(this.slotOf('golden_apple'))
      await hold(4)
      await A.useOn(m, { delay: 4, tol: 0.6 })
      await hold(1)
      ctx.sound('entity.zombie_villager.cure', 1, 1)   // ZombieVillager.handleEntityEvent 16 (client side)
      ctx.mark(`apple_${b.id}`)
      ctx.mark('pose', { ids: [m.id], converting: true })
      await hold(22)
      // the cure takes 3-5 minutes in vanilla: the wait is cut short here and the sub says "5 minutes later"
      ctx.mark(`later_${b.id}`)
      await ctx.cmd(`/data merge entity @e[tag=ud_${b.id},limit=1] {ConversionTime:6}`)
      let v = null
      for (let k = 0; k < 40 && !v; k++) { await hold(1); v = Object.values(bot.entities).find(e => e.name === 'villager' && e.position.distanceTo(m.position) < 1.5) }
      if (!v) { ctx.log('no villager after the cure'); return false }
      ctx.mark('pose_off', { ids: [m.id] })
      ctx.sound('entity.zombie_villager.converted', 1, 1)   // level event 1027 (client side)
      ctx.mark(`fixed_${b.id}`)
      await hold(b.after ?? 18)
      return true
    },

    // "...but who heals him?": the forgotten one alone in the sun; offered something in vain; it melts away
    async forgottenBeat (ctx, A) {
      const { bot } = ctx
      const { X, Z, F } = this
      const hold = (n) => this.hold(ctx, A, n)
      if (F_.tryItem) { ctx.select(this.slotOf(F_.tryItem)); await hold(2) }
      this.focus = null
      const d = F_.dist || 3.4, fx = this.fx
      await this.tp(ctx, X + fx + 0.5 - d, F + 1, Z + 0.5, -90, -Math.atan2(1.9 * 0.62 - 1.62, d) * 180 / Math.PI)   // looking east at it (the drift tilts up to the sun)
      await hold(1)
      ctx.mark('twist')
      let g = null
      for (let k = 0; k < 10 && !g; k++) { g = this.mob(ctx, 'forgotten'); if (!g) await hold(1) }
      if (!g) { ctx.log('no forgotten mob'); return false }
      // a slow drift up toward the sun over it as it melts
      this.focusOn(g, 1.9, 0.62, { len: 90, span: 0.7, ux: 0, uz: 1, uy: 0.25 })
      let hits = 0, dead = false
      const onDmg = (p) => { if (p.entityId === g.id) { hits++; ctx.sound(...[].concat(F_.hurtSound || ['entity.snow_golem.hurt', 1, 1])) } }
      const onES = (p) => { if (p.entityId === g.id && p.entityStatus === 3) dead = true }
      bot._client.on('damage_event', onDmg); bot._client.on('entity_status', onES)
      await hold(F_.calm ?? 20)
      // a look up at what's doing it: the low morning sun right over its head (east, ~25 deg up), then back down
      this.focus = null
      const e = bot.entity.position.offset(0, 1.62, 0), el = (F_.sunDeg ?? 25) * Math.PI / 180
      ctx.mark('sun')
      await A.turnTo(e.offset(10 * Math.cos(el), 10 * Math.sin(el), 0), { hold: F_.sunHold ?? 6, max: 30 })
      // its cell back to the desert: vanilla melts it (SnowGolem.aiStep: the snow_golem_melts biome tag), 1 hp a hit
      await ctx.cmd(`/fillbiome ${X + fx - 1} ${F - 2} ${Z - 1} ${X + fx + 1} ${F + 6} ${Z + 1} ${this.biome}`)
      ctx.mark('melting')
      // back down onto it as it starts to melt, and the offer it can't take
      if (F_.tryItem) { await A.useOn(g, { delay: 4, tol: 0.08, max: 30 }); ctx.mark('try') } else await A.turnTo(g.position.offset(0, 1.2, 0), { max: 30 })
      this.focusOn(g, 1.9, 0.62, { len: 40, span: 0.5, ux: 0, uz: 1, uy: 0.15 })
      for (let k = 0; k < 120 && !dead; k++) await hold(1)
      bot._client.removeListener('damage_event', onDmg); bot._client.removeListener('entity_status', onES)
      if (!dead) { ctx.log('the forgotten one never died; hits', hits); return false }
      ctx.mark('melted')
      ctx.sound(...[].concat(F_.deathSound || ['entity.snow_golem.death', 1, 1]))
      ctx.log('melted after', hits, 'hits')
      await hold(4)
      return true
    }
  }
}

module.exports = { makeStunt, SPACING, FX }
