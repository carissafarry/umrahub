// node --test factory/driver.test.mjs
// Runs the driver against fake `claude`, `gh`, `git` and `npm` shims on PATH, so nothing costs money.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const DRIVER = join(dirname(fileURLToPath(import.meta.url)), 'driver.mjs')

const CLAUDE = `#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path')
const args = process.argv.slice(2)
const prompt = fs.readFileSync(0, 'utf8')
const agent = args[args.indexOf('--agent') + 1]
const resume = args.includes('--resume') ? args[args.indexOf('--resume') + 1] : null
const env = process.env
fs.appendFileSync(env.FAKE_LOG, JSON.stringify({ tool: 'claude', agent, resume, args, prompt }) + '\\n')
const out = (extra = {}) => console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'done',
  session_id: resume || 'sess-' + agent + '-' + Date.now() + Math.random().toString(16).slice(2, 6), num_turns: 3, duration_ms: 1234,
  total_cost_usd: 0.5, usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 100, cache_creation_input_tokens: 1000 },
  modelUsage: { 'claude-fake-1': {} }, permission_denials: [], ...extra }))
if (env.FAKE_FAIL === agent) { out({ subtype: 'error_during_execution', is_error: true }); process.exit(1) }
if (env.FAKE_EMPTY === agent) { out({ result: '' }); process.exit(0) }
const dir = (prompt.match(/Job folder: (\\S+?)\\/\\./) || prompt.match(/reviews are in (\\S+?)\\/round-/))[1]
const round = Number((prompt.match(/(?:Review round|Final round:) (\\d+)/) || [])[1] || 0)
const w = (f, text) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text) }
const verdicts = JSON.parse(env.FAKE_VERDICTS || '{}') // { "<round>": { ux: "CHANGES" } }
if (agent === 'spec-writer') w('spec.md', '# Spec\\n')
else if (agent === 'builder') {
  const status = env.FAKE_BUILD_STATUS || 'READY'
  w('build.md', 'STATUS: ' + status + '\\n\\nBuilt it.\\n' + (env.FAKE_ROUTE ? 'Preview route: ' + env.FAKE_ROUTE + '\\n' : ''))
} else if (agent.startsWith('reviewer-')) {
  const key = agent.slice(9)
  w('round-' + round + '/review-' + key + '.md', 'VERDICT: ' + ((verdicts[round] || {})[key] || 'PASS') + '\\n')
} else if (agent === 'approver') w('decision.md', (env.FAKE_DECISION || 'APPROVE') + '\\n\\nWhy: fine.\\n')
out()
`

const GH = `#!/usr/bin/env node
const fs = require('node:fs')
const a = process.argv.slice(2)
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'gh', args: a }) + '\\n')
if (a[0] === 'pr' && a[1] === 'list') console.log('[]')
if (a[0] === 'pr' && a[1] === 'create') console.log('https://github.com/carissafarry/umrahub/pull/42')
`

const GIT = `#!/usr/bin/env node
require('node:fs').appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'git', args: process.argv.slice(2) }) + '\\n')
`

// "npm run dev -- --port N" becomes a tiny http server on N.
const NPM = `#!/usr/bin/env node
const a = process.argv.slice(2)
require('node:http').createServer((q, r) => r.end('ok')).listen(Number(a[a.indexOf('--port') + 1]), '127.0.0.1')
`

async function setup(id, { stage = 'spec', round = 0, spec = false } = {}) {
  const base = await mkdtemp(join(tmpdir(), 'driver-test-'))
  const root = join(base, 'repo')
  const wt = join(base, 'repo-factory', id)
  const bin = join(base, 'bin')
  const dir = join(root, 'factory/jobs', id)
  await mkdir(dir, { recursive: true })
  await mkdir(wt, { recursive: true })
  await mkdir(bin)
  for (const [name, src] of [['claude', CLAUDE], ['gh', GH], ['git', GIT], ['npm', NPM]]) {
    await writeFile(join(bin, name), src)
    await chmod(join(bin, name), 0o755)
  }
  const job = { id, feature: 'Do the thing', branch: `factory/${id}`, worktree: wt, stage, round,
    reviews: { security: 'pending', ux: 'pending', ui: 'pending', code: 'pending' } }
  await writeFile(join(dir, 'job.json'), JSON.stringify(job))
  if (spec) await writeFile(join(dir, 'spec.md'), '# Spec\n')
  const log = join(base, 'calls.jsonl')
  await writeFile(log, '')
  return { root, dir, wt, bin, log, id, base }
}

