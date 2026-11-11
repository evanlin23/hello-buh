// The "interrupt" format (owner, 2026-11-11, r:re05b89; STANDARDS 10): a Short that plays straight as a normal
// Minecraft video (a build, a trick), a mob interrupts it (an arrow thunks in beside the player, a hiss, a knock),
// the player stops, walks over, deals with it absurdly (eats a golden apple in its face and it's gone on the last
// bite; one deadpan punch), walks straight back to the same spot and carries on with the same task. No caption
// change, no reaction: the joke is the deadpan.
//
// Any stunt swaps the build and the mob; this file is the interruption only, on the story kit's motion (lib/story.js
// storyKit: eased looks, K.walkTo, the aim governor), so it moves like a player by construction.
//
//   const I = require('../lib/interrupt')
//   setup:    await I.summon(ctx, { mob: 'skeleton', at: P(10.5, 1, -1.5), face: P(0.5, 1, 0.8), tag: 'intr' })
//   perform:  const K = storyKit(ctx, I.NO_LINES, { X, Z, F })      // a stunt with no narration
//             ...the build...
//             await I.interrupt(ctx, K, { mob: 'skeleton', tag: 'intr', home: P(0.5, 1, 0.8), resume: K.top(nextBlock),
//                                         cue: { target: P(3.5, 1, -2.5) }, deal: { how: 'eat', slot: 1 }, workSlot: 0 })
//             ...the build goes on...
// Marks (edit keySounds / subs / punch can use them): intr_cue (the arrow is loosed / the hiss starts), intr_hit (the
// arrow thunks in), intr_notice (the turn to the mob), intr_walk, intr_deal (the food comes up / the swing),
// intr_gone (the last bite: poof), intr_back (walking back), intr_resume (aimed at the work again).
//
// Mobs (MOBS): skeleton (an arrow into a block beside the player), creeper (the fuse hiss), zombie (knocks: groans and
// door hits), phantom (a swoop overhead; summon it with { fly: true } and it hangs where put), or any other mob with
// a cue of { sounds: [[sound, volume, pitch, delayTicks], ...] }.
// Deals: 'eat' (the held food's vanilla use: 32 ticks of crunches every 4 ticks from tick 7, a burp; a golden apple
// eats at full hunger), 'drink' (a milk bucket: the gulps), 'punch' (one swing, the strong-attack sound).

const NO_LINES = { gap: 0, lines: [], line (id) { throw new Error(`lib/interrupt: no story lines in this stunt (asked for ${id})`) } }

const MOBS = {
  skeleton: { cue: 'arrow', ambient: 'entity.skeleton.ambient', death: 'entity.skeleton.death', held: 'bow', helmet: 'iron_helmet', h: 1.99, w: 0.6 },
  stray: { cue: 'arrow', ambient: 'entity.stray.ambient', death: 'entity.stray.death', held: 'bow', helmet: 'iron_helmet', h: 1.99, w: 0.6 },
  pillager: { cue: 'arrow', ambient: 'entity.pillager.ambient', death: 'entity.pillager.death', held: 'crossbow', h: 1.95, w: 0.6, shoot: 'item.crossbow.shoot' },
  creeper: { cue: { sounds: [['entity.creeper.primed', 1, 0.5, 0]] }, ambient: null, death: 'entity.creeper.death', h: 1.7, w: 0.6 },
  zombie: { cue: { sounds: [['entity.zombie.attack_wooden_door', 0.9, 1, 0], ['entity.zombie.attack_wooden_door', 0.9, 0.95, 9], ['entity.zombie.ambient', 1, 1, 16]] }, ambient: 'entity.zombie.ambient', death: 'entity.zombie.death', helmet: 'iron_helmet', h: 1.95, w: 0.6 },
  phantom: { cue: { sounds: [['entity.phantom.swoop', 1, 1, 0]] }, ambient: 'entity.phantom.ambient', death: 'entity.phantom.death', h: 0.5, w: 0.9, fly: true }
}

