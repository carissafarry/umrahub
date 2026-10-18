# Backlog

`/factory next` builds the first unchecked item and checks it off with its job id.

Item format: `- [ ] [<type>-<NNN>] <Title>: <description>`
- `<type>` is `infra`, `be` or `fe` (`?` until triage decides). `<type>-<NNN>` is the task code and the
  prefix of every commit for that task, without brackets, e.g. `fe-004 Add language toggle`.
- Tooling and factory work is an `infra` task too; every commit has a task code.
- The job id, job folder, branch (`factory/<job-id>`) and worktree folder are `<type>-<NNN>`, e.g. `fe-004`.
  (Jobs 001–003 predate this and keep their old ids.)
- Every item implements part of `.plans/umrohhub-mvp-spec.md`; read the matching section there.

Only items under **Siap** are runnable, and every item there can run in parallel. When a job merges,
the orchestrator moves items whose dependencies are all merged from **Menunggu** into **Siap** as
`- [ ]` lines, dropping the `(butuh: ...)` suffix.

## Selesai

- [x] [fe-001] Design foundation: replace the default Next.js page and styles with UmrohHub's design tokens (warm sand/ink light theme, charcoal dark theme via prefers-color-scheme, single gold accent), Inter + Noto Naskh Arabic fonts, 44px minimum tap targets, and a mobile-first landing page in Bahasa Indonesia that explains the app and has one "Masuk dengan Google" CTA (button only, no auth yet) → 001-design-foundation
- [x] [infra-017] Factory tooling: dashboard task list with detail drawer and clickable blockers, task graph page, task codes and wave backlog, parallel-safe jobs, fe preview servers, dashboard decision inbox, AI requirement docs with autosave → infra-017
- [x] [infra-018] Project setup: Next.js scaffold, Supabase clients and project config, migration rules, initial MVP backlog → infra-018
- [x] [infra-019] Dashboard drawer UX: resizable job and task drawers (drag handle, width remembered, double-click for full width), header and decision form scroll with the content instead of sticking, file list stays beside the markdown → infra-019
- [x] [infra-020] Responsive rule: spec and AGENTS.md require a real desktop layout (≥ 1024px) for every screen, not only mobile → infra-020
- [x] [infra-021] Preview button at any stage: job cards show "Lihat preview" whenever a preview server is running, not only while waiting on a human decision → infra-021
- [x] [infra-022] Rename to Umra Hub: brand "Umra Hub" in docs and conventions, `umrahub` as package name, local Supabase project id, GitHub repo, Vercel and Supabase project names (UI copy is renamed in fe-004) → infra-022

## Siap — gelombang 1

- [x] [fe-002] Design refresh: restyle the app to the new visual direction in .plans/design-reference.png and the spec's updated Design Direction: replace the sand/gold tokens with a lavender-to-white gradient background, white large-radius cards with soft shadows, an indigo-violet primary, pastel icon-tile colours and a deep-navy dark theme; add reusable primitives in src/components/ui (Card, Chip/segmented control, round IconButton, primary pill Button with a white circular arrow badge, floating dark pill BottomNav with max 4 tabs, not mounted on the landing page yet) using inline SVG icons and no new dependencies; restyle the landing page to match the reference's first screen (CSS/SVG hero composition with floating icon chips, centred headline, indigo "Masuk dengan Google" pill CTA, still no auth); keep 44px tap targets, body text contrast ≥ 7:1 and text on indigo ≥ 4.5:1; update AGENTS.md's Design system section → 002-design-refresh
- [x] [be-003] DB schema: database schema migration for the MVP data model in the spec (preparation_steps, city_cost_overrides, trips, travelers, trip_step_config, trip_step_progress) with RLS so users only read and write their own trips; preparation_steps and city_cost_overrides are readable by any signed-in user → 003-db-schema
- [ ] [be-005] Seed content: seed migration with the full preparation-step content from the spec (all timeline phases and categories, Bahasa Indonesia and English titles, summaries and detail markdown, dependencies, shared/individual default, IDR cost ranges, city cost overrides for flights from Jakarta, Surabaya, Medan, Makassar and Yogyakarta)
- [ ] [fe-004] i18n: Bahasa Indonesia (default) and English with a language toggle in the header, all existing UI copy moved into message files, choice persisted in a cookie

## Menunggu

Gelombang 3
- [be-006] Google auth: Google sign-in with Supabase Auth: the landing CTA starts Google OAuth, /auth/callback exchanges the code, middleware refreshes the session, every route except / and /auth/* redirects signed-out users to /, and a signed-in header shows the user's name, avatar and a sign-out button (butuh: fe-004)

Gelombang 4
- [fe-007] Onboarding wizard: wizard for first-time signed-in users: departure city, travel month/year, passport status, number of travelers with names, disability and minor flags; on finish it creates the trip and travelers and lands on the trip page; users who already have a trip skip it (butuh: be-003, be-006)
- [fe-008] Trip checklist: page /trips/[id] with steps grouped by timeline phase then category, each step an accordion with summary, estimated cost and a status control (not started / in progress / done), overall progress bar at the top (butuh: be-005, be-006)

Gelombang 5
- [fe-009] Step detail: page /steps/[id] with the full guide markdown rendered safely, prerequisites, cost range adjusted for the trip's departure city, and a link back to the checklist; checklist accordions get a "Pelajari lebih lanjut" link to it (butuh: fe-008)
- [fe-010] Trip dashboard: multi-trip dashboard /dashboard listing the user's trips with progress, create a new trip via a short wizard, rename and delete a trip with confirmation; signed-in users land here; mounts the BottomNav (butuh: fe-007)
- [fe-011] Budget: page /trips/[id]/budget with per-step and per-phase cost ranges multiplied by traveler count where individual, total min–max in IDR with a simple bar chart, and the "harga perkiraan, dapat berubah" disclaimer (butuh: fe-008)
- [be-012] Notifications: in-app deadline reminders generated from the travel date and step timeline phases, a bell with unread count in the header, and a /notifications page to read and mark them read (butuh: fe-008)

Gelombang 6
- [fe-013] Step dependencies: hybrid step dependencies — marking a step done while a prerequisite is not done shows a non-blocking warning naming the prerequisite, and blocked steps are visually marked in the checklist (butuh: fe-009)
- [be-014] Step comments: signed-in users can post and delete their own tips on a step detail page, newest first, with display name and avatar; requires a migration with RLS (butuh: fe-009)

Gelombang 7
- [fe-015] Per traveler: trip owner can switch each step between shared and individual; individual steps show one status control per traveler and count toward progress per traveler (butuh: fe-013)
- [be-016] Content flags: a "Laporkan info usang" button on each step detail page that records a reason in a content_flags table (migration with RLS, users can only insert and read their own flags) (butuh: be-014)
