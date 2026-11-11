// Deterministic particles from recorded events (the client spawns most particles itself, so like
// the sounds we spawn them from the stunt's events). Motion, lifetimes and sizes follow the
// vanilla particle classes; textures are the jar's particle sprites (or the block atlas for crumbs).
// Event: timeline {event:'particles', type, x, y, z, block?(name), count?}
//   splash  - WaterDropParticle burst where something hits the water
//   block   - TerrainParticle: a 4x4x4 grid of crumbs of the block's particle texture
//   portal  - PortalParticle: purple specks drifting in to where a pearl lands
//   happy   - happy_villager sparkles (glint) around a villager's head
//   angry   - angry_villager clouds rising from a villager's head
//   heart   - HeartParticle: a fed or tamed animal (ev.w, ev.h: its box)
//   poof    - a mob vanishing: 20 light-grey poof clouds in its box (ev.w, ev.h)
//   smoke   - large_smoke puffs where water meets lava (LevelEvent.LAVA_FIZZ: 8 per block, rising)
//   dust    - DustParticle specks (redstone dust: mining redstone ore)
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
      const uo = r() * 3, vo = r() * 3   // TerrainParticle: a quarter of the sprite at a continuous random offset
      P({ x: ev.x + ox, y: ev.y + oy, z: ev.z + oz, vx: (ox - 0.5) * 0.2 + (r() - 0.5) * 0.1, vy: (oy - 0.5) * 0.2 + r() * 0.1, vz: (oz - 0.5) * 0.2 + (r() - 0.5) * 0.1,
        g: 0.04, drag: 0.98, life: 4 / (r() * 0.9 + 0.1), size: 0.05 * (r() * 0.5 + 0.5) * 2, collide: true,
        tex: 'atlas', uv: [blockTex.u + uo * blockTex.su / 4, blockTex.v + vo * blockTex.sv / 4, blockTex.su / 4, blockTex.sv / 4], color: ev.tint ? ev.tint.map(c => c * 0.6) : [0.6, 0.6, 0.6] })
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
  if (ev.type === 'heart') {
    // HeartParticle (a fed/tamed animal, Animal.handleEntityEvent 18: 7 hearts in its box): rises 0.1 a tick, slowing
    for (let i = 0; i < (ev.count || 7); i++) {
      P({ x: ev.x + (r() - 0.5) * (ev.w || 0.6), y: ev.y + 0.5 + r() * (ev.h || 0.85), z: ev.z + (r() - 0.5) * (ev.w || 0.6), vx: (r() - 0.5) * 0.04, vy: 0.04 + r() * 0.02, vz: (r() - 0.5) * 0.04,
        g: 0, drag: 0.86, life: 16 + r() * 8, size: 0.16, tex: 'particle/heart', color: [1, 1, 1] })
    }
  }
  if (ev.type === 'obsidian_tear') {
    // DripParticle (CryingObsidianBlock.animateTick): the tear hangs on the face (drip_hang, gravity
    // x 0.02) for 64 / (r * 0.8 + 0.2) ticks, then falls (drip_fall, gravity 0.06 a tick, friction
    // 0.98) and splats where it lands (drip_land, 16 / (r * 0.8 + 0.2) ticks). Purple (0.51, 0.03,
    // 0.89) and glowing (isGlowing: full bright)
    const col = [0.51171875, 0.03125, 0.890625], size = 0.1 * (r() * 0.5 + 0.5) * 2
    const hang = Math.floor(64 / (r() * 0.8 + 0.2))
    P({ x: ev.x, y: ev.y, z: ev.z, vx: 0, vy: 0, vz: 0, g: 0.0012, drag: 0.02, life: hang, size, tex: 'particle/drip_hang', bright: true, color: col })
    // the fall: y(n) from rest with v -= 0.06 then *= 0.98 each tick, until the floor
    let y = ev.y, v = 0, n = 0
    const floor = ev.floorY ?? ev.y - 16
    while (y > floor && n < 200) { v -= 0.06; y += v; v *= 0.98; n++ }
    out.push({ t0: T0 + hang, x: ev.x, y: ev.y, z: ev.z, vx: 0, vy: 0, vz: 0, g: 0.06, drag: 0.98, life: Math.max(1, n), size, tex: 'particle/drip_fall', bright: true, color: col })
    if (ev.floorY !== null && ev.floorY !== undefined) out.push({ t0: T0 + hang + n, x: ev.x, y: floor + 0.02, z: ev.z, vx: 0, vy: 0, vz: 0, g: 0, drag: 1, life: Math.floor(16 / (r() * 0.8 + 0.2)), size, tex: 'particle/drip_land', bright: true, color: col })
  }
  if (ev.type === 'lava') {
    // LavaParticle (LavaFluid.animateTick: a spark off the lava surface): up at 0.05-0.45, gravity
    // 0.75 (0.03 a tick), friction 0.999, size x (0.2..2.2), lives 16 / (r * 0.8 + 0.2), full bright,
    // lands on blocks
    for (let i = 0; i < (ev.count || 1); i++) {
      const sp = ev.spread ?? 0
      P({ x: ev.x + (r() - 0.5) * sp, y: ev.y, z: ev.z + (r() - 0.5) * sp, vx: (r() * 2 - 1) * 0.06, vy: r() * 0.4 + 0.05, vz: (r() * 2 - 1) * 0.06,
        g: 0.03, drag: 0.999, life: 16 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5) * 2 * (r() * 2 + 0.2) * 0.5, tex: 'particle/lava', bright: true, collide: true, color: [1, 1, 1] })
    }
  }
  if (ev.type === 'bubble') {
    // BubbleParticle: rises (yd + 0.002 a tick), friction 0.85, size x (0.2..0.8), lives 8 / (r * 0.8 + 0.2)
    for (let i = 0; i < (ev.count || 1); i++) {
      const sp = ev.spread ?? 0
      P({ x: ev.x + (r() - 0.5) * sp, y: ev.y + (r() - 0.5) * sp, z: ev.z + (r() - 0.5) * sp, vx: (ev.vx || 0) * 0.2 + (r() * 2 - 1) * 0.02, vy: (ev.vy ?? 0.1) * 0.2 + (r() * 2 - 1) * 0.02, vz: (ev.vz || 0) * 0.2 + (r() * 2 - 1) * 0.02,
        g: -0.002, drag: 0.85, life: 8 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5) * 2 * (r() * 0.6 + 0.2), tex: 'particle/bubble', color: [1, 1, 1] })
    }
  }
  if (ev.type === 'bubble_pop') {
    // BubblePopParticle: bubble_pop_0..4 over 4 ticks, barely falling
    for (let i = 0; i < (ev.count || 1); i++) {
      const sp = ev.spread ?? 0
      P({ x: ev.x + (r() - 0.5) * sp, y: ev.y, z: ev.z + (r() - 0.5) * sp, vx: ev.vx || 0, vy: ev.vy || 0, vz: ev.vz || 0, g: 0.008 * 0.04, drag: 0.98, life: 4, size: 0.1 * (r() * 0.5 + 0.5) * 2, anim: ['particle/bubble_pop_', 5], color: [1, 1, 1] })
    }
  }
  if (ev.type === 'note') {
    // NoteParticle (NoteBlock.triggerEvent: at the block's centre, y + 1.2, xd = note / 24): rises at
    // 0.2 with friction 0.66, lives 6 ticks, 1.5x the base size; colour from the note's hue
    const f = (ev.note || 0) / 24, c = (o) => Math.max(0, Math.sin((f + o) * Math.PI * 2) * 0.65 + 0.35)
    P({ x: ev.x, y: ev.y, z: ev.z, vx: 0, vy: 0.2, vz: 0, g: 0, drag: 0.66, life: 6, size: 0.1 * (r() * 0.5 + 0.5) * 2 * 1.5, tex: 'particle/note', color: [c(0), c(1 / 3), c(2 / 3)] })
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
  if (ev.type === 'sonic_boom') {
    // the warden's sonic boom (SonicBoom.tick): from its chest (x, y, z) toward the target (tx, ty, tz), one
    // SonicBoomParticle per block for distance + 7 blocks, all on the same tick; each is a HugeExplosionParticle with
    // quadSize 2 (multiplier 0), lifetime 16, sonic_boom_0..15, full bright, white
    const dx = ev.tx - ev.x, dy = ev.ty - ev.y, dz = ev.tz - ev.z, d = Math.hypot(dx, dy, dz) || 1
    for (let i = 1; i < Math.floor(d) + 7; i++) {
      out.push({ t0: T0, x: ev.x + dx / d * i, y: ev.y + dy / d * i, z: ev.z + dz / d * i, vx: 0, vy: 0, vz: 0, g: 0, drag: 1, life: 16, size: 2, anim: ['particle/sonic_boom_', 16], bright: true, color: [1, 1, 1] })
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
  if (ev.type === 'tnt_smoke') {
    // SmokeParticle (BaseAshSmokeParticle, scale 1): grey 0-0.3, half-size 0.1 x (0.5..1) x 2 x 0.75,
    // rises (gravity -0.1), friction 0.96, lives 8/(r*0.8+0.2) ticks, generic_7 -> generic_0
    const g = r() * 0.3
    P({ x: ev.x, y: ev.y, z: ev.z, vx: (r() - 0.5) * 0.01, vy: 0.008 + r() * 0.006, vz: (r() - 0.5) * 0.01,
      g: -0.004, drag: 0.96, life: 8 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5) * 2 * 0.75, anim: ['particle/generic_', 8, 'rev'], color: [g, g, g] })
  }
  if (ev.type === 'dig' && blockTex) {
    // a warden coming up through the ground (Warden.clientDiggingParticles): crumbs of the block under it thrown up
    // around its feet (ev.w: the ring's width, default the warden's 0.9)
    const w = ev.w || 0.9
    for (let i = 0; i < (ev.count || 8); i++) {
      const uo = r() * 3, vo = r() * 3
      P({ x: ev.x + (r() - 0.5) * w * 1.6, y: ev.y + 0.05, z: ev.z + (r() - 0.5) * w * 1.6, vx: (r() - 0.5) * 0.12, vy: 0.12 + r() * 0.15, vz: (r() - 0.5) * 0.12,
        g: 0.04, drag: 0.98, life: 4 / (r() * 0.9 + 0.1) + 4, size: 0.05 * (r() * 0.5 + 0.5) * 2 * 1.5, collide: true,
        tex: 'atlas', uv: [blockTex.u + uo * blockTex.su / 4, blockTex.v + vo * blockTex.sv / 4, blockTex.su / 4, blockTex.sv / 4], color: ev.tint ? ev.tint.map(c => c * 0.6) : [0.6, 0.6, 0.6] })
    }
  }
  if (ev.type === 'campfire_smoke') {
    // one tick of a lit campfire (CampfireBlockEntity.particleTick): a 0.11 chance of 2-3 CampfireSmokeParticles
    // (CampfireBlock.makeParticles) at x/z + 0.5 +- r/3, y + r + r, rising 0.07 a tick (+ r/500), drifting by
    // +-r/5000 a tick, no friction; big_smoke_0..11 (one picked), 3x the base size, alpha 0.9 (signal 0.95),
    // lives 80-129 ticks (signal 280-329) and fades 0.015 a tick over its last 60 (translucent)
    if (r() < 0.11) {
      const n = 2 + Math.floor(r() * 2)
      for (let i = 0; i < n; i++) {
        P({ x: ev.x + 0.5 + r() / 3 * (r() < 0.5 ? 1 : -1), y: ev.y + r() + r(), z: ev.z + 0.5 + r() / 3 * (r() < 0.5 ? 1 : -1),
          vx: (r() - 0.5) / 2500 * 8, vy: 0.07 + r() / 500, vz: (r() - 0.5) / 2500 * 8, g: 3e-6, drag: 1,
          life: ev.signal ? 280 + Math.floor(r() * 50) : 80 + Math.floor(r() * 50), size: 0.1 * (r() * 0.5 + 0.5) * 2 * 3,
          tex: `particle/big_smoke_${Math.floor(r() * 12)}`, color: [1, 1, 1], alpha: ev.signal ? 0.95 : 0.9, fade: 60 })
      }
    }
  }
  if (ev.type === 'dust') {
    // DustParticle (DustParticleOptions, REDSTONE: colour (1, 0, 0), scale 1): Particle's random start
    // velocity x 0.1 (a slow drift, +0.01 up), friction 0.96, no gravity, colour x (0.6..1) x (0.8..1),
    // quadSize x 0.75, lives 8/(r*0.8+0.2) ticks, sprite generic_7 -> generic_0
    const c = ev.color || [1, 0, 0]
    for (let i = 0; i < (ev.count || 1); i++) {
      let vx = r() * 2 - 1, vy = r() * 2 - 1, vz = r() * 2 - 1
      const d0 = (r() + r() + 1) * 0.15, d1 = Math.hypot(vx, vy, vz) || 1
      vx = vx / d1 * d0 * 0.4 * 0.1; vy = (vy / d1 * d0 * 0.4 + 0.1) * 0.1; vz = vz / d1 * d0 * 0.4 * 0.1
      const f = r() * 0.4 + 0.6, col = c.map(v => (r() * 0.2 + 0.8) * v * f)
      P({ x: ev.x, y: ev.y, z: ev.z, vx, vy, vz, g: 0, drag: 0.96, life: Math.floor(8 / (r() * 0.8 + 0.2)), size: 0.1 * (r() * 0.5 + 0.5) * 2 * 0.75, anim: ['particle/generic_', 8, 'rev'], color: col })
    }
  }
  if (ev.type === 'item_break') {
    // LivingEntity.spawnItemParticles(stack, 5): velocity ((r-0.5)*0.1, r*0.1+0.1, 0) and offset
    // ((r-0.5)*0.3, -r*0.6-0.3, 0.6), both turned by the view (xRot then yRot), + 0.05 up; each a
    // BreakingItemParticle: a random quarter of the item sprite, half-size quadSize/2, gravity 1
    // (0.04 a tick), friction 0.98, lives 4/(r*0.9+0.1) ticks
    const rot = (v) => {
      const a = -ev.jpitch, b = -ev.jyaw
      let [x, y, z] = v; [y, z] = [y * Math.cos(a) + z * Math.sin(a), z * Math.cos(a) - y * Math.sin(a)]
      ;[x, z] = [x * Math.cos(b) + z * Math.sin(b), z * Math.cos(b) - x * Math.sin(b)]
      return [x, y, z]
    }
    for (let i = 0; i < 5; i++) {
      const v = rot([(r() - 0.5) * 0.1, r() * 0.1 + 0.1, 0]), o = rot([(r() - 0.5) * 0.3, -r() * 0.6 - 0.3, 0.6])
      const uo = r() * 3, vo = r() * 3
      P({ x: ev.x + o[0], y: ev.y + o[1], z: ev.z + o[2], vx: v[0], vy: v[1] + 0.05, vz: v[2],
        g: 0.04, drag: 0.98, life: 4 / (r() * 0.9 + 0.1), size: 0.1 * (r() * 0.5 + 0.5) * 2 / 2, tex: ev.tex, uv: [uo / 4, vo / 4, 0.25, 0.25], color: [1, 1, 1] })
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
  if (ev.type === 'firework_trail') {
    // FireworkRocketEntity.tick (client): a FIREWORK spark every tick at the rocket, moving
    // (gaussian x 0.05, -yd x 0.5, gaussian x 0.05); SparkParticle as for the explosion, white
    const gs = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())
    P({ x: ev.x, y: ev.y, z: ev.z, vx: gs() * 0.05, vy: -(ev.vy || 0) * 0.5, vz: gs() * 0.05, g: 0.004, drag: 0.91, life: 48 + Math.floor(r() * 12), size: 0.1 * (r() * 0.5 + 0.5) * 2 * 0.75, anim: ['particle/spark_', 8], bright: true, color: [1, 1, 1] })
  }
  if (ev.type === 'firework') {
    // FireworkParticles.Starter: a flash, then per explosion a ball of sparks (small ball: speed 0.25,
    // size 2; large ball: 0.5, 4; others drawn as a ball too) in its colours; SparkParticle: friction
    // 0.91, lives 48-60 ticks, falls slowly, full bright
    const exps = (ev.explosions && ev.explosions.length) ? ev.explosions : []
    // the flash (FireworkParticles.OverlayParticle): the first explosion's first colour, quad size 7.1 x sin((age - 1)
    // x pi/4), alpha 0.6 - (age - 1) / 8: a translucent glow that swells and fades in 4 ticks (it was an opaque white
    // 2-block disc: love_cherry_heart's ring of bursts read as white plates)
    if (exps.length) {
      const c0 = ((exps[0].colors && exps[0].colors[0]) ?? 0xFFFFFF)
      P({ x: ev.x, y: ev.y, z: ev.z, vx: 0, vy: 0, vz: 0, g: 0, drag: 1, life: 4, size: 0, flash: true, alpha: 0.6, tex: 'particle/flash', bright: true, color: [((c0 >> 16) & 255) / 255, ((c0 >> 8) & 255) / 255, (c0 & 255) / 255] })
    }
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
  if (p.flash) {
    const a = age - 1
    if (a <= 0) return null
    return { x: p.x, y: p.y, z: p.z, size: 2 * 7.1 * Math.sin(a * Math.PI / 4), alpha: Math.max(0, 0.6 - a / 8) }
  }
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
  const o = { x: x + vx * f, y: y + vy * f, z: z + vz * f, size: p.size, tex: p.anim ? p.anim[0] + (p.anim[2] === 'rev' ? p.anim[1] - 1 - frame : frame) : undefined }
  if (p.alpha !== undefined) o.alpha = p.fade ? p.alpha - Math.max(0, age - (p.life - p.fade)) * p.alpha / p.fade : p.alpha
  return o
}

module.exports = { spawn, state }
