# Factory driver

`factory/driver.mjs` runs one job through the factory loop of
`.claude/skills/factory/SKILL.md` (the reference) with a Node script instead of a
long-lived orchestrator conversation. Node 20, no dependencies.

```bash
node factory/driver.mjs run <job-id> [--from spec|build|review|approve] [--dry-run]
                                     [--permission-mode <mode>] [--allowed-tools "<rules>"]
                                     [--agent-timeout <minutes>]
node factory/driver.mjs usage <job-id>
node --test factory/driver.test.mjs      # tests, fake claude/gh/git/npm on PATH
```

The job must already exist (`factory/jobs/<job-id>/job.json`, worktree created and
set up, as in SKILL.md "/factory <feature>" steps 1 and 2). The repo root is found
with `git rev-parse --git-common-dir`, so the script can run from the main checkout
or from any worktree.

## What it does

spec (skipped if `spec.md` exists) -> builder -> four reviewers in parallel ->
decide -> on CHANGES resume the **same builder session** (at most `MAX_RESUMES = 2`,
so 3 rounds) -> approver -> on `APPROVE`: write `pr-body.md`, push the branch,
`gh pr create` with title `Merge PR #0 from /factory/<job-id>`, then
`gh api -X PATCH` to the real title. Stage becomes `pr`. It never merges and never
pushes to `main`; the user merges on GitHub, then the orchestrator does the merge
cleanup from SKILL.md.

Each agent is `claude -p --agent <name> --output-format json --permission-mode <m>
--add-dir <worktree> --allowedTools ...`, with the prompt on stdin (the text from
SKILL.md "Prompts"). The process runs in the main checkout, where `.claude/agents`
lives. Restarting is safe: a rerun continues from `job.json`'s stage, skips reviews
already on disk, and finds the builder session in `usage.jsonl`.

It sets `stage: needs-human`, prints why, and exits non-zero on: builder
`STATUS: BLOCKED` (or any status other than READY), approver `ESCALATE`, exhausted
rounds (it writes the `ESCALATE` decision.md like SKILL.md), a reviewer without a
`VERDICT:` first line, a failed, errored, empty or timed-out agent run, an agent that did not
write its file, and (fe jobs) a missing or `/` preview route. It never retries.

`job.json` is rewritten on every transition (verdict chips fill in as reviewers
finish), so `dashboard.html` keeps working. `driver.log` in the job folder has the
transitions.

## fe-* jobs

After the builder is READY and after each review round the driver starts
`npm run dev -- --port <5103 + 10n>` in the worktree (copies `.env.local` if
missing), reads the `Preview route:` line of `build.md` and sets `preview` to the
full URL. It stops the server before the builder and before UX/UI reviewers and
starts it again after. The route must be a specific path: missing, `/` or one with a
placeholder like `<id>` or `[id]` stops with needs-human (an id owned by the user is the
orchestrator's/human's to look up). The preview is also started on needs-human and
before the PR, and left running.

## Permissions

The driver never passes `--dangerously-skip-permissions` and refuses
`--permission-mode bypassPermissions`. Default mode is `acceptEdits` (file edits in
the working directory and `--add-dir`); override with `FACTORY_PERMISSION_MODE` or
`--permission-mode` (flag wins).

A headless run cannot ask, so any tool that is not pre-allowed is denied. The agents
run Bash for `git`, `npm`, `npx`, `node`, `supabase`, `gh`, `agent-browser`, `lsof`
and `curl`. The default `--allowedTools` is
`Bash(git:*) Bash(npm:*) Bash(npx:*) Bash(node:*) Bash(supabase:*) Bash(gh:*) Bash(agent-browser:*) Bash(lsof:*) Bash(curl:*) Bash(ls:*) Bash(cat:*) Bash(grep:*) Bash(head:*) Bash(tail:*) Bash(wc:*) Bash(cd:*) Bash(pwd:*) Bash(sort:*) Bash(diff:*) Bash(nohup:*) Bash(kill:*) Bash(sleep:*)`.
The six after `curl` (workflow-006) are read-only: be-061's reviewers and approver were denied Bash for such reads.
`cd`, `pwd`, `sort` and `diff` (workflow-014) are read-only too: the agent files tell every command to start with `cd <worktree> && `, and a `&&` chain is allowed only when each part is, so be-064's reviewers, approver and builder were denied almost every Bash call (see `driver.log`).
`find` and `sed` are left out on purpose (`find -delete/-exec`, `sed -i` write files); agents use Glob, Grep and Read with
offset/limit instead. Nothing that deletes, pushes outside `git`, or writes outside the job folder is added.
Change it with `FACTORY_ALLOWED_TOOLS` or `--allowed-tools "<rules>"`, or put the
rules in `.claude/settings.json` `permissions.allow` (settings and flag rules add up).
Optional spend cap per agent run: `FACTORY_MAX_BUDGET_USD`.

