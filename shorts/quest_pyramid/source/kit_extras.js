// Story-kit extras (docs/engine_features.md "Entity scale, skin swaps, trails, block changes, head turns, display
// props"; Sorry, Dear and The Statue Gets Younger). Pure helpers (the harness, render.js and the tests use them) and
// the kit's verbs (lib/story.js puts them on K: K.scale, K.skin, K.trail, K.setBlocks, K.prop).
//
// Vanilla first: an entity's size is the 1.20.5+ `minecraft:scale` attribute (LivingEntity.getScale, 0.0625..16; the
// hitbox, the eye, the name tag's height, the shadow and the held items all follow it), a trail is the 1.21.2+
// `minecraft:trail` particle, a prop is a block_display / item_display entity. The renderer draws what the recording
// holds; marks only add what the server can't show (an eased size change, a skin swap).

// ---- the scale attribute (AttributeInstance.calculateValue: base + add_value, x (1 + sum add_multiplied_base),
// x each (1 + add_multiplied_total), clamped to the attribute's range 0.0625..16)
const SCALE_MIN = 0.0625, SCALE_MAX = 16
function attrScale (attrs) {
  if (!attrs) return 1
  const k = Object.keys(attrs).find(n => /(^|[:.])scale$/.test(n))
  if (!k) return 1
  const a = attrs[k] || {}
  let v = Number.isFinite(a.value) ? a.value : 1
  const mods = Array.isArray(a.modifiers) ? a.modifiers : []
  const op = (m) => (m.operation ?? m.op ?? 0)
  for (const m of mods) if (op(m) === 0 || op(m) === 'add_value') v += +m.amount || 0
  let mul = 1
  for (const m of mods) if (op(m) === 1 || op(m) === 'add_multiplied_base') mul += +m.amount || 0
  v *= mul
  for (const m of mods) if (op(m) === 2 || op(m) === 'add_multiplied_total') v *= 1 + (+m.amount || 0)
  v = Math.min(SCALE_MAX, Math.max(SCALE_MIN, v))
  return Math.abs(v - 1) < 1e-6 ? 1 : +v.toFixed(4)
}

// ---- display entities (Display: 11 translation, 12 scale, 13 left_rotation, 14 right_rotation, 15 billboard,
// 16 brightness_override; BlockDisplay 23 block_state; ItemDisplay 23 item_stack, 24 item_display context)
const ITEM_CTX = ['none', 'thirdperson_lefthand', 'thirdperson_righthand', 'firstperson_lefthand', 'firstperson_righthand', 'head', 'gui', 'ground', 'fixed']
const v3 = (o, d) => (o && typeof o === 'object' && 'x' in o) ? [+o.x, +o.y, +o.z] : d
const q4 = (o) => (o && typeof o === 'object' && 'w' in o) ? [+o.x, +o.y, +o.z, +o.w] : [0, 0, 0, 1]
const r5 = (a) => a.map(v => +(+v).toFixed(5))
function displayData (e, registry) {
  const md = e.metadata || []
  const out = {}
  if (e.name === 'block_display') {
    if (typeof md[23] !== 'number' || md[23] <= 0) return null   // air (the default): nothing drawn
    out.state = md[23]
  } else {
    const it = md[23]
    const id = it && (it.itemId ?? it.blockId)
    const nm = id !== undefined && id >= 0 && registry && registry.items[id] ? registry.items[id].name : null
    if (!nm || nm === 'air' || (it.itemCount ?? 1) <= 0) return null
    out.item = nm
    if (JSON.stringify(it.components || '').includes('enchant')) out.glint = true
    const c = typeof md[24] === 'number' ? md[24] : 0
    if (c) out.ctx = ITEM_CTX[c] || 'none'
  }
  const t = v3(md[11], [0, 0, 0]), s = v3(md[12], [1, 1, 1]), l = q4(md[13]), r = q4(md[14])
  if (t.some(v => v)) out.t = r5(t)
  if (s.some(v => v !== 1)) out.s = r5(s)
  if (l[3] !== 1) out.l = r5(l)
  if (r[3] !== 1) out.r = r5(r)
  if (typeof md[15] === 'number' && md[15]) out.billboard = md[15]
  if (typeof md[16] === 'number' && md[16] >= 0) out.bright = [(md[16] >> 20) & 15, (md[16] >> 4) & 15]   // [sky, block]
  return out
}

