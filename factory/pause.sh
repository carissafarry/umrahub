#!/bin/bash
# Pause everything the factory runs on this machine (for sleep or battery): `bash factory/pause.sh [--keep-supabase] [--quit-orbstack] [--dry-run]`.
# Stops, in this order: job drivers and their agents, the watchers, the dashboard server, the dev servers of the
# job previews, the login helper and the local Supabase stack. It never kills by a port it does not own: only
# the preview ports written in factory/jobs/*/job.json, and never 3000 or 8000 (the user's own servers).
# Job state is on disk, so `/factory resume` picks everything up again; a job stopped in the middle of an agent
# is restarted by resume. Writes factory/PAUSED, which resume-check.sh prints until `/factory resume` removes it.
# the main checkout holds factory/jobs, also when this script runs from a worktree
cd "$(git -C "$(dirname "$0")" rev-parse --git-common-dir)/.." || exit 1
keep_supabase=0; quit_orbstack=0; dry=0
for a in "$@"; do case "$a" in --keep-supabase) keep_supabase=1;; --quit-orbstack) quit_orbstack=1;; --dry-run) dry=1;; esac; done
stopped=()

stop_pids() { # label pids...
  local label=$1; shift
  [ $# -gt 0 ] || return 0
  if [ "$dry" = 1 ]; then stopped+=("would stop $label"); return 0; fi
  kill "$@" 2>/dev/null && stopped+=("$label")
}

# 1. drivers and the agents (claude -p) they started: children first
for d in $(pgrep -f "factory/driver.mjs run"); do
  [ "$dry" = 1 ] || for c in $(pgrep -P "$d"); do kill "$c" 2>/dev/null; done
  stop_pids "driver $d" "$d"
done

# 2. watchers, 3. dashboard server, 4. login helper (by their command, never by port)
stop_pids "watcher" $(pgrep -f "factory/watch.sh")
stop_pids "dashboard server" $(pgrep -f "factory/server.mjs")
stop_pids "login helper" $(pgrep -f "factory/preview.mjs serve")

# 5. dev servers of the job previews (ports from job.json; never 3000 or 8000)
for j in factory/jobs/*/job.json; do
  [ -e "$j" ] || continue
  port=$(sed -n 's/.*"preview": "http:\/\/localhost:\([0-9]*\).*/\1/p' "$j")
  [ -n "$port" ] || continue
  case "$port" in 3000|8000) continue;; esac
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)
  [ -n "$pids" ] && stop_pids "preview :$port ($(basename "$(dirname "$j")"))" $pids
done

# 6. local Supabase (only if it is running)
if [ "$keep_supabase" = 0 ] && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^supabase_db_umrahub$'; then
  if [ "$dry" = 1 ]; then stopped+=("would stop local Supabase"); else supabase stop >/dev/null 2>&1 && stopped+=("local Supabase"); fi
fi
[ "$quit_orbstack" = 1 ] && [ "$dry" = 0 ] && osascript -e 'quit app "OrbStack"' >/dev/null 2>&1 && stopped+=("OrbStack")

# jobs that were in the middle of work
running=()
for j in factory/jobs/*/job.json; do
  [ -e "$j" ] || continue
  grep -qE '"stage": "(spec|build|review|approve)"' "$j" && running+=("$(basename "$(dirname "$j")")")
done

[ "$dry" = 1 ] && { echo "dry run, nothing stopped:"; printf '  %s\n' "${stopped[@]}"; echo "jobs in progress: ${running[*]:-none}"; exit 0; }
{
  echo "paused $(date '+%Y-%m-%d %H:%M')"
  echo "stopped: ${stopped[*]:-nothing was running}"
  echo "jobs interrupted: ${running[*]:-none}"
} > factory/PAUSED
cat factory/PAUSED
echo "Resume with /factory resume (dashboard, watcher, previews and, if needed, local Supabase come back)."
