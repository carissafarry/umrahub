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

ahead=$(git rev-list --count origin/main..main 2>/dev/null || echo "?")
behind=$(git rev-list --count main..origin/main 2>/dev/null || echo "?")
branch=$(git branch --show-current)
echo "main: ahead $ahead, behind $behind (checked out: $branch)"
if [ "$ahead" != "0" ] && [ "$ahead" != "?" ]; then
  shipped=$(git branch -r --contains main 2>/dev/null | grep -c 'origin/factory/infra-')
  if [ "$shipped" -gt 0 ]; then
    note "main has $ahead commit(s) GitHub's main doesn't, already shipped in an open infra PR (waiting for the user to merge it)"
  else
    need "main has $ahead commit(s) GitHub doesn't: ship them through an infra PR before opening job PRs"
  fi
fi
[ "$behind" != "0" ] && [ "$behind" != "?" ] && need "main is $behind commit(s) behind origin/main: merge --ff-only origin/main"

echo "dashboard requests:"
found=0
for f in factory/inbox/*.json factory/inbox/taken/*.json; do
  [ -e "$f" ] || continue
  found=1
  need "unprocessed: $(basename "$f") $(tr -d '\n' < "$f" | tr -s ' ')"
done
[ $found -eq 0 ] && note "none"

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
      port=$(sed -n 's/.*"preview": "http:\/\/localhost:\([0-9]*\)".*/\1/p' "$j" | head -1)
      if [ -n "$port" ] && ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        need "$id: waiting for the user's decision, but its preview (port $port) is down — restart it"
      else
        note "$id: waiting for the user's decision${port:+ (preview on port $port)}"
      fi ;;
    pr)
      shown=1
      url=$(sed -n 's/.*"pr": "\([^"]*\)".*/\1/p' "$j" | head -1)
      state=$(gh pr view "$url" --json state -q .state 2>/dev/null || echo "UNKNOWN")
      case "$state" in
        MERGED) need "$id: PR $url was MERGED while no session was watching — sync main, remove worktree/branch, promote backlog" ;;
        CLOSED) need "$id: PR $url was CLOSED without merging — set needs-human and ask the user" ;;
        OPEN)   note "$id: PR open, waiting for the user to merge: $url" ;;
        *)      note "$id: PR state unknown ($url)" ;;
      esac ;;
    *) shown=1; note "$id: stage=$stage" ;;
  esac
done
[ $shown -eq 0 ] && note "no active jobs"

echo "worktrees:"
git worktree list | tail -n +2 | sed 's/^/  - /'
[ "$(git worktree list | wc -l | tr -d ' ')" = "1" ] && note "none besides main"

echo
if [ $action -eq 1 ]; then
  echo "ACTION REQUIRED: run /factory resume now (re-arm the watcher, then handle every '!' line above). Do not wait for the user, except for decisions only they can make."
else
  echo "Nothing to recover. Re-arm the watcher anyway: Monitor 'bash factory/watch.sh'."
fi
