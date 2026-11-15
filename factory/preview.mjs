#!/usr/bin/env node
// Preview data and one-click sign-in for fe previews (workflow-012).
// Previews run against the LOCAL Supabase stack with sample data, never the hosted project.
//
//   node factory/preview.mjs prepare <persona>      stack up, sample data, login helper up; prints the env for a dev server as JSON
//   node factory/preview.mjs link <persona> <url>   prints the one-click link for a preview page
//   node factory/preview.mjs seed <persona>         only (re)creates the sample data
//   node factory/preview.mjs serve                  runs the login helper (http://localhost:5090) in the foreground
//
// Personas: "baru" = signed in, no trip (for /onboarding); "berjalan" = signed in, one trip with travelers,
// stays, progress, a notification and a tip (Beranda, trips, steps, notifications, catalog).
// The local service-role key (the CLI's local demo key, read from `supabase status` at run time) is only used to
// create the sample users and rows; it is never written to a file or sent anywhere.
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// Node 20 has no global WebSocket and supabase-js wants one at import time; we never use realtime.
globalThis.WebSocket ??= class {}

const HELPER_PORT = Number(process.env.PREVIEW_HELPER_PORT || 5090)
const PASSWORD = 'preview-only-local-password'
const PERSONAS = {
  baru: { email: 'baru@preview.test', name: 'Siti Preview' },
  berjalan: { email: 'berjalan@preview.test', name: 'Carissa Preview' },
}

export function stackEnv() {
  let out
  try { out = execFileSync('supabase', ['status', '-o', 'env'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString() } catch { return null }
  const env = Object.fromEntries(out.split('\n').map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]))
  if (!env.API_URL || !env.ANON_KEY || !env.SERVICE_ROLE_KEY) return null
  return env
}

const need = () => {
  const e = stackEnv()
  if (!e) throw new Error('local Supabase is not running: supabase start -x studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,mailpit,postgres-meta,supavisor')
  return e
}

const admin = (e) => createClient(e.API_URL, e.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

async function ensureUser(db, persona) {
  const p = PERSONAS[persona]
  if (!p) throw new Error(`unknown persona "${persona}" (use: ${Object.keys(PERSONAS).join(', ')})`)
  const list = await db.auth.admin.listUsers({ perPage: 200 })
  const found = list.data.users.find((u) => u.email === p.email)
  if (found) await db.auth.admin.deleteUser(found.id) // fresh data every time; trips cascade
  const { data, error } = await db.auth.admin.createUser({
    email: p.email, password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: p.name },
  })
  if (error) throw error
  return data.user
}

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data }

export async function seed(persona) {
  const e = need()
  const db = admin(e)
  const user = await ensureUser(db, persona)
  if (persona === 'baru') return { user: PERSONAS.baru.email }

  const trip = must(await db.from('trips').insert({
    user_id: user.id, name: 'Umrah Januari 2027', departure_city: 'Surabaya', planned_departure_date: day(75),
  }).select('id').single(), 'trip')
  const travelers = must(await db.from('travelers').insert([
    { trip_id: trip.id, name: 'Carissa', has_disability: false }, { trip_id: trip.id, name: 'Budi', has_disability: false }, { trip_id: trip.id, name: 'Ibu Rina', has_disability: true },
  ]).select('id'), 'travelers')
  const tryOpt = async (what, q) => { const r = await q; if (r.error) console.error(`(skipped ${what}: ${r.error.message})`); return r }
  await tryOpt('trip_legs', db.from('trip_legs').insert([
    { trip_id: trip.id, city: 'Madinah', start_date: day(75), end_date: day(79), sort_order: 1 },
    { trip_id: trip.id, city: 'Makkah', start_date: day(79), end_date: day(86), sort_order: 2 },
  ]))
  const steps = must(await db.from('preparation_steps').select('id, is_shared_step').order('sort_order').limit(4), 'steps')
  const rows = steps.flatMap((s) => s.is_shared_step
    ? [{ trip_id: trip.id, step_id: s.id, traveler_id: null, status: 'completed', completed_at: new Date().toISOString() }]
    : travelers.map((t) => ({ trip_id: trip.id, step_id: s.id, traveler_id: t.id, status: 'completed', completed_at: new Date().toISOString() })))
  await tryOpt('progress', db.from('trip_step_progress').insert(rows))
  await tryOpt('notifications', db.from('notifications').insert([
    { user_id: user.id, trip_id: trip.id, type: 'deadline_reminder', phase_key: '2_3_months_before', is_read: false,
      title_id: 'Waktunya urus dokumen', title_en: 'Time to sort your documents',
      body_id: 'Keberangkatanmu tinggal sekitar 2 bulan. Cek paspor dan visa.', body_en: 'About 2 months to go. Check your passport and visa.' },
    { user_id: user.id, trip_id: trip.id, type: 'deadline_reminder', phase_key: '1_month_before', is_read: true,
      title_id: 'Vaksinasi meningitis', title_en: 'Meningitis vaccination',
      body_id: 'Jadwalkan vaksinasi sebelum berangkat.', body_en: 'Book your vaccination before departure.' },
  ]))
  await tryOpt('tip', db.from('step_comments').insert({ step_id: steps[0].id, user_id: user.id, content: 'Foto paspor pakai latar putih, jangan berkacamata.' }))
  return { user: PERSONAS.berjalan.email, trip: trip.id }
}

