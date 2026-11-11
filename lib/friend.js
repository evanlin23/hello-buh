// The "friend" format (owner, 2026-11-11, r:ra64f79: "i think this is like hacking friend? like its a relatable beat,
// just exagerated"): a relatable multiplayer moment from your own point of view (56e, POV), with the friend (an actor
// bot, another player in the server) exaggerated to the absurd: his tree gone in a blink while you are still punching
// your first log, a forest gone, the advancements flooding the chat, a whole house built behind your back.
//
// Your own actions are vanilla and aimed (lib/act.js / the story kit: K.dig, K.walkTo, governed turns, r:rffba12,
// r:r38374d); only the friend's speed is staged (commands while the camera looks on, his arm swinging, the sounds).
// A stunt swaps the content: which trees, which chat lines, what waits behind you.
//
//   const F = require('../lib/friend')
//   setup:    const trees = await F.trees(ctx, A, [{ dx: 0, dz: -1, h: 6 }, ...])      // hand-built oaks, known shapes
//             const bro = await F.friend(ctx, 'bro', { at: [x, y, z], tag: 'bro' })      // the actor bot (stunt.cast skin)
//   perform:  const run = F.timeline(ctx, K, [[18, () => F.vanish(ctx, trees[1], { by: bro })], ...])
//             ...your own vanilla actions (K.dig etc.), the timeline firing on its ticks meanwhile...
//             F.advancement(ctx, 'bro', 'Getting Wood')                                  // the vanilla chat line
// Marks: friend_vanish (a tree gone), friend_chat (a chat line), friend_build (a burst of build noise).

// Java 1.21 advancements a fast player gets on day 1 that are ANNOUNCED in chat (the story tab after its root; the old
// pre-1.12 achievements "Getting Wood", "Benchmarking", "Time to Mine!" are not advancements in Java: independent
// review, friend_new_world round 1). The chat flood's script, in order.
const DAY_ONE = ['Stone Age', 'Getting an Upgrade', 'Acquire Hardware', 'Suit Up', 'Hot Stuff', "Isn't It Iron Pick",
  'Diamonds!', 'Cover Me with Diamonds']

// A hand-built oak (vanilla's oak shape, but known: so it can vanish whole and nothing else with it): a trunk h tall
// from the floor + 1, two wide leaf layers (radius 2, the corners clipped) over the top - 3 and top - 2, a narrow pair
// (radius 1, a plus on the very top). A(dx, dy, dz) -> "x y z" (absolute), the set's floor at dy 0.
// -> { dx, dz, h, box: [x0, y0, z0, x1, y1, z1] (set-relative, inclusive), logs: [[dx, dy, dz], ...] }
async function tree (ctx, A, { dx, dz, h = 5, clip = [1, 1, 1, 1] }) {
  const c = (s) => ctx.cmd(s)
  const top = h   // the top log's dy
  for (const [y, r] of [[top - 2, 2], [top - 1, 2]]) {
    await c(`/fill ${A(dx - r, y, dz - r)} ${A(dx + r, y, dz + r)} oak_leaves[persistent=true]`)
    // clip the corners (clip[i]: corner i off on both wide layers: so neighbouring canopies never share a block)
    const corners = [[-r, -r], [r, -r], [-r, r], [r, r]]
    for (let i = 0; i < 4; i++) if (clip[i] || y === top - 1) await c(`/setblock ${A(dx + corners[i][0], y, dz + corners[i][1])} air`)
  }
  await c(`/fill ${A(dx - 1, top, dz - 1)} ${A(dx + 1, top + 1, dz + 1)} oak_leaves[persistent=true]`)
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) await c(`/setblock ${A(dx + a, top + 1, dz + b)} air`)
  await c(`/fill ${A(dx, 1, dz)} ${A(dx, top, dz)} oak_log[axis=y]`)
  const logs = []
  for (let y = 1; y <= top; y++) logs.push([dx, y, dz])
  return { dx, dz, h, box: [dx - 2, 1, dz - 2, dx + 2, top + 1, dz + 2], logs }
}

async function trees (ctx, A, list) { const out = []; for (const t of list) out.push(await tree(ctx, A, t)); return out }

