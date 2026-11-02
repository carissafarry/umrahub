#!/usr/bin/env node
// How many factory jobs may run agents at once.
//   node factory/capacity.mjs status
//   node factory/capacity.mjs check <job-id>     exit 0 = go, exit 2 = wait
// A job is "active" while its stage is spec, build, review or approve. Jobs in pr, needs-human or merged
// hold no slot. At most FACTORY_MAX_JOBS (default 2) jobs run at once and at most FACTORY_MAX_DB_JOBS
// (default 1) of them use the shared local Supabase stack: be-* jobs, or any job with "db": true in job.json.
import { readdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ACTIVE_STAGES = new Set(['spec', 'build', 'review', 'approve'])

export const limitsFrom = (env = process.env) => ({
  jobs: Number(env.FACTORY_MAX_JOBS || 2),
  db: Number(env.FACTORY_MAX_DB_JOBS || 1),
})

export const usesDb = (job) => (typeof job.db === 'boolean' ? job.db : /^be-/.test(job.id))

export function summarize(jobs, limits) {
  const active = jobs.filter((j) => ACTIVE_STAGES.has(j.stage))
  return { active, db: active.filter(usesDb), limits }
}

// Can this job start (or resume) running agents now? A job that is already active keeps its slot.
export function check(jobs, id, limits) {
  const job = jobs.find((j) => j.id === id)
  if (!job) return { ok: false, reason: `unknown job ${id}` }
  const { active, db } = summarize(jobs, limits)
  if (active.some((j) => j.id === id)) return { ok: true, reason: `${id} already holds a slot` }
  if (active.length >= limits.jobs) {
    return { ok: false, reason: `all ${limits.jobs} job slots are taken by ${active.map((j) => j.id).join(', ')}` }
  }
  if (usesDb(job) && db.length >= limits.db) {
    return { ok: false, reason: `the database slot is taken by ${db.map((j) => j.id).join(', ')} (limit ${limits.db} job using local Supabase)` }
  }
  return { ok: true, reason: 'a slot is free' }
}

export async function loadJobs(dir) {
  const jobs = []
  for (const name of await readdir(dir).catch(() => [])) {
    try {
      const job = JSON.parse(await readFile(resolve(dir, name, 'job.json'), 'utf8'))
      if (job && job.id && job.stage) jobs.push(job)
    } catch {}
  }
  return jobs
}

// Job state lives in the main checkout, also when this runs from a worktree.
export function jobsDir(env = process.env) {
  if (env.FACTORY_JOBS_DIR) return resolve(env.FACTORY_JOBS_DIR)
  const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim()
  return resolve(common, '..', 'factory', 'jobs')
}

export function describe({ active, db, limits }) {
  const lines = [`jobs running agents: ${active.length}/${limits.jobs}, using local Supabase: ${db.length}/${limits.db}`]
  for (const j of active) lines.push(`  - ${j.id} (${j.stage}${usesDb(j) ? ', database' : ''})`)
  return lines.join('\n')
}

async function main(argv) {
  const [cmd, id] = argv
  const limits = limitsFrom()
  const jobs = await loadJobs(jobsDir())
  if (cmd === 'status') {
    console.log(describe(summarize(jobs, limits)))
    return 0
  }
  if (cmd === 'check' && id) {
    const r = check(jobs, id, limits)
    console.log(`${r.ok ? 'OK' : 'WAIT'}: ${r.reason}`)
    if (!r.ok) console.log(describe(summarize(jobs, limits)))
    return r.ok ? 0 : 2
  }
  console.error('usage: node factory/capacity.mjs status | check <job-id>')
  return 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)))