function drive(t, args, extraEnv = {}) {
  return new Promise((ok) => {
    const env = { ...process.env, PATH: `${t.bin}:${process.env.PATH}`, FACTORY_REPO_ROOT: t.root, FAKE_LOG: t.log }
    delete env.FACTORY_PERMISSION_MODE
    Object.assign(env, extraEnv)
    execFile('node', [DRIVER, ...args], { env }, (err, stdout, stderr) => ok({ code: err ? err.code : 0, stdout, stderr }))
  })
}

const calls = async (t) => (await readFile(t.log, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l))
const agents = async (t) => (await calls(t)).filter((c) => c.tool === 'claude').map((c) => c.agent)
const jobOf = async (t) => JSON.parse(await readFile(join(t.dir, 'job.json'), 'utf8'))
const usageOf = async (t) => (await readFile(join(t.dir, 'usage.jsonl'), 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l))

test('happy path: spec, build, four reviewers, approver, push, PR with fixed title', async () => {
  const t = await setup('be-901')
  const r = await drive(t, ['run', 'be-901'])
  assert.equal(r.code, 0, r.stdout + r.stderr)
  const a = await agents(t)
  assert.equal(a[0], 'spec-writer')
  assert.equal(a[1], 'builder')
  assert.deepEqual(a.slice(2, 6).sort(), ['reviewer-code', 'reviewer-security', 'reviewer-ui', 'reviewer-ux'])
  assert.equal(a[6], 'approver')
  const job = await jobOf(t)
  assert.equal(job.stage, 'pr')
  assert.equal(job.pr, 'https://github.com/carissafarry/umrahub/pull/42')
  assert.equal(job.round, 1)
  assert.deepEqual(Object.values(job.reviews), ['PASS', 'PASS', 'PASS', 'PASS'])
  assert.equal(job.worktree, t.wt)
  const all = await calls(t)
  const push = all.find((c) => c.tool === 'git')
  assert.deepEqual(push.args, ['-C', t.wt, 'push', '-u', 'origin', 'factory/be-901'])
  const gh = all.filter((c) => c.tool === 'gh').map((c) => c.args.join(' '))
  assert.ok(gh.some((s) => s.includes('pr create') && s.includes('--title Merge PR #0 from /factory/be-901')))
  assert.ok(gh.some((s) => s.includes('api -X PATCH repos/carissafarry/umrahub/pulls/42 -f title=Merge PR #42 from /factory/be-901')))
  assert.ok(!gh.some((s) => s.includes('merge')))
  const body = await readFile(join(t.dir, 'pr-body.md'), 'utf8')
  assert.match(body, /Built it/)
  assert.doesNotMatch(body + JSON.stringify(all), /Co-Authored|Generated with/i)
})

test('prompts and flags follow SKILL.md; never skips permissions', async () => {
  const t = await setup('be-902', { spec: true })
  await drive(t, ['run', 'be-902'])
  const cs = (await calls(t)).filter((c) => c.tool === 'claude')
  const builder = cs.find((c) => c.agent === 'builder')
  assert.equal(builder.prompt, `Job folder: ${t.dir}/. Worktree: ${t.wt}. Branch: factory/be-902. Build round 1. Port: ${5100 + 10 * 902}. Task code: be-902.`)
  const ux = cs.find((c) => c.agent === 'reviewer-ux')
  assert.match(ux.prompt, new RegExp(`Review round 1\\. Port: ${5101 + 10 * 902}\\. Task code: be-902\\.$`))
  assert.match(cs.find((c) => c.agent === 'approver').prompt, /Final round: 1\./)
  for (const c of cs) {
    assert.ok(!c.args.includes('--dangerously-skip-permissions'))
    assert.equal(c.args[c.args.indexOf('--permission-mode') + 1], 'acceptEdits')
    assert.ok(c.args.includes('--add-dir'))
    assert.equal(c.args[c.args.indexOf('--output-format') + 1], 'json')
  }
  assert.ok(!cs.some((c) => c.agent === 'spec-writer'))
})

