// Format "fakemod" (docs/formats.md; STANDARDS r:rd551de): normal gameplay, then a fake mod's permission popup at
// the key moment ("A Creeper is asking for permission to explode": Allow / Deny / Roll), and the choice plays out with
// real game mechanics. The popup is an edit overlay (scripts/popup.py: our own Minecraft-style GUI); this file is the
// stunt side: it times the popup in the recording and freezes the asking mob while it waits for an answer.
//
//   const FM = require('../lib/fakemod')
//   // in perform: the mob stops (NoAI: it's waiting for permission), the popup opens, the cursor hovers, clicks,
//   // (Roll: the slot steps ALLOW / DENY and lands), it closes. The bot holds its view the whole time (a screen is open).
//   await FM.ask(ctx, { k: 1, tag: 'fm_zombie', hover: ['Deny'], entity: zombie, A })   // A: lib/act.js (frames the mob)
//   await FM.ask(ctx, { k: 3, tag: 'fm_creeper', hover: ['Deny', 'Roll'], roll: 'Allow' })
//   // in the stunt's edit: popup: [FM.popup({ k: 1, mob: 'zombie', text: [...], pick: 'Deny', ... }), ...]
//
// Every popup leaves marks fm<k>_open, fm<k>_hover + fm<k>_hover<i> (one per hovered button), fm<k>_click, fm<k>_roll + fm<k>_roll<i> (each slot step),
// fm<k>_result and fm<k>_close: ./hb check's held-frame check, pace and the overlay all read the same marks. The
// sounds are the game's own (ui.toast.in, ui.button.click, note block hats), in the game track.

const OPEN_T = 12       // ticks from the popup opening to the cursor on the first button
const HOVER_T = 10      // ticks resting on / gliding between buttons
const CLICK_T = 8       // ticks from the click to the popup closing (a plain pick)
const ROLL = [2, 2, 2, 3, 3, 4, 5, 6, 7]   // ticks between the roll's steps: fast, then slowing onto the result
const RESULT_T = 12     // ticks the landed result holds before the popup closes

function sel (tag) { return `@e[tag=${tag},limit=1]` }

async function freeze (ctx, tag, on = true) {
  await ctx.cmd(`/data merge entity ${sel(tag)} {NoAI:${on ? 1 : 0}b}`)
}

// The popup sits centred in the game view (owner r:r7ef6ec), so the mob it is about is framed just UNDER it: the
// point to look at so the mob's top lands GAP (fraction of the view's height) below the view's centre. The game view
// is the full height of the window, so its vertical field of view is the camera's (70 deg). GAP 0.155: half the
// scale-3 panel (249 px of 1011 = 0.123) plus a small margin.
const VFOV = 70, GAP = 0.155
// the gap for a popup at GUI scale `scale` (the panel is ~83 GUI px tall): half of it plus a margin
const gapFor = (scale = 3) => 83 * scale / 1011 / 2 + 0.032
function framePoint (ctx, ent, gap = GAP) {
  const { bot, Vec3 } = ctx
  const eye = bot.entity.position.offset(0, 1.62, 0)
  const top = ent.position.offset(0, ent.height ?? 1.8, 0)
  const d = Math.hypot(top.x - eye.x, top.z - eye.z)
  const below = Math.atan(2 * gap * Math.tan(VFOV / 2 * Math.PI / 180))   // the angle from the centre down to the mob's top
  const up = Math.atan2(top.y - eye.y, d) + below
  return new Vec3(top.x, eye.y + d * Math.tan(up), top.z)
}

async function ask (ctx, o) {
  const { bot } = ctx
  const k = o.k
  const hover = o.hover || [o.pick || 'Deny']
  if (o.tag && o.freeze !== false) await freeze(ctx, o.tag, true)   // it stops: waiting for an answer
  if (o.entity && o.A) await o.A.turnTo(framePoint(ctx, o.entity, o.gap ?? gapFor(o.scale)), { max: 30 })   // the mob under the centred popup
  ctx.mark(`fm${k}_open`); ctx.mark('gui_freeze')   // a screen is open: the view holds by rule (renderer/lint.js)
  ctx.sound('ui.toast.in', 1, 1)
  await bot.waitForTicks(OPEN_T)
  for (let i = 0; i < hover.length; i++) {
    ctx.mark(`fm${k}_hover`, { button: hover[i] }); ctx.mark(`fm${k}_hover${i}`)   // numbered too: the held check reads first marks
    await bot.waitForTicks(HOVER_T)
  }
  ctx.mark(`fm${k}_click`, { button: hover[hover.length - 1] })
  ctx.sound('ui.button.click', 1, 1)
  if (o.roll) {
    for (let i = 0; i < ROLL.length; i++) {
      await bot.waitForTicks(ROLL[i])
      ctx.mark(`fm${k}_roll`); ctx.mark(`fm${k}_roll${i}`)
      ctx.sound('block.note_block.hat', 0.9, 1.2 + i * 0.05)
    }
    ctx.mark(`fm${k}_result`, { result: o.roll })
    ctx.sound(o.roll === 'Allow' ? 'block.note_block.pling' : 'block.note_block.bass', 1, o.roll === 'Allow' ? 1.4 : 0.7)
    await bot.waitForTicks(RESULT_T)
  } else {
    await bot.waitForTicks(CLICK_T)
  }
  ctx.mark(`fm${k}_close`); ctx.mark('gui_thaw')
}

// the edit entry for popup k (scripts/popup.py): o.mob (spawn egg), o.text / o.done (segments: 'plain' or
// ['word', 'red']), o.pick, o.hover, o.roll ('Allow' | 'Deny'), o.buttons, o.y, o.title, o.tag
function popup (o) {
  const k = o.k
  const e = {
    at: [`fm${k}_open`, `fm${k}_click`, `fm${k}_close`],
    marks: [],
    mob: o.mob,
    title: o.title || 'Permission Request',
    tag: o.tag || 'MobPerms',
    text: o.text,
    buttons: o.buttons || [['Allow', 'green'], ['Deny', 'red'], ['Roll', 'yellow']],
    pick: o.roll ? 'Roll' : (o.pick || 'Deny'),
    hover: o.hover || [o.roll ? 'Roll' : (o.pick || 'Deny')]
  }
  e.marks = e.hover.map((_, i) => `fm${k}_hover${i}`).concat(o.roll ? ROLL.map((_, i) => `fm${k}_roll${i}`) : [])
  if (o.done) e.done = o.done
  if (o.roll) e.roll = { ticks: `fm${k}_roll`, at: `fm${k}_result`, result: o.roll }
  if (o.y !== undefined) e.y = o.y
  if (o.scale !== undefined) e.scale = o.scale
  return e
}

module.exports = { ask, popup, freeze, framePoint, gapFor, OPEN_T, HOVER_T, CLICK_T, ROLL, RESULT_T }
