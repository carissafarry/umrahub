---
name: factory
description: Run the software factory. Use when the user types /factory <feature>, /factory next [n], /factory run <code>, /factory resume, /factory watch, /factory approve <job-id>, or /factory rework <job-id> <note>. The session that runs it becomes the orchestrator of the spec → build → review → approve loop.
---

# Factory

You are the orchestrator for one job. You run the loop below, spawn every agent,
and are the only writer of your job's `job.json`. You never write code, specs,
reviews or decisions yourself. Agents do the work and each writes one file; you
move the job along and keep `job.json` current.

## The loop

```
feature → spec-writer → builder → [security, ux, ui, code] → WAIT FOR ALL
                           ▲                                      │
                           └──── any CHANGES: resume builder ◄────┤
                                                                  ▼ all PASS
                                     merge to main ◄─ APPROVE ─ approver ─ ESCALATE → needs-human
```

| Step         | Agent (`subagent_type`) | Writes                                      |
| ------------ | ----------------------- | ------------------------------------------- |
| spec         | `spec-writer`           | `spec.md`                                   |
| build        | `builder`               | `build.md` + commits on `factory/<job-id>`  |
| review       | `reviewer-security`     | `round-N/review-security.md`                |
|              | `reviewer-ux`           | `round-N/review-ux.md`                      |
|              | `reviewer-ui`           | `round-N/review-ui.md`                      |
|              | `reviewer-code`         | `round-N/review-code.md`                    |
| approve      | `approver`              | `decision.md`                               |

`MAX_RESUMES = 2`: after round 1 the builder can be resumed at most twice, so a
run has at most 3 review rounds. To change the factory, edit this file and the
agent files in `.claude/agents/`.

Every agent reads `AGENTS.md` (or `CLAUDE.md`) for the repo's setup, dev server,
validation commands and conventions. Nothing repo-specific lives in these files.

## Parallel jobs

Every job runs in its own git worktree on its own branch, so several jobs can run
at once, one per Claude session. To run three features, open three sessions in
this repo and start `/factory` in each. Your session orchestrates only the job it
started or was handed.

- Your session stays in the main checkout. Agents work in the job's worktree.
  The main checkout is the user's repo folder and lives on `factory/infra` (see
  **Prompts**); it may hold uncommitted backlog edits. Job work never touches it
  except the sync in **Merge**.
- Job state lives in `factory/jobs/<job-id>/` in the main checkout, never in a
  worktree. Each job has its own `job.json`, so sessions never write the same
  file.
- Each job gets its own dev server ports and agent-browser sessions (see
  **Prompts**), so reviewers of different jobs never see each other's pages.

## Capacity (workflow-003)

Running many jobs at once overloads the machine (the shared local Supabase stack and several
`next build` and test runs at the same time) and burns tokens on waiting. So at most **2 jobs run
agents at once, and at most 1 of them uses the local Supabase stack** (every `be-*` job, or any job
whose `job.json` has `"db": true`). A job holds a slot only in stage `spec`, `build`, `review` or
`approve`; `pr`, `needs-human` and `merged` hold none.

Before you start a job, resume one (`/factory resume`, a builder resume, `/factory rework`) or spawn
any agent for a job that is not running yet, run:

```bash
node factory/capacity.mjs check <job-id>   # exit 0 = go, exit 2 = wait
node factory/capacity.mjs status           # who holds the slots
```

On exit 2 do not start it: tell the user which jobs hold the slots and start it when one leaves the
four stages. `/factory next <n>` claims only as many items as `status` leaves room for. Limits can be
changed with `FACTORY_MAX_JOBS` and `FACTORY_MAX_DB_JOBS`. Pick the next job so that the free slot is
not wasted: a front-end job can run next to a database job, but not two database jobs.

## Files

`<repo>` is the main checkout (`git rev-parse --show-toplevel` from your
session) and `<name>` is its folder name. `factory/jobs/` is gitignored runtime
state that never lands in a commit.

```
<repo>/factory/backlog.md                      queue for /factory next
<repo>/factory/jobs/<job-id>/job.json          the job's state (you write it, the dashboard reads it)
<repo>/factory/jobs/<job-id>/spec.md
<repo>/factory/jobs/<job-id>/build.md
<repo>/factory/jobs/<job-id>/rework-<k>.md     written by you, from /factory rework
<repo>/factory/jobs/<job-id>/round-<N>/review-{security,ux,ui,code}.md
<repo>/factory/jobs/<job-id>/decision.md
<repo>/../<name>-factory/<job-id>/             the job's worktree, on factory/<job-id>
```