// Display.calculateOrientation (billboard FIXED) x Transformation.getMatrix (translation, left rotation, scale, right
// rotation) as a column-major 4x4 (three.js Matrix4.elements), without the entity position. yaw/pitch: the
// recording's (mineflayer: yaw = PI - javaYaw, pitch = -javaPitch), so Ry(-javaYaw) Rx(javaPitch) = Ry(yaw - PI) Rx(-pitch).
function quatMat (q) {
  const [x, y, z, w] = q
  return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1]
}
function mul (a, b) {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s }
  return o
}
const rotY = (a) => [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1]
const rotX = (a) => [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1]
function displayMatrix (d, yaw = Math.PI, pitch = 0) {
  let m = (d.billboard ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] : mul(rotY(yaw - Math.PI), rotX(-pitch)))
  const t = d.t || [0, 0, 0], s = d.s || [1, 1, 1]
  m = mul(m, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1])
  if (d.l) m = mul(m, quatMat(d.l))
  m = mul(m, [s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1])
  if (d.r) m = mul(m, quatMat(d.r))
  return m
}

// ---- staged scale marks: `scale` { ids?, user?, tag?, scale, ticks? } -> per entity key a list of [t, from?, to, ticks]
// The size eases (smoothstep) from where it was to `scale` over `ticks` (0: at once, as the attribute does in game).
function scaleRuns (timeline) {
  const out = new Map()   // key ('id:N' | 'user:NAME' | 'tag:TAG') -> [[t, scale, ticks]]
  for (const m of timeline || []) {
    if (m.event !== 'scale' || !Number.isFinite(+m.scale)) continue
    const keys = [...(m.ids || []).map(i => `id:${i}`), ...(m.user ? [`user:${m.user}`] : []), ...(m.tag ? [`tag:${m.tag}`] : [])]
    for (const k of keys) { if (!out.has(k)) out.set(k, []); out.get(k).push([m.t / 50, +m.scale, Math.max(0, +m.ticks || 0)]) }
  }
  for (const l of out.values()) l.sort((a, b) => a[0] - b[0])
  return out
}
// the staged size at tick t (undefined before the first mark: the recorded attribute, or 1, holds)
function scaleAt (runs, t) {
  if (!runs || !runs.length || t < runs[0][0]) return undefined
  let cur = 1, from = 1
  for (const [a, to, n] of runs) {
    if (t < a) break
    from = cur
    if (n > 0 && t < a + n) { const u = (t - a) / n; return from + (to - from) * u * u * (3 - 2 * u) }
    cur = to
  }
  return cur
}