When an agent is denied a tool it usually keeps going or reports it. The driver
logs `permission_denials` from the result (the tool names, then one line per denial with the command text, one line, truncated to 120 characters, so you can see which rule to allow), and stops with needs-human when the run
is an error, has an empty result, or did not write its expected file (a stale file
from an earlier round does not count: the mtime must be newer than the run start).
It does not loop.

## Agent timeout (workflow-006)

Every agent run is limited to 45 minutes (`FACTORY_AGENT_TIMEOUT_MIN`, or `--agent-timeout <minutes>`; the flag wins;
must be above 0). When it passes, the driver stops only the `claude` process it started (SIGTERM via `execFile`, never by
name), sets needs-human with "<agent> timed out after N min" and does not retry. Rerunning continues from `job.json`.

## Failed agent: real error text (workflow-007)

When `claude -p` exits without a JSON result, the stop reason now carries the exit code or signal, the end of stderr and
the start of stdout (one line each), and the full text is saved in the job folder as `agent-error-<agent>.txt`. When the
agent ends with an error result, its `result` text and `errors` are appended to the reason (300 characters).

## Usage

`usage.jsonl` (job folder) gets one line per agent run: `ts, job, task, feature (first 400 characters of the task text), stage, agent (builder, reviewer-code, reviewer-security, reviewer-ux, reviewer-ui, ...), round, sessionId, promptChars,
resumed, model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens,
costUsd, durationMs, numTurns`. `node factory/driver.mjs usage <job-id>` prints runs,
tokens, cost and time per agent and in total, to compare workflow changes.

Real CLI JSON (claude 2.1.316, `--output-format json`): `type`, `subtype`
(`success`), `is_error`, `result`, `session_id`, `num_turns`, `duration_ms`,
`total_cost_usd`, `usage.{input_tokens, output_tokens, cache_read_input_tokens,
cache_creation_input_tokens}`, `modelUsage.<model>`, `permission_denials[]`.
`--resume <session-id>` continues a session and keeps its id.

## Differences from the orchestrator session

No conversation history is carried between steps, so every transition costs only the
agent runs. The driver does not do: backlog claiming, worktree creation, triage,
dashboard inbox requests, the PR-merged cleanup, `/factory rework`, or `watch.sh`.

## Slim mode (workflow-004)

`node factory/driver.mjs run <job-id> --slim` (or `FACTORY_SLIM=1`) starts every agent with
`--setting-sources project,local --strict-mcp-config --disable-slash-commands`: no user-level plugins,
MCP servers or skills. In `factory/measure-context.sh` (reviewer-code on haiku, one tiny call per
configuration) the start-up context went from 14,133 to 5,918 tokens. It is **off by default** because
it also skips the user's own hooks, such as a token-saving command rewriter, so the tool output the
agents read may get bigger. Run one cheap job with and without `--slim` and compare
`node factory/driver.mjs usage <job-id>` before turning it on for good. Re-measure the start-up context
any time with `bash factory/measure-context.sh [agent]` (a failed or timed-out call stops the script;
it never retries).

## Choosing reviewers (workflow-005)

`--reviewers code,security` (or `FACTORY_REVIEWERS=code,security`) runs only those reviewers; the
default is all four (`security,ux,ui,code`). Reviewers that are not chosen are written to `job.json`
as `skipped` (never `PASS`), and the approver's prompt says they were waived by the user's decision.
Use it when a review cannot add value: a schema-only job needs no UX or UI review, and a headless
agent cannot sign in to look at pages that need a login.

## Known gaps / TODO

- Not run against real agents (it costs money): only the fake-shim tests and one
  trivial real `claude -p` probe. Run a cheap `be-*` job first and check `usage`.
- The repo `SessionStart` hook (`resume-check.sh`) runs in every headless `claude`
  start in the main checkout and adds its output to the context. Check the cost;
  consider guarding it on an env var set by the driver.
- No automatic retry of a failed or timed-out run.
- `pr-body.md` is built from build.md, the verdicts and decision.md; the acceptance
  criteria with check marks depend on build.md listing them.
- `/factory rework`, the `Requirements` doc commit, and merge handling stay with the
  orchestrator. `--from build` after a needs-human resumes the builder if a CHANGES
  round is on record, else starts a fresh one.
