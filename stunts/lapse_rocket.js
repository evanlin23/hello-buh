// "building a rocket in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js), on red badlands sand:
// a three-block rocket, then a little survival rocket with fins (its nose built from a dirt pillar the
// bot towers up and then digs away), then a 60-block launch complex rising as a time-lapse: the pad
// and flame trench, the three rocket stages, the nose cone, the launch tower with its arms, fuel tanks
// and a control building, and last the ignition - fire and smoke pouring out of the trench.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: two white blocks and a red tip (the bot jumps for the tip)
const small = { blocks: [[1, 0, 0, 'white_concrete'], [1, 1, 0, 'white_concrete'], [1, 2, 0, 'red_concrete']], slots: { white_concrete: 0, red_concrete: 1 } }

// 1 minute: a 3x3 rocket, 6 high: two full rows with red fins at the corners, a plus-shaped white body
// with a blue band, a red nose and tip (front row z = 2). Its core column goes in first from the first
// side (lib/time_lapse.js 'IN'), rows 3 and up from a 3-block dirt pillar
function mini () {
  const out = []
  for (let y = 0; y <= 5; y++) {
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        const corner = x !== 1 && z !== 1
        const centre = x === 1 && z === 1
        if (y >= 2 && corner) continue
        if (y === 5 && !centre) continue
        let name = 'white_concrete'
        if (corner) name = 'red_concrete'
        if (y === 3 && !centre) name = 'blue_concrete'
        if (y >= 4) name = 'red_concrete'
        out.push([x, y, z, name])
      }
    }
  }
  return out
}

