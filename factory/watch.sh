#!/bin/bash
# Event stream for the factory orchestrator (run from the repo root, under Monitor).
#   REQUEST <file> <json>      a dashboard decision/requirements request (moved to factory/inbox/taken/)
#   PR <job-id> <MERGED|CLOSED> <url>   a job's pull request left the OPEN state on GitHub
cd "$(dirname "$0")/.." || exit 1
mkdir -p factory/inbox/taken factory/inbox/pr-seen
tick=0
while true; do
  for f in factory/inbox/*.json; do
    [ -e "$f" ] || continue
    b=$(basename "$f")
    mv "$f" factory/inbox/taken/ && echo "REQUEST $b $(tr -d '\n' < "factory/inbox/taken/$b")"
  done
  if [ $((tick % 30)) -eq 0 ]; then
    for j in factory/jobs/*/job.json; do
      [ -e "$j" ] || continue
      grep -q '"stage": "pr"' "$j" || continue
      id=$(basename "$(dirname "$j")")
      url=$(sed -n 's/.*"pr": "\([^"]*\)".*/\1/p' "$j")
      [ -n "$url" ] || continue
      state=$(gh pr view "$url" --json state -q .state 2>/dev/null || true)
      seen="factory/inbox/pr-seen/$id-${url##*/}" # per PR: the long-lived infra job gets a new PR each time
      if { [ "$state" = "MERGED" ] || [ "$state" = "CLOSED" ]; } && [ "$(cat "$seen" 2>/dev/null)" != "$state" ]; then
        echo "$state" > "$seen"
        echo "PR $id $state $url"
      fi
    done
  fi
  tick=$((tick + 1))
  sleep 2
done