// ---- props (lib/story.js K.prop): block_display / item_display recipes, sizes in blocks, from the prop's base
// centre on whatever it stands on. Each part: [kind ('b' block | 'i' item), id, [x0, y0, z0] corner (blocks: the
// box's min corner; items: its centre), [sx, sy, sz] (blocks: the box size; items: the scale), extra]
// extra.rot: [rx, ry, rz] degrees (items: applied as the left rotation, YXZ)
const PROPS = {
  // a mug as tall as the aunt at 0.3 (0.54): glazed cyan walls round a coffee top, a loop handle on the east side
  mug: (o = {}) => {
    const h = o.h ?? 0.54, w = o.w ?? 0.36, t = 0.045, body = o.block || 'cyan_terracotta', fill = o.fill || 'brown_terracotta'
    const x0 = -w / 2, z0 = -w / 2
    return [
      ['b', body, [x0, 0, z0], [w, 0.04, w]],                                    // the bottom
      ['b', body, [x0, 0, z0], [w, h, t]], ['b', body, [x0, 0, -z0 - t], [w, h, t]],   // north and south walls
      ['b', body, [x0, 0, z0 + t], [t, h, w - 2 * t]], ['b', body, [-x0 - t, 0, z0 + t], [t, h, w - 2 * t]],   // west and east
      ['b', fill, [x0 + t, h * 0.82, z0 + t], [w - 2 * t, 0.02, w - 2 * t]],   // the coffee, a little under the rim
      ['b', body, [-x0, h * 0.68, -0.035], [0.1, 0.06, 0.07]], ['b', body, [-x0, h * 0.18, -0.035], [0.1, 0.06, 0.07]],   // the handle's arms
      ['b', body, [-x0 + 0.1, h * 0.18, -0.035], [0.055, h * 0.56, 0.07]]       // and its loop
    ]
  },
  // a teacup on a saucer, ~0.5 tall and wider than her: a foot, a narrow bowl under a wide one, tea under a blue rim
  teacup: (o = {}) => {
    const h = o.h ?? 0.5, w = o.w ?? 0.62, t = 0.04, body = o.block || 'white_concrete', rim = o.rim || 'light_blue_concrete', fill = o.fill || 'orange_terracotta'
    const ring = (y0, y1, ww, blk) => [
      ['b', blk, [-ww / 2, y0, -ww / 2], [ww, y1 - y0, t]], ['b', blk, [-ww / 2, y0, ww / 2 - t], [ww, y1 - y0, t]],
      ['b', blk, [-ww / 2, y0, -ww / 2 + t], [t, y1 - y0, ww - 2 * t]], ['b', blk, [ww / 2 - t, y0, -ww / 2 + t], [t, y1 - y0, ww - 2 * t]]]
    const sw = w * 1.35
    return [
      ['b', body, [-sw / 2, 0, -sw / 2], [sw, 0.03, sw]],                         // the saucer
      ['b', body, [-w * 0.25, 0.03, -w * 0.25], [w * 0.5, 0.05, w * 0.5]],        // the foot
      ['b', body, [-w * 0.38, 0.08, -w * 0.38], [w * 0.76, h * 0.3, w * 0.76]],   // the narrow lower bowl
      ...ring(0.08 + h * 0.3, h - 0.04, w, body), ...ring(h - 0.04, h, w, rim),    // the wide upper bowl and its rim
      ['b', fill, [-w / 2 + t, h * 0.78, -w / 2 + t], [w - 2 * t, 0.02, w - 2 * t]],
      ['b', body, [w / 2, h * 0.45, -0.035], [0.12, 0.05, 0.07]], ['b', body, [w / 2 + 0.12, h * 0.3, -0.035], [0.05, h * 0.42, 0.07]], ['b', body, [w / 2, h * 0.3, -0.035], [0.12, 0.05, 0.07]]
    ]
  },
  // a hand of flat cards on the cloth, fanned: thin white slabs (o.w x o.l) with a red or black pip, each turned about
  // the fan's pivot (o.n cards, o.fan degrees across). o.item: paper items instead (vanilla's paper sprite, curled)
  cards: (o = {}) => {
    const n = o.n ?? 5, fan = o.fan ?? 50, w = o.w ?? 0.15, l = o.l ?? 0.21, out = []
    for (let i = 0; i < n; i++) {
      const a = n > 1 ? -fan / 2 + fan * i / (n - 1) : 0, rad = a * Math.PI / 180, y = 0.002 + i * 0.004
      // the card's centre, l * 0.4 out from the pivot along its own length (north at a = 0)
      const cx = Math.sin(rad) * l * 0.4, cz = -Math.cos(rad) * l * 0.4
      if (o.item) { out.push(['i', o.item, [cx, y + 0.002, cz], [l, l, l], { rot: [-90, -a, 0] }]); continue }
      out.push(['b', o.block || 'white_concrete', [cx - w / 2, y, cz - l / 2], [w, 0.003, l], { rot: [0, -a, 0] }])
      const pip = (o.pips || ['red_concrete', 'black_concrete'])[i % 2]
      out.push(['b', pip, [cx - 0.025, y + 0.003, cz - 0.03], [0.05, 0.002, 0.06], { rot: [0, -a, 0], about: [cx, cz] }])
    }
    return out
  },
  // a heap of items (emeralds), lying every which way, layers narrowing to the top: o.h tall, o.r wide at the base
  heap: (o = {}) => {
    const h = o.h ?? 0.7, r0 = o.r ?? 0.3, sz = o.size ?? 0.28, it = o.item || 'emerald', out = []
    let seed = o.seed ?? 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    const layers = Math.max(2, Math.round(h / (sz * 0.32)))
    for (let L = 0; L < layers; L++) {
      const k = L / layers, rr = r0 * (1 - k) + 0.02, n = Math.max(1, Math.round(7 * (1 - k) * (r0 / 0.3) + 0.5))
      for (let i = 0; i < n; i++) {
        const a = (i / n + rnd() * 0.3) * Math.PI * 2, d = n > 1 ? rr * (0.55 + rnd() * 0.45) : 0
        out.push(['i', it, [Math.cos(a) * d, sz * 0.25 + L * (h - sz * 0.5) / Math.max(1, layers - 1), Math.sin(a) * d], [sz, sz, sz], { rot: [-90 + (rnd() - 0.5) * 70, rnd() * 360, (rnd() - 0.5) * 40] }])
      }
    }
    return out
  }
}