// An arrow's flight (AbstractArrow.tick: move by the velocity, then drag 0.99 and gravity 0.05 a tick): the motion
// that carries it from `from` to land at `to` at about `speed` blocks a tick (a skeleton's bow: 1.6). -> { motion:
// [vx, vy, vz], ticks } (ticks: when it gets there)
function arrowShot (from, to, speed = 1.6) {
  const dx = to.x - from.x, dz = to.z - from.z, D = Math.hypot(dx, dz), ux = dx / D, uz = dz / D
  const yAt = (th) => {
    let px = 0, py = from.y, vh = speed * Math.cos(th), vy = speed * Math.sin(th)
    for (let t = 1; t <= 200; t++) {
      const nx = px + vh, ny = py + vy
      if (nx >= D) { const f = (D - px) / vh; return { y: py + vy * f, ticks: t - 1 + f } }
      px = nx; py = ny; vh *= 0.99; vy = vy * 0.99 - 0.05
    }
    return { y: -1e9, ticks: 200 }
  }
  let lo = -0.6, hi = 0.9
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (yAt(m).y < to.y) lo = m; else hi = m }
  const th = (lo + hi) / 2, r = yAt(th)
  return { motion: [speed * Math.cos(th) * ux, speed * Math.sin(th), speed * Math.cos(th) * uz], ticks: r.ticks, pitch: th }
}

// The interrupter, in setup: NoAI, Silent, Invulnerable, PersistenceRequired (it moves only when we move it), tagged,
// facing `face`; the skeleton family holding its bow and wearing a helmet (they burn in daylight otherwise).
// at, face: Vec3 (absolute). o.fly: NoGravity (a phantom).
async function summon (ctx, { mob = 'skeleton', at, face, tag = 'intr', fly, nbt = '' }) {
  const M = MOBS[mob] || {}
  const yaw = face ? -Math.atan2(face.x - at.x, face.z - at.z) * 180 / Math.PI : 0
  const eq = []
  if (M.held) eq.push(`mainhand:{id:"minecraft:${M.held}",count:1}`)
  if (M.helmet) eq.push(`head:{id:"minecraft:${M.helmet}",count:1}`)
  const more = [eq.length ? `equipment:{${eq.join(',')}}` : '', (fly ?? M.fly) ? 'NoGravity:1b' : '', nbt].filter(Boolean).join(',')
  await ctx.cmd(`/summon ${mob} ${at.x.toFixed(2)} ${at.y.toFixed(2)} ${at.z.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}","warm"],Rotation:[${yaw.toFixed(1)}f,0f]${more ? ',' + more : ''}}`)
}

const find = (ctx, mob, tag, near) => Object.values(ctx.bot.entities).filter(e => e.name === mob && e !== ctx.bot.entity && (!near || e.position.distanceTo(near) < 24))
  .sort((a, b) => a.position.distanceTo(ctx.bot.entity.position) - b.position.distanceTo(ctx.bot.entity.position))[0]

