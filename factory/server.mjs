// Factory dashboard server: static files + directory listings (like `python3 -m http.server`)
// plus a tiny API so new backlog tasks can be added from the dashboard.
// Run from the repo root: node factory/server.mjs   (http://localhost:8000/dashboard.html)
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const BACKLOG = join(ROOT, 'backlog.md')
const JOBS = join(ROOT, 'jobs')
// Dashboard decisions land here; the orchestrator session watches it (see SKILL.md "Dashboard requests").
const INBOX = join(ROOT, 'inbox')
const TAKEN = join(INBOX, 'taken')
// AI-generated, user-editable requirement docs per backlog task.
const REQS = join(ROOT, 'requirements')
const TASK_CODE = /^(infra|be|fe|spec|workflow|\?)-\d{3}$/
const reqFile = (code) => join(REQS, `${code.replace('?', 'q')}.md`)
const PORT = Number(process.env.PORT || 8000)
const NEW_SECTION = '## Baru — belum dicek'
const TYPES = { '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' }
const TYPES_TASK = ['infra', 'be', 'fe', 'spec', 'workflow', '?']
const ITEM = /^- (?:\[( |x)\] )?\[(infra|be|fe|spec|workflow|\?)-(\d{3})\] (.+?): (.*?)(?: → (\S+))?$/

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function parseBacklog(text) {
  let section = ''
  let wave = null
  const items = []
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      section = line.slice(3).trim()
      const w = section.match(/gelombang (\d+)/i)
      wave = w ? Number(w[1]) : null
    }
    const w = line.match(/^Gelombang (\d+)/)
    if (w) wave = Number(w[1])
    const m = line.match(ITEM)
    if (!m) continue
    const [, box, type, num, title, rest, job] = m
    const needs = rest.match(/\(butuh: ([^)]*)\)\s*$/)
    items.push({
      code: `${type}-${num}`, type, title, section, wave, checked: box === 'x', job: job || null,
      needs: needs ? needs[1].split(',').map((s) => s.trim()) : [],
      text: needs ? rest.slice(0, needs.index).trim() : rest,
    })
  }
  return items
}

async function nextNumber(text) {
  const nums = [...text.matchAll(/\[(?:infra|be|fe|spec|\?)-(\d{3})\]/g)].map((m) => Number(m[1]))
  try {
    for (const d of await readdir(JOBS)) {
      const m = d.match(/^(?:[a-z]+-)?(\d{3})(?:-|$)/)
      if (m) nums.push(Number(m[1]))
    }
  } catch {}
  return String(Math.max(0, ...nums) + 1).padStart(3, '0')
}

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/→/g, '->').trim()

async function addTask(body) {
  const type = TYPES_TASK.includes(body.type) ? body.type : '?'
  const title = oneLine(body.title).replace(/:/g, ' -')
  const description = oneLine(body.description)
  if (title.length < 3 || title.length > 80) throw Object.assign(new Error('Judul harus 3–80 karakter.'), { status: 400 })
  if (description.length > 1500) throw Object.assign(new Error('Deskripsi maksimal 1500 karakter.'), { status: 400 })

  const text = await readFile(BACKLOG, 'utf8')
  const code = `${type}-${await nextNumber(text)}`
  const line = `- [${code}] ${title}: ${description || title}`

  const lines = text.replace(/\n+$/, '').split('\n')
  let at = lines.indexOf(NEW_SECTION)
  if (at === -1) {
    const before = lines.findIndex((l) => l.startsWith('## Menunggu'))
    const block = [NEW_SECTION, '', line, '']
    if (before === -1) lines.push('', ...block)
    else lines.splice(before, 0, ...block)
  } else {
    let end = at + 1
    while (end < lines.length && !lines[end].startsWith('## ')) end++
    while (end > at + 1 && lines[end - 1].trim() === '') end--
    lines.splice(end, 0, line)
  }
  await writeFile(BACKLOG, lines.join('\n') + '\n')
  return { code, line }
}

const fail = (status, message) => Object.assign(new Error(message), { status })

async function listRequests() {
  const read = async (dir, state) => {
    let names = []
    try { names = (await readdir(dir)).filter((n) => n.endsWith('.json')) } catch {}
    return Promise.all(names.map(async (n) => ({ ...JSON.parse(await readFile(join(dir, n), 'utf8')), state })))
  }
  return [...await read(INBOX, 'queued'), ...await read(TAKEN, 'taken')]
}

