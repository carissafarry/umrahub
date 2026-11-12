#!/usr/bin/env node
// Token and cost summary over every factory/jobs/*/usage.jsonl (written by factory/driver.mjs).
//   node factory/usage-report.mjs            table per job, per agent and per day
//   node factory/usage-report.mjs --json     the same data as JSON (also saved to factory/jobs/usage-summary.json)
// Only driver runs are counted; work done inside an interactive session is not in usage.jsonl.
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const jobsDir = join(dirname(fileURLToPath(import.meta.url)), 'jobs')
const rows = []
for (const id of readdirSync(jobsDir)) {
  const f = join(jobsDir, id, 'usage.jsonl')
  if (!existsSync(f)) continue
  let feature = ''
  try { feature = JSON.parse(readFileSync(join(jobsDir, id, 'job.json'), 'utf8')).feature || '' } catch { /* no job.json */ }
  for (const l of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    try { const r = JSON.parse(l); rows.push({ job: id, task: id, feature: feature.replace(/\s+/g, ' ').slice(0, 400), ...r }) } catch { /* skip a broken line */ }
  }
}

const zero = () => ({ runs: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, seconds: 0, turns: 0 })
const add = (a, r) => {
  a.runs++; a.input += r.inputTokens ?? 0; a.output += r.outputTokens ?? 0
  a.cacheRead += r.cacheReadTokens ?? 0; a.cacheWrite += r.cacheCreationTokens ?? 0
  a.cost += r.costUsd ?? 0; a.seconds += (r.durationMs ?? 0) / 1000; a.turns += r.numTurns ?? 0
}
const group = (key) => {
  const m = {}
  for (const r of rows) add((m[key(r)] ??= zero()), r)
  return m
}
const total = zero()
rows.forEach((r) => add(total, r))
const tasks = {}
for (const r of rows) {
  const t = (tasks[r.task] ??= { feature: r.feature, firstRun: r.ts, lastRun: r.ts, ...zero(), byAgent: {} })
  add(t, r); add((t.byAgent[r.agent] ??= zero()), r)
  if (r.ts < t.firstRun) t.firstRun = r.ts
  if (r.ts > t.lastRun) t.lastRun = r.ts
}
const out = { generated: new Date().toISOString(), total, byJob: group((r) => r.job), byAgent: group((r) => r.agent),
  byDay: group((r) => String(r.ts).slice(0, 10)), byModel: group((r) => r.model || 'unknown'), byTask: tasks, runs: rows }
writeFileSync(join(jobsDir, 'usage-summary.json'), JSON.stringify(out, null, 2) + '\n')

if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); process.exit(0) }

const fmt = (n) => Math.round(n).toLocaleString('en-US')
const show = (title, m) => {
  console.log(`\n${title}`)
  console.log(['name', 'runs', 'turns', 'output', 'cache-read', 'cache-write', 'cost USD', 'min', 'cache%'].join('\t'))
  for (const [k, v] of Object.entries(m).sort((a, b) => b[1].cost - a[1].cost)) {
    const seen = v.input + v.cacheRead + v.cacheWrite
    console.log([k, v.runs, v.turns, fmt(v.output), fmt(v.cacheRead), fmt(v.cacheWrite), v.cost.toFixed(2), (v.seconds / 60).toFixed(1),
      seen ? Math.round((v.cacheRead / seen) * 100) + '%' : '-'].join('\t'))
  }
}
show('Per task (job)', out.byJob)
console.log('\nTask text and dates')
for (const [k, t] of Object.entries(tasks)) console.log(`${k}  ${t.firstRun.slice(0, 10)}..${t.lastRun.slice(0, 10)}  ${t.feature.slice(0, 110)}`)
show('Per agent (builder, reviewer-code, -security, -ux, -ui, approver, spec-writer)', out.byAgent)
show('Per day', out.byDay)
show('Per model', out.byModel)
console.log(`\nTOTAL ${total.runs} runs, ${total.cost.toFixed(2)} USD, ${(total.seconds / 60).toFixed(1)} min (driver runs only)`)
