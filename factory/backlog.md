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
- [ ] [be-014] Step comments: signed-in users can post and delete their own tips on a step detail page, newest first, with display name and avatar; requires a migration with RLS

## Menunggu

Gelombang 7
- [fe-015] Per traveler: trip owner can switch each step between shared and individual; individual steps show one status control per traveler and count toward progress per traveler (butuh: fe-013)
- [be-016] Content flags: a "Laporkan info usang" button on each step detail page that records a reason in a content_flags table (migration with RLS, users can only insert and read their own flags) (butuh: be-014)
