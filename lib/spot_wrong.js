// "Spot what's wrong" (worker 12): a series of interactive Shorts. Each round cuts to a normal-looking
// build with ONE wrong block hidden in it, a countdown ticks while the camera looks the build over
// (a slow walk past it or a scan around a room: the viewer's own search), then the camera snaps to
// the mistake and a sharp FOV push-in (stunt.fovZoom) reveals it, with a red ring (edit.ring) and the
// answer as a subtitle. Rounds escalate (easy -> medium -> "only 1% can find it") and each one is a
// new setting. A round can have a follow-up reveal ("wait, there's another one").
//
// A stunt module calls spotWrong({ name, caption, rounds: [...] }) where each round is
//   { at: [dx, dz]             set origin offset from the field centre (sets ~45 blocks apart)
//     build (b)                commands for the set, in local coordinates: b.set(x, y, z, state),
//                              b.fill(x0, y0, z0, x1, y1, z1, state). y 0 is the first air layer
//                              above the grass; the grass is y -1.
//     cam: { pos: [x, z], look: [x, y, z], speed, walk: 'right'|'left'|'forward'|null }
//     scan: [[sec, [x, y, z]], ...]   where the camera looks over time (eased; the search)
//     seconds                  the countdown
//     tag, hint: [sec, text]   subtitles: the round's difficulty and a mid-round hint
//     reveals: [{ at: [x, y, z], zoom, label, sub, strafe }]  the mistake(s), in order }
// All set-building happens in setup(), before the recording, with the bot in creative out of shot.
const SEC = 20

