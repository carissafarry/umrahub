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
- [x] [infra-023] No AI co-author: AGENTS.md, builder and factory skill forbid Co-Authored-By/AI attribution in commits and merges → infra-023
- [x] [infra-028] Factory resumes with the session: SessionStart hook runs `factory/resume-check.sh` (unprocessed dashboard requests, PRs merged/closed while away, interrupted jobs, dead previews, main sync); `/factory resume` and the rule in SKILL.md and AGENTS.md → infra-028
- [x] [infra-029] One infra branch: all infra/tooling/factory commits go on the long-lived `factory/infra` branch (task codes kept in commit messages) with one PR to main; nothing is ever committed on main, local `main` only mirrors origin/main; watcher and resume check updated → infra-029
- [x] [infra-030] PR title format: PR titles read "Merge pull request #<N> from /factory/<job-id>" (the infra PR appends its task codes; set via the API once the number is known) so PR merge commits are easy to tell from ordinary commits in git log → infra-030
- [x] [infra-031] PR title prefix is "Merge PR" instead of "Merge pull request": job PRs "Merge PR #<N> from /factory/<job-id>", infra PR "Merge PR #<N> from /factory/infra: <task codes>" → infra-031
- [x] [infra-032] Preview links with a route: `preview` in job.json may include a path (e.g. `http://localhost:5193/steps/<id>`) so "Lihat preview" opens the page to check, not only the port → infra-032
- [x] [infra-033] Backlog bookkeeping after fe-009 merge: fe-013 and be-014 move to Siap (gelombang 6) → infra-033
- [x] [infra-034] Sync infra branch: sync factory/infra with origin/main after PR #11 (fe-009) and PR #12 (infra-032) merged → infra-034
- [x] [infra-035] PR button in the task detail drawer: the Job section shows "Buka PR #N" next to "Lihat preview" once the job has a pull request → infra-035
- [x] [infra-036] Job drawer buttons: PR and preview buttons in the job drawer (opened from a card in the Pull request column), under the branch name → infra-036
- [x] [infra-037] Task list in the infra job drawer: `GET /api/jobs/<id>/tasks` reads the task codes of the branch's commits on top of origin/main, and the infra drawer shows one button per task that opens its detail; also removes a stale duplicate `pr` key from `factory/jobs/infra/job.json` that made the dashboard show PR #10 instead of the open PR → infra-037
- [x] [infra-038] Infra task detail: the task detail of an infra task shows the open infra PR button and the list of all tasks in that PR (current one dimmed), each opening its own detail → infra-038
- [x] [infra-039] Preview rule for fe jobs: an fe job never sits in needs-human or pr without a running preview; it is stopped only while a builder or UX/UI reviewer runs in the worktree and when the PR is merged, never when the PR is opened; resume-check flags fe jobs in needs-human or pr whose preview is missing or down (also fixes its port regex, which ignored previews that carry a route) → infra-039
- [x] [infra-040] Preview route rule: an fe job's preview link opens the exact page the job added or changed (dynamic ids filled with a real id, asked from the user when it is theirs), never `/` or a parent page; resume-check flags fe previews that open `/` → infra-040
- [x] [infra-041] Stricter preview gates (builder writes `Preview route:` in build.md, no PR or "preview is up" with a bare port link, ask the user for their id first) and the infra PR's content is kept current: every pushed infra task is added to `factory/jobs/infra/pr-body.md` (the dashboard summary) and to the GitHub PR body; both now list infra-033…041 → infra-041
- [x] [infra-042] Task buttons survive the merge: `GET /api/jobs/<id>/tasks` falls back to the merged PR's own commits (via its merge commit) once the branch has nothing on top of origin/main, and the new `GET /api/tasks/<code>/group` gives any infra task its own PR button and sibling list, also for tasks from older merged PRs → infra-042
- [x] [infra-043] Infra tasks wait for merge: infra tasks in the open infra PR show "Merge PR di GitHub" (under "Butuh kamu") in the dashboard task list instead of "Selesai"; they become Selesai only once the PR is merged → infra-043
- [x] [infra-044] "Done means merged" rule in SKILL.md (Reporting): no task, infra included, is called done/selesai in the dashboard, pr-body.md, backlog text or messages until its PR is merged; before that it is "menunggu merge" → infra-044
- [x] [infra-045] Preview ids are looked up before asking the user: SKILL.md tells the orchestrator to grep the preview dev server log and the saved trip id for an id the user already opened → infra-045
- [x] [infra-046] Backlog format guard: repairs the infra-030, 034, 036, 038 and 043 lines that had no "Title: description" shape (the dashboard dropped them, so infra-043 was missing from the list), and `factory/resume-check.sh` now flags any backlog task line the dashboard cannot parse → infra-046
- [x] [infra-047] Keep merged branches on the remote: after a PR merges the orchestrator removes only the local worktree and branch and never deletes `factory/*` on the remote; the remote `factory/fe-011` deleted by mistake was restored → infra-047
- [x] [infra-048] Merged infra PRs stay in the Merged column: the single infra job card was overwritten by each new PR, so PR #14 and #16 vanished from the board; they are now archived as `infra-pr14` and `infra-pr16` (with their task lists and PR bodies), and SKILL.md tells the orchestrator to archive a merged infra PR before reusing the infra job → infra-048
- [x] [infra-049] Foldable backlog groups: the dashboard's task list groups (Butuh kamu, Berjalan, Siap dikerjakan, Diblokir, Selesai, …) are dropdowns that can be collapsed, and the folded ones are remembered in the browser → infra-049
- [x] [infra-050] Watcher repeats merged events: `factory/watch.sh` printed each PR merged/closed event once, so a missed notification (PR #18 was merged and detected within a minute but never handled) was lost; it now repeats the event about every five minutes while the job is still in stage `pr`, and SKILL.md says to act on the first one → infra-050
- [x] [infra-051] Complete command list: the dashboard footer and the factory skill description now list every command (/factory <feature>, next [n], run <code>, resume, watch, approve, rework); resume and watch were missing, and the footer commands have a one-line hint each → infra-051
- [x] [infra-052] Footer hover effect: each command in the dashboard footer highlights on hover, shows a help cursor and an instant hint bubble above it (also on keyboard focus), replacing the slow native title tooltip → infra-052
- [x] [infra-053] Sync infra branch after PR #20: bring origin/main (be-012 notifications merged by the user) into factory/infra so the open infra PR stays mergeable → infra-053
- [x] [infra-059] Backlog for Cari dan Gabung Jadwal MVP-1: 22 tasks (be-017 to fe-038 plus infra-060) in waves 8 to 13, with user stories and ticket details in .plans/2026-11-02-cari-jadwal-mvp1-stories-and-tickets.md → infra-059
- [x] [infra-058] Design docs and preview for Cari dan Gabung Jadwal: design document, UI direction spec and the HTML preview (.plans/design-preview/cari-jadwal-preview-v3.html) saved in the repo → infra-058
- [x] [infra-057] Sync main with merged PR #24: be-016 content flags merged on GitHub; backlog has no open items left → infra-057
- [x] [infra-056] Sync main with merged PR #22: be-014 step comments merged on GitHub; be-016 content flags moved to Siap → infra-056
- [x] [infra-055] Sync main with merged PR #21: fe-015 per-traveler step tracking merged on GitHub; factory/infra merged with origin/main → infra-055
- [x] [infra-054] Backlog bookkeeping: fe-015 claimed and running → infra-054
- [x] [infra-024] Vercel Web Analytics: installed by the user from the Vercel dashboard (GitHub PR #1: `@vercel/analytics` and `<Analytics />` in `src/app/layout.tsx`); merged into local main → infra-024
- [x] [infra-025] Spelling rule: worship term is always "Umrah" in both languages (never "Umroh"); brand is "Umra Hub" — AGENTS.md, spec and fe-004 requirements → infra-025
- [x] [infra-026] Merge via GitHub PR: approved jobs are pushed and opened as pull requests instead of merging into local main; `factory/watch.sh` streams dashboard requests and PR merged/closed events; dashboard gets a Pull request column and PR links → infra-026
- [x] [infra-027] Sync main via PR: publish the already-reviewed local main commits (fe-001, fe-002, be-003, infra-017…026) through one PR so job PRs show only their own commits; orchestrator's infra commits now always go through a PR → infra-027

## Siap — gelombang 1

- [x] [fe-002] Design refresh: restyle the app to the new visual direction in .plans/design-reference.png and the spec's updated Design Direction: replace the sand/gold tokens with a lavender-to-white gradient background, white large-radius cards with soft shadows, an indigo-violet primary, pastel icon-tile colours and a deep-navy dark theme; add reusable primitives in src/components/ui (Card, Chip/segmented control, round IconButton, primary pill Button with a white circular arrow badge, floating dark pill BottomNav with max 4 tabs, not mounted on the landing page yet) using inline SVG icons and no new dependencies; restyle the landing page to match the reference's first screen (CSS/SVG hero composition with floating icon chips, centred headline, indigo "Masuk dengan Google" pill CTA, still no auth); keep 44px tap targets, body text contrast ≥ 7:1 and text on indigo ≥ 4.5:1; update AGENTS.md's Design system section → 002-design-refresh
- [x] [be-003] DB schema: database schema migration for the MVP data model in the spec (preparation_steps, city_cost_overrides, trips, travelers, trip_step_config, trip_step_progress) with RLS so users only read and write their own trips; preparation_steps and city_cost_overrides are readable by any signed-in user → 003-db-schema
- [x] [be-005] Seed content: seed migration with the full preparation-step content from the spec (all timeline phases and categories, Bahasa Indonesia and English titles, summaries and detail markdown, dependencies, shared/individual default, IDR cost ranges, city cost overrides for flights from Jakarta, Surabaya, Medan, Makassar and Yogyakarta) → be-005
- [x] [fe-004] i18n: Bahasa Indonesia (default) and English with a language toggle in the header, all existing UI copy moved into message files, choice persisted in a cookie → fe-004

## Siap — gelombang 3

- [x] [be-006] Google auth: Google sign-in with Supabase Auth: the landing CTA starts Google OAuth, /auth/callback exchanges the code, middleware refreshes the session, every route except / and /auth/* redirects signed-out users to /, and a signed-in header shows the user's name, avatar and a sign-out button → be-006

## Siap — gelombang 4

- [x] [fe-007] Onboarding wizard: wizard for first-time signed-in users: departure city, travel month/year, passport status, number of travelers with names, disability and minor flags; on finish it creates the trip and travelers and lands on the trip page; users who already have a trip skip it → fe-007
- [x] [fe-008] Trip checklist: page /trips/[id] with steps grouped by timeline phase then category, each step an accordion with summary, estimated cost and a status control (not started / in progress / done), overall progress bar at the top → fe-008

## Siap — gelombang 5

- [x] [fe-009] Step detail: page /steps/[id] with the full guide markdown rendered safely, prerequisites, cost range adjusted for the trip's departure city, and a link back to the checklist; checklist accordions get a "Pelajari lebih lanjut" link to it → fe-009
- [x] [fe-010] Trip dashboard: multi-trip dashboard /dashboard listing the user's trips with progress, create a new trip via a short wizard, rename and delete a trip with confirmation; signed-in users land here; mounts the BottomNav → fe-010
- [x] [fe-011] Budget: page /trips/[id]/budget with per-step and per-phase cost ranges multiplied by traveler count where individual, total min–max in IDR with a simple bar chart, and the "harga perkiraan, dapat berubah" disclaimer → fe-011
- [x] [be-012] Notifications: in-app deadline reminders generated from the travel date and step timeline phases, a bell with unread count in the header, and a /notifications page to read and mark them read → be-012

## Siap — gelombang 6

- [x] [fe-013] Step dependencies: hybrid step dependencies — marking a step done while a prerequisite is not done shows a non-blocking warning naming the prerequisite, and blocked steps are visually marked in the checklist → fe-013
- [x] [be-014] Step comments: signed-in users can post and delete their own tips on a step detail page, newest first, with display name and avatar; requires a migration with RLS → be-014

## Siap — gelombang 7

- [x] [fe-015] Per traveler: trip owner can switch each step between shared and individual; individual steps show one status control per traveler and count toward progress per traveler → fe-015
- [x] [be-016] Content flags: a "Laporkan info usang" button on each step detail page that records a reason in a content_flags table (migration with RLS, users can only insert and read their own flags) → be-016

## Siap — gelombang 8

Cari dan Gabung Jadwal, MVP-1. Read first: `.plans/2026-11-02-cari-dan-gabung-jadwal-design.md` (what to build), `.plans/2026-11-02-ui-direction-spec.md` (look and feel), `.plans/2026-11-02-cari-jadwal-mvp1-stories-and-tickets.md` (user stories and per-ticket detail) and the HTML preview `.plans/design-preview/cari-jadwal-preview-v3.html` (reference screens; the preview wins for visuals). UI term is "Jadwal", never "sesi". These four have no dependencies and can run in parallel.

- [ ] [be-017] Trip dates per city: migration adding trips.planned_return_date and a trip_legs table (trip, city Makkah or Madinah, start and end date, sort order) with owner-only RLS and pgTAP tests; extend onboarding validation and createOnboardingTrip to accept the return date and one or two city legs (ticket be-017, story US-1)
- [ ] [be-019] Provider catalog schema: providers (muthawif or travel, name, bio, WhatsApp contact, bank account text, is_dummy), provider_affiliations (relationship type, status, dates, confirmed by both sides), provider_verifications (status, date, expiry, criteria met, reviewer; results only, never documents), service_types, provider_catalog_items and provider_reviews (stars 1 to 5, text, display name like "Siti R."), read-only RLS for signed-in users, pgTAP tests (ticket be-019, story US-10)
- [ ] [fe-022] New theme: replace the soft indigo tokens in src/app/globals.css with the sky theme from the UI direction spec (white background, light-blue cards without shadow, ink pill CTA, sky accent and hero gradients), remove the dark-mode block, load Plus Jakarta Sans with next/font, update design-tokens.test.ts for the light theme only, restyle the ui primitives (Button, Chip, Card, BottomNav) and update the Design system section of AGENTS.md including the relaxed photo rule; no page layout changes beyond what the primitives cause (ticket fe-022, story US-13)
- [ ] [be-034] Tip ratings: step_comment_votes table (one vote per user per comment, value +1 or -1, no voting on your own comment) with RLS and tests, Server Actions to vote and clear a vote, and the step detail loader ordering tips by most helpful then newest with vote counts and the viewer's own vote; UI comes in fe-035 (ticket be-034, story US-12)

## Menunggu

Gelombang 9
- [be-020] Jadwal schema: schedules (provider, service type, city, date, three deadlines, discussion and final group links, is_dummy), schedule_options (vehicle format, minimum, capacity, price in SAR), participations (trip, schedule, seats, status, created_by), payment_proofs, and an is_trip_member(trip_id) function used by every new policy (owner only for now); users may set only interested, fix, declined, cancelled and paid_claimed, while confirmed and lapsed are admin-only; pgTAP tests (ticket be-020, stories US-5 to US-8) (butuh: be-019)
- [fe-018] Onboarding dates: date step with a range calendar, duration chips, per-city dates (Makkah and Madinah) in the wizard and the new-trip wizard, wizard button labelled "Next"; reference screen "Onboarding tanggal" in the preview (ticket fe-018, story US-1) (butuh: be-017, fe-022)
- [fe-024] Beranda and navigation: /dashboard becomes the Beranda (greeting, active trip, tasks that need action, one "Cari jadwal untuk tanggalmu" CTA that is enabled once fe-025 exists), the old trip list moves to /trips (tab "Trip"), new header with bell and account menu, bottom nav and top nav; add tabs only for routes that exist. Open question: where account, language and sign-out live (proposal in the design doc section 10b: profile icon in the header opening a bottom sheet) (ticket fe-024, story US-2) (butuh: fe-022)
- [fe-035] Tip ratings UI: "Membantu" and "Kurang" buttons with counts on each tip in the step detail, own vote highlighted, "Paling membantu" tag on the top tip, sort control; reference screen "Detail langkah" in the preview (ticket fe-035, story US-12) (butuh: be-034, fe-022)

Gelombang 10
- [be-021] Dummy data: idempotent upsert migration with about 10 providers (muthawif and travel, some affiliated, one unverified), jadwal in Makkah, Thaif (day trip from Makkah) and Madinah for January 2027 with vehicle options, dummy reviews and catalog items, all is_dummy = true (ticket be-021, story US-14) (butuh: be-019, be-020)
- [be-031] Status notifications: database trigger inserting a notification for the trip owner when a participation status changes, with new notification types in the notifications table and fixed id and en copy keys (ticket be-031, story US-11) (butuh: be-020)
- [fe-033] Provider profiles: muthawif and travel profile pages (verified badge with date, prominent affiliation card, read-only reviews, catalog cards, available jadwal, WhatsApp button, unverified warning text "Belum diverifikasi Umra Hub. Periksa sendiri sebelum membayar.") and a catalog item detail page. Open question: catalog shape (proposal: card list opening a detail page) (ticket fe-033, story US-10) (butuh: be-019, be-021, fe-022)

Gelombang 11
- [be-023] Jadwal search: loader searchSchedules(trip, kinds) grouping results per city with day trips under their city, and a capacity function returning confirmed, fix and interested counts per option without exposing who the participants are (ticket be-023, stories US-3 and US-4) (butuh: be-017, be-020, be-021)
- [be-026] Participation actions: expressInterest, setSeats, cancelInterest, confirmAttendance, respondToOption as Server Actions with trip-membership checks, validation and a pure, tested status-transition table; no cancel after payment proof (ticket be-026, stories US-5 to US-7) (butuh: be-020)
- [be-028] Payment proof storage: private bucket, images only up to 1 MB, RLS so only the trip owner, the provider and admins can read, an upload action that sets paid_claimed, and a function that deletes proofs 30 days after the jadwal ends (scheduling it is a manual step noted in the PR) (ticket be-028, story US-8) (butuh: be-026)

Gelombang 12
- [fe-025] Cari: /cari search form (trip dates, per-city rows, kinds chips, "Kabari saya soal kursi kosong" toggle placeholder), results page with large city bands, muthawif tiles and the Thaif day trip under Makkah, and the "Semua muthawif" list; adds the Cari tab. Open question: tapping a tile opens the jadwal detail (proposal) (ticket fe-025, stories US-3 and US-4) (butuh: be-023, fe-024)
- [fe-027] Jadwal detail and interest: vehicle options with progress, seat stepper, deadlines, "Saya tertarik" CTA, state after interest, cancel dialog (ticket fe-027, stories US-4 and US-5) (butuh: be-026, be-023, fe-025)
- [fe-030] Jadwal saya: tasks that need action and the list of jadwal with status pills; adds the Jadwal saya tab (ticket fe-030, story US-9) (butuh: be-026, fe-024)
- [fe-029] Attendance and payment screens: konfirmasi hadir, tawaran opsi, final and pembayaran (bank account, copy button, proof upload, final group link) and the states after each action (ticket fe-029, stories US-6 to US-8) (butuh: be-028, fe-027)
- [fe-032] Notifications restyle: notifications page in the new style with rows for the new notification types (ticket fe-032, story US-11) (butuh: be-031, fe-022)

Gelombang 13
- [fe-036] New style for landing, onboarding steps and the trip list: apply the new layout patterns to /, the other onboarding steps and /trips including rename and delete dialogs, with no behaviour change (ticket fe-036, story US-13) (butuh: fe-022, fe-024)
- [fe-037] New style for checklist, step detail and budget: apply the new layout patterns to /trips/[id], /steps/[id] and /trips/[id]/budget with no behaviour change (ticket fe-037, story US-13) (butuh: fe-022)
- [fe-038] Final QA: check every new and restyled screen at 390, 768 and 1280, keyboard and screen reader basics, token contrast, Lighthouse mobile above 90 on key pages, id and en key parity, and empty and error states (ticket fe-038) (butuh: fe-018, fe-024, fe-025, fe-027, fe-029, fe-030, fe-032, fe-033, fe-035, fe-036, fe-037)
- [infra-060] Studio runbook for jadwal: admin notes for marking participants fix, confirmed or lapsed and for opening seat offers through Supabase Studio, with example SQL (ticket infra-060, story US-15) (butuh: be-026)