// The whole interruption, from the cue to aimed back at the work. Returns once the player is home, aimed at `resume`
// with `workSlot` in hand. opts:
//   mob, tag              the interrupter (summon()); at: its feet (a Vec3) if mineflayer can't see it yet
//   home                  the feet spot to walk back to (a Vec3, absolute; default: where the player stands now)
//   resume                the point to aim at once home (the next block of the build)
//   cue                   skeleton family: { target } a point (a block's top face, or a side face) the arrow lands in,
//                         beside the player and in view; { speed } blocks/tick (1.6). Others: { sounds } or the mob's.
//   pause                 ticks the player holds still after the cue before turning (8: the beat that makes it funny)
//   stand                 blocks from the mob to stop at (1.25: right in its face)
//   path                  extra points (Vec3) to walk through on the way there (around the build); walked in reverse back
//   deal                  { how: 'eat' | 'drink' | 'punch', slot } (slot: the food's hotbar slot)
//   workSlot              the hotbar slot to go back to (the build's block)
async function interrupt (ctx, K, o) {
  const { bot } = ctx
  const mob = o.mob || 'skeleton', M = MOBS[mob] || {}, tag = o.tag || 'intr'
  const home = o.home || bot.entity.position.clone()
  const ent = () => find(ctx, mob, tag, home)
  const e0 = ent()
  if (!e0) throw new Error(`lib/interrupt: no ${mob} near ${home}`)
  const mobFeet = e0.position.clone()
  const look = (k = 0) => K.look(k)

  // 1. the cue
  const cue = o.cue || {}
  if ((M.cue === 'arrow' || cue.target) && cue.target) {
    const dir = cue.target.minus(mobFeet); dir.y = 0
    const n = dir.scaled(1 / Math.hypot(dir.x, dir.z))
    const from = mobFeet.offset(n.x * 0.9, 1.45, n.z * 0.9)   // off the bow, clear of its own hitbox (no owner: it would hit it)
    const s = arrowShot(from, cue.target, cue.speed || 1.6)
    K.say(`/summon arrow ${from.x.toFixed(3)} ${from.y.toFixed(3)} ${from.z.toFixed(3)} {Motion:[${s.motion.map(v => v.toFixed(5) + 'd').join(',')}],pickup:0b,Tags:["${tag}_arrow"]}`)
    ctx.mark('intr_cue', { mob })
    ctx.sound(M.shoot || 'entity.skeleton.shoot', 0.5, 0.9)   // 10 blocks off: quiet, so the thunk is the hit
    // the thunk on the tick it lands: the arrow stops (inGround) or the flight time runs out
    let landed = false
    for (let k = 0; k < Math.ceil(s.ticks) + 6; k++) {
      await bot.waitForTicks(1); look(k)
      const a = Object.values(bot.entities).find(x => x.name === 'arrow' && x.position.distanceTo(cue.target) < 3)
      const still = a && a.velocity && Math.hypot(a.velocity.x, a.velocity.y, a.velocity.z) < 0.01 && k > 2
      if (still || k >= Math.ceil(s.ticks)) { landed = true; break }
    }
    ctx.mark('intr_hit', { landed })
    ctx.sound('entity.arrow.hit', 1, 1.1)
  } else {
    const sounds = (cue.sounds || (M.cue && M.cue.sounds) || [[M.ambient || 'entity.generic.hurt', 1, 1, 0]])
    ctx.mark('intr_cue', { mob })
    let k = 0
    for (const [snd, vol = 1, pitch = 1, at = 0] of sounds) {
      while (k < at) { await bot.waitForTicks(1); look(k++) }
      ctx.sound(snd, vol, pitch)
    }
    ctx.mark('intr_hit', {})
  }
  // 2. the beat: stop dead (eyes on the arrow, if any), then turn to it
  if (cue.target) { K.base = K.aim(cue.target); }
  for (let k = 0; k < (o.pause ?? 8); k++) { look(k); await bot.waitForTicks(1) }
  const e1 = ent() || e0
  ctx.mark('intr_notice')
  if (M.ambient) ctx.sound(M.ambient, 0.6, 1)
  await K.aimAt(K.face(e1, mob))
  for (let k = 0; k < 4; k++) { look(k); await bot.waitForTicks(1) }

  // 3. the walk over: straight up to it, eyes on its face (the mob turns its head to follow: a NoAI mob's /tp facing)
  const follow = K.every(() => K.say(`/execute as @e[tag=${tag},limit=1] at @s run tp @s ~ ~ ~ facing entity @p eyes`))
  const me = bot.entity.position, d = mobFeet.minus(me); d.y = 0
  const L = Math.hypot(d.x, d.z), stand = o.stand ?? 1.25
  const there = me.plus(d.scaled((L - stand) / L)); there.y = home.y
  const path = [...(o.path || []), there]
  ctx.mark('intr_walk')
  const facePitch = () => { const f = K.face(ent() || e1, mob); return K.aim(f).pitch }
  await K.walkTo(path, { pitch: facePitch() })
  await K.aimAt(K.face(ent() || e1, mob))

  // 4. the deal
  const deal = o.deal || { how: 'eat', slot: 1 }
  let goneAt = null
  const gone = () => {
    if (goneAt !== null) return
    goneAt = ctx.tick
    const f = (ent() || e1).position.clone()
    ctx.mark('intr_gone', { mob })
    ctx.particles('poof', f, { w: M.w || 0.6, h: M.h || 1.8 })
    if (M.death) ctx.sound(M.death, 0.8, 1)
    follow()
    // out of the world, at once: the renderer snaps a jump over 4 blocks (no streak), and the teleport check skips
    // one over 16 (a park); /kill there, under the terrain, where nothing shows
    K.say(`/tp @e[tag=${tag}] ${f.x.toFixed(2)} ${(f.y - 120).toFixed(2)} ${f.z.toFixed(2)}`)
    K.say(`/kill @e[tag=${tag}]`)
  }
  if (deal.how === 'punch') {
    ctx.select(deal.slot ?? 8)
    for (let k = 0; k < 6; k++) { look(k); await bot.waitForTicks(1) }
    ctx.mark('intr_deal', { how: 'punch' })
    bot.swingArm('right')
    ctx.sound('entity.player.attack.strong', 1, 1)
    await bot.waitForTicks(2)
    gone()
    for (let k = 0; k < 8; k++) { look(k); await bot.waitForTicks(1) }
  } else {
    // eat / drink: the vanilla use, 32 ticks; the server ends it (use_stop) and that tick is the last bite
    ctx.select(deal.slot ?? 1)
    for (let k = 0; k < 5; k++) { look(k); await bot.waitForTicks(1) }   // the item comes up into the hand
    let using = true
    const onMeta = (p) => {
      if (!bot.entity || p.entityId !== bot.entity.id) return
      const m = (p.metadata || []).find(x => x && x.key === 8)
      if (m && typeof m.value === 'number' && !(m.value & 1)) using = false
    }
    bot._client.on('entity_metadata', onMeta)
    ctx.mark('intr_deal', { how: deal.how || 'eat' })
    bot.activateItem()
    const drink = deal.how === 'drink'
    try {
      for (let k = 1; k <= 44; k++) {
        await bot.waitForTicks(1); look(k)
        // LivingEntity.triggerItemUseEffects: from tick 7 of the use, every 4 ticks (eat 0.5-1.0, pitch 0.8-1.2)
        if (using && k >= 7 && (k - 7) % 4 === 0) ctx.sound(drink ? 'entity.generic.drink' : 'entity.generic.eat', drink ? 0.5 : 0.5 + 0.5 * (k % 8 === 3 ? 1 : 0), drink ? 0.9 + (k % 3) * 0.05 : 0.85 + ((k * 7) % 5) * 0.08)
        if (!using || k >= 33) {
          // completeUsingItem: the last crunch, and a player's burp (Player.eat: entity.player.burp 0.5, pitch 0.9-1.0)
          ctx.sound(drink ? 'entity.generic.drink' : 'entity.generic.eat', 1, 1)
          if (!drink) ctx.sound('entity.player.burp', 0.5, 0.95)
          gone()
          break
        }
      }
    } finally { bot._client.removeListener('entity_metadata', onMeta); if (using) bot.deactivateItem() }
    for (let k = 0; k < 6; k++) { look(k); await bot.waitForTicks(1) }   // it's gone: a beat on the empty grass
  }

  // 5. straight back, same spot, same task: no reaction
  ctx.select(o.workSlot ?? 0)
  ctx.mark('intr_back')
  await K.walkTo([...(o.path || []).slice().reverse(), home.clone()], { pitch: o.backPitch ?? 0.15 })
  if (o.resume) await K.aimAt(o.resume)
  ctx.mark('intr_resume')
  return { goneAt }
}

module.exports = { MOBS, NO_LINES, arrowShot, summon, interrupt }
