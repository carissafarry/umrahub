// Factory driver: runs one job through spec -> build -> review -> approve -> PR without an
// orchestrator conversation. Every agent is a fresh `claude -p` process. See factory/driver.md.
//   node factory/driver.mjs run <job-id> [--from <stage>] [--dry-run] [--permission-mode <m>] [--allowed-tools "<rules>"]
//   node factory/driver.mjs usage <job-id>
// Never merges a PR and never pushes to main.
import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { appendFile, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MAX_RESUMES = 2
const GH_REPO = process.env.FACTORY_GH_REPO || 'carissafarry/umrahub'
const REVIEWERS = { security: 'reviewer-security', ux: 'reviewer-ux', ui: 'reviewer-ui', code: 'reviewer-code' }
const DEFAULT_TOOLS = 'Bash(git:*) Bash(npm:*) Bash(npx:*) Bash(node:*) Bash(supabase:*) Bash(gh:*) Bash(agent-browser:*) Bash(lsof:*) Bash(curl:*)'

class Stop extends Error {} // a reason to set needs-human

const run = (cmd, args, opts = {}) =>
  new Promise((ok, fail) => {
    const p = execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, ...opts }, (err, stdout, stderr) =>
      err ? fail(Object.assign(err, { stdout, stderr })) : ok(stdout))
    if (opts.input !== undefined) p.stdin.end(opts.input)
  })

async function repoRoot() {
  if (process.env.FACTORY_REPO_ROOT) return resolve(process.env.FACTORY_REPO_ROOT)
  const common = (await run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: HERE })).trim()
  return dirname(common)
}

const readText = async (p) => (await readFile(p, 'utf8').catch(() => '')) || ''
const firstLine = async (p) => (await readText(p)).split('\n')[0].trim()

// ---------- job state ----------

async function loadJob(root, id) {
  const dir = join(root, 'factory/jobs', id)
  const file = join(dir, 'job.json')
  if (!existsSync(file)) throw new Stop(`no job.json at ${file}`)
  const job = JSON.parse(await readFile(file, 'utf8'))
  const m = id.match(/^([a-z]+)-(\d{3})$/)
  job.reviews ??= { security: 'pending', ux: 'pending', ui: 'pending', code: 'pending' }
  job.round ??= 0
  return { root, dir, file, job, code: m ? id : null, type: m?.[1] ?? null, n: m ? Number(m[2]) : 0 }
}

// Whole file rewritten on every change, worktree always absolute (the dashboard reads it).
async function save(c, patch = {}) {
  Object.assign(c.job, patch)
  c.job.worktree = resolve(c.job.worktree)
  await writeFile(c.file, JSON.stringify(c.job, null, 2) + '\n')
}

async function log(c, msg) {
  const line = `${new Date().toISOString()} ${c.job.id}: ${msg}`
  console.log(line)
  await appendFile(join(c.dir, 'driver.log'), line + '\n').catch(() => {})
}

async function needsHuman(c, reason) {
  await log(c, `needs-human: ${reason}`)
  await save(c, { stage: 'needs-human' })
  // Hard rule: an fe job waiting for a human has a running preview (best effort here).
  if (c.type === 'fe') await ensurePreview(c).catch((e) => log(c, `preview not started: ${e.message}`))
}

// ---------- prompts (same text as SKILL.md "Prompts") ----------

const paths = (c) => `Job folder: ${c.dir}/. Worktree: ${resolve(c.job.worktree)}. Branch: ${c.job.branch}.`
const port = (c, offset) => 5100 + 10 * c.n + offset
const tail = (c) => (c.code ? ` Task code: ${c.code}.` : '')
const PREVIEW_SENTENCE = ' Preview route: write the exact page(s) to check, as paths, on a line "Preview route: <path>" in build.md.'
const reviewerPort = (c, key) => (key === 'ux' ? ` Port: ${port(c, 1)}.` : key === 'ui' ? ` Port: ${port(c, 2)}.` : '')

function specPrompt(c) {
  const req = c.code && existsSync(join(c.root, 'factory/requirements', `${c.code}.md`))
    ? ` Requirements: factory/requirements/${c.code}.md (the user-approved detail; it overrides the backlog line where they differ).` : ''
  return `${paths(c)} Feature: ${c.job.feature}${req}${tail(c)}`
}
const buildPrompt = (c, round) =>
  `${paths(c)} Build round ${round}. Port: ${port(c, 0)}.${tail(c)}${c.type === 'fe' ? PREVIEW_SENTENCE : ''}`