async function addDecision(jobId, body) {
  if (!/^[a-z0-9-]{3,60}$/.test(jobId)) throw fail(400, 'Job id tidak valid.')
  let job
  try { job = JSON.parse(await readFile(join(JOBS, jobId, 'job.json'), 'utf8')) } catch { throw fail(404, 'Job tidak ditemukan.') }
  if (job.stage !== 'needs-human') throw fail(409, `Job sedang di tahap "${job.stage}", bukan menunggu keputusan.`)
  const action = body.action
  if (action !== 'approve' && action !== 'rework') throw fail(400, 'Aksi harus approve atau rework.')
  const note = String(body.note ?? '').trim()
  if (action === 'rework' && note.length < 5) throw fail(400, 'Tulis catatan perubahan (minimal 5 karakter).')
  if (note.length > 4000) throw fail(400, 'Catatan maksimal 4000 karakter.')
  if ((await listRequests()).some((r) => r.job === jobId)) throw fail(409, 'Sudah ada permintaan untuk job ini yang belum diproses.')
  const request = { kind: 'decision', job: jobId, action, note, createdAt: new Date().toISOString() }
  await mkdir(INBOX, { recursive: true })
  await writeFile(join(INBOX, `${Date.now()}-${jobId}.json`), JSON.stringify(request, null, 2) + '\n')
  return request
}

async function getRequirement(code) {
  try {
    const [content, info] = await Promise.all([readFile(reqFile(code), 'utf8'), stat(reqFile(code))])
    return { exists: true, content, mtime: info.mtimeMs }
  } catch {
    return { exists: false, content: '', mtime: null }
  }
}

async function saveRequirement(code, body) {
  const content = String(body.content ?? '')
  if (content.length > 50_000) throw fail(413, 'Dokumen maksimal 50.000 karakter.')
  const current = await getRequirement(code)
  // Reject a stale editor overwriting a newer (re)generated version.
  if (current.exists && body.baseMtime !== current.mtime) throw fail(409, 'Dokumen berubah di tempat lain (mungkin baru di-generate ulang). Muat ulang dulu.')
  await mkdir(REQS, { recursive: true })
  await writeFile(reqFile(code), content)
  return { mtime: (await stat(reqFile(code))).mtimeMs }
}

async function requestRequirement(code, body) {
  if ((await listRequests()).some((r) => r.task === code)) throw fail(409, 'Claude sedang menulis requirement untuk task ini.')
  const note = String(body.note ?? '').trim().slice(0, 2000)
  const request = { kind: 'requirements', task: code, note, createdAt: new Date().toISOString() }
  await mkdir(INBOX, { recursive: true })
  await writeFile(join(INBOX, `${Date.now()}-req-${code.replace('?', 'q')}.json`), JSON.stringify(request, null, 2) + '\n')
  return request
}

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 10_000) throw Object.assign(new Error('Body terlalu besar.'), { status: 413 })
  }
  try { return JSON.parse(raw) } catch { throw Object.assign(new Error('JSON tidak valid.'), { status: 400 }) }
}

async function serveStatic(req, res, urlPath) {
  const target = resolve(ROOT, '.' + decodeURIComponent(urlPath))
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return send(res, 403, 'Forbidden')
  let info
  try { info = await stat(target) } catch { return send(res, 404, 'Not found') }
  if (info.isDirectory()) {
    if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: urlPath + '/' }); return res.end() }
    const entries = (await readdir(target, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'))
    const links = entries.sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => { const n = e.name + (e.isDirectory() ? '/' : ''); return `<li><a href="${encodeURIComponent(e.name)}${e.isDirectory() ? '/' : ''}">${esc(n)}</a></li>` })
    return send(res, 200, `<!doctype html><ul>${links.join('')}</ul>`, 'text/html; charset=utf-8')
  }
  send(res, 200, await readFile(target), TYPES[extname(target)] || 'application/octet-stream')
}

const git = (args) => new Promise((done) => {
  execFile('git', args, { cwd: resolve(ROOT, '..') }, (err, out) => done(err ? '' : out))
})

// Task codes in the commit subjects of a git range, newest task first.
async function codesIn(range) {
  const codes = (await git(['log', range, '--format=%s'])).split('\n').map((s) => s.match(/^((?:infra|be|fe|spec|workflow)-\d{3})\b/)?.[1]).filter(Boolean)
  return [...new Set(codes)].sort((a, b) => Number(b.slice(-3)) - Number(a.slice(-3)))
}

// A merged PR's tasks: the commits its merge commit brought into main (second parent minus first parent).
async function mergedPrTasks(prNumber) {
  const merge = (await git(['log', 'origin/main', '--merges', '--fixed-strings', `--grep=Merge PR #${prNumber} from`, '--format=%H', '-1'])).trim()
  return merge ? codesIn(`${merge}^1..${merge}^2`) : []
}

const prNumberOf = (job) => String(job?.pr || '').match(/\/pull\/(\d+)$/)?.[1]
const prUrlOf = (job, n) => (job?.pr || '').replace(/\/pull\/\d+$/, `/pull/${n}`)

async function readJob(jobId) {
  try { return JSON.parse(await readFile(join(JOBS, jobId, 'job.json'), 'utf8')) } catch { return null }
}

