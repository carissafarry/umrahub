# Factory driver

`factory/driver.mjs` runs one job through the factory loop of
`.claude/skills/factory/SKILL.md` (the reference) with a Node script instead of a
long-lived orchestrator conversation. Node 20, no dependencies.

```bash
node factory/driver.mjs run <job-id> [--from spec|build|review|approve] [--dry-run]
                                     [--permission-mode <mode>] [--allowed-tools "<rules>"]
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
`VERDICT:` first line, a failed, errored or empty agent run, an agent that did not
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
placeholder like `<id>` stops with needs-human (an id owned by the user is the
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
`Bash(git:*) Bash(npm:*) Bash(npx:*) Bash(node:*) Bash(supabase:*) Bash(gh:*) Bash(agent-browser:*) Bash(lsof:*) Bash(curl:*)`.
Change it with `FACTORY_ALLOWED_TOOLS` or `--allowed-tools "<rules>"`, or put the
rules in `.claude/settings.json` `permissions.allow` (settings and flag rules add up).
Optional spend cap per agent run: `FACTORY_MAX_BUDGET_USD`.

When an agent is denied a tool it usually keeps going or reports it. The driver
logs `permission_denials` from the result, and stops with needs-human when the run
is an error, has an empty result, or did not write its expected file (a stale file
from an earlier round does not count: the mtime must be newer than the run start).
It does not loop.

## Usage

`usage.jsonl` (job folder) gets one line per agent run: `ts, agent, round, sessionId,
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

## Known gaps / TODO

- Not run against real agents (it costs money): only the fake-shim tests and one
  trivial real `claude -p` probe. Run a cheap `be-*` job first and check `usage`.
- The repo `SessionStart` hook (`resume-check.sh`) runs in every headless `claude`
  start in the main checkout and adds its output to the context. Check the cost;
  consider guarding it on an env var set by the driver.
- No per-agent timeout shorter than 3 hours, no automatic retry of a failed run.
- `pr-body.md` is built from build.md, the verdicts and decision.md; the acceptance
  criteria with check marks depend on build.md listing them.
- `/factory rework`, the `Requirements` doc commit, and merge handling stay with the
  orchestrator. `--from build` after a needs-human resumes the builder if a CHANGES
  round is on record, else starts a fresh one.
- fe preview: id-owning routes are not looked up; the dev server is detached and
  only stopped by port (`lsof`), never by name.
- Several jobs at once: run one driver per job; ports derive from the job number.