const changesPrompt = (c, round) =>
  `Round ${round} reviews are in ${c.dir}/round-${round}/. Address every review with VERDICT: CHANGES, commit, and update build.md for round ${round + 1}.`
const reviewPrompt = (c, key, round) => `${paths(c)} Review round ${round}.${reviewerPort(c, key)}${tail(c)}`

// ---------- running one agent ----------

function claudeArgs(c, agent, o, resume) {
  if (o.permissionMode === 'bypassPermissions') throw new Stop('refusing bypassPermissions: the driver never skips permissions')
  const args = ['-p', '--agent', agent, '--output-format', 'json', '--permission-mode', o.permissionMode,
    '--add-dir', resolve(c.job.worktree), '--allowedTools', ...o.allowedTools.split(/\s+/).filter(Boolean)]
  if (process.env.FACTORY_MAX_BUDGET_USD) args.push('--max-budget-usd', process.env.FACTORY_MAX_BUDGET_USD)
  if (resume) args.push('--resume', resume)
  return args
}

// The prompt goes through stdin because --allowedTools takes a variable number of values.
// cwd is the main checkout, where .claude/agents lives; --add-dir grants the worktree.
async function runAgent(c, agent, prompt, o, { round = 0, file, resume } = {}) {
  const started = Date.now()
  let out
  try {
    out = await run('claude', claudeArgs(c, agent, o, resume), { cwd: c.root, input: prompt, timeout: 3 * 60 * 60 * 1000 })
  } catch (e) {
    out = e.stdout || ''
    if (!out.trim().startsWith('{')) throw new Stop(`${agent} failed to run: ${(e.stderr || e.message).slice(0, 300)}`)
  }
  let res
  try { res = JSON.parse(out) } catch { throw new Stop(`${agent} printed no JSON result`) }
  const u = res.usage || {}
  await appendFile(join(c.dir, 'usage.jsonl'), JSON.stringify({
    ts: new Date().toISOString(), agent, round, sessionId: res.session_id ?? null, resumed: Boolean(resume),
    model: Object.keys(res.modelUsage || {}).join(',') || null,
    inputTokens: u.input_tokens ?? null, outputTokens: u.output_tokens ?? null,
    cacheReadTokens: u.cache_read_input_tokens ?? null, cacheCreationTokens: u.cache_creation_input_tokens ?? null,
    costUsd: res.total_cost_usd ?? null, durationMs: res.duration_ms ?? Date.now() - started, numTurns: res.num_turns ?? null,
  }) + '\n')
  const denied = (res.permission_denials || []).map((d) => d.tool_name || 'tool').join(', ')
  if (denied) await log(c, `${agent}: permission denied for ${denied}`)
  const hint = denied ? ` (denied: ${denied}; see factory/driver.md)` : ''
  if (res.is_error || res.subtype !== 'success') throw new Stop(`${agent} ended with ${res.subtype || 'error'}${hint}`)
  // An empty run or a missing/stale file means the agent did not do its job (for example a denied tool).
  if (!String(res.result || '').trim() && !file) throw new Stop(`${agent} returned an empty result${hint}`)
  if (file) {
    const mtime = await stat(file).then((s) => s.mtimeMs, () => 0)
    if (mtime < started - 1000) throw new Stop(`${agent} did not write ${file}${hint}`)
  }
  return res.session_id
}

// The builder's session is the last builder line of usage.jsonl, so a rerun can still resume it.
async function builderSession(c) {
  const rows = (await readText(join(c.dir, 'usage.jsonl'))).split('\n').filter(Boolean).map((l) => JSON.parse(l))
  return rows.filter((r) => r.agent === 'builder' && r.sessionId).pop()?.sessionId
}

// ---------- fe preview (SKILL.md "Preview for fe jobs") ----------

const previewPort = (c) => port(c, 3)
const answers = (p) => new Promise((ok) => {
  const r = request({ host: '127.0.0.1', port: p, path: '/', timeout: 1500 }, (res) => { res.resume(); ok(true) })
  r.on('error', () => ok(false)).on('timeout', () => { r.destroy(); ok(false) }).end()
})

