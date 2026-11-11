// Shared kit for the "noob vs pro vs hacker" series (worker 15; stunts/noob_pro_hacker*.js).
// Each Short is TASKS x [NOOB, PRO, HACKER] beats, every beat a hard cut back to the same start.
//   const kit = nph.kit(ctx)          // in perform()
//   kit.beat({ task: 0 }) ... kit.endBeat()   marks seg / g<k> / x<k> (the edit cuts x<k> -> g<k>)
//   module.exports.edit = nph.edit({ caption, red, tasks, cmds, feedback, ... })
const ROLES = [['NOOB', 'green'], ['PRO', 'blue'], ['HACKER', 'red']]

// The edit block: the role as a tag for the whole beat, the task as a subtitle on its noob beat, the
// hacker's command typed into the vanilla chat bar (Enter on typed<i>) with its feedback line, and a
// hard cut from the end of each beat's action (x<k>) to the start of the next (g<k>): no teleport waits.
// deathBeats: beats that end on a death screen; their tag ends on the death (over the death screen it
// covered "You Died!")
function edit ({ caption, red, tasks, cmds, feedback, dropAt = 'hack', endAfter, speed = [], deathBeats = [], extra = {} }) {
  const n = tasks.length * 3
  return {
    caption, red, song: 'songs/funk_abnormal.mp3', dropAt, startAt: 'seg:0', endAfter, subsY: 0.3,
    tags: Array.from({ length: n }, (_, i) => ['seg', deathBeats.includes(i) ? 'death' : null, ROLES[i % 3][0], ROLES[i % 3][1], i]),
    subs: tasks.map((t, i) => ['seg', `task ${i + 1}: ${t}`, 1.6, i * 3]),
    // a command is 'text' or ['text', TYPE_S] (a re-sent command recalled with the up arrow types in ~0.1 s);
    // the input box closes on Enter, like vanilla
    chat: cmds.map((c, i) => { const [t, ty] = Array.isArray(c) ? c : [c, 0.9]; return [`typed${i}`, t, ty, 0, feedback[i]] }),
    speed: [...speed, ...Array.from({ length: n - 1 }, (_, k) => [`x${k + 1}`, `g${k + 1}`, 'cut'])],
    ...extra
  }
}

function kit (ctx) {
  const { bot, Vec3 } = ctx
  const A = require('./act')(ctx)   // the aimed actions (lib/act.js: gated on the crosshair)
  let seg = 0, typedN = 0
  const k = {
    get seg () { return seg },
    beat (extra = {}) { if (seg > 0) ctx.mark(`g${seg}`); ctx.mark('seg', { n: seg++, ...extra }) },
    endBeat () { ctx.mark(`x${seg}`) },        // the next beat's cut starts here
    look: (yaw, pitch, ms) => ctx.easeLook(yaw, pitch, ms),
    // the hacker hits Enter on his command (the chat bar types it out before this mark)
    typed () { const i = typedN++; ctx.mark('typed', { n: i }); ctx.mark(`typed${i}`); ctx.sound('ui.button.click', 0.4, 1.4) },
    // a real right-click on a block face (the server checks reach, not where I look)
    // (gated on the crosshair, lib/act.js: on the block it goes out this tick; off it, the view turns there first)
    placeAt (ref, face, cursor, at) {
      return A.click(ref, face, cursor, { swing: true, also: () => { if (at) ctx.mark('place', { x: at.x, y: at.y, z: at.z }) } })
    },
    // a hard cut to a new start (the /tp carries the aim). Everything the HUD shows for the new beat
    // (hotbar, full hearts, no XP) is set and settled BEFORE the cut: the review saw the old beat's
    // hotbar and the hearts refilling on the new shot's first frames.
    async cutTo (X, Y, Z, yawDeg, pitchDeg, { hotbar = [], select = 0 } = {}) {
      bot.chat('/effect clear @s'); bot.chat('/effect give @s saturation infinite 1 true')
      bot.chat('/effect give @s instant_health 1 10 true')
      bot.chat('/xp set @s 0 levels'); bot.chat('/xp set @s 0 points')
      await ctx.hotbar(hotbar)
      ctx.select(select)
      await bot.waitForTicks(14)                 // the heal's heart blink is over by the cut
      for (let i = 0; ; i++) {
        ctx.mark('cut')
        bot.chat(`/tp @s ${X} ${Y} ${Z} ${yawDeg} ${pitchDeg}`)
        for (let w = 0; w < 10 && bot.entity.position.distanceTo(new Vec3(X, Y, Z)) > 0.1; w++) await bot.waitForTicks(1)
        await bot.waitForTicks(1)
        if (bot.entity.position.distanceTo(new Vec3(X, Y, Z)) < 0.15) break
        if (i === 4) throw new Error('teleport did not stick')
      }
    },
    // move toward a world direction whatever way I'm looking (the forward/back/left/right combination
    // pointing closest to it)
    steer (dirX, dirZ) {
      const yaw = bot.entity.yaw
      const fw = [-Math.sin(yaw), -Math.cos(yaw)], lf = [-Math.sin(yaw + Math.PI / 2), -Math.cos(yaw + Math.PI / 2)]
      let best = null
      for (const f of [-1, 0, 1]) {
        for (const l of [-1, 0, 1]) {
          if (!f && !l) continue
          const vx = f * fw[0] + l * lf[0], vz = f * fw[1] + l * lf[1]
          const d = (vx * dirX + vz * dirZ) / Math.hypot(vx, vz)
          if (!best || d > best.d) best = { f, l, d }
        }
      }
      bot.setControlState('forward', best.f === 1); bot.setControlState('back', best.f === -1)
      bot.setControlState('left', best.l === 1); bot.setControlState('right', best.l === -1)
    },
    angTo (q) { const e = bot.entity.position.offset(0, 1.62, 0), d = q.minus(e); return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))] },
    lerpLook (yaw, pitch, f) {                   // one tick of a smooth follow
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      bot.look(bot.entity.yaw + dy * f, bot.entity.pitch + (pitch - bot.entity.pitch) * f, true)
    },
    // follow a target (Vec3 or () => Vec3) with the eyes for n ticks, or until done() says stop
    async follow (target, n, f = 0.25, done = () => false, pitchOff = 0) {
      for (let w = 0; w < n && !done(); w++) {
        const q = typeof target === 'function' ? target() : target
        if (q) { const [ya, pa] = k.angTo(q); k.lerpLook(ya, pa + pitchOff, f) }
        await bot.waitForTicks(1)
      }
    },
    mob (name) { return Object.values(bot.entities).find(e => e.name === name) }
  }
  return k
}

module.exports = { edit, kit, ROLES }
