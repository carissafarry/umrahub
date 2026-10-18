// Factory dashboard server: static files + directory listings (like `python3 -m http.server`)
// plus a tiny API so new backlog tasks can be added from the dashboard.
// Run from the repo root: node factory/server.mjs   (http://localhost:8000/dashboard.html)
import { createServer } from 'node:http'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const BACKLOG = join(ROOT, 'backlog.md')
const JOBS = join(ROOT, 'jobs')
const PORT = Number(process.env.PORT || 8000)
const NEW_SECTION = '## Baru — belum dicek'
const TYPES = { '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' }
const ITEM = /^- (?:\[( |x)\] )?(\d{3})-([a-z0-9-]+): (.*?)(?: → (\S+))?$/

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function parseBacklog(text) {
  let section = ''
  const items = []
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) section = line.slice(3).trim()
    const m = line.match(ITEM)
    if (!m) continue
    const [, box, num, slug, rest, job] = m
    const needs = rest.match(/\(butuh: ([^)]*)\)\s*$/)
    items.push({
      code: `${num}-${slug}`, section, checked: box === 'x', job: job || null,
      needs: needs ? needs[1].split(',').map((s) => s.trim()) : [],
      text: needs ? rest.slice(0, needs.index).trim() : rest,
    })
  }
  return items
}

async function nextNumber(text) {
  const nums = [...text.matchAll(/\b(\d{3})-[a-z0-9-]+/g)].map((m) => Number(m[1]))
  try { for (const d of await readdir(JOBS)) if (/^\d{3}-/.test(d)) nums.push(Number(d.slice(0, 3))) } catch {}
  return String(Math.max(0, ...nums) + 1).padStart(3, '0')
}

function slugify(title) {
  return title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/).filter(Boolean).slice(0, 4).join('-') || 'task'
}

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/→/g, '->').trim()

async function addTask(body) {
  const title = oneLine(body.title)
  const description = oneLine(body.description)
  if (title.length < 3 || title.length > 80) throw Object.assign(new Error('Judul harus 3–80 karakter.'), { status: 400 })
  if (description.length > 1500) throw Object.assign(new Error('Deskripsi maksimal 1500 karakter.'), { status: 400 })

  const text = await readFile(BACKLOG, 'utf8')
  const code = `${await nextNumber(text)}-${slugify(title)}`
  const line = `- ${code}: ${description ? `${title} — ${description}` : title}`

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

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname === '/api/backlog' && req.method === 'GET') {
      return send(res, 200, JSON.stringify({ items: parseBacklog(await readFile(BACKLOG, 'utf8')) }), TYPES['.json'])
    }
    if (pathname === '/api/tasks' && req.method === 'POST') {
      // Only the dashboard itself may write: reject cross-site requests and non-JSON bodies.
      const origin = req.headers.origin
      if (origin && origin !== `http://${req.headers.host}`) return send(res, 403, 'Forbidden origin')
      if (!String(req.headers['content-type']).startsWith('application/json')) return send(res, 415, 'JSON only')
      return send(res, 201, JSON.stringify(await addTask(await readJson(req))), TYPES['.json'])
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed')
    await serveStatic(req, res, pathname)
  } catch (err) {
    send(res, err.status || 500, JSON.stringify({ error: err.status ? err.message : 'Server error' }), TYPES['.json'])
    if (!err.status) console.error(err)
  }
}).listen(PORT, '127.0.0.1', () => console.log(`factory dashboard: http://localhost:${PORT}/dashboard.html`))