async function stopPreview(c) {
  const out = await run('lsof', ['-tiTCP:' + previewPort(c), '-sTCP:LISTEN']).catch(() => '')
  for (const pid of out.split('\n').filter(Boolean)) try { process.kill(Number(pid)) } catch {}
  delete c.job.preview
  await save(c)
}

async function previewRoute(c) {
  const m = (await readText(join(c.dir, 'build.md'))).match(/^Preview route:\s*(\S.*)$/m)
  const route = m?.[1].trim().split(/[\s,]/)[0] ?? ''
  if (!route.startsWith('/') || route === '/' || /[<>[\]{}]/.test(route))
    throw new Stop(`build.md has no usable "Preview route:" (got "${route || 'nothing'}"); it must be a specific page, never "/" or a placeholder`)
  return route
}

async function ensurePreview(c) {
  const route = await previewRoute(c)
  const p = previewPort(c)
  const wt = resolve(c.job.worktree)
  if (!(await answers(p))) {
    const env = join(wt, '.env.local')
    if (!existsSync(env) && existsSync(join(c.root, '.env.local'))) await copyFile(join(c.root, '.env.local'), env)
    spawn('npm', ['run', 'dev', '--', '--port', String(p)], { cwd: wt, detached: true, stdio: 'ignore' }).unref()
    for (let i = 0; i < 60 && !(await answers(p)); i++) await new Promise((r) => setTimeout(r, 1000))
    if (!(await answers(p))) throw new Stop(`preview did not answer on port ${p}`)
  }
  await save(c, { preview: `http://localhost:${p}${route}` })
}

// ---------- stages ----------

async function stageSpec(c, o) {
  const spec = join(c.dir, 'spec.md')
  if (existsSync(spec)) return log(c, 'spec.md exists, skipping spec-writer')
  await save(c, { stage: 'spec' })
  await log(c, 'running spec-writer')
  await runAgent(c, 'spec-writer', specPrompt(c), o, { file: spec })
}

// Runs the builder (fresh, or resumed after review round `round`) and checks build.md.
async function stageBuild(c, o, round, changes) {
  await save(c, { stage: 'build' })
  if (c.type === 'fe') await stopPreview(c)
  const session = changes ? await builderSession(c) : undefined
  let prompt = buildPrompt(c, round)
  if (changes) prompt = session ? changesPrompt(c, round)
    : `${buildPrompt(c, round + 1)} Continue: check git status and git log --oneline main..HEAD in the worktree first and don't redo finished work; the round ${round} reviews are in ${c.dir}/round-${round}/.`
  await log(c, `${session ? 'resuming' : 'running'} builder (${changes ? `after round ${round}` : 'round 1'})`)
  await runAgent(c, 'builder', prompt, o, { round, file: join(c.dir, 'build.md'), resume: session })
  await checkBuild(c)
}

async function checkBuild(c) {
  const first = await firstLine(join(c.dir, 'build.md'))
  if (first !== 'STATUS: READY') throw new Stop(`builder says "${first}": see ${join(c.dir, 'build.md')}`)
  if (c.type === 'fe') await ensurePreview(c)
}

async function verdictOf(file) {
  const m = (await firstLine(file)).match(/^VERDICT: (PASS|CHANGES)$/)
  if (!m) throw new Stop(`${file} does not start with a VERDICT line`)
  return m[1]
}

// Returns the reviewers that asked for CHANGES.
async function stageReview(c, o, round) {
  const dir = join(c.dir, `round-${round}`)
  await mkdir(dir, { recursive: true })
  const reviews = { security: 'pending', ux: 'pending', ui: 'pending', code: 'pending' }
  const todo = []
  for (const key of Object.keys(REVIEWERS)) {
    const f = join(dir, `review-${key}.md`)
    if (existsSync(f)) reviews[key] = await verdictOf(f) // written before a restart
    else todo.push(key)
  }
  await save(c, { stage: 'review', round, reviews })
  if (c.type === 'fe' && todo.some((k) => k === 'ux' || k === 'ui')) await stopPreview(c)
  await log(c, `review round ${round}: running ${todo.join(', ') || 'nothing'}`)
  const settled = await Promise.allSettled(todo.map(async (key) => {
    const f = join(dir, `review-${key}.md`)
    await runAgent(c, REVIEWERS[key], reviewPrompt(c, key, round), o, { round, file: f })
    reviews[key] = await verdictOf(f)
    await save(c, { reviews }) // dashboard chips fill in as each one lands
  }))
  if (c.type === 'fe') await ensurePreview(c)
  const bad = settled.filter((s) => s.status === 'rejected').map((s) => s.reason.message)
  if (bad.length) throw new Stop(bad.join('; '))
  return Object.keys(reviews).filter((k) => reviews[k] === 'CHANGES')
}

