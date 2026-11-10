// docs/STANDARDS.md must keep up with the owner's rule history (docs/stories.md "House rules" + story-make's owner
// sections): every history rule cited by key, none dated after the "Updated:" stamp. Run: npm test
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const S = require('../standards')
const ROOT = path.join(__dirname, '..', '..', '..')

test('STANDARDS.md cites every house rule and is not older than the newest one', () => {
  const r = S.syncReport(ROOT)
  assert.ok(r.updated, 'docs/STANDARDS.md needs an "Updated: YYYY-MM-DD" line')
  const msg = [...r.uncited.map(x => `not cited: r:${x.key} ${x.file}:${x.line} ${x.plain.slice(0, 120)}`),
    ...r.newer.map(x => `dated ${x.date}, after Updated: ${r.updated}: r:${x.key} ${x.file}:${x.line}`)].join('\n')
  assert.ok(r.ok, `docs/STANDARDS.md is behind docs/stories.md: fold each rule in (standard, number, check, r:<key>) and bump "Updated:"\n${msg}`)
})

test('the history parses (the docs layout still matches lib/hb/standards.js RULE_SOURCES)', () => {
  const { rules } = S.readRules(ROOT)
  assert.ok(rules.length >= 5 && rules.filter(r => r.date).length >= 3, `only ${rules.length} rules parsed`)
  assert.strictEqual(new Set(rules.map(r => r.key)).size, rules.length, 'two rules share a key')
})

// a copy of the docs with one more owner rule: the check must catch it
function fixture (extraRule, stamp) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-std-'))
  for (const f of ['docs/stories.md', '.claude/skills/story-make/SKILL.md', 'docs/STANDARDS.md']) {
    fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true })
    fs.copyFileSync(path.join(ROOT, f), path.join(d, f))
  }
  if (extraRule) {
    const p = path.join(d, 'docs/stories.md')
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^## House rules.*\n\n/m, (m) => m + `- **Owner, ${extraRule}**\n`))
  }
  if (stamp) {
    const p = path.join(d, 'docs/STANDARDS.md')
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^Updated:.*$/m, `Updated: ${stamp}`))
  }
  return d
}

test('a new owner rule not in STANDARDS.md fails the check', () => {
  const d = fixture('2099-01-01: "every story needs a llama."')
  const r = S.syncReport(d)
  assert.strictEqual(r.ok, false)
  assert.ok(r.uncited.some(x => /llama/.test(x.plain)), 'the new rule is reported as not cited')
  assert.ok(r.newer.some(x => /llama/.test(x.plain)), 'and as newer than the stamp')
  fs.rmSync(d, { recursive: true, force: true })
})

test('a stamp older than the newest rule fails the check', () => {
  const d = fixture(null, '2026-01-01')
  const r = S.syncReport(d)
  assert.strictEqual(r.ok, false)
  assert.ok(r.newer.length > 0)
  fs.rmSync(d, { recursive: true, force: true })
})