// The tasks of a job's PR (newest first): what its branch has on top of origin/main while the PR is open,
// the PR's own commits once it is merged, so the list survives the merge.
async function branchTasks(jobId) {
  const job = await readJob(jobId)
  if (!/^factory\/[\w.-]+$/.test(job?.branch || '')) return { tasks: [], pr: null }
  // A merged job's branch may be reused (the long-lived infra branch), so read its own merged PR, not the branch.
  if (job.stage === 'merged' && prNumberOf(job)) return { tasks: await mergedPrTasks(prNumberOf(job)), pr: job.pr }
  const open = await codesIn(`origin/main..${job.branch}`)
  if (open.length) return { tasks: open, pr: job.pr || null }
  const n = prNumberOf(job)
  return { tasks: n ? await mergedPrTasks(n) : [], pr: job.pr || null }
}

// The PR a task shipped in, with every task of that PR: the open infra PR first, then merged PRs on main.
async function taskGroup(code) {
  const infra = await readJob('infra')
  const current = await branchTasks('infra')
  if (current.tasks.includes(code)) return current
  const merges = (await git(['log', 'origin/main', '--merges', '--fixed-strings', '--grep=Merge PR #', '--format=%H %s'])).split('\n').filter(Boolean)
  for (const line of merges) {
    const m = line.match(/^(\w+) Merge PR #(\d+) from/)
    if (!m) continue
    const [, sha, n] = m
    const tasks = await codesIn(`${sha}^1..${sha}^2`)
    if (tasks.includes(code)) return { tasks, pr: prUrlOf(infra, n) }
  }
  return { tasks: [], pr: null }
}

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname === '/api/backlog' && req.method === 'GET') {
      return send(res, 200, JSON.stringify({ items: parseBacklog(await readFile(BACKLOG, 'utf8')) }), TYPES['.json'])
    }
    if (pathname === '/api/inbox' && req.method === 'GET') {
      return send(res, 200, JSON.stringify({ requests: await listRequests() }), TYPES['.json'])
    }
    const jobTasks = pathname.match(/^\/api\/jobs\/([\w-]+)\/tasks$/)
    if (jobTasks && req.method === 'GET') {
      return send(res, 200, JSON.stringify(await branchTasks(jobTasks[1])), TYPES['.json'])
    }
    const taskPr = pathname.match(/^\/api\/tasks\/((?:infra|be|fe|spec|workflow)-\d{3})\/group$/)
    if (taskPr && req.method === 'GET') {
      return send(res, 200, JSON.stringify(await taskGroup(taskPr[1])), TYPES['.json'])
    }
    const reqMatch = pathname.match(/^\/api\/requirements\/([^/]+)(\/generate)?$/)
    if (reqMatch) {
      const code = decodeURIComponent(reqMatch[1])
      if (!TASK_CODE.test(code)) return send(res, 400, JSON.stringify({ error: 'Kode task tidak valid.' }), TYPES['.json'])
      if (req.method === 'GET' && !reqMatch[2]) return send(res, 200, JSON.stringify(await getRequirement(code)), TYPES['.json'])
      if (req.method !== 'PUT' && req.method !== 'POST') return send(res, 405, 'Method not allowed')
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      // Only the dashboard itself may write: reject cross-site requests and non-JSON bodies.
      const origin = req.headers.origin
      if (origin && origin !== `http://${req.headers.host}`) return send(res, 403, 'Forbidden origin')
      if (!String(req.headers['content-type']).startsWith('application/json')) return send(res, 415, 'JSON only')
      if (reqMatch && req.method === 'PUT' && !reqMatch[2]) return send(res, 200, JSON.stringify(await saveRequirement(decodeURIComponent(reqMatch[1]), await readJson(req))), TYPES['.json'])
      if (reqMatch && req.method === 'POST' && reqMatch[2]) return send(res, 201, JSON.stringify(await requestRequirement(decodeURIComponent(reqMatch[1]), await readJson(req))), TYPES['.json'])
      if (req.method !== 'POST') return send(res, 405, 'Method not allowed')
      if (pathname === '/api/tasks') return send(res, 201, JSON.stringify(await addTask(await readJson(req))), TYPES['.json'])
      const decision = pathname.match(/^\/api\/jobs\/([^/]+)\/decision$/)
      if (decision) return send(res, 201, JSON.stringify(await addDecision(decision[1], await readJson(req))), TYPES['.json'])
      return send(res, 404, 'Not found')
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed')
    await serveStatic(req, res, pathname)
  } catch (err) {
    send(res, err.status || 500, JSON.stringify({ error: err.status ? err.message : 'Server error' }), TYPES['.json'])
    if (!err.status) console.error(err)
  }
}).listen(PORT, '127.0.0.1', () => console.log(`factory dashboard: http://localhost:${PORT}/dashboard.html`))