- fe preview: id-owning routes are not looked up; the dev server is detached and
  only stopped by port (`lsof`), never by name.
- Several jobs at once: run one driver per job; ports derive from the job number.

## Bash chains that are always denied (workflow-016)

A headless run always denies `cd <dir> && git ...` (Claude Code's guard against a `cd` into a repo whose git config could run code), even with `Bash(cd:*)` and `Bash(git:*)` allowed. `git -C <dir> ...` is allowed, and so are `cd <dir> && npm|npx|node|ls|cat|grep|head|tail ...` and `;` chains of allowed commands. The agent files say so. `driver.log` now keeps 400 characters of each denied command (was 120), so the reason for a denial is readable.

`nohup`, `kill` and `sleep` (workflow-016) let a builder start its dev server detached and stop it by port, as `builder.md` says; before this, `nohup ... &` and `kill $(lsof ...)` were denied in a headless run. `kill` is not limited to one port by the rule, so the agent files stay the guard: only the job's own port, never 3000 or 8000. `awk` stays out (it can run commands); agents use grep, Grep and Read. Writes outside the worktree and the job folder (`echo > file`, `cp` elsewhere) stay denied on purpose.

Command substitution (`$(...)`, backticks) is denied in a headless run whatever the rules say, so `builder.md` stops a dev server with two commands: `lsof -tiTCP:<port> -sTCP:LISTEN`, then `kill <pid>`. The job folder lives inside the main checkout (the agents' working directory), so `nohup ... > <job folder>/dev.log` is a write inside it.

## Model per agent and cost per run (workflow-015)

`--model <agent>=<model>` (repeatable, for example `--model builder=sonnet`) passes `--model` to that agent's
`claude -p` run and overrides the `model:` in its agent file; the row in `usage.jsonl` gets `modelOverride`.
A resumed session reports its cost since the session began, so `costUsd` is now what that run added and
`costTotalUsd` is the raw figure (old rows have no `costTotalUsd`). If the resumed run gets a new session id the
delta cannot be found and `costUsd` stays the raw total; compare with `costTotalUsd` before trusting a builder row.

## Dev server for fe jobs (workflow-017)

A headless agent cannot start a detached dev server (`nohup ... > log &`, `&` and redirects to a file are denied). So for an `fe-*` job the
driver starts `npm run dev -- --port <5103 + 10n>` in the worktree itself before the builder and before the UX/UI reviewers (output in
`dev.log` of the job folder), and the prompts of builder and reviewers say it is already running at that port: they open pages there and
never start or stop a server. The same server is the preview link. A signed-in page needs a session: when the local Supabase stack runs, the driver also calls `node factory/preview.mjs prepare <persona>` (sample user and
data on the local stack: `berjalan` has a trip, `baru` has none and is used for `/onboarding`), starts the dev server with the local stack's URL and key (they
win over `.env.local`, so the hosted project is never touched) and gives the agents a one-click link on the login helper (port 5090). With no local stack
the agents are told they cannot open signed-in pages. Preparing a persona recreates the sample user, so two fe jobs running together can sign each other out.

## Metrics to compare builder models (workflow-018)

`node factory/metrics.mjs` prints one row per job (builder model, cost, builder cost, agent minutes, review rounds, whether round 1 was clean, number
of findings in reviews that asked for changes, denied Bash, your score, bugs after merge) and a summary per builder model. `<job>` shows one job by
round. `score <job> <1-5> [note]` and `bug <job> <note>` write `factory/jobs/<job>/score.json`. Builder model comes from `usage.jsonl` (`modelOverride`
or the model of the run); jobs built in a chat session are labelled `in-session`. Compare models only with several jobs of the same kind: one job is an anecdote.

## Rework from the driver (workflow-021)

`node factory/driver.mjs run <job> --from build --rework` starts a fresh builder (not the old session) on the highest `rework-<k>.md` of the job folder
(written by the orchestrator from the user's note, as in SKILL.md "/factory rework"), with the prompt `Rework: read <file> and address it, then update build.md
for round N+1.`; the reviews then continue as round N+1, and the rework run gets a fresh `MAX_RESUMES` (the rounds before it do not count).

## What a builder may write (workflow-022)

fe-100's rework still had 19 denials in the builder: `cat > file <<EOF` and `sed -i` (writes by shell), `/tmp` screenshots (Read and Write
refuse paths outside the worktree and the job folder) and `S=...; agent-browser ...` (a command that starts with a variable). `builder.md` now says to use
the Write and Edit tools, keep screenshots in `<job folder>/shots/` and start `agent-browser` calls with the command. No new allowed command: these
writes were denied on purpose.