async function stageApprove(c, o, round) {
  const file = join(c.dir, 'decision.md')
  await save(c, { stage: 'approve' })
  await log(c, 'running approver')
  await runAgent(c, 'approver', `${paths(c)} Final round: ${round}.${tail(c)}`, o, { round, file })
  const first = await firstLine(file)
  if (first !== 'APPROVE')
    throw new Stop(first === 'ESCALATE' ? `approver escalated: see ${file}` : `decision.md starts with "${first}", expected APPROVE or ESCALATE`)
}

async function stagePr(c) {
  const wt = resolve(c.job.worktree)
  const { branch } = c.job
  if (!branch || branch === 'main') throw new Stop(`refusing to push branch "${branch}"`)
  if (c.type === 'fe') await ensurePreview(c) // hard rule: no PR of an fe job without a running preview
  const [build, decision] = await Promise.all([readText(join(c.dir, 'build.md')), readText(join(c.dir, 'decision.md'))])
  const body = [`## Summary\n\n${build.split('\n').slice(1).join('\n').trim()}`,
    `## Final review verdicts (round ${c.job.round})\n\n${Object.entries(c.job.reviews).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`,
    `## Approver\n\n${decision.split('\n').slice(1).join('\n').trim()}`,
    c.job.preview ? `## Preview\n\n${c.job.preview}` : ''].filter(Boolean).join('\n\n') + '\n'
  const bodyFile = join(c.dir, 'pr-body.md')
  await writeFile(bodyFile, body)
  await run('git', ['-C', wt, 'push', '-u', 'origin', branch])
  const open = JSON.parse(await run('gh', ['pr', 'list', '--repo', GH_REPO, '--head', branch, '--state', 'open', '--json', 'url']) || '[]')
  const url = open[0]?.url ?? (await run('gh', ['pr', 'create', '--repo', GH_REPO, '--base', 'main', '--head', branch,
    '--title', `Merge PR #0 from /${branch}`, '--body-file', bodyFile])).trim().split('\n').pop()
  const num = url.match(/\/(\d+)$/)?.[1]
  if (!num) throw new Stop(`could not read the PR number from "${url}"`)
  await run('gh', ['api', '-X', 'PATCH', `repos/${GH_REPO}/pulls/${num}`, '-f', `title=Merge PR #${num} from /${branch}`])
  await save(c, { stage: 'pr', pr: url })
  await log(c, `PR opened: ${url} (waiting for the user to merge; the driver never merges)`)
}

// ---------- the loop ----------

async function runJob(c, o) {
  const resumable = ['spec', 'build', 'review', 'approve']
  let stage = o.from || c.job.stage
  if (!resumable.includes(stage)) throw new Stop(`job is in stage "${stage}"; pass --from <${resumable.join('|')}> to restart it`)
  let round = c.job.round
  if (stage === 'spec') { await stageSpec(c, o); stage = 'build' }
  if (stage === 'build') {
    if (round === 0 && (await firstLine(join(c.dir, 'build.md'))) === 'STATUS: READY') await checkBuild(c) // built before a restart
    else if (round === 0) await stageBuild(c, o, 1)
    else await stageBuild(c, o, round, true) // CHANGES from round `round` are waiting
    round++
    stage = 'review'
  }
  if (stage === 'review') {
    round = Math.max(round, 1)
    for (;;) {
      const changes = await stageReview(c, o, round)
      if (!changes.length) break
      if (round - 1 >= MAX_RESUMES) {
        await writeFile(join(c.dir, 'decision.md'),
          `ESCALATE\n\nReview rounds exhausted. Outstanding CHANGES in round-${round}/ from: ${changes.join(', ')}.\n`)
        throw new Stop(`review rounds exhausted; CHANGES from ${changes.join(', ')} in round-${round}`)
      }
      await log(c, `round ${round}: CHANGES from ${changes.join(', ')}`)
      await stageBuild(c, o, round, true)
      round++
    }
  }
  await stageApprove(c, o, Math.max(round, 1))
  await stagePr(c)
}

