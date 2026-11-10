// The owner's rules, two views (docs/STANDARDS.md "How this file is kept"):
//   readRules()      the dated history: docs/stories.md "House rules" + story-make's owner sections, parsed live.
//                    Every rule gets a short key (r + 6 hex of its first 100 letters/digits), stable while its
//                    opening words stay the same.
//   readStandards()  docs/STANDARDS.md: the current, de-duplicated checklist. Its "Updated:" stamp and the rule keys
//                    it cites ([r:abc123], in a standard's source or in "Superseded") say which history it covers.
//   syncReport()     which history rules STANDARDS.md doesn't cite yet (a new owner rule), and any rule dated after
//                    its stamp. `./hb rules` prints it; lib/hb/test/standards.test.js fails on it.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ROOT = path.join(__dirname, '..', '..')

const RULE_SOURCES = [
  ['docs/stories.md', /^## House rules/],
  ['.claude/skills/story-make/SKILL.md', /^## (The format|Rules|Voice structure)/]
]
const STANDARDS = 'docs/STANDARDS.md'

const plain = (t) => t.replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
const ruleKey = (text) => 'r' + crypto.createHash('sha1').update(plain(text).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 100)).digest('hex').slice(0, 6)

function readRules (root = ROOT) {
  const rules = []
  for (const [file, head] of RULE_SOURCES) {
    const p = path.join(root, file)
    if (!fs.existsSync(p)) continue
    const lines = fs.readFileSync(p, 'utf8').split('\n')
    let on = false, section = '', cur = null, para = null, n = 0
    const push = (r) => { if (r && r.text.trim()) rules.push(r) }
    for (const ln of lines) {
      n++
      if (/^#{1,2} /.test(ln)) { push(cur); push(para); cur = para = null; on = head.test(ln); section = ln.replace(/^#+ /, ''); continue }
      if (!on) continue
      const secDate = (/(\d{4}-\d{2}-\d{2})/.exec(section) || [])[1] || null
      if (/^- /.test(ln)) { push(cur); push(para); para = null; cur = { file, line: n, section, text: ln.slice(2), sub: [], secDate }; continue }
      if (/^\s+\d+\. /.test(ln) && cur) { cur.sub.push(ln.trim()); continue }
      if (/^\s+\S/.test(ln) && cur) { if (cur.sub.length) cur.sub[cur.sub.length - 1] += ' ' + ln.trim(); else cur.text += ' ' + ln.trim(); continue }
      if (!ln.trim()) { push(para); para = null; continue }
      if (!cur || para) { if (!para) { push(cur); cur = null; para = { file, line: n, section, text: '', sub: [], secDate } } para.text += (para.text ? ' ' : '') + ln.trim() } else { push(cur); cur = null; para = { file, line: n, section, text: ln.trim(), sub: [], secDate } }
    }
    push(cur); push(para)
  }
  for (const r of rules) {
    r.date = (/(\d{4}-\d{2}-\d{2})/.exec(r.text) || [])[1] || r.secDate || null
    r.plain = plain(r.text); r.sub = r.sub.map(plain)
    r.key = ruleKey(r.text)
  }
  const id = crypto.createHash('sha1').update(rules.map(r => r.plain + r.sub.join('')).join('\n')).digest('hex').slice(0, 10)
  const newest = rules.map(r => r.date).filter(Boolean).sort().pop() || null
  return { rules, id, newest }
}

function readStandards (root = ROOT) {
  const p = path.join(root, STANDARDS)
  if (!fs.existsSync(p)) return null
  const text = fs.readFileSync(p, 'utf8')
  const m = /^Updated:\s*(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/m.exec(text)
  const cites = new Set((text.match(/\br:(r[0-9a-f]{6})\b/g) || []).map(s => s.slice(2)))
  return { path: p, text, updated: m ? m[1] : null, updatedTime: m ? m[2] || null : null, cites }
}

// what STANDARDS.md is missing: history rules it doesn't cite, rules dated after its stamp (both fail), and keys it
// cites that don't exist here (a warning: a rule whose opening was edited, or one still on its way to main from a
// branch, like agent/speakers' speaker-check rule)
function syncReport (root = ROOT) {
  const { rules, id, newest } = readRules(root)
  const st = readStandards(root)
  if (!st) return { ok: false, error: `no ${STANDARDS}`, rules: rules.length, id, newest }
  const keys = new Set(rules.map(r => r.key))
  const uncited = rules.filter(r => !st.cites.has(r.key))
  const newer = rules.filter(r => r.date && st.updated && r.date > st.updated)
  const stale = [...st.cites].filter(k => !keys.has(k))
  const ok = !!st.updated && !uncited.length && !newer.length
  return { ok, updated: st.updated, id, newest, rules: rules.length, uncited, newer, stale }
}

module.exports = { RULE_SOURCES, STANDARDS, readRules, readStandards, syncReport, ruleKey, plain }
