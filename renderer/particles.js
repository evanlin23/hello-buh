// Deterministic particles from recorded events (the client spawns most particles itself, so like
// the sounds we spawn them from the stunt's events). Motion, lifetimes and sizes follow the
// vanilla particle classes; textures are the jar's particle sprites (or the block atlas for crumbs).
// Event: timeline {event:'particles', type, x, y, z, block?(name), count?}
//   splash  - WaterDropParticle burst where something hits the water
//   block   - TerrainParticle: a 4x4x4 grid of crumbs of the block's particle texture
//   portal  - PortalParticle: purple specks drifting in to where a pearl lands
//   happy   - happy_villager sparkles (glint) around a villager's head
//   angry   - angry_villager clouds rising from a villager's head
//   poof    - a mob vanishing: 20 light-grey poof clouds in its box (ev.w, ev.h)
//   smoke   - large_smoke puffs where water meets lava (LevelEvent.LAVA_FIZZ: 8 per block, rising)
function rng (seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000 } }

function spawn (ev, blockTex) {
  const r = rng(Math.floor(ev.t) * 7919 + ev.x * 13 + ev.z * 31)
  const T0 = ev.t / 50
  const out = []
  const P = (o) => out.push({ t0: T0, ...o })
  if (ev.type === 'splash' && (ev.count || 24) >= 30 && !ev.spread) {
    // a player landing in water (Entity.doWaterSplashEffect): 1 + width * 20 = 13 WaterDropParticles
    // within +-width (0.6) of the player at the surface, drifting at 0.3 x a small random speed and
    // rising 0.1-0.3 (stunts ask for 30; the old wide 2.6-block spread put drops right at the eye,
    // big blue squares: every_clutch f105)
    for (let i = 0; i < 13; i++) {
      P({ x: ev.x + (r() * 2 - 1) * 0.6, y: ev.y, z: ev.z + (r() * 2 - 1) * 0.6, vx: (r() - 0.5) * 0.05, vy: 0.1 + r() * 0.2, vz: (r() - 0.5) * 0.05,
        g: 0.06, drag: 0.98, life: 8 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5) * 2, tex: `particle/splash_${Math.floor(r() * 4)}`, color: [1, 1, 1] })
    }
  } else if (ev.type === 'splash') {
    for (let i = 0; i < (ev.count || 24); i++) {
      const sp = ev.spread || ((ev.count || 24) >= 30 ? 2.6 : 1.2)   // big landing splashes spread wide: the eye is right above them and particles within 1 block are culled
      P({ x: ev.x + (r() - 0.5) * sp, y: ev.y, z: ev.z + (r() - 0.5) * sp, vx: (r() - 0.5) * 0.25, vy: 0.1 + r() * 0.25, vz: (r() - 0.5) * 0.25,
        g: 0.06, drag: 0.98, life: 8 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5) * 2, tex: `particle/splash_${Math.floor(r() * 4)}`, color: [1, 1, 1] })
    }
  } else if (ev.type === 'block' && blockTex) {
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
      const ox = (a + 0.5) / 4, oy = (b + 0.5) / 4, oz = (c + 0.5) / 4
      const uo = Math.floor(r() * 4), vo = Math.floor(r() * 4)
      P({ x: ev.x + ox, y: ev.y + oy, z: ev.z + oz, vx: (ox - 0.5) * 0.2 + (r() - 0.5) * 0.1, vy: (oy - 0.5) * 0.2 + r() * 0.1, vz: (oz - 0.5) * 0.2 + (r() - 0.5) * 0.1,
        g: 0.04, drag: 0.98, life: 4 / (r() * 0.9 + 0.1), size: 0.05 * (r() * 0.5 + 0.5) * 2, collide: true,
        tex: 'atlas', uv: [blockTex.u + uo * blockTex.su / 4, blockTex.v + vo * blockTex.sv / 4, blockTex.su / 4, blockTex.sv / 4], color: [0.6, 0.6, 0.6] })
    }
  } else if (ev.type === 'portal') {
    for (let i = 0; i < (ev.count || 40); i++) {
      const f = r() * 0.6 + 0.4
      // PortalParticle: starts offset and is pulled to the origin along a curve
      // face: ambient particles of a lit portal (NetherPortalBlock.animateTick): from a point on the
      // portal surface, drifting just off the face. Otherwise a pearl landing: a 2-block column.
      P({ x: ev.x, y: ev.face ? ev.y - 0.5 : ev.y + r() * 2, z: ev.z, ox: (r() - 0.5) * (ev.face ? 1 : 2), oy: (r() - 0.5) * (ev.face ? 1 : 2), oz: (r() - 0.5) * (ev.face ? 0.6 : 2), portal: true,
        life: Math.floor(r() * 10) + 40, size: 0.1 * (r() * 0.2 + 0.5) * 1.6, tex: `particle/generic_${Math.floor(r() * 8)}`, color: [0.9 * f, 0.3 * f, f] })
    }
  } else if (ev.type === 'happy' || ev.type === 'angry') {
    for (let i = 0; i < (ev.count || 7); i++) {
      P({ x: ev.x + (r() - 0.5) * 1.0, y: ev.y + r() * 0.8, z: ev.z + (r() - 0.5) * 1.0, vx: (r() - 0.5) * 0.02, vy: ev.type === 'angry' ? 0.03 : 0.01, vz: (r() - 0.5) * 0.02,
        g: 0, drag: 0.96, life: ev.type === 'angry' ? 16 + r() * 10 : 20 + r() * 20, size: ev.type === 'angry' ? 0.2 : 0.16, tex: ev.type === 'angry' ? 'particle/angry' : 'particle/glint', color: [1, 1, 1] })
    }
  }
  if (ev.type === 'smoke') {
    // LargeSmokeParticle (BaseAshSmokeParticle, scale 2.5): grey 0..0.3, half-size
    // 0.1 x (0.5..1) x 2 x 0.75 x 2.5, rises (gravity -0.1), lives 8/(r*0.8+0.2) x 2.5 ticks, sprite
    // generic_7 -> generic_0 over its life (particles/large_smoke.json; big_smoke is the campfire's)
    for (let i = 0; i < (ev.count || 8); i++) {
      const g = r() * 0.3
      P({ x: ev.x + (r() - 0.5) * 0.9, y: ev.y + r() * 0.3, z: ev.z + (r() - 0.5) * 0.9, vx: (r() - 0.5) * 0.02, vy: 0.02 + r() * 0.04, vz: (r() - 0.5) * 0.02,
        g: -0.004, drag: 0.96, life: 8 / (r() * 0.8 + 0.2) * 2.5, size: 0.1 * (r() * 0.5 + 0.5) * 2 * 0.75 * 2.5, anim: ['particle/generic_', 8, 'rev'], color: [g, g, g] })
    }
  }
  if (ev.type === 'explosion') {
    // HugeExplosionSeedParticle: for 8 ticks, 6 HugeExplosionParticles a tick within +-2 blocks;
    // each lives 6-9 ticks, flips through explosion_0..15, size 2*(1 - r*0.5), grey, full bright
    // the packet's particle: explosion_emitter only when ServerExplosion.isSmall() is false (radius >= 2
    // AND the blast interacts with blocks); a creeper with mobGriefing false sends the single small
    // `explosion` (story_runaway f2108: the emitter's big discs behind the death screen)
    const big = ev.particle ? ev.particle === 'explosion_emitter' : ev.emitter ?? (ev.radius || 4) >= 2
    for (let k = 0; k < (big ? 8 : 1); k++) {
      for (let i = 0; i < (big ? 6 : 1); i++) {
        const g = r() * 0.6 + 0.4
        out.push({ t0: T0 + k, x: ev.x + (r() - r()) * 4 * (big ? 1 : 0), y: ev.y + (r() - r()) * 4 * (big ? 1 : 0), z: ev.z + (r() - r()) * 4 * (big ? 1 : 0),
          vx: 0, vy: 0, vz: 0, g: 0, drag: 1, life: 6 + Math.floor(r() * 4), size: big ? 2 * (1 - r() * 0.5) : 1, anim: ['particle/explosion_', 16], bright: true, color: [g, g, g] })
      }
    }
    // block particles (ServerExplosion's defaults: poof, and smoke), as many as the packet's
    // blockCount: the size of calculateExplodedPositions(), sent even when the blast keeps the blocks
    // (mobGriefing false), so vanilla shows them then too. Older recordings without the count use the
    // blocks they turned to air (render.js). Poof (ExplodeParticle): light grey
    // 0.7-1, lives 16/(r*0.8+0.2)+2; smoke (SmokeParticle): grey 0-0.3, scale 1; both generic_7 -> 0
    const nb = ev.blocks === undefined ? 16 : Math.min(ev.blocks, 32)
    for (let i = 0; i < nb; i++) {
      const poof = r() < 0.5, g = poof ? 0.7 + r() * 0.3 : r() * 0.3, rad = ev.radius || 4
      const dx = (r() - 0.5) * rad, dy = (r() - 0.5) * rad * 0.6, dz = (r() - 0.5) * rad, d = Math.hypot(dx, dy, dz) || 1
      out.push({ t0: T0 + Math.floor(r() * 3), x: ev.x + dx, y: ev.y + dy, z: ev.z + dz, vx: dx / d * 0.05, vy: dy / d * 0.05 + 0.02, vz: dz / d * 0.05,
        g: -0.004, drag: 0.9, life: poof ? 16 / (r() * 0.8 + 0.2) + 2 : 8 / (r() * 0.8 + 0.2), size: poof ? 0.1 * (r() * r() * 6 + 1) : 0.1 * (r() * 0.5 + 0.5) * 2 * 0.75, anim: ['particle/generic_', 8, 'rev'], color: [g, g, g] })
    }
  }
  if (ev.type === 'poof') {
    // a mob vanishing (LivingEntity.makePoofParticles): 20 ExplodeParticles (poof) at random points in
    // its box (ev.w, ev.h; default a player-sized 0.6 x 1.8, from ev.y up), gaussian x 0.02 plus +-0.05
    // drift, light grey 0.7-1, half-size 0.1 x (r^2 x 6 + 1), friction 0.9, gravity -0.1, lives
    // 16/(r*0.8+0.2)+2 ticks, generic_7 -> generic_0
    const w = ev.w || 0.6, h = ev.h || 1.8
    const gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
    for (let i = 0; i < (ev.count || 20); i++) {
      const g = r() * 0.3 + 0.7
      P({ x: ev.x + (r() * 2 - 1) * w / 2, y: ev.y + r() * h, z: ev.z + (r() * 2 - 1) * w / 2, vx: gauss() * 0.02 + (r() * 2 - 1) * 0.05, vy: gauss() * 0.02 + (r() * 2 - 1) * 0.05, vz: gauss() * 0.02 + (r() * 2 - 1) * 0.05,
        g: -0.004, drag: 0.9, life: Math.floor(16 / (r() * 0.8 + 0.2)) + 2, size: 0.1 * (r() * r() * 6 + 1), anim: ['particle/generic_', 8, 'rev'], color: [g, g, g] })
    }
  }
  if (ev.type === 'potion') {
    // LevelEvent 2002/2007 (a splash potion breaks): 100 SpellParticles (effect_0..7, rising: gravity
    // -0.1 x 0.04, friction 0.96) thrown out up to 4 blocks' power, tinted the potion colour x 0.75-1
    const c = ev.color ?? 0x385DC6, cr = ((c >> 16) & 255) / 255, cg = ((c >> 8) & 255) / 255, cb = (c & 255) / 255
    for (let i = 0; i < 100; i++) {
      const d = r() * 4, a = r() * Math.PI, dx = Math.cos(a) * d, dz = Math.sin(a) * d * (r() < 0.5 ? 1 : -1), f = 0.75 + r() * 0.25
      const vy0 = (0.01 + r() * 0.5) * 0.2
      P({ x: ev.x + dx * 0.1, y: ev.y + 0.3, z: ev.z + dz * 0.1, vx: dx * 0.05, vy: ((vy0 - 0.1) * d + 0.1) * 0.5, vz: dz * 0.05,
        g: -0.004, drag: 0.96, life: 8 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5) * 2 * 0.75, anim: ['particle/effect_', 8], bright: !!ev.instant, color: [cr * f, cg * f, cb * f] })
    }
  }
  if (ev.type === 'firework') {
    // FireworkParticles.Starter: a flash, then per explosion a ball of sparks (small ball: speed 0.25,
    // size 2; large ball: 0.5, 4; others drawn as a ball too) in its colours; SparkParticle: friction
    // 0.91, lives 48-60 ticks, falls slowly, full bright
    const exps = (ev.explosions && ev.explosions.length) ? ev.explosions : []
    if (exps.length) P({ x: ev.x, y: ev.y, z: ev.z, vx: 0, vy: 0, vz: 0, g: 0, drag: 1, life: 4, size: 2.0, tex: 'particle/flash', bright: true, color: [1, 1, 1] })
    for (const e of exps) {
      const big = /large|creeper|star/.test(e.shape || ''), speed = big ? 0.5 : 0.25, size = big ? 4 : 2
      const cols = (e.colors && e.colors.length ? e.colors : [0xFFFFFF]).map(c => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255])
      for (let i = -size; i <= size; i++) for (let j = -size; j <= size; j++) for (let k = -size; k <= size; k++) {
        const dx = k + (r() - r()) * 0.5, dy = j + (r() - r()) * 0.5, dz = i + (r() - r()) * 0.5
        const n = Math.sqrt(dx * dx + dy * dy + dz * dz) / speed + (r() - 0.5) * 0.1
        P({ x: ev.x, y: ev.y, z: ev.z, vx: dx / n, vy: dy / n, vz: dz / n, g: 0.004, drag: 0.91, life: 48 + Math.floor(r() * 12), size: 0.1 * 0.75 * 2, anim: ['particle/spark_', 8], bright: true, color: cols[Math.floor(r() * cols.length)] })
        if (i !== -size && i !== size && j !== -size && j !== size) k += size * 2 - 1   // only the shell
      }
    }
  }
  return out
}

