---
name: factory
description: Run the software factory. Use when the user types /factory <feature>, /factory next, /factory approve <job-id>, or /factory rework <job-id> <note>. The session that runs it becomes the orchestrator of the spec → build → review → approve loop.
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
  The main checkout is the user's, and it may be dirty or on another branch.
  Only **Merge** touches it.
- Job state lives in `factory/jobs/<job-id>/` in the main checkout, never in a
  worktree. Each job has its own `job.json`, so sessions never write the same
  file.
- Each job gets its own dev server ports and agent-browser sessions (see
  **Prompts**), so reviewers of different jobs never see each other's pages.

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

Your own commits on `main` follow the same rule. Factory or tooling changes
that no backlog task covers get one first: add `- [x] [infra-<next NNN>] <Title>:
<what changed> → infra-<NNN>` under **Selesai** in `factory/backlog.md` and
commit with that code. Never commit without a task code.

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

### Merge

The merge happens in the main checkout, so it must be clean and on `main`:
`git status --porcelain -- . ':!factory/backlog.md' ':!factory/requirements'` prints nothing and
`git branch --show-current` prints `main`. `factory/backlog.md` is exempt: every
`/factory next` edits it, and job branches never touch it, so a dirty backlog
cannot conflict with the merge. If not, set `stage: "needs-human"` and tell the
user the job is approved but the main checkout is busy; they run
`/factory approve <job-id>` once it is clean. Otherwise:

```bash
git merge --no-ff factory/<job-id> -m "<task code> Merge factory/<job-id>"
git worktree remove <worktree>
git branch -d factory/<job-id>
```

Set `stage: "merged"`. If the merge fails, run `git merge --abort` (when a merge
is in progress), set `stage: "needs-human"` and tell the user why. If removing the
worktree fails, the job is still merged: tell the user what `git worktree remove`
printed. Never push.

### Needs human

Set `stage: "needs-human"`. The branch and its worktree stay for the human to
inspect. Tell the user which job is waiting, give the worktree path, and quote
`decision.md` (or the BLOCKED reason from `build.md`).

**Preview for fe jobs.** When the task code is `fe-*` and `build.md` says
`STATUS: READY`, start a preview so the user can look before deciding: in the
worktree, run `npm run dev -- --port <5103 + 10n>` in the background, wait until
it answers, and add `"preview": "http://localhost:<port>"` to job.json (the
dashboard shows it as a "Lihat preview" button). Give the user the link in your
message, plus the pages to open for this feature.

You may also start the preview earlier (e.g. while a round is waiting on a
reviewer that doesn't open pages) when the user wants to look; the dashboard
shows the button whenever `preview` is set.

**Stop the preview** (`kill $(lsof -tiTCP:<port> -sTCP:LISTEN)`) and drop
`preview` from job.json before **Merge**, before any builder (resume or rework)
or a UX/UI reviewer runs in that worktree, and when the job is merged.

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
# Run through bash: zsh aborts on an unmatched *.json glob.
mkdir -p factory/inbox/taken && bash -c 'while true; do
  for f in factory/inbox/*.json; do
    [ -e "$f" ] || continue
    b=$(basename "$f")
    mv "$f" factory/inbox/taken/ && echo "REQUEST $b $(tr -d "\n" < "factory/inbox/taken/$b")"
  done
  sleep 2
done'
```

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