function plan(c, o) {
  const lines = [`job ${c.job.id} (${c.job.feature}) stage=${c.job.stage} round=${c.job.round}`,
    `worktree ${resolve(c.job.worktree)}, branch ${c.job.branch}, permission mode ${o.permissionMode}`]
  const step = (agent, prompt) => lines.push(`  claude ${claudeArgs(c, agent, o).join(' ')}\n    prompt: ${prompt}`)
  step('spec-writer', specPrompt(c))
  step('builder', buildPrompt(c, 1))
  for (const [k, a] of Object.entries(REVIEWERS)) step(a, reviewPrompt(c, k, 1))
  lines.push(`  on CHANGES: resume the builder session (up to ${MAX_RESUMES} times), then review the next round`)
  step('approver', `${paths(c)} Final round: N.${tail(c)}`)
  lines.push(`  on APPROVE: git push -u origin ${c.job.branch}; gh pr create (title "Merge PR #0 from /${c.job.branch}"), PATCH the real title, stage pr`)
  if (c.type === 'fe') lines.push(`  fe job: preview on port ${previewPort(c)} after the builder and each review round; stopped before the builder and ux/ui reviewers`)
  return lines.join('\n')
}

// ---------- usage ----------

async function usage(root, id) {
  const rows = (await readText(join(root, 'factory/jobs', id, 'usage.jsonl'))).split('\n').filter(Boolean).map((l) => JSON.parse(l))
  if (!rows.length) return console.log(`no usage recorded for ${id}`)
  const groups = new Map()
  const add = (key, r) => {
    const g = groups.get(key) ?? { runs: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, ms: 0 }
    g.runs++; g.input += r.inputTokens ?? 0; g.output += r.outputTokens ?? 0
    g.cacheRead += r.cacheReadTokens ?? 0; g.cacheWrite += r.cacheCreationTokens ?? 0
    g.cost += r.costUsd ?? 0; g.ms += r.durationMs ?? 0
    groups.set(key, g)
  }
  for (const r of rows) { add(r.agent, r); add('TOTAL', r) }
  console.log(['agent'.padEnd(18), 'runs', 'input', 'output', 'cache-read', 'cache-write', 'cost USD', 'time s'].join('\t'))
  for (const [k, g] of [...groups].filter(([k]) => k !== 'TOTAL').concat([['TOTAL', groups.get('TOTAL')]]))
    console.log([k.padEnd(18), g.runs, g.input, g.output, g.cacheRead, g.cacheWrite, g.cost.toFixed(4), (g.ms / 1000).toFixed(0)].join('\t'))
}

// ---------- main ----------

function parseArgs(argv) {
  const [cmd, id, ...rest] = argv
  const o = { cmd, id, dryRun: false, from: null,
    permissionMode: process.env.FACTORY_PERMISSION_MODE || 'acceptEdits',
    allowedTools: process.env.FACTORY_ALLOWED_TOOLS || DEFAULT_TOOLS }
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--dry-run') o.dryRun = true
    else if (rest[i] === '--from') o.from = rest[++i]
    else if (rest[i] === '--permission-mode') o.permissionMode = rest[++i]
    else if (rest[i] === '--allowed-tools') o.allowedTools = rest[++i]
    else throw new Stop(`unknown option ${rest[i]}`)
  }
  return o
}

async function main() {
  const o = parseArgs(process.argv.slice(2))
  if (!['run', 'usage'].includes(o.cmd) || !o.id) throw new Stop('usage: node factory/driver.mjs run|usage <job-id> [--from <stage>] [--dry-run]')
  const root = await repoRoot()
  if (o.cmd === 'usage') return usage(root, o.id)
  const c = await loadJob(root, o.id)
  if (o.dryRun) return console.log(plan(c, o))
  try {
    await runJob(c, o)
  } catch (e) {
    if (!(e instanceof Stop)) await log(c, `unexpected error: ${e.stack || e.message}`)
    await needsHuman(c, e.message)
    process.exitCode = 1
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1 })
