// usage: node scripts/steer_sim.js   (TIERS='[[h, off, bias], ...]' STEER_LP= STEER_LE= STEER_LEAD= to try values)
// vanilla-ish air sim of the one_in_a_million drops with lib/air_steer.js (1 tick input lag)
const path = process.argv[2] || require('path').join(__dirname, '../lib/air_steer.js')
delete require.cache[path]
const { steer } = require(path)
const floor = 71, TOP = 316
const TIERS = JSON.parse(process.env.TIERS || "[[40,3,1],[100,5,-1.5],[160,7,2],[\"max\",9,-2.5],[\"max\",11,3]]")
const YAW = Math.PI / 2
const fwd = { x: -Math.sin(YAW), z: -Math.cos(YAW) }, right = { x: Math.cos(YAW), z: -Math.sin(YAW) }
for (const [h, off, bias] of TIERS) {
  const top = h === 'max' ? TOP : floor + h, tx = 0.5, tz = 0.5
  let px = off + 0.5, pz = 0.5, y = top + 1, vx = 0, vz = 0, vy = 0
  const startY = y; let keys = { forward: true }, k = 0, maxOff = 0, at = null, sprint = true, rows = []
  for (; y > floor + 1 && k < 400; k++) {
    // input from last tick's decision (lag)
    let f = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0), s = (keys.left ? 1 : 0) - (keys.right ? 1 : 0)
    if (k === 0) { vy = 0.42; vx += fwd.x * 0.2; vz += fwd.z * 0.2 }   // sprint-jump boost
    f *= 0.98; s *= 0.98; const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l }
    const sp = sprint ? 0.026 : 0.02
    vx += (fwd.x * f - right.x * s) * sp; vz += (fwd.z * f - right.z * s) * sp
    px += vx; pz += vz; y += vy
    vx *= 0.91; vz *= 0.91; vy = (vy - 0.08) * 0.98
    if (k >= 3 && y < startY - 0.5) keys = steer({ yaw: YAW, px, pz, vx, vz, y, vy, tx, tz, floorY: floor + 1, startY, bias })
    else keys = { forward: true }
    const lat = (px - tx) * right.x + (pz - tz) * right.z, hh = y - floor - 1
    const deg = Math.atan2(Math.hypot(px - tx, pz - tz), hh) * 180 / Math.PI
    const ld = Math.abs(Math.atan2(lat, hh)) * 180 / Math.PI; if (k > 15 && ld > maxOff && hh > 3) { maxOff = ld; at = { k, h: hh.toFixed(0), lat: lat.toFixed(2) } }
    if (k % 5 === 0) rows.push(`${k}:${hh.toFixed(0)}/${deg.toFixed(1)}°`)
  }
  console.log(`tier ${h}: ${k} ticks, land err ${Math.hypot(px - tx, pz - tz).toFixed(2)}; max off-crosshair ${maxOff.toFixed(1)}° at`, at)
  if (process.env.V) console.log('  ' + rows.join(' '))
}
