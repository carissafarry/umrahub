#!/usr/bin/env node
// Quality and cost metrics per job, to compare builder models (workflow-018). Node 20, no dependencies.
//
//   node factory/metrics.mjs                     one row per job, then a summary per builder model
//   node factory/metrics.mjs <job-id>            the detail of one job
//   node factory/metrics.mjs --json              the same data as JSON
//   node factory/metrics.mjs score <job> <1-5> [note]   your score after looking at the result (kept in factory/jobs/<job>/score.json)
//   node factory/metrics.mjs bug <job> <note>    a bug found after merge (the most honest quality signal)
//
// Everything comes from files the driver already writes: usage.jsonl, round-N/review-*.md, decision.md, driver.log.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const sh = promisify(execFile)
const text = async (p) => (await readFile(p, 'utf8').catch(() => '')) || ''
const first = (t) => t.split('\n', 1)[0].trim()
const round2 = (n) => Math.round(n * 100) / 100
const short = (m) => (m || '?').replace(/^claude-/, '').replace(/-\d+(-\d+)*$/, '') // claude-sonnet-5-5 -> sonnet

async function root() {
  const common = (await sh('git', ['rev-parse', '--git-common-dir'])).stdout.trim()
  return join(common, '..')
}

// Review findings: numbered or bulleted items under "## Findings" of a review that asked for changes.
function findingCount(md) {
  const m = md.match(/^## Findings\s*\n([\s\S]*?)(?=^## |\s*$(?![\s\S]))/m)
  return m ? (m[1].match(/^\s*(?:\d+\.|-)\s+\S/gm) || []).length : 0
}

async function jobMetrics(dir, id) {
  const rows = (await text(join(dir, 'usage.jsonl'))).split('\n').filter(Boolean).map((l) => JSON.parse(l))
  if (!rows.length) return null
  const sum = (f) => rows.filter(f).reduce((a, r) => a + (r.costUsd || 0), 0)
  const builders = rows.filter((r) => r.agent === 'builder')
  // rows written by a chat session (`source: in-session`) carry no model or cost: they must not label the builder
  const models = [...new Set(builders.filter((r) => r.source !== 'in-session' && r.model).map((r) => r.modelOverride || short(r.model)))]
  const rounds = (await readdir(dir).catch(() => [])).filter((n) => /^round-\d+$/.test(n)).sort((a, b) => a.slice(6) - b.slice(6))
  const perRound = []
  for (const r of rounds) {
    const files = (await readdir(join(dir, r)).catch(() => [])).filter((f) => /^review-.*\.md$/.test(f))
    const verdicts = {}
    let findings = 0
    for (const f of files) {
      const md = await text(join(dir, r, f))
      const v = first(md).replace(/^VERDICT:\s*/, '')
      verdicts[f.slice(7, -3)] = v
      if (v === 'CHANGES') findings += findingCount(md)
    }
    perRound.push({ round: Number(r.slice(6)), verdicts, findings })
  }
  const log = await text(join(dir, 'driver.log'))
  const score = JSON.parse((await text(join(dir, 'score.json'))) || '{}')
  const decision = first(await text(join(dir, 'decision.md')))
  const times = rows.map((r) => Date.parse(r.ts)).filter(Number.isFinite)
  return {
    job: id, builder: models.join('+') || (builders.length ? 'in-session' : '?'),
    costUsd: round2(sum(() => true)), builderCostUsd: round2(sum((r) => r.agent === 'builder')),
    agentMinutes: round2(rows.reduce((a, r) => a + (r.durationMs || 0), 0) / 60000),
    builderRuns: builders.length, reviewRounds: perRound.length,
    firstRoundClean: perRound.length > 0 && Object.values(perRound[0].verdicts).every((v) => v === 'PASS' || v === 'skipped'),
    changesFindings: perRound.reduce((a, r) => a + r.findings, 0),
    deniedBash: (log.match(/denied Bash:/g) || []).length,
    decision: decision || null, perRound,
    score: score.score ?? null, bugsAfterMerge: (score.bugs || []).length, bugs: score.bugs || [],
    from: times.length ? new Date(Math.min(...times)).toISOString().slice(0, 10) : null,
  }
}

function summarize(jobs) {
  const by = new Map()
  for (const j of jobs) by.set(j.builder, [...(by.get(j.builder) || []), j])
  const avg = (a, f) => (a.length ? round2(a.reduce((s, j) => s + f(j), 0) / a.length) : null)
  return [...by].map(([builder, a]) => {
    const scored = a.filter((j) => j.score != null)
    return {
      builder, jobs: a.length, avgCostUsd: avg(a, (j) => j.costUsd), avgBuilderCostUsd: avg(a, (j) => j.builderCostUsd),
      avgAgentMinutes: avg(a, (j) => j.agentMinutes), avgReviewRounds: avg(a, (j) => j.reviewRounds),
      firstRoundCleanPct: Math.round((100 * a.filter((j) => j.firstRoundClean).length) / a.length),
      avgChangesFindings: avg(a, (j) => j.changesFindings), avgDeniedBash: avg(a, (j) => j.deniedBash),
      avgScore: scored.length ? avg(scored, (j) => j.score) : null, bugsAfterMerge: a.reduce((s, j) => s + j.bugsAfterMerge, 0),
    }
  })
}

const pad = (v, n) => String(v ?? '-').padEnd(n)
function table(rows, cols) {
  console.log(cols.map(([h, , w]) => pad(h, w)).join(''))
  for (const r of rows) console.log(cols.map(([, f, w]) => pad(f(r), w)).join(''))
}

async function main() {
  const [a, b, c, ...rest] = process.argv.slice(2)
  const base = await root()
  const jobsDir = join(base, 'factory/jobs')
  if (a === 'score' || a === 'bug') {
    const file = join(jobsDir, b, 'score.json')
    if (!existsSync(join(jobsDir, b))) throw new Error(`no job ${b}`)
    const cur = JSON.parse((await text(file)) || '{}')
    if (a === 'score') {
      const n = Number(c)
      if (!(n >= 1 && n <= 5)) throw new Error('score is 1 to 5')
      Object.assign(cur, { score: n, note: rest.join(' ') || undefined, scoredAt: new Date().toISOString() })
    } else {
      if (!c) throw new Error('bug needs a note')
      cur.bugs = [...(cur.bugs || []), { note: [c, ...rest].join(' '), at: new Date().toISOString() }]
    }
    await writeFile(file, JSON.stringify(cur, null, 2) + '\n')
    return console.log(`${b}: ${a} recorded`)
  }
  const ids = (await readdir(jobsDir)).filter((n) => /^[a-z]+-\d{3}$/.test(n)).sort()
  const want = a && !a.startsWith('--') ? [a] : ids
  const jobs = (await Promise.all(want.map((id) => jobMetrics(join(jobsDir, id), id)))).filter(Boolean)
  if (process.argv.includes('--json')) return console.log(JSON.stringify({ jobs, summary: summarize(jobs) }, null, 2))
  if (want.length === 1) {
    const j = jobs[0]
    if (!j) return console.log('no usage recorded')
    console.log(`${j.job}  builder ${j.builder}  $${j.costUsd} (builder $${j.builderCostUsd})  ${j.agentMinutes} min  decision ${j.decision || '-'}`)
    for (const r of j.perRound) console.log(`  round ${r.round}: ${Object.entries(r.verdicts).map(([k, v]) => `${k}=${v}`).join(' ')}  findings ${r.findings}`)
    console.log(`  denied Bash ${j.deniedBash}  score ${j.score ?? '-'}  bugs after merge ${j.bugsAfterMerge}`)
    return
  }
  table(jobs, [['job', (j) => j.job, 9], ['builder', (j) => j.builder, 12], ['cost$', (j) => j.costUsd, 8], ['bldr$', (j) => j.builderCostUsd, 8],
    ['min', (j) => j.agentMinutes, 7], ['rounds', (j) => j.reviewRounds, 8], ['1st clean', (j) => (j.firstRoundClean ? 'yes' : 'no'), 11],
    ['findings', (j) => j.changesFindings, 10], ['denied', (j) => j.deniedBash, 8], ['score', (j) => j.score, 7], ['bugs', (j) => j.bugsAfterMerge, 5]])
  console.log('\nPer builder model')
  table(summarize(jobs), [['builder', (s) => s.builder, 10], ['jobs', (s) => s.jobs, 6], ['avg$', (s) => s.avgCostUsd, 8], ['avg bldr$', (s) => s.avgBuilderCostUsd, 11],
    ['avg min', (s) => s.avgAgentMinutes, 9], ['avg rounds', (s) => s.avgReviewRounds, 12], ['1st clean%', (s) => s.firstRoundCleanPct, 12],
    ['avg findings', (s) => s.avgChangesFindings, 14], ['avg denied', (s) => s.avgDeniedBash, 12], ['avg score', (s) => s.avgScore, 11], ['bugs', (s) => s.bugsAfterMerge, 5]])
}

main().catch((e) => { console.error(e.message); process.exit(1) })
