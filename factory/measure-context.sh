#!/usr/bin/env bash
# How many tokens does an agent start with, before it does any work?
#   bash factory/measure-context.sh [agent]        (default agent: reviewer-code)
# Runs one tiny call per configuration on the cheapest model (about a cent in total) and prints the size of the
# start-up context. Each call has a 90 second limit. If one fails or times out the script stops at once and does
# NOT retry: report it and decide what to do.
set -u
agent="${1:-reviewer-code}"
cd "$(git rev-parse --show-toplevel)" || exit 1

run() {
  name="$1"; shift
  out=$(timeout 90 claude -p --agent "$agent" --model haiku --output-format json \
    "Reply with the single word OK. Do not use any tools." "$@" 2>/dev/null) || { echo "$name: failed or timed out, stopping (no retry)"; exit 1; }
  printf '%s' "$out" | python3 -I -c "
import json, sys
d = json.load(sys.stdin); u = d.get('usage', {})
new = (u.get('input_tokens', 0) or 0) + (u.get('cache_creation_input_tokens', 0) or 0)
hit = u.get('cache_read_input_tokens', 0) or 0
print('%-30s start-up %6d tokens (new %6d, from cache %6d)' % ('$name', new + hit, new, hit))
"
}

run "A default"
run "B no MCP servers" --strict-mcp-config
run "C project settings only" --setting-sources project,local
run "D slim (= driver --slim)" --setting-sources project,local --strict-mcp-config --disable-slash-commands
