import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { check, limitsFrom, loadJobs, summarize, usesDb } from './capacity.mjs'

const lim = { jobs: 2, db: 1 }
const job = (id, stage, extra = {}) => ({ id, stage, ...extra })

test('an empty factory has room', () => {
  assert.equal(check([job('be-1', 'pr')], 'be-1', lim).ok, true)
})

test('only spec, build, review and approve hold a slot', () => {
  const jobs = ['spec', 'build', 'review', 'approve', 'pr', 'needs-human', 'merged'].map((s) => job(`fe-${s}`, s))
  assert.deepEqual(summarize(jobs, lim).active.map((j) => j.stage), ['spec', 'build', 'review', 'approve'])
})

test('a third job waits when two are running', () => {
  const jobs = [job('fe-1', 'build'), job('fe-2', 'review'), job('fe-3', 'needs-human')]
  const r = check(jobs, 'fe-3', lim)
  assert.equal(r.ok, false)
  assert.match(r.reason, /fe-1, fe-2/)
})

test('a second database job waits even when a slot is free', () => {
  const jobs = [job('be-1', 'build'), job('be-2', 'needs-human')]
  const r = check(jobs, 'be-2', lim)
  assert.equal(r.ok, false)
  assert.match(r.reason, /database slot is taken by be-1/)
})

test('a front-end job may run next to a database job', () => {
  assert.equal(check([job('be-1', 'build'), job('fe-1', 'needs-human')], 'fe-1', lim).ok, true)
})

test('a paused job frees its slot', () => {
  assert.equal(check([job('be-1', 'needs-human'), job('be-2', 'needs-human')], 'be-2', lim).ok, true)
})

test('a running job keeps its slot when checked again', () => {
  const jobs = [job('be-1', 'build'), job('fe-1', 'review')]
  assert.equal(check(jobs, 'be-1', lim).ok, true)
})

test('db flag in job.json overrides the be- prefix', () => {
  assert.equal(usesDb(job('be-9', 'build', { db: false })), false)
  assert.equal(usesDb(job('fe-9', 'build', { db: true })), true)
  assert.equal(usesDb(job('fe-9', 'build')), false)
})

test('unknown job is refused', () => {
  assert.equal(check([], 'be-1', lim).ok, false)
})

test('limits come from the environment', () => {
  assert.deepEqual(limitsFrom({ FACTORY_MAX_JOBS: '3', FACTORY_MAX_DB_JOBS: '2' }), { jobs: 3, db: 2 })
  assert.deepEqual(limitsFrom({}), { jobs: 2, db: 1 })
})

test('loadJobs reads job.json files and skips broken ones', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cap-'))
  await mkdir(join(dir, 'a'))
  await writeFile(join(dir, 'a', 'job.json'), JSON.stringify({ id: 'fe-1', stage: 'build' }))
  await mkdir(join(dir, 'b'))
  await writeFile(join(dir, 'b', 'job.json'), '{ not json')
  await mkdir(join(dir, 'c'))
  assert.deepEqual((await loadJobs(dir)).map((j) => j.id), ['fe-1'])
})