test('permission mode: env var, CLI flag wins, bypassPermissions refused', async () => {
  let t = await setup('be-903', { spec: true })
  await drive(t, ['run', 'be-903'], { FACTORY_PERMISSION_MODE: 'plan' })
  assert.equal((await calls(t))[0].args[(await calls(t))[0].args.indexOf('--permission-mode') + 1], 'plan')
  t = await setup('be-904', { spec: true })
  await drive(t, ['run', 'be-904', '--permission-mode', 'default'], { FACTORY_PERMISSION_MODE: 'plan' })
  assert.equal((await calls(t))[0].args[(await calls(t))[0].args.indexOf('--permission-mode') + 1], 'default')
  t = await setup('be-905', { spec: true })
  const r = await drive(t, ['run', 'be-905', '--permission-mode', 'bypassPermissions'])
  assert.notEqual(r.code, 0)
  assert.equal((await jobOf(t)).stage, 'needs-human')
  assert.equal((await calls(t)).length, 0)
})

test('slim mode adds the start-up trimming flags only when asked (flag or FACTORY_SLIM=1)', async () => {
  const flags = ['--setting-sources', 'project,local', '--strict-mcp-config', '--disable-slash-commands']
  let t = await setup('be-907', { spec: true })
  await drive(t, ['run', 'be-907'])
  for (const c of (await calls(t)).filter((x) => x.tool === 'claude')) assert.ok(!c.args.includes('--strict-mcp-config'))
  t = await setup('be-908', { spec: true })
  await drive(t, ['run', 'be-908', '--slim'])
  for (const c of (await calls(t)).filter((x) => x.tool === 'claude')) {
    for (const f of flags) assert.ok(c.args.includes(f), `${c.agent} misses ${f}`)
    assert.equal(c.args[c.args.indexOf('--setting-sources') + 1], 'project,local')
    assert.ok(!c.args.includes('--dangerously-skip-permissions'))
  }
  t = await setup('be-909', { spec: true })
  await drive(t, ['run', 'be-909'], { FACTORY_SLIM: '1' })
  assert.ok((await calls(t)).find((x) => x.tool === 'claude').args.includes('--disable-slash-commands'))
})

test('one CHANGES round: same builder session is resumed, then PASS', async () => {
  const t = await setup('be-906', { spec: true })
  const r = await drive(t, ['run', 'be-906'], { FAKE_VERDICTS: JSON.stringify({ 1: { security: 'CHANGES' } }) })
  assert.equal(r.code, 0, r.stdout + r.stderr)
  const cs = (await calls(t)).filter((c) => c.tool === 'claude')
  const builders = cs.filter((c) => c.agent === 'builder')
  assert.equal(builders.length, 2)
  assert.equal(builders[0].resume, null)
  const first = (await usageOf(t)).find((u) => u.agent === 'builder')
  assert.equal(builders[1].resume, first.sessionId) // resume of the SAME session
  assert.equal(builders[1].prompt, `Round 1 reviews are in ${t.dir}/round-1/. Address every review with VERDICT: CHANGES, commit, and update build.md for round 2.`)
  assert.equal(cs.filter((c) => c.agent === 'reviewer-code').length, 2)
  assert.equal(cs.at(-1).agent, 'approver')
  assert.match(cs.at(-1).prompt, /Final round: 2\./)
  const job = await jobOf(t)
  assert.equal(job.stage, 'pr')
  assert.equal(job.round, 2)
})