// Position of a particle at time t (ticks), or null if dead.
function state (p, t, solidAt) {
  const age = t - p.t0
  if (age < 0 || age >= p.life) return null
  if (p.portal) {
    const k = age / p.life, f = 1 - (-k + k * k * 2)   // vanilla's ease for portal particles
    return { x: p.x + p.ox * f, y: p.y + p.oy * f + (1 - k), z: p.z + p.oz * f, size: p.size * (1 - (1 - k) * (1 - k) * 0.5) }
  }
  let { x, y, z, vx, vy, vz } = p
  const steps = Math.floor(age)
  for (let i = 0; i < steps; i++) {
    vy -= p.g
    const ny = y + vy
    if (p.collide && solidAt && solidAt(x, ny, z)) { vy = 0; vx *= 0.7; vz *= 0.7 } else y = ny
    x += vx; z += vz
    vx *= p.drag; vy *= p.drag; vz *= p.drag
  }
  const f = age - steps
  const frame = p.anim ? Math.min(p.anim[1] - 1, Math.floor(age * p.anim[1] / p.life)) : null
  return { x: x + vx * f, y: y + vy * f, z: z + vz * f, size: p.size, tex: p.anim ? p.anim[0] + (p.anim[2] === 'rev' ? p.anim[1] - 1 - frame : frame) : undefined }
}

module.exports = { spawn, state }