// a quaternion [x, y, z, w] for rotations in degrees applied Y, then X, then Z (JOML rotationYXZ)
function quatYXZ (rx, ry, rz) {
  const D = Math.PI / 360, cy = Math.cos(ry * D), sy = Math.sin(ry * D), cx = Math.cos(rx * D), sx = Math.sin(rx * D), cz = Math.cos(rz * D), sz = Math.sin(rz * D)
  // qY * qX * qZ
  const a = [0, sy, 0, cy], b = [sx, 0, 0, cx], c = [0, 0, sz, cz]
  const m = (p, q) => [p[3] * q[0] + p[0] * q[3] + p[1] * q[2] - p[2] * q[1], p[3] * q[1] - p[0] * q[2] + p[1] * q[3] + p[2] * q[0], p[3] * q[2] + p[0] * q[1] - p[1] * q[0] + p[2] * q[3], p[3] * q[3] - p[0] * q[0] - p[1] * q[1] - p[2] * q[2]]
  return m(m(a, b), c)
}
const f = (v) => `${(+v).toFixed(4)}f`
// one prop part -> a /summon command at absolute (x, y, z) (the prop's base centre), tagged
function partCommand (p, x, y, z, tags) {
  const [kind, id, c, s, ex = {}] = p
  const tg = `Tags:[${tags.map(t => `"${t}"`).join(',')}]`
  if (kind === 'b') {
    let tr = c, lq = '0f,0f,0f,1f'
    if (ex.rot) {
      // turned about its own centre (or ex.about [x, z]): translation = pivot + R (corner - pivot), left rotation R
      const q = quatYXZ(...ex.rot), [px, pz] = ex.about || [c[0] + s[0] / 2, c[2] + s[2] / 2], py = c[1] + s[1] / 2
      const v = [c[0] - px, c[1] - py, c[2] - pz], R = quatMat(q)
      tr = [px + R[0] * v[0] + R[4] * v[1] + R[8] * v[2], py + R[1] * v[0] + R[5] * v[1] + R[9] * v[2], pz + R[2] * v[0] + R[6] * v[1] + R[10] * v[2]]
      lq = q.map(f).join(',')
    }
    return `/summon block_display ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)} {block_state:{Name:"minecraft:${id}"},transformation:{translation:[${tr.map(f).join(',')}],left_rotation:[${lq}],scale:[${s.map(f).join(',')}],right_rotation:[0f,0f,0f,1f]},${tg}}`
  }
  const q = ex.rot ? quatYXZ(...ex.rot) : [0, 0, 0, 1]
  return `/summon item_display ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)} {item:{id:"minecraft:${id}",count:1},item_display:"none",transformation:{translation:[${c.map(f).join(',')}],left_rotation:[${q.map(f).join(',')}],scale:[${s.map(f).join(',')}],right_rotation:[0f,0f,0f,1f]},${tg}}`
}
// the commands for a prop: name (PROPS) or a parts list, at absolute (x, y, z), turned `yaw` degrees (about y, from
// the prop's own north: the parts are turned before the summon, so each entity keeps Rotation 0)
function propCommands (name, x, y, z, o = {}) {
  const parts = Array.isArray(name) ? name : PROPS[name] ? PROPS[name](o) : null
  if (!parts) throw new Error(`K.prop: no prop '${name}' (${Object.keys(PROPS).join(', ')}, or a parts list)`)
  const yaw = (o.yaw || 0) * Math.PI / 180, cs = Math.cos(yaw), sn = Math.sin(yaw), tags = [].concat(o.tag || [], 'prop')
  return parts.map(p => {
    const [kind, , c, s, ex = {}] = p
    // turn the part's anchor about the prop's centre; blocks turn about their own min corner, so move by the centre
    const cx = kind === 'b' ? c[0] + s[0] / 2 : c[0], cz = kind === 'b' ? c[2] + s[2] / 2 : c[2]
    const rx = cx * cs - cz * sn, rz = cx * sn + cz * cs
    if (!yaw) return partCommand(p, x, y, z, tags)
    if (kind === 'b') {
      // a turned box: its pivot (ex.about, else its centre) moves round the prop's centre and the box turns with it
      const [px, pz] = ex.about || [cx, cz], qx = px * cs - pz * sn, qz = px * sn + pz * cs
      const r0 = ex.rot || [0, 0, 0]
      return partCommand([kind, p[1], [c[0] - px + qx, c[1], c[2] - pz + qz], s, { ...ex, rot: [r0[0], r0[1] - (o.yaw || 0), r0[2]], about: [qx, qz] }], x, y, z, tags)
    }
    const rot = ex.rot ? [ex.rot[0], ex.rot[1] - (o.yaw || 0), ex.rot[2]] : [0, -(o.yaw || 0), 0]
    return partCommand([kind, p[1], [rx, c[1], rz], s, { ...ex, rot }], x, y, z, tags)
  })
}