function spotWrong (opt) {
  const R = opt.rounds
  // fovZoom windows, in recording time, from the marks perform() writes
  const fovZoom = []
  R.forEach((r, i) => r.reveals.forEach((v, j) => fovZoom.push([`zoom${i + 1}_${j + 1}`, `zoom${i + 1}_${j + 1}_end`, v.zoom || 3])))
  const lastR = R.length, lastV = R[R.length - 1].reveals.length
  const subs = []
  R.forEach((r, i) => {
    if (r.tag) subs.push([`round${i + 1}`, r.tag, r.hint ? r.hint[0] : r.seconds])
    if (r.hint) subs.push([`hint${i + 1}`, r.hint[1], r.seconds - r.hint[0]])
    r.reveals.forEach((v, j) => {
      if (v.pre) subs.push([`pre${i + 1}_${j + 1}`, v.pre, 1.2])
      subs.push([`reveal${i + 1}_${j + 1}`, v.sub, 3])
    })
  })
  const mod = {
    name: opt.name,
    biome: opt.biome || 'minecraft:plains',
    time: opt.time ?? 6000,
    botTimeout: 420,
    fovZoom,
    caption: opt.caption,
    edit: Object.assign({
      caption: opt.caption,
      song: 'songs/funk_abnormal.mp3',
      dropAt: `reveal${lastR}_${lastV}`,
      startAt: 'round1:0',
      endAfter: `reveal${lastR}_${lastV}:${opt.tail ?? 1.0}`,
      subs,
      subsY: 0.75,
      counter: { at: R.map((r, i) => `round${i + 1}`), total: R.length },
      // the red ring over the mistake (screen space, on the crosshair), up until the cut
      ring: R.flatMap((r, i) => r.reveals.map((v, j) => [`zoom${i + 1}_${j + 1}:0.2`, (v.hold || 1.5) - 0.2 + (i === R.length - 1 && j === r.reveals.length - 1 ? 0.5 : 0), 0.5, 0.5, v.ring || 120])),
      countdowns: R.map((r, i) => [`round${i + 1}`, `time_up${i + 1}`, null, null, 1.0, 0.13]),   // centre-top: the middle is what the viewer searches
      sfx: R.flatMap((r, i) => [['whoosh', `round${i + 1}`]].concat(r.reveals.map((v, j) => ['impact', `zoom${i + 1}_${j + 1}`]))).slice(1)
    }, opt.edit || {}),

    async setup (ctx) {
      const { bot } = ctx
      if (opt.searchFrom) {   // a site away from spawn (the nearest plains backs onto snowy mountains)
        await ctx.cmd(`/tp @s ${opt.searchFrom[0]} 200 ${opt.searchFrom[1]}`); await bot.waitForTicks(40)
        await ctx.locateBiome(opt.biome || 'minecraft:plains')
      }
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land')
      const { x, z, y: floor } = g
      this.x = x; this.z = z; this.floor = floor
      await ctx.defaultRules()
      for (const c of ['/gamerule random_tick_speed 0', '/gamerule log_admin_commands false', '/difficulty peaceful']) await ctx.cmd(c)
      await ctx.cmd(`/forceload add ${x - 90} ${z - 60} ${x + 90} ${z + 50}`)
      const fillBig = async (x0, y0, z0, x1, y1, z1, block) => {
        const per = Math.max(1, Math.floor(32768 / ((y1 - y0 + 1) * (z1 - z0 + 1))))
        for (let xa = x0; xa <= x1; xa += per) { bot.chat(`/fill ${xa} ${y0} ${z0} ${Math.min(x1, xa + per - 1)} ${y1} ${z1} ${block}`); await new Promise(r => setTimeout(r, 900)) }
      }
      // one wide flat clearing for all the sets (its edge out in the fog)
      for (let y0 = floor + 1; y0 <= floor + 40; y0 += 8) await fillBig(x - 85, y0, z - 60, x + 85, y0 + 7, z + 45, 'air')
      await fillBig(x - 85, floor, z - 60, x + 85, floor, z + 45, 'grass_block')
      await fillBig(x - 85, floor - 4, z - 60, x + 85, floor - 1, z + 45, 'dirt')
      for (const r of R) {
        const ox = x + r.at[0], oy = floor + 1, oz = z + r.at[1]
        const cmds = []
        const b = {
          set: (lx, ly, lz, s) => cmds.push(`/setblock ${ox + lx} ${oy + ly} ${oz + lz} ${s}`),
          fill: (x0, y0, z0, x1, y1, z1, s) => cmds.push(`/fill ${ox + x0} ${oy + y0} ${oz + z0} ${ox + x1} ${oy + y1} ${oz + z1} ${s}`)
        }
        r.build(b)
        for (const c of cmds) { bot.chat(c); await bot.waitForTicks(1) }
        await bot.waitForTicks(10)
      }
      await ctx.cmd('/attribute @s minecraft:movement_speed base set 0.03')   // a slow, searching walk
      await ctx.hotbar(opt.hotbar || ['iron_pickaxe', 'oak_planks', 'torch', 'bread'])
      ctx.select(0)
      const r0 = R[0]
      const p0 = this.camPos(r0)
      const [yw, pt] = this.aimDeg(p0, this.world(r0, r0.scan[0][1]))
      await ctx.tpCheck(p0.x, p0.y, p0.z, yw, pt)
      await ctx.cmd('/gamemode survival')
      await bot.waitForTicks(20)
      return { x, y: floor, z }
    },

    world (r, p) { return { x: this.x + r.at[0] + p[0], y: this.floor + 1 + p[1], z: this.z + r.at[1] + p[2] } },
    camPos (r) { return { x: this.x + r.at[0] + r.cam.pos[0], y: this.floor + 1, z: this.z + r.at[1] + r.cam.pos[1] } },
    // vanilla /tp angles (yaw 0 = south, 90 = west) from an eye at p (feet) to q
    aimDeg (p, q) {
      const dx = q.x - p.x, dy = q.y - (p.y + 1.62), dz = q.z - p.z
      return [-Math.atan2(dx, dz) * 180 / Math.PI, -Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI]
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const self = this
      let aim = null, target = null, k = 0.12
      const steer = () => {
        if (!target) return
        if (!aim) aim = target.clone()
        aim = aim.plus(target.minus(aim).scaled(k))
        const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
        bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      }
      bot.on('physicsTick', steer)
      const V = (p) => new Vec3(p.x, p.y, p.z)
      const stopWalk = () => { for (const c of ['left', 'right', 'forward', 'back']) bot.setControlState(c, false) }
      const ticks = (n) => bot.waitForTicks(n)
      // a slow, searching walk: prismarine-physics ignores the server's movement_speed update on
      // 1.21.11 (the bot walked at full speed into the builds), so set the attribute it reads too
      const slow = () => { bot.entity.attributes = bot.entity.attributes || {}; bot.entity.attributes['minecraft:movement_speed'] = { value: opt.walkSpeed || 0.03, modifiers: [] } }
      slow()

      for (let i = 0; i < R.length; i++) {
        const r = R[i], n = i + 1
        if (i > 0) {
          // a hard cut to the next set, already aimed at its first scan point
          stopWalk()
          const p = self.camPos(r)
          const q = self.world(r, r.scan[0][1])
          const [yw, pt] = self.aimDeg(p, q)
          target = null
          bot.chat(`/tp @s ${p.x + 0.5} ${p.y} ${p.z + 0.5} ${yw.toFixed(1)} ${pt.toFixed(1)}`)
          await ticks(2)
          aim = null
        }
        target = V(self.world(r, r.scan[0][1])); k = 0.12; aim = target.clone()
        ctx.mark('cut'); ctx.mark(`round${n}`); ctx.mark('round', { n })
        slow()
        if (r.cam.walk) bot.setControlState(r.cam.walk, true)
        // the search: the countdown ticks every second while the camera looks the build over
        const total = r.seconds * SEC
        let si = 0
        for (let t = 0; t < total; t++) {
          if (t % SEC === 0) {
            const left = r.seconds - t / SEC
            ctx.mark('tick', { left }); ctx.mark(`t${n}_${left}`)
            ctx.sound(left <= 3 ? 'block.note_block.pling' : 'block.note_block.hat', left <= 3 ? 0.5 : 0.7, left <= 3 ? 1.4 : 1.0)
          }
          if (r.hint && t === r.hint[0] * SEC) ctx.mark(`hint${n}`)
          if (r.stopAt && t === r.stopAt * SEC) stopWalk()
          while (si + 1 < r.scan.length && t >= r.scan[si + 1][0] * SEC) si++
          // ease between scan points: the target glides from one to the next over its span
          const a = r.scan[si], b2 = r.scan[si + 1]
          if (b2) {
            const u = Math.min(1, (t - a[0] * SEC) / ((b2[0] - a[0]) * SEC))
            const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
            const pa = self.world(r, a[1]), pb = self.world(r, b2[1])
            target = new Vec3(pa.x + (pb.x - pa.x) * e, pa.y + (pb.y - pa.y) * e, pa.z + (pb.z - pa.z) * e)
          }
          await ticks(1)
        }
        ctx.mark(`time_up${n}`)
        stopWalk()
        // the reveal(s): snap to the mistake, push in, hold with a slow drift, cut
        for (let j = 0; j < r.reveals.length; j++) {
          const v = r.reveals[j], m = `${n}_${j + 1}`
          if (v.pre) { ctx.mark(`pre${m}`); await ticks(Math.round((v.preHold || 0.6) * SEC)) }
          ctx.mark(`reveal${m}`)
          target = V(self.world(r, v.at)); k = 0.3
          ctx.sound('block.note_block.bell', 0.9, j ? 1.2 : 1.0)
          await ticks(3)
          ctx.mark(`zoom${m}`)
          ctx.sound('entity.experience_orb.pickup', 0.8, 0.9)
          if (v.strafe) bot.setControlState(v.strafe, true)
          const hold = Math.round((v.hold || 1.5) * SEC)
          const drift = v.drift || [0, 0.12, 0]
          const t0 = V(self.world(r, v.at))
          for (let t = 0; t < hold; t++) {
            k = t < 8 ? 0.3 : 0.15
            const u = t / hold
            target = t0.offset(drift[0] * u, drift[1] * u, drift[2] * u)
            await ticks(1)
          }
          stopWalk()
          ctx.mark(`zoom${m}_end`)
        }
      }
      await ticks(Math.round((opt.tail ?? 1.0) * SEC) + 4)
      bot.removeListener('physicsTick', steer)
      // every mistake has to be in the world as designed (a setblock can be refused or updated away)
      let ok = true
      for (const r of R) {
        for (const v of r.reveals) {
          if (!v.check) continue
          const w = self.world(r, v.check[0])
          const bl = bot.blockAt(new Vec3(w.x, w.y, w.z))
          if (!bl || bl.name !== v.check[1]) { ok = false; ctx.log('mistake missing at', v.check[0], 'want', v.check[1], 'got', bl && bl.name) }
        }
      }
      return ok
    }
  }
  return mod
}

module.exports = spotWrong