test('rounds exhausted after two resumes: ESCALATE, needs-human, nonzero, no PR', async () => {
  const t = await setup('be-907', { spec: true })
  const v = { 1: { code: 'CHANGES' }, 2: { code: 'CHANGES' }, 3: { ux: 'CHANGES', code: 'CHANGES' } }
  const r = await drive(t, ['run', 'be-907'], { FAKE_VERDICTS: JSON.stringify(v) })
  assert.notEqual(r.code, 0)
  assert.equal((await agents(t)).filter((a) => a === 'builder').length, 3) // 1 build + 2 resumes
  assert.ok(!(await agents(t)).includes('approver'))
  const job = await jobOf(t)
  assert.equal(job.stage, 'needs-human')
  assert.equal(job.round, 3)
  const decision = await readFile(join(t.dir, 'decision.md'), 'utf8')
  assert.match(decision, /^ESCALATE\n\nReview rounds exhausted\. Outstanding CHANGES in round-3\/ from: ux, code\./)
  assert.ok(!(await calls(t)).some((c) => c.tool === 'gh' || c.tool === 'git'))
})

test('builder BLOCKED: needs-human, no reviewers', async () => {
  const t = await setup('be-908', { spec: true })
  const r = await drive(t, ['run', 'be-908'], { FAKE_BUILD_STATUS: 'BLOCKED' })
  assert.notEqual(r.code, 0)
  assert.match(r.stdout, /BLOCKED/)
  assert.deepEqual(await agents(t), ['builder'])
  assert.equal((await jobOf(t)).stage, 'needs-human')
})

test('approver ESCALATE: needs-human, no push', async () => {
  const t = await setup('be-909', { spec: true })
  const r = await drive(t, ['run', 'be-909'], { FAKE_DECISION: 'ESCALATE' })
  assert.notEqual(r.code, 0)
  assert.equal((await jobOf(t)).stage, 'needs-human')
  assert.ok(!(await calls(t)).some((c) => c.tool === 'git'))
})

test('agent failure and empty run both stop with needs-human', async () => {
  let t = await setup('be-910', { spec: true })
  let r = await drive(t, ['run', 'be-910'], { FAKE_FAIL: 'builder' })
  assert.notEqual(r.code, 0)
  assert.equal((await jobOf(t)).stage, 'needs-human')
  assert.deepEqual(await agents(t), ['builder']) // no loop, no retry
  t = await setup('be-912', { spec: true })
  r = await drive(t, ['run', 'be-912'], { FAKE_EMPTY: 'reviewer-ui' })
  assert.notEqual(r.code, 0)
  const job = await jobOf(t)
  assert.equal(job.stage, 'needs-human')
  assert.equal(job.reviews.ui, 'pending')
  assert.equal(job.reviews.code, 'PASS') // others still landed
  assert.ok(!(await agents(t)).includes('approver'))
})

test('missing spec.md after spec-writer run stops', async () => {
  const t = await setup('be-913')
  const r = await drive(t, ['run', 'be-913'], { FAKE_EMPTY: 'spec-writer' })
  assert.notEqual(r.code, 0)
  assert.equal((await jobOf(t)).stage, 'needs-human')
})

test('usage.jsonl has one line per run and the usage command totals it', async () => {
  const t = await setup('be-914')
  await drive(t, ['run', 'be-914'])
  const rows = await usageOf(t)
  assert.equal(rows.length, 7)
  const b = rows.find((u) => u.agent === 'builder')
  assert.equal(b.model, 'claude-fake-1')
  assert.equal(b.inputTokens, 10)
  assert.equal(b.outputTokens, 20)
  assert.equal(b.cacheReadTokens, 100)
  assert.equal(b.cacheCreationTokens, 1000)
  assert.equal(b.costUsd, 0.5)
  assert.equal(b.durationMs, 1234)
  assert.equal(b.round, 1)
  assert.match(b.sessionId, /^sess-builder-/)
  assert.ok(rows.find((u) => u.agent === 'reviewer-ux' && u.round === 1))
  assert.ok(!Number.isNaN(Date.parse(b.ts)))
  const u = await drive(t, ['usage', 'be-914'])
  assert.match(u.stdout, /TOTAL\s+7\s+70\s+140\s+700\s+7000\s+3\.5000/)
  assert.match(u.stdout, /builder\s+1\s+10/)
})

