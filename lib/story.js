// Narrated story Shorts (docs/stories.md): the narration's timing for a story stunt.
// stories/<name>/voice/voice.json comes from scripts/voice.py: each line's spoken length and its
// caption chunks' start/end (seconds from the start of the line's wav).
//   const S = storyLines('stories/<name>')
//   S.line('L03').dur        seconds of the line's wav
//   S.line('L03').at(4)      tick (from the line's mark) where caption chunk 4 starts
//   S.gap                    seconds of air after each line
const fs = require('fs')
const path = require('path')

function storyLines (dir) {
  const vf = path.join(dir, 'voice', 'voice.json')
  if (!fs.existsSync(vf)) throw new Error(`no ${vf}: run scripts/voice.py ${dir} first`)
  const v = JSON.parse(fs.readFileSync(vf, 'utf8'))
  const story = JSON.parse(fs.readFileSync(path.join(dir, 'story.json'), 'utf8'))
  return {
    gap: story.gap ?? v.gap ?? 0.12,
    ids: story.lines.map(l => l.id),
    line (id) {
      const l = v.lines[id]
      if (!l) throw new Error(`line ${id} has no voice: run scripts/voice.py ${dir}`)
      return { ...l, at: (k) => Math.round(l.chunks[Math.min(k, l.chunks.length - 1)][0] * 20) }
    }
  }
}

module.exports = { storyLines }

// The per-line machinery every story stunt needs (see stunts/story_respawn_tax.js):
//   const K = storyKit(ctx, S, { X, Z, F })
//   await K.cut(dx, dz, K.P(dx, dy, dz))      teleport (a cut in the renderer), aim at a point
//   await K.line('L03', (k, at) => {...})      mark the line, run the scene every tick for dur + gap
//   K.look(k, dyaw, dpitch)                    aim + a slow sway (no shot is ever still)
//   K.flee(tag, speed)                         a tagged group steps away from the camera, facing away
function storyKit (ctx, S, { X, Z, F }) {
  const { bot } = ctx
  const K = {
    base: { yaw: 0, pitch: 0 },
    sway: 1,
    P: (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz),
    say: (s) => bot.chat(s),                    // ops aren't chat-limited: per-tick commands are fine
    aim (p) {
      const eye = bot.entity.position.offset(0, 1.62, 0), d = p.minus(eye)
      return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
    },
    look (k, dyaw = 0, dpitch = 0) {
      return bot.look(K.base.yaw + dyaw + Math.sin(k / 23) * 0.06 * K.sway, K.base.pitch + dpitch + Math.sin(k / 31) * 0.025 * K.sway, true)   // sway is zero at k=0: the first tick matches the cut's aim
    },
    async cut (dx, dz, target, dy = 1) {
      const x = X + dx, z = Z + dz
      // always decimals: /tp centres a whole-number x/z on the block (+0.5) and the arrival check never matched
      // arrive already aimed (the rotation rides on the teleport): aiming after it showed the new
      // place at the old angle for 2 frames, then a snap (frame review, story_runaway)
      const d = target.minus(new ctx.Vec3(x, F + dy + 1.62, z))
      K.base = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
      // (and no look before it lands: the tick before the cut then turned the old shot, 3 frames of spin)
      K.say(`/tp @s ${x.toFixed(3)} ${(F + dy).toFixed(3)} ${z.toFixed(3)} ${(180 - K.base.yaw * 180 / Math.PI).toFixed(2)} ${(-K.base.pitch * 180 / Math.PI).toFixed(2)}`)
      for (let i = 0; i < 10; i++) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.x - x) < 0.05 && Math.abs(bot.entity.position.z - z) < 0.05) break }
      await bot.look(K.base.yaw, K.base.pitch, true)
    },
    flee (tag, speed) { K.say(`/execute as @e[tag=${tag}] at @s facing entity ${bot.username} feet rotated ~180 0 positioned ^ ^ ^${speed} run tp @s ~ ${F + 1} ~ facing ^ ^ ^5`) },
    // turn the camera to a point over n ticks (eased), from inside a scene: call every tick with k - start
    turnTo (from, p, u) {
      u = Math.max(0, Math.min(1, u))   // past 1 the ease falls again and the camera spun back (worker 8)
      const to = K.aim(p), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
      let dy = to.yaw - from.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy <= -Math.PI) dy += 2 * Math.PI
      K.base = { yaw: from.yaw + dy * Math.min(1, e), pitch: from.pitch + (to.pitch - from.pitch) * Math.min(1, e) }
    },
    // one line: mark it, run scene(k, at) every tick for its spoken length + gap + extra seconds
    async line (id, scene, extra = 0) {
      const L = S.line(id)
      const ticks = Math.round((L.dur + S.gap + extra) * 20)
      ctx.mark('line', { id })
      for (let k = 0; k < ticks; k++) { await scene(k, L.at); await bot.waitForTicks(1) }
    }
  }
  return K
}

// A little house: cobble floor, plank walls with log corners, a spruce roof, glass windows on the
// x-running walls, a hanging lantern, and a door (open or shut) at (doorX, doorZ) facing `facing`.
async function house (ctx, A, x0, z0, doorX, doorZ, facing, open = true, wall = 'oak_planks') {
  const c = (s) => ctx.cmd(s), x1 = x0 + 5, z1 = z0 + 5
  await c(`/fill ${A(x0, 0, z0)} ${A(x1, 4, z1)} ${wall} hollow`)   // a room y1-y3 (a hollow fill from y1 left one air layer)
  await c(`/fill ${A(x0, 0, z0)} ${A(x1, 0, z1)} cobblestone`)
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) await c(`/fill ${A(x, 1, z)} ${A(x, 3, z)} oak_log`)
  await c(`/fill ${A(x0 - 1, 4, z0 - 1)} ${A(x1 + 1, 4, z1 + 1)} spruce_planks`)
  await c(`/fill ${A(x0, 5, z0)} ${A(x1, 5, z1)} spruce_slab`)
  await c(`/setblock ${A(x0 + 2, 4, z0 + 2)} glowstone`); await c(`/setblock ${A(x0 + 3, 4, z0 + 3)} glowstone`)   // lit inside
  await c(`/fill ${A(x0 + 2, 2, z0)} ${A(x0 + 3, 2, z0)} glass`)
  await c(`/fill ${A(x0 + 2, 2, z1)} ${A(x0 + 3, 2, z1)} glass`)
  await c(`/setblock ${A(doorX, 2, doorZ)} oak_door[half=upper,facing=${facing},open=${open}]`)
  await c(`/setblock ${A(doorX, 1, doorZ)} oak_door[half=lower,facing=${facing},open=${open}]`)
}

module.exports.storyKit = storyKit
module.exports.house = house