// 1 hour: the launch complex, local to the rocket's axis (front faces +z), y from the ground
function complex () {
  const out = new Map()
  const put = (x, y0, z, name, stage) => { const y = y0 + (stage >= 1 && stage <= 5 ? 1 : 0); const k = `${x},${y},${z}`; if (!out.has(k)) out.set(k, [x, y, z, name, stage]) }
  const ring = (y, r, name, stage, paint) => {          // a one-block-thick circle, radius r
    for (let x = -r - 1; x <= r + 1; x++) for (let z = -r - 1; z <= r + 1; z++) {
      const d = Math.hypot(x, z)
      if (d <= r + 0.5 && d > r - 0.5) put(x, y, z, paint ? paint(x, y, z) || name : name, stage)
    }
  }
  const disc = (y, r, name, stage) => { for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (Math.hypot(x, z) <= r + 0.5) put(x, y, z, name, stage) }
  // stage 0: the pad, two layers of concrete with yellow edge lines, split by a flame trench running
  // north-south under the rocket (its floor black, at ground level)
  for (let x = -18; x <= 18; x++) for (let z = -18; z <= 18; z++) {
    if (Math.abs(x) <= 3) { put(x, -1, z, 'black_concrete', 0); continue }
    put(x, 0, z, 'gray_concrete', 0)
    const edge = Math.abs(x) === 18 || Math.abs(z) === 18 || Math.abs(x) === 4
    put(x, 1, z, edge ? 'yellow_concrete' : 'light_gray_concrete', 0)
  }
  // stage 1: the first stage, radius 5, white with black roll bands, four red fins
  for (let y = 1; y <= 20; y++) ring(y, 5, 'white_concrete', 1, (x, yy, z) => (yy === 6 || yy === 19) && 'black_concrete')
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let y = 1; y <= 7; y++) for (let k = 6; k <= 6 + Math.max(0, 3 - Math.floor((y - 1) / 2)); k++) put(dx * k, y, dz * k, 'red_concrete', 1)
  }
  disc(20, 4, 'white_concrete', 1)
  // stage 2: the second stage, radius 5, with a black checker band
  for (let y = 21; y <= 36; y++) ring(y, 5, 'white_concrete', 2, (x, yy, z) => yy >= 33 && yy <= 34 && ((Math.atan2(x, z) * 4 / Math.PI + 8 + (yy & 1)) | 0) % 2 === 0 && 'black_concrete')
  // stage 3: the third stage, radius 4, a blue window band, on an adapter ring
  disc(37, 5, 'light_gray_concrete', 3)
  for (let y = 38; y <= 47; y++) ring(y, 4, 'white_concrete', 3, (x, yy, z) => yy >= 42 && yy <= 43 && 'light_blue_concrete')
  // stage 4: the nose cone tapering to a red tip
  for (let y = 48; y <= 56; y++) disc(y, Math.max(0, Math.round(4 - (y - 48) * 0.5)), y >= 53 ? 'red_concrete' : 'white_concrete', 4)
  put(0, 57, 0, 'red_concrete', 4); put(0, 58, 0, 'lightning_rod', 4)
  // stage 5: the launch tower east of the rocket: a 5x5 red lattice to y 62, two swing arms
  const TX = 13
  for (let y = 1; y <= 62; y++) for (let x = TX - 2; x <= TX + 2; x++) for (let z = -2; z <= 2; z++) {
    const cx = Math.abs(x - TX) === 2, cz = Math.abs(z) === 2
    if (cx && cz) put(x, y, z, 'red_concrete', 5)                                   // the corner legs
    else if ((cx || cz) && y % 6 === 0) put(x, y, z, 'red_concrete', 5)             // the floors
    else if ((cx || cz) && (y % 6 === Math.abs((x - TX) + z) % 6)) put(x, y, z, 'iron_bars', 5)   // bracing
  }
  for (const ay of [30, 50]) for (let x = 6; x <= TX - 3; x++) for (const z of [-1, 0, 1]) put(x, ay, z, z === 0 ? 'gray_concrete' : 'red_concrete', 5)
  // stage 6: fuel tanks west (two big white spheres with an orange band), floodlight masts at the pad
  // corners, the road in
  for (const tz of [-11, 11]) {
    const cx = -36, cy = 7
    for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) for (let z = -7; z <= 7; z++) {
      const d = Math.hypot(x, y, z)
      if (d <= 7.4 && d > 6.4) put(cx + x, cy + y, tz + z, y === 0 ? 'orange_concrete' : 'quartz_block', 6)
    }
  }
  for (const [mx, mz] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) {
    for (let y = 2; y <= 25; y++) put(mx, y, mz, 'gray_concrete', 6)
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(mx + dx, 26, mz + dz, 'sea_lantern', 6)
  }
  for (let z = 19; z <= 60; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, Math.abs(x) === 1 ? 'yellow_concrete' : 'gray_concrete', 6)   // (3 wide: the minute rocket stood on a 5-wide road's edge)
  // stage 7: the assembly hall out to the left, for scale: 19x23x37 with a tall door and a flag stripe
  // (back left at 140 blocks from the last shot it faded in and out at the fog edge; straight behind,
  // the rocket stood against a white wall)
  for (let x = -66; x <= -48; x++) for (let y = 0; y <= 36; y++) for (let z = 6; z <= 28; z++) {
    if (x !== -66 && x !== -48 && y !== 36 && z !== 6 && z !== 28) continue
    let name = 'white_concrete'
    if (x === -48 && z >= 12 && z <= 20 && y <= 30) name = 'light_gray_concrete'   // the big door, facing the pad
    if (x === -48 && z >= 22 && z <= 26 && y >= 28 && y <= 33) name = (y - 28) % 2 ? 'red_concrete' : 'white_concrete'
    if (x === -48 && z >= 24 && z <= 26 && y >= 31 && y <= 33) name = 'blue_concrete'
    put(x, y, z, name, 7)
  }
  // stage 8: ignition - fire filling the trench and pouring out of both ends, a ring of smoke rolling
  // round the pad and a plume rising off the back (the old wisps out of the trench ends read as specks)
  for (let z = -18; z <= 18; z++) for (let x = -3; x <= 3; x++) for (let y = 0; y <= 1; y++) {
    put(x, y, z, Math.abs(z) < 5 || (y === 0 && Math.abs(x) <= 1) ? 'yellow_concrete' : 'orange_concrete', 8)
  }
  for (const s of [-1, 1]) for (let k = 1; k <= (s > 0 ? 4 : 8); k++) for (let x = -3; x <= 3; x++) for (let y = 0; y <= 2; y++) {
    if (Math.abs(x) + y <= 4 - k * 0.3) put(x, y, s * (18 + k), k < 3 ? 'yellow_concrete' : 'orange_concrete', 8)
  }
  const puff = (cx, cy, cz, r) => {
    for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) {
      if (Math.hypot(x, y, z) <= r + 0.3 && cy + y >= 0) put(cx + x, cy + y, cz + z, 'white_wool', 8)
    }
  }
  for (let k = 0; k < 70; k++) {                          // the ring round the pad, low and lumpy
    const a = k * 2 * Math.PI / 70 + Math.sin(k * 1.3) * 0.05
    const r = 21 + (k * 7 % 5)
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r)
    if (z > 18 && Math.abs(x) < 10) continue               // the road and the two small builds stay clear
    puff(x, 2 + (k * 3 % 5), z, 3 + (k % 2))   // big enough to read from the last shot
  }
  for (let k = 0; k < 26; k++) {                          // the plume off the back of the trench, rising
    const t = k / 25
    puff(Math.round(Math.sin(k * 2.1) * 3), Math.round(2 + t * 22), Math.round(-24 - t * 16), 3 + Math.round(t * 2))
  }
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_rocket',
  biomeSearch: 'minecraft:badlands',
  caption: 'building a rocket in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  recordRadius: 200,
  endAfter: 'big_done:0.5',
  bigCuts: [6, 1.2, 67.5], payoffFlash: true, song: null,   // pace: jump cuts through the 1-hour round, a flash + punch on 60:00
  field: { top: 'red_sand', under: 'terracotta', biome: 'minecraft:badlands' },
  hotbar: [['white_concrete', 64], ['red_concrete', 64], ['blue_concrete', 64], ['dirt', 64], 'diamond_shovel'],
  small,
  mid: { blocks: mini(), w: 3, d: 3, towerY: 3, towerH: 3, towerSlot: 3, digSlot: 4, perTick: 2, speed: 3, backTicks: 12,
    slots: { white_concrete: 0, red_concrete: 1, blue_concrete: 2 } },
  big: {
    blocks: complex(),
    hold: 'white_concrete', slot: 0,
    // pad, stage 1, stage 2, stage 3, nose, tower, tanks + masts, the hall, ignition
    stageTicks: { 0: 150, 1: 190, 2: 150, 3: 130, 4: 120, 5: 170, 6: 200, 7: 170, 8: 90 },
    // one smooth move for the whole round (owner r:r200cfe: "The rocket time lapse has a ton for jerking around between
    // shots": the rail swung round the pad, the tower and the hall, so every 1.2 s jump cut jumped 5-15 deg and 4-15
    // blocks): a slow crane-out from low over the pad to the wide of the whole site, the look rising with the rocket so
    // its nose and the tower stay under the clock. Across a jump cut the camera moves under a block and turns under a degree.
    keys: [
      [0, [-10, 10, 48], [-6, 8, 0]],
      [690, [-8, 18, 76], [-6, 30, 0]],
      [1378, [-6, 22, 92], [-6, 31, 0]]        // the pull-back lands on 60:00: the hall, the tanks and the tower in frame
    ],
    reveal: [
      [8, [-5.97, 22.02, 92.18], [-6, 31, 0]], // on along the same line, as slowly
      [16, [-5.94, 22.04, 92.36], [-6, 31, 0]]
    ]
  }
})