test('restart mid-review only runs the missing reviewers', async () => {
  const t = await setup('be-915', { stage: 'review', round: 1, spec: true })
  await mkdir(join(t.dir, 'round-1'))
  await writeFile(join(t.dir, 'round-1/review-code.md'), 'VERDICT: PASS\n')
  await writeFile(join(t.dir, 'round-1/review-ui.md'), 'VERDICT: CHANGES\n')
  await writeFile(join(t.dir, 'build.md'), 'STATUS: READY\n')
  const r = await drive(t, ['run', 'be-915'], { FAKE_VERDICTS: JSON.stringify({ 1: { ux: 'PASS' } }) })
  assert.equal(r.code, 0, r.stdout + r.stderr)
  const a = await agents(t)
  assert.deepEqual(a.slice(0, 2).sort(), ['reviewer-security', 'reviewer-ux'])
  assert.equal(a.filter((x) => x.startsWith('reviewer-')).length, 2 + 4) // 2 missing in round 1, all four in round 2
  assert.equal(a.filter((x) => x === 'builder').length, 1) // no builder session on record: starts a fresh one
})

test('dry run prints the plan and calls nothing', async () => {
  const t = await setup('fe-916')
  const r = await drive(t, ['run', 'fe-916', '--dry-run'])
  assert.equal(r.code, 0)
  assert.match(r.stdout, /spec-writer/)
  assert.match(r.stdout, /Preview route/)
  assert.match(r.stdout, /Merge PR #0 from \/factory\/fe-916/)
  assert.equal((await calls(t)).length, 0)
  assert.equal((await jobOf(t)).stage, 'spec')
  assert.ok(!existsSync(join(t.dir, 'usage.jsonl')))
})

test('refuses to run a job in stage pr, needs --from for needs-human', async () => {
  const t = await setup('be-917', { stage: 'pr' })
  const r = await drive(t, ['run', 'be-917'])
  assert.notEqual(r.code, 0)
  assert.equal((await calls(t)).length, 0)
})

test('fe job: preview starts after build with the full route, stage pr keeps it', async () => {
  const t = await setup('fe-918', { spec: true })
  let pid
  try {
    const r = await drive(t, ['run', 'fe-918'], { FAKE_ROUTE: '/trips/5eed0000-0000-4000-8000-000000000001/budget' })
    assert.equal(r.code, 0, r.stdout + r.stderr)
    const job = await jobOf(t)
    assert.equal(job.stage, 'pr')
    assert.equal(job.preview, `http://localhost:${5103 + 10 * 918}/trips/5eed0000-0000-4000-8000-000000000001/budget`)
    const b = (await calls(t)).find((c) => c.agent === 'builder')
    assert.match(b.prompt, /Preview route: write the exact page\(s\) to check, as paths, on a line "Preview route: <path>" in build.md\.$/)
    assert.match(await readFile(join(t.dir, 'pr-body.md'), 'utf8'), /## Preview/)
  } finally {
    const { execFileSync } = await import('node:child_process')
    try { pid = execFileSync('lsof', ['-tiTCP:' + (5103 + 10 * 918), '-sTCP:LISTEN']).toString().trim(); for (const p of pid.split('\n')) process.kill(Number(p)) } catch {}
  }
})

test('fe job without a usable route stops with needs-human and opens no PR', async () => {
  for (const [n, route] of [['fe-919', undefined], ['fe-920', '/'], ['fe-921', '/trips/<id>/budget']]) {
    const t = await setup(n, { spec: true })
    const r = await drive(t, ['run', n], route ? { FAKE_ROUTE: route } : {})
    assert.notEqual(r.code, 0, n)
    assert.match(r.stdout, /Preview route/)
    const job = await jobOf(t)
    assert.equal(job.stage, 'needs-human')
    assert.equal(job.preview, undefined)
    assert.ok(!(await agents(t)).includes('reviewer-code'))
    assert.ok(!(await calls(t)).some((c) => c.tool === 'gh'))
  }
})