// ---- login helper: signs the sample user in (cookies for `localhost`, shared by every preview port) and redirects ----
function startHelper(e) {
  return createServer(async (req, res) => {
    try {
      const u = new URL(req.url, `http://localhost:${HELPER_PORT}`)
      if (u.pathname !== '/go') { res.writeHead(404).end('use /go?persona=<baru|berjalan>&to=<preview url>'); return }
      const persona = u.searchParams.get('persona') || 'berjalan'
      const to = new URL(u.searchParams.get('to') || '/')
      if (!['localhost', '127.0.0.1'].includes(to.hostname)) { res.writeHead(400).end('only localhost targets'); return }
      const p = PERSONAS[persona]
      if (!p) { res.writeHead(400).end('unknown persona'); return }
      const jar = []
      const sb = createServerClient(e.API_URL, e.ANON_KEY, { cookies: { getAll: () => [], setAll: (cs) => jar.push(...cs) } })
      const { error } = await sb.auth.signInWithPassword({ email: p.email, password: PASSWORD })
      if (error) { res.writeHead(500).end(`sign-in failed: ${error.message} (run: node factory/preview.mjs seed ${persona})`); return }
      const cookies = jar.map(({ name, value, options = {} }) =>
        `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${options.maxAge ?? 3600}`)
      res.writeHead(302, { 'Set-Cookie': cookies, Location: to.toString() }).end()
    } catch (err) { res.writeHead(500).end(String(err.message || err)) }
  })
}

const helperUp = async () => { try { const r = await fetch(`http://localhost:${HELPER_PORT}/`); return r.status === 404 } catch { return false } }

export const linkFor = (persona, url) => `http://localhost:${HELPER_PORT}/go?persona=${persona}&to=${encodeURIComponent(url)}`

async function prepare(persona) {
  const e = need()
  if (!(await helperUp())) {
    spawn('node', [new URL(import.meta.url).pathname, 'serve'], { detached: true, stdio: 'ignore' }).unref()
    for (let i = 0; i < 20 && !(await helperUp()); i++) await new Promise((r) => setTimeout(r, 500))
  }
  await seed(persona)
  return { NEXT_PUBLIC_SUPABASE_URL: e.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: e.ANON_KEY }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, a, b] = process.argv.slice(2)
  try {
    if (cmd === 'serve') { const e = need(); startHelper(e).listen(HELPER_PORT, () => console.log(`login helper on http://localhost:${HELPER_PORT}`)) }
    else if (cmd === 'prepare') console.log(JSON.stringify(await prepare(a || 'berjalan')))
    else if (cmd === 'seed') console.log(JSON.stringify(await seed(a || 'berjalan')))
    else if (cmd === 'link') console.log(linkFor(a || 'berjalan', b || 'http://localhost:3000/'))
    else { console.log('usage: node factory/preview.mjs prepare|seed <persona> | link <persona> <url> | serve'); process.exit(1) }
  } catch (err) { console.error(String(err.message || err)); process.exit(1) }
}