### job.json

```json
{ "id": "003-rate-limiting", "feature": "Rate limit the signup form",
  "branch": "factory/003-rate-limiting",
  "worktree": "/Users/you/code/my-app-factory/003-rate-limiting",
  "stage": "review", "round": 2,
  "reviews": { "security": "CHANGES", "ux": "PASS", "ui": "pending", "code": "PASS" } }
```

- `stage` is one of `spec`, `build`, `review`, `approve`, `merged`,
  `needs-human`. Worktree setup counts as `spec`.
- `round` is the current review round (0 until the first round starts).
- `reviews` holds the current round only. Each value is `pending`, `PASS` or
  `CHANGES`. Earlier rounds live in their `round-<N>/` folders, which the
  dashboard reads directly.
- Rewrite the whole file on every change. `worktree` is always an absolute path.

### Prompts

Every agent prompt starts with the job's absolute paths:
`Job folder: <repo>/factory/jobs/<job-id>/. Worktree: <worktree>. Branch: factory/<job-id>.`
Below, `<paths>` stands for that sentence.

Every agent prompt also ends with ` Task code: <type>-<NNN>.` (for jobs from
the backlog). Every commit in that job is `<type>-<NNN> <message>`, no brackets.

**Nothing is ever committed on `main`, not even the local `main` ref.** All
infra, tooling and factory changes go on one long-lived branch, `factory/infra`,
and reach `main` only through a pull request the user merges. The main checkout
(the repo folder this session runs in) stays on `factory/infra`; local `main` is
a read-only mirror of `origin/main`, moved only with `git fetch origin main:main`.
Job branches and worktrees start from `main` (fetch it first), so they never
carry infra commits and job PRs show only their own commits.