// A tree gone in a blink: the canopy and the trunk taken off top-down over `ticks` (4), each slice with its break
// sound, its crumbs and the friend's arm swinging; then the pickup pops. Not awaited by the caller's scene (it runs
// on its own ticks). o.by: the friend's bot (swings), o.vol: the sounds' level (distance: 1 near, 0.3 far),
// o.pops: pickup pops after (3). P(dx, dy, dz) -> a Vec3 (absolute).
async function vanish (ctx, K, P, t, o = {}) {
  const { bot } = ctx
  const ticks = o.ticks ?? 4, vol = o.vol ?? 1
  const [x0, y0, z0, x1, y1, z1] = t.box
  ctx.mark('friend_vanish', { dx: t.dx, dz: t.dz })
  for (let k = 0; k < ticks; k++) {
    // slice k of the tree, top first: its rows y from hi down to lo
    const hi = y1 - Math.floor((y1 - y0 + 1) * k / ticks), lo = y1 - Math.floor((y1 - y0 + 1) * (k + 1) / ticks) + 1
    K.say(`/fill ${K.A(x0, lo, z0)} ${K.A(x1, hi, z1)} air replace oak_leaves`)
    K.say(`/fill ${K.A(x0, lo, z0)} ${K.A(x1, hi, z1)} air replace oak_log`)
    const hasLog = lo <= t.h
    ctx.particles('block', P(t.dx + 0.5, Math.min(hi, t.h) + 0.5, t.dz + 0.5), { block: hasLog ? 'oak_log' : 'oak_leaves' })
    ctx.sound(hasLog ? 'block.wood.break' : 'block.grass.break', 0.9 * vol, 0.9 + Math.random() * 0.25)
    if (o.by) o.by.swingArm('right')
    await bot.waitForTicks(1)
  }
  for (let k = 0; k < (o.pops ?? 3); k++) { ctx.sound('entity.item.pickup', 0.45 * vol, 1.4 + Math.random() * 0.6); await bot.waitForTicks(2) }
}

// the vanilla chat line a player's advancement gets ("bro has made the advancement [Stone Age]"): edit.py draws
// `chat` marks (each held `hold` s). At a phone-readable chat scale (edit.chatScale 5) the line is wider than the
// 1080 px view, so it wraps as vanilla's chat wraps a long line: the template, then the name on its own line below.
function advancement (ctx, who, name, hold = 2.0) {
  const head = `${who} has made the advancement`, tail = `[${name}]`
  ctx.mark('chat', { text: head, color: 'white', hold })
  ctx.mark('chat', { text: tail, color: 'white', hold })
  ctx.mark('friend_chat', { who, name })
  return `${head} ${tail}`
}

// Someone building out of view: a burst of placing sounds (the wood and stone of a house), `n` of them every `every`
// ticks at volume `vol` (rising when vol is [a, b]). Awaited per burst; mark friend_build.
async function buildNoise (ctx, { n = 6, every = 2, vol = 0.5, mats = ['wood', 'stone', 'wood', 'glass'] } = {}) {
  ctx.mark('friend_build', { n })
  const [a, b] = Array.isArray(vol) ? vol : [vol, vol]
  for (let i = 0; i < n; i++) {
    ctx.sound(`block.${mats[i % mats.length]}.place`, a + (b - a) * i / Math.max(1, n - 1), 0.8 + Math.random() * 0.2)
    await ctx.bot.waitForTicks(every)
  }
}

// The friend: one actor bot (lib/movie.js spawnActors; its skin from stunt.cast[name]), tagged for the story kit
// (K.actor(tag, ...) moves him every tick), immune, at `at` (absolute feet) facing yaw (Minecraft degrees).
async function friend (ctx, name, { at, yaw = 0, tag = name, gear = null } = {}) {
  const M = require('./movie')
  const cast = await M.spawnActors(ctx, [name])
  await ctx.cmd(`/gamemode survival ${name}`)
  await ctx.cmd(`/effect give ${name} resistance infinite 4 true`)
  await ctx.cmd(`/tag ${name} add ${tag}`)
  if (at) await M.place(ctx, name, at[0], at[1], at[2], yaw, 0)
  await dress(ctx, name, gear || {})   // always: an actor bot keeps its gear from the last run on a shared server
  return cast[name]
}

// a full armour set and the main hand: tier 'iron' / 'diamond' / 'netherite' / null (none); hand an item id or null
async function dress (ctx, name, { tier = null, hand = null } = {}) {
  const slots = [['head', 'helmet'], ['chest', 'chestplate'], ['legs', 'leggings'], ['feet', 'boots']]
  for (const [s, p] of slots) await ctx.cmd(`/item replace entity ${name} armor.${s} with ${tier ? `${tier}_${p}` : 'air'}`)
  await ctx.cmd(`/item replace entity ${name} weapon.mainhand with ${hand || 'air'}`)
}

// Events on ticks while the stunt's own actions run: [[tick, fn], ...] from now (fn may be async: not awaited, so a
// vanish or a build burst runs alongside). -> { stop, at (the start tick), done (a promise: every event fired) }
function timeline (ctx, K, events) {
  const t0 = ctx.tick
  const todo = [...events].sort((a, b) => a[0] - b[0])
  let resolve
  const done = new Promise(r => { resolve = r })
  const stop = K.every(() => {
    while (todo.length && ctx.tick - t0 >= todo[0][0]) {
      const [, fn] = todo.shift()
      Promise.resolve().then(fn).catch(e => ctx.log(`friend.timeline: ${e && e.message}`))
    }
    if (!todo.length) { stop(); resolve() }
  })
  return { stop, at: t0, done }
}

module.exports = { DAY_ONE, tree, trees, vanish, advancement, buildNoise, friend, dress, timeline }
