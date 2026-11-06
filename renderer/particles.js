// Deterministic particles from recorded events (the client spawns most particles itself, so like
// the sounds we spawn them from the stunt's events). Motion, lifetimes and sizes follow the
// vanilla particle classes; textures are the jar's particle sprites (or the block atlas for crumbs).
// Event: timeline {event:'particles', type, x, y, z, block?(name), count?}
//   splash  - WaterDropParticle burst where something hits the water
//   block   - TerrainParticle: a 4x4x4 grid of crumbs of the block's particle texture
//   portal  - PortalParticle: purple specks drifting in to where a pearl lands
//   happy   - happy_villager sparkles (glint) around a villager's head
//   angry   - angry_villager clouds rising from a villager's head
function rng (seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000 } }

function spawn (ev, blockTex) {
  const r = rng(Math.floor(ev.t) * 7919 + ev.x * 13 + ev.z * 31)
  const T0 = ev.t / 50
  const out = []
  const P = (o) => out.push({ t0: T0, ...o })
  if (ev.type === 'splash') {
    for (let i = 0; i < (ev.count || 24); i++) {
      P({ x: ev.x + (r() - 0.5) * 1.2, y: ev.y, z: ev.z + (r() - 0.5) * 1.2, vx: (r() - 0.5) * 0.25, vy: 0.1 + r() * 0.25, vz: (r() - 0.5) * 0.25,
        g: 0.06, drag: 0.98, life: 8 / (r() * 0.8 + 0.2), size: 0.1 * (r() * 0.5 + 0.5), tex: `particle/splash_${Math.floor(r() * 4)}`, color: [1, 1, 1] })
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
      P({ x: ev.x, y: ev.y + r() * 2, z: ev.z, ox: (r() - 0.5) * 2, oy: (r() - 0.5) * 2, oz: (r() - 0.5) * 2, portal: true,
        life: Math.floor(r() * 10) + 40, size: 0.1 * (r() * 0.2 + 0.5) * 1.6, tex: `particle/generic_${Math.floor(r() * 8)}`, color: [0.9 * f, 0.3 * f, f] })
    }
  } else if (ev.type === 'happy' || ev.type === 'angry') {
    for (let i = 0; i < (ev.count || 7); i++) {
      P({ x: ev.x + (r() - 0.5) * 1.0, y: ev.y + r() * 0.8, z: ev.z + (r() - 0.5) * 1.0, vx: (r() - 0.5) * 0.02, vy: ev.type === 'angry' ? 0.03 : 0.01, vz: (r() - 0.5) * 0.02,
        g: 0, drag: 0.96, life: ev.type === 'angry' ? 16 + r() * 10 : 20 + r() * 20, size: ev.type === 'angry' ? 0.2 : 0.1, tex: ev.type === 'angry' ? 'particle/angry' : 'particle/glint', color: [1, 1, 1] })
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
  return { x: x + vx * f, y: y + vy * f, z: z + vz * f, size: p.size }
}

module.exports = { spawn, state }