Infra workflow: edit in the main checkout, commit with the task code
(`infra-<NNN> <message>`; commit pending `factory/backlog.md` and
`factory/requirements` changes the same way), `git push -u origin factory/infra`,
and keep **one open PR** from `factory/infra` to `main`: if
`gh pr list --head factory/infra --state open` shows none, create it, then set its title (see **Merge**) to
`Merge PR #<N> from /factory/infra: infra-030, infra-029, infra-028`
(every task code in the PR, newest first; update the title whenever you push
another task to the open PR; body listing every task code, no AI attribution), otherwise the push updates it.
**Every push of a new infra task also updates the PR's content**: add a
section for it to `factory/jobs/infra/pr-body.md` (the dashboard shows this file
as the job's summary) and send the whole file as the PR body with
`gh api -X PATCH repos/carissafarry/umrahub/pulls/<N> -F body=@factory/jobs/infra/pr-body.md`.
A summary that lists only some of the PR's tasks is a bug. Track it in
`factory/jobs/infra/job.json` (`stage: "pr"`, `pr: <url>`) and tell the user the
link. Never rename or delete `factory/infra` on GitHub: that closes its PR.
Infra changes reach job worktrees (AGENTS.md rules, agent files) only after the
PR is merged.

Spec changes use their own code type, `spec-NNN` (see AGENTS.md): when you or a builder must change a spec or design document under `.plans/`, add a `[spec-NNN]` line under **Selesai** first (next number from the global counter) and commit it on `factory/infra` as `spec-NNN <message>`; it rides the infra PR. Never fold a spec edit into an infra, be or fe commit.

Changes to the AI workflow itself (agent files and models, prompts, this skill's loop, a driver script, context-saving rules) use their own code type, `workflow-NNN` (own counter from 001), on their own branch `factory/workflow-NNN` with their own PR, and add a row to `factory/workflow-log.md` (see AGENTS.md). Their backlog line goes on `factory/infra` under **Selesai**.

Your own commits (on `factory/infra`) follow the same task-code rule. Factory or tooling changes
that no backlog task covers get one first: add `- [x] [infra-<next NNN>] <Title>:
<what changed> → infra-<NNN>` under **Selesai** in `factory/backlog.md` and
commit with that code. The `: ` after the short title is required: the
dashboard drops any backlog line without it, so the task is missing from the
list while its code still shows up in commits and PR titles. Take the next
number from the highest `infra-NNN` in the backlog and add the line **before**
you mention the code anywhere. `factory/resume-check.sh` flags unparseable lines. Never commit without a task code, and **never add a
`Co-Authored-By: Claude` (or any AI attribution) trailer** to any commit or
merge — the user's most important rule.

Agents that open pages also get a port. With `n` the job number (`fe-004` → 4),
the builder gets `5100 + 10n`, `reviewer-ux` gets `5101 + 10n` and `reviewer-ui`
gets `5102 + 10n`, appended as ` Port: <port>.`

## /factory <feature>

1. **Create the job.** `mkdir -p factory/jobs`, then pick the next 3-digit number
   after the highest numbered folder in `factory/jobs/` (`001` if there are
   none) and a 2–4 word kebab-case slug of the feature: `004-blog-reading-time`.
   Claim it with `mkdir factory/jobs/<job-id>` (no `-p`). If that fails because
   another session took the number, pick the next number and try again.
   The worktree path is `$(cd .. && pwd)/$(basename "$PWD")-factory/<job-id>`,
   run from `<repo>`. Write `job.json` with that `worktree`, `stage: "spec"`,
   `round: 0` and all reviews `pending`.
2. **Worktree.** Create the branch and its worktree from `main`:
   ```bash
   git fetch origin main:main    # main is a read-only mirror of origin/main
   git worktree add -b factory/<job-id> <worktree> main
   ```
   Then, in the worktree, run the setup AGENTS.md gives for a fresh checkout
   (installing dependencies, for example). If any of it fails, stop and tell
   the user.
3. **Spec.** Spawn `spec-writer` with the prompt
   `<paths> Feature: <feature, verbatim>`.
   Wait for it to finish, then check that `spec.md` exists.
4. **Build.** Set `stage: "build"`. Spawn `builder` **with the name
   `builder-<job-id>`** and the prompt `<paths> Build round 1. Port: <port>.`
   Wait for it to finish, then go to **Build check**.

### Build check

Read the first line of `build.md`.

- `STATUS: READY`: start the next review round.
- `STATUS: BLOCKED`: go to **Needs human**.

### Review round N

1. Set `stage: "review"`, `round: N` and all four reviews to `pending`. Create
   `factory/jobs/<job-id>/round-<N>/`.
2. Spawn all four reviewers **in one message**, so they run in parallel. Each
   gets the prompt `<paths> Review round N.`, plus its port for `reviewer-ux`
   and `reviewer-ui`.
3. **WAIT FOR ALL.** Each time a reviewer finishes, read the first line of its
   file (`VERDICT: PASS` or `VERDICT: CHANGES`) and write that verdict to
   `job.json` straight away, so the dashboard chips fill in as they land. The
   round is done only when all four `review-*.md` files exist in `round-<N>/`.
   Never resume the builder mid-round. If a reviewer finishes without writing
   its file, or writes a first line that isn't a verdict, stop and tell the user.
4. Decide:
   - **All PASS**: go to **Approve**.
   - **Any CHANGES, resumes left**: set `stage: "build"`, then resume the same
     builder with `SendMessage` to `builder-<job-id>`:
     `Round N reviews are in factory/jobs/<job-id>/round-<N>/. Address every review with VERDICT: CHANGES, commit, and update build.md for round N+1.`
     Wait for it to finish, then go to **Build check**.
   - **Any CHANGES, no resumes left**: write `decision.md` yourself, reading
     `ESCALATE`, then a blank line, then
     `Review rounds exhausted. Outstanding CHANGES in round-<N>/ from: <reviewers>.`
     Go to **Needs human**.

### Approve

Set `stage: "approve"`. Spawn `approver` with the prompt `<paths> Final round: N.`
When it finishes, read the first line of `decision.md`:

- `APPROVE`: go to **Merge**.
- `ESCALATE`: go to **Needs human**.

### Merge (via GitHub pull request)

Jobs never merge into `main` locally. The user merges every job on GitHub.

1. For `fe-*` jobs, make sure the preview is **running** (see **Preview for fe
   jobs**); start it if it is not. Never stop it here: it stays up while the PR
   is open so the user can look before merging.
2. Push the branch: `git -C <worktree> push -u origin factory/<job-id>`.
3. Open the PR:
   ```bash
   gh pr create --repo carissafarry/umrahub --base main --head factory/<job-id> \
     --title "Merge PR #0 from /factory/<job-id>" \
     --body-file <job folder>/pr-body.md
   ```
   The PR number is only known after creation, so right away set the real title
   (`gh pr edit` fails on this repo; use the API):
   `gh api -X PATCH repos/carissafarry/umrahub/pulls/<N> -f title="Merge PR #<N> from /factory/<job-id>"`.
   The repo uses the PR title as the merge commit's title, so every PR merge
   reads `Merge PR #<N> from /factory/<job-id>` (no owner prefix, no
   task code; GitHub turns `#N` into a link on the web, git itself cannot store
   markdown links), while ordinary commits stay `<task code> <message>`.
   Write `pr-body.md` first (it is runtime state): a short summary of what the
   branch does (from build.md), the acceptance criteria with ✅/❌, the final
   review verdicts, the approver's `decision.md` "Why" (or "approved by the
   user" for `/factory approve`), anything the user must do after merging
   (e.g. `supabase db push`), and the preview link for fe jobs. **No AI
   attribution of any kind** in the title or body.
4. Set `stage: "pr"` and add `"pr": "<url>"` to job.json (an `fe-*` job keeps
   its `preview` there). Tell the user the PR link and, for `fe-*` jobs, the
   preview link with the page to open. Never merge the PR yourself, and never
   push to `main`.

**When a PR is merged** (the watcher prints `PR <job-id> MERGED <url>`):
sync the main checkout with GitHub. Commit any pending `factory/backlog.md` /
`factory/requirements` changes on `factory/infra` (`infra-<NNN> …`), run
`git fetch origin main:main`, then bring `factory/infra` up to date: when it has
no commits outside `origin/main` (`git rev-list --count origin/main..factory/infra`
is 0) run `git merge --ff-only origin/main`; otherwise
`git merge origin/main -m "infra-<NNN> Sync main with merged PR"` and push.
Then, for an ordinary job, `git worktree remove <worktree>`,
and `git branch -d factory/<job-id>`. **Delete only the local branch: never
delete a merged `factory/*` branch on the remote** (no `git push origin
--delete`, no "delete branch" through `gh`), the user keeps them. If one was
deleted by mistake, restore it from its last commit with
`git push origin <sha>:refs/heads/factory/<job-id>`. For the long-lived `infra` job keep the
branch and checkout: just do the sync; the next infra commit opens a new PR.
**Before the infra job is reused for the next PR, archive the merged one** so it
stays in the dashboard's Merged column: create `factory/jobs/infra-pr<N>/` with
a copy of the infra `job.json` (`id: "infra-pr<N>"`, `stage: "merged"`, the
merged `pr` url, and a `feature` like `Infra PR #<N>: infra-0AA sampai infra-0BB
(<short summary>)`) and the PR's final `pr-body.md` (`gh pr view <N> --json body
--jq .body`). Only then set the infra `job.json` to the new PR. Never overwrite a
merged infra PR's card with the next PR.
Stop the job's preview first (see **Stop the preview**) and drop `preview` from
job.json.
Set `stage: "merged"`, keep the `pr` url, and promote unblocked backlog items.
Tell the user, including any post-merge step from the PR body.

**When the PR is closed unmerged** (`PR <job-id> CLOSED`): set
`stage: "needs-human"` and ask the user what to do; keep the branch, the
worktree and the preview.

### Needs human

Set `stage: "needs-human"`. The branch and its worktree stay for the human to
inspect. Tell the user which job is waiting, give the worktree path, and quote
`decision.md` (or the BLOCKED reason from `build.md`).

**Preview for fe jobs (hard rule).** An `fe-*` job must never be in
`needs-human` or `pr` (and the PR must never be opened) without a running
preview. As soon as `build.md` says `STATUS: READY`, and again every time a
builder or a UX/UI reviewer has finished in that worktree, start it: copy the
main checkout's `.env.local` into the worktree if it is missing (it is
gitignored), run `npm run dev -- --port <5103 + 10n>` there in the background,
wait until it answers, and add `"preview": "http://localhost:<port><route>"` to
job.json (the dashboard shows it as a "Lihat preview" button). Give the user the
link in your message, plus any other pages to open for this feature, in the
message that reports a decision or a PR.

**Hard gates, no exceptions.** (1) Every builder prompt for an `fe-*` job also
ends with ` Preview route: write the exact page(s) to check, as paths, on a line
"Preview route: <path>" in build.md.` and you read that line to fill `<route>`.
(2) Never tell the user "the preview is up" or open the PR with a bare
`http://localhost:<port>/` link: the message and job.json must carry the full
link to the specific page, as a clickable URL. (3) If `<route>` needs an id that
belongs to the user and you don't have it, ask for it right then and wait; do
not open the PR, start with `/`, or promise to fix it later. (4) After you set
`preview` in job.json, re-read the job.json and the message and check the path
is not empty and not `/`.

**`<route>` is the exact page the job added or changed** (for fe-011:
`/trips/<id>/budget`), never just the port, never `/`, and never a parent or
entry page the user has to click through from. Take it from the spec and
`build.md`. Fill dynamic segments with a real id: seeded content ids are fixed
(steps are `5eed0000-0000-4000-8000-0000000000NN`); an id that belongs to the
user (a trip, for example) is looked up before it is asked: grep the preview dev
server log (`grep -oE 'GET /trips/[0-9a-f-]{36}' <log>`, the log you started the
preview with) and the memory note `reference_preview_trip_id` for an id the user
already opened. Only when nothing is there, ask the user once; then use it and
keep it for later previews. If you don't have such an id yet, ask for it
before reporting the preview; do not fall back to `/`. When a job touches
several pages, `<route>` is the main one and the message lists the rest.
`factory/resume-check.sh` flags an fe job whose preview opens `/`.

You may also start the preview earlier (e.g. while a round is waiting on a
reviewer that doesn't open pages) when the user wants to look; the dashboard
shows the button whenever `preview` is set.

**Stop the preview** (`kill $(lsof -tiTCP:<port> -sTCP:LISTEN)`) and drop
`preview` from job.json only (1) before any builder (resume or rework) or a
UX/UI reviewer runs in that worktree, because two dev servers in one worktree
clash, and (2) when the job's PR is merged. Case (1) is temporary: start it
again right after that agent finishes. Never stop it just because the PR was
opened.

## /factory next

Read `factory/backlog.md` and take the first `- [ ]` item. Claim it with one
Edit that replaces its exact line with `- [x] <item> → claimed`. If the Edit
fails because the line changed, another session claimed it: re-read the backlog
and try the next `- [ ]` item. If none is left, say so and stop.

Backlog items look like `[<type>-<NNN>] <Title>: <description>`. The task code
`[<type>-<NNN>]` fixes the job id: in step 1 use `<type>-<NNN>` (e.g. `fe-004`)
as `<job-id>` instead of picking a number and slug, so the branch is
`factory/fe-004`, and pass `<Title>: <description>` as the feature. An item
whose type is still `?` must be triaged first. Run `/factory <item>`, and once
step 1 has given it a job id, replace `claimed` on its backlog line with the
job id.

`/factory next <n>` claims the first `n` runnable items and runs them as
parallel jobs from this session: each job has its own job.json, worktree,
ports and named builder, and you step each one through the loop as its agents
finish. Merges still happen one at a time.

After a job merges, move every **Menunggu** item whose `(butuh: ...)` codes are
all merged into **Siap** as a `- [ ]` line, without the suffix.

Before claiming anything, `/factory next` runs **Triage** if the backlog has a
`## Baru — belum dicek` section with items in it.

## Triage

The user adds tasks from the dashboard; the server gives each a code and puts it
under `## Baru — belum dicek` as `- [<type>-NNN] <Title>: <description>`, with
type `?` when the user left it to you. Such an item is never run until it has
been triaged. For each one:

1. Read `.plans/umrohhub-mvp-spec.md`, the rest of the backlog, AGENTS.md and the
   code the task would touch.
2. Work out its requirements:
   - **Dependencies**: which backlog codes must be merged first (the pages,
     tables, components or auth it builds on), and which running or ready items
     touch the same files and so must not run alongside it.
   - **Missing decisions**: product or business choices the text leaves open
     (copy, pricing, what is free, who can see what).
   - **External setup**: keys, accounts, provider config or a migration a human
     must push before it can work.
   - **Size**: if it is really several jobs, propose the split.
   - **Type**: `infra` (tooling, CI, deploy, factory), `be` (database, auth,
     server logic) or `fe` (pages and UI). Replace `?` with it.
3. Tell the user, per task, in a few lines: the dependencies, the open
   decisions and the external setup. Ask about every open decision and wait for
   the answers; never guess them.
4. Rewrite the item (with the user's answers folded into its text) and move it:
   to **Siap** as `- [ ] [<type>-NNN] <Title>: <feature>` when every dependency is merged,
   otherwise to **Menunggu** under the right wave with `(butuh: <codes>)`.
   Remove the `## Baru — belum dicek` heading once it is empty.

## /factory run <code>

Triage the item first if it is still under **Baru**. Then, if it is in
**Siap**, claim and run it exactly like `/factory next` does. If it is in
**Menunggu**, list which of its dependencies are not merged yet and stop.

## Dashboard requests and /factory watch

The dashboard's job drawer lets the user approve or rework a `needs-human` job.
The server writes each decision to `factory/inbox/<epoch>-<job-id>.json`:
`{ "job", "action": "approve" | "rework", "note", "createdAt" }`. A request is
the user's own command, exactly as if they had typed it.

`/factory watch` (and every orchestrator session that has run `/factory next`
or `/factory run`) keeps a Monitor on the inbox for as long as the session is
open, re-arming it each time it expires (30 minutes):

```bash
bash factory/watch.sh   # from the repo root
```

It emits `REQUEST <file> <json>` for dashboard requests and
`PR <job-id> MERGED|CLOSED <url>` when a job's pull request leaves the open
state (see **Merge**). A `MERGED`/`CLOSED` event repeats about every five minutes
for as long as the job's stage is still `pr`, so a missed one comes back: act on
the first one at once (run the "When the PR is merged" steps) and set the job's
stage so it stops. When you re-arm the watcher after editing `watch.sh`, stop the
old Monitor first (the running script keeps the old code).

For each `REQUEST` event with `"kind": "decision"`:
- `approve`: run `/factory approve <job>`. A non-empty note is only a comment;
  put it in the merge report to the user.
- `rework`: run `/factory rework <job> <note>`.
- Then delete `factory/inbox/taken/<file>` and tell the user what you started,
  in one line. If the job is no longer `needs-human`, delete the file and tell
  the user why nothing ran.

For each `REQUEST` with `"kind": "requirements"` (the "Generate requirement"
button), write the task's requirement doc yourself; this is backlog grooming,
not job work:
1. Read the backlog item, `.plans/umrohhub-mvp-spec.md`, AGENTS.md, the docs of
   the tasks it depends on (`factory/requirements/<code>.md` where they exist)
   and the code it would touch. If the doc already exists, it may hold the
   user's edits: copy it to `factory/requirements/<file>.prev.md` and treat it
   as input — keep every decision the user wrote unless the request's `note`
   says otherwise. Follow the `note` as the user's instruction.
2. Write `factory/requirements/<code with ? as q>.md` in Bahasa Indonesia:
   ```markdown
   # [<code>] <Title>
   ## Ringkasan            — 2–3 kalimat: masalah dan hasil yang diinginkan
   ## User story           — "Sebagai …, saya ingin …, supaya …"
   ## Alur pengguna        — langkah bernomor, termasuk jalur gagal
   ## Kebutuhan fungsional — daftar bernomor, masing-masing bisa diuji
   ## Kasus tepi           — data kosong, error, belum login, mobile, dll.
   ## Data & backend       — tabel/kolom/RLS/endpoint yang dipakai atau dibuat
   ## UI & copy            — halaman, komponen dari src/components/ui, teks kunci
   ## Kriteria selesai     — checklist yang bisa dicek reviewer
   ## Di luar cakupan
   ## Pertanyaan terbuka   — keputusan produk yang belum jelas (jangan ditebak)
   ## Dependensi           — kode task yang harus selesai dulu
   ```
3. Delete the inbox file and tell the user in one line that the doc is ready,
   with its open questions.

When a task with a requirement doc is claimed (`/factory next` or `/factory
run`), commit the doc on `main` first (`<code> Add requirements`) so the
worktree has it, and add ` Requirements: factory/requirements/<file>.md (the
user-approved detail; it overrides the backlog line where they differ).` to the
spec-writer prompt. `factory/requirements/` is exempt from the clean-checkout
check in **Merge**, like `factory/backlog.md`.

On start, also process any files already in `factory/inbox/taken/` (left by a
session that closed mid-request) and in `factory/inbox/`.

## /factory resume — the factory restarts itself with the session

**Rule: the factory never depends on one session staying alive.** When a session
ends, its watcher, its background agents and its previews die with it, but job
state lives on disk (`factory/jobs/*/job.json`, `factory/inbox/`, git, GitHub).
So every new or resumed session continues the factory by itself, without being
asked.

The `SessionStart` hook in `.claude/settings.json` runs
`factory/resume-check.sh`, which prints the real state: unprocessed dashboard
requests, PRs that were merged or closed while nobody watched, jobs stuck in
`spec`/`build`/`review`/`approve`, previews that went down, and whether `main`
is in sync. **Treat every `!` line as your to-do list and act on it at once**;
only stop for decisions that are the user's. `/factory resume` does the same by
hand (run `bash factory/resume-check.sh` first if you have no report).

1. **Bring the servers back**: the dashboard server (`node factory/server.mjs`,
   background, port 8000) dies with the session, so start it again when port 8000
   is down and give the user the link (http://localhost:8000/dashboard.html).
   Then re-arm the watcher: Monitor `bash factory/watch.sh`, and re-arm it every
   time it expires. Never report the factory as resumed until both are up.
2. **Dashboard requests**: process everything in `factory/inbox/taken/` and
   `factory/inbox/` as the user's own commands (see **Dashboard requests**). A
   request is never "nothing to do"; if you can't tell what it asks, ask.
3. **PRs**: for each job in stage `pr`, if the PR is `MERGED` run the
   "When the PR is merged" steps; if `CLOSED`, set `needs-human` and ask.
4. **Interrupted jobs**: agents from a dead session are gone, so a
   `SendMessage` to an old name may fail; then spawn a fresh agent with the
   same `<paths>` prompt plus "Continue: check `git status` and
   `git log --oneline main..HEAD` in the worktree first and don't redo finished
   work". By stage:
   - `spec`: `spec.md` exists → go on to build; otherwise run `spec-writer`.
   - `build`: `build.md` starts with `STATUS: READY` → **Build check**;
     otherwise resume (or respawn) the builder.
   - `review`: look at `round-<N>/`; spawn **only** the reviewers whose
     `review-*.md` is missing, record verdicts already on disk, then decide as
     usual.
   - `approve`: `decision.md` exists → read it; otherwise respawn `approver`.
5. **`needs-human` and `pr` jobs**: every `fe-*` job here must have a running
   preview. Restart a dead one on its port, start one that is missing (see
   **Preview for fe jobs**), and remind the user which jobs wait for them.
6. **Sync**: make sure the main checkout is on `factory/infra`, local `main` is
   `origin/main` (`git fetch origin main:main`), `factory/infra` is up to date
   with `origin/main`, and any infra commits have an open PR (see **Prompts**);
   promote unblocked backlog items.
7. **Report** in a few lines: what you recovered, what is running, what waits for
   the user.

## /factory approve <job-id>

The job must be in `needs-human`. Run **Merge** with that job id.

## /factory rework <job-id> <note>

The job must be in `needs-human`.

1. Write the note, verbatim, to `factory/jobs/<job-id>/rework-<k>.md`, where `k`
   is the next unused number.
2. Set `stage: "build"`.
3. Spawn a fresh `builder` named `builder-<job-id>` with the prompt
   `<paths> Rework: read rework-<k>.md and address it, then update build.md for round N+1. Port: <port>.`
   (`N` is the job's last round.) A rework run gets a fresh `MAX_RESUMES`.
4. Continue from **Build check**, exactly like a new job.

## Reporting

Keep the user posted with one short line per transition, for example
`003-rate-limiting: round 2, security CHANGES, ux/ui/code PASS → resuming builder`.
When the job ends, say whether it merged or needs a human, and why.

**Done means merged (hard rule, every task type).** A task, infra tasks
included, is never called "done", "selesai" or "finished" — in the dashboard,
in `pr-body.md`, in the backlog text or in a message to the user — until its PR
is merged on GitHub. Between the commit and the merge it is "menunggu merge" /
"waiting for merge" (the dashboard shows infra tasks of the open infra PR as
"Merge PR di GitHub"). Checking an infra task off under **Selesai** in
`factory/backlog.md` at commit time is only bookkeeping; the dashboard, not the
checkbox, decides what counts as done, and any report you write says "waiting
for merge" until the `PR … MERGED` event arrives. Never build a dashboard
status or a report that treats a checked-off task as done without looking at
its PR.

## Driver

`node factory/driver.mjs run <job-id>` is an alternative way to run **one job**
through this loop without an orchestrator conversation: a Node script that starts
each agent as a fresh `claude -p` process, resumes the builder session on
CHANGES, writes `job.json` and `usage.jsonl`, and opens the PR. It never merges.
It does not replace this skill: the loop above remains the reference, and the
driver must match it. See `factory/driver.md`.
