#!/bin/bash
# Prints the software factory's real state when a Claude session starts or resumes
# (run by the SessionStart hook in .claude/settings.json, or by hand).
# Read-only apart from `git fetch`. See "/factory resume" in .claude/skills/factory/SKILL.md.
cd "$(dirname "$0")/.." || exit 1

action=0
note() { echo "  - $*"; }
need() { action=1; echo "  ! $*"; }

echo "== Software factory: state check ($(date '+%Y-%m-%d %H:%M'))"
git fetch -q origin 2>/dev/null || echo "  (git fetch failed: offline? PR states below may be stale)"

branch=$(git branch --show-current)
mbehind=$(git rev-list --count main..origin/main 2>/dev/null || echo "?")
mahead=$(git rev-list --count origin/main..main 2>/dev/null || echo "?")
echo "local main ref: ahead $mahead, behind $mbehind of origin/main"
[ "$mahead" != "0" ] && [ "$mahead" != "?" ] && need "local main has $mahead commit(s) of its own: nothing is ever committed on main — move them to factory/infra and reset main to origin/main"
[ "$mbehind" != "0" ] && [ "$mbehind" != "?" ] && need "local main is $mbehind behind origin/main: git fetch origin main:main"

echo "main checkout is on: $branch"
if [ "$branch" != "factory/infra" ]; then
  need "the main checkout must be on factory/infra (infra work never lands on main): git switch factory/infra"
else
  iahead=$(git rev-list --count origin/main..factory/infra)
  ibehind=$(git rev-list --count factory/infra..origin/main)
  dirty=$(git status --porcelain | grep -v '^??' | wc -l | tr -d ' ')
  echo "factory/infra: $iahead commit(s) not in origin/main, origin/main is $ibehind ahead"
  [ "$ibehind" != "0" ] && need "origin/main moved ($ibehind new commit(s)): sync factory/infra with it (see 'When a PR is merged' in SKILL.md)"
  [ "$dirty" != "0" ] && need "$dirty uncommitted tracked change(s) on factory/infra (backlog/requirements?): commit them as an infra-NNN commit"
  if [ "$iahead" != "0" ]; then
    ipr=$(gh pr list --head factory/infra --state open --json url -q '.[0].url' 2>/dev/null)
    if [ -n "$ipr" ]; then note "open infra PR waiting for the user to merge: $ipr"
    else need "factory/infra has $iahead commit(s) with no open PR: push it and open one against main"; fi
  fi
fi

echo "dashboard server:"
if lsof -tiTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  note "running on http://localhost:8000/dashboard.html"
else
  need "dashboard server is down (it dies with the session): start it in the background with 'node factory/server.mjs' from the repo root, then tell the user http://localhost:8000/dashboard.html"
fi

echo "dashboard requests:"
found=0
for f in factory/inbox/*.json factory/inbox/taken/*.json; do
  [ -e "$f" ] || continue
  found=1
  need "unprocessed: $(basename "$f") $(tr -d '\n' < "$f" | tr -s ' ')"
done
[ $found -eq 0 ] && note "none"

# Path part of a job's preview link ("" when it is just the port or "/"): fe previews must open the changed page.
pv_path() { sed -n 's/.*"preview": "http:\/\/localhost:[0-9]*\([^"]*\)".*/\1/p' "$1" | head -1; }
pv_generic() { [ "${1#fe-}" != "$1" ] && p=$(pv_path "$2") && { [ -z "$p" ] || [ "$p" = "/" ]; }; }

echo "jobs:"
shown=0
for j in factory/jobs/*/job.json; do
  [ -e "$j" ] || continue
  id=$(basename "$(dirname "$j")")
  stage=$(sed -n 's/.*"stage": "\([a-z-]*\)".*/\1/p' "$j" | head -1)
  round=$(sed -n 's/.*"round": \([0-9]*\).*/\1/p' "$j" | head -1)
  case "$stage" in
    merged) continue ;;
    spec|build|review|approve)
      shown=1; need "$id: stage=$stage round=$round — interrupted when the last session ended; resume the loop at this stage" ;;
    needs-human)
      shown=1
      port=$(sed -n 's/.*"preview": "http:\/\/localhost:\([0-9]*\)[^"]*".*/\1/p' "$j" | head -1)
      if [ -n "$port" ] && ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        need "$id: waiting for the user's decision, but its preview (port $port) is down — restart it"
      elif [ -z "$port" ] && [ "${id#fe-}" != "$id" ]; then
        need "$id: waiting for the user's decision, but it has no preview — start one (SKILL.md: Preview for fe jobs)"
      elif pv_generic "$id" "$j"; then
        need "$id: preview opens '/' instead of the changed page — set \"preview\" to that exact route (SKILL.md: Preview for fe jobs)"
      else
        note "$id: waiting for the user's decision${port:+ (preview on port $port)}"
      fi ;;
    pr)
      shown=1
      url=$(sed -n 's/.*"pr": "\([^"]*\)".*/\1/p' "$j" | head -1)
      state=$(gh pr view "$url" --json state -q .state 2>/dev/null || echo "UNKNOWN")
      case "$state" in
        MERGED) need "$id: PR $url was MERGED while no session was watching — run the 'When a PR is merged' steps" ;;
        CLOSED) need "$id: PR $url was CLOSED without merging — set needs-human and ask the user" ;;
        OPEN)
          port=$(sed -n 's/.*"preview": "http:\/\/localhost:\([0-9]*\)[^"]*".*/\1/p' "$j" | head -1)
          if [ -n "$port" ] && ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
            need "$id: PR open ($url), but its preview (port $port) is down — restart it"
          elif [ -z "$port" ] && [ "${id#fe-}" != "$id" ]; then
            need "$id: PR open ($url), but it has no preview — start one (SKILL.md: Preview for fe jobs)"
          elif pv_generic "$id" "$j"; then
            need "$id: PR open ($url), but its preview opens '/' instead of the changed page — set \"preview\" to that exact route (SKILL.md: Preview for fe jobs)"
          else
            note "$id: PR open, waiting for the user to merge: $url${port:+ (preview on port $port)}"
          fi ;;
        *)      note "$id: PR state unknown ($url)" ;;
      esac ;;
    *) shown=1; note "$id: stage=$stage" ;;
  esac
done
[ $shown -eq 0 ] && note "no active jobs"

echo "worktrees:"
git worktree list | tail -n +2 | sed 's/^/  - /'
[ "$(git worktree list | wc -l | tr -d ' ')" = "1" ] && note "none besides the main checkout"

echo
if [ $action -eq 1 ]; then
  echo "ACTION REQUIRED: run /factory resume now (re-arm the watcher, then handle every '!' line above). Do not wait for the user, except for decisions only they can make."
else
  echo "Nothing to recover. Re-arm the watcher anyway: Monitor 'bash factory/watch.sh'."
fi