// the /particle command for a trail (TrailParticleOption: target, color as an int RGB, duration in ticks)
function trailCommand (from, to, o = {}) {
  const c = o.color || [1, 1, 1], rgb = (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255)
  const sp = o.spread ?? 0.15
  return `/particle minecraft:trail{target:[${to.map(v => (+v).toFixed(3) + 'd').join(',')}],color:${rgb},duration:${Math.round(o.dur || 20)}} ${from.map(v => (+v).toFixed(3)).join(' ')} ${sp} ${sp} ${sp} 0 ${o.count || 3} force`
}

// ---- the kit's verbs (lib/story.js puts them on K). Spots are set-relative [dx, dy, dz] (or { abs: [x, y, z] }).
function kit (ctx, K, { X, Z, F }) {
  const abs = (p) => (p && p.abs) ? p.abs : [X + p[0], F + p[1], Z + p[2]]
  // who: an actor's tag (K.actor), 'self' (the recording bot), or a player actor's / mannequin's name
  const target = (who) => {
    if (who === 'self') return { sel: '@s', mark: { ids: [-1] } }
    if (K.actors && K.actors.has(who)) return { sel: `@e[tag=${who},limit=1]`, mark: { tag: who } }
    return { sel: who, mark: { user: who } }
  }
  return {
    // the vanilla minecraft:scale attribute (0.0625..16: the hitbox, eye, name tag, shadow and held items follow it),
    // set at once in game; the picture eases to it over o.secs (0: a cut-like jump, as the attribute itself does)
    scale (who, v, o = {}) {
      v = Math.min(SCALE_MAX, Math.max(SCALE_MIN, +v))
      const t = target(who)
      if (o.server !== false) K.say(`/attribute ${t.sel} minecraft:scale base set ${v}`)
      ctx.mark('scale', { ...t.mark, scale: v, ticks: Math.round((o.secs || 0) * 20) })
    },
    // a player actor's skin from this tick on (render.js cast_skin; skins/<name>.png or the jar's): a mid-shot swap
    skin (who, skin) { ctx.mark('cast_skin', { user: who, skin }) },
    // a trail (vanilla minecraft:trail): specks from `from` that fly straight to `to` and land on it after o.dur ticks
    // (20); a stream of o.count (3) a tick for o.secs (1) s, the start spread o.spread (0.15) blocks; o.color [r, g, b];
    // o.size x the vanilla speck (generic_0 is a small dot: x2-3 reads at phone size; the server's stays vanilla)
    trail (from, to, o = {}) {
      const a = abs(from), b = abs(to), ticks = Math.max(1, Math.round((o.secs ?? 1) * 20))
      const color = o.color || [0.55, 0.55, 0.55], dur = Math.round(o.dur ?? 20)
      ctx.mark('particles', { type: 'trail', x: +a[0].toFixed(3), y: +a[1].toFixed(3), z: +a[2].toFixed(3), tx: +b[0].toFixed(3), ty: +b[1].toFixed(3), tz: +b[2].toFixed(3), color, dur, count: o.count || 3, ticks, spread: o.spread ?? 0.15, ...(o.size ? { size: o.size } : {}) })
      if (o.server !== false) K.say(trailCommand(a, b, { ...o, color, dur }))
    },
    // a block change on this tick (a /fill from a to b, set-relative): the recording's block update, re-meshed by the
    // renderer on the tick it lands (no swing, no sound: a story change, not the player placing it; K.place does that)
    setBlocks (a, b, block) {
      const p = abs(a), q = abs(b || a)
      K.say(`/fill ${p.map(Math.floor).join(' ')} ${q.map(Math.floor).join(' ')} ${block}`)
      ctx.mark('set_change', { from: p.map(Math.floor), to: q.map(Math.floor), block })
    },
    // a prop from block_display / item_display entities (PROPS: mug, teacup, cards, heap; or a parts list) standing on
    // the spot (its base centre), tagged o.tag; o.yaw turns it. In setup: `for (const c of propCommands(...)) await ctx.cmd(c)`
    prop (name, at, o = {}) { const p = abs(at); for (const c of propCommands(name, p[0], p[1], p[2], o)) K.say(c) },
    propOff (tag) { K.say(`/kill @e[tag=${tag}]`) }
  }
}

module.exports = { kit, attrScale, displayData, displayMatrix, scaleRuns, scaleAt, PROPS, propCommands, partCommand, quatYXZ, trailCommand, ITEM_CTX, SCALE_MIN, SCALE_MAX }
