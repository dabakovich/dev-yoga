#!/usr/bin/env bash
# Stop hook for the `agent-log` skill.
#
# Fires every time the agent finishes a turn, but does NOT force a log entry each
# time. It nudges the agent to judge whether the turn closed a meaningful
# collaboration beat (planning, scaffolding, an edit/refactor, a review, a fix, or
# a non-obvious decision) and, only then, append a one-line entry to AGENT_LOG.md.
#
# The stop_hook_active guard prevents an infinite loop: the nudge is injected at
# most once per stop cycle. On the follow-up stop the guard is set, so we exit
# cleanly and let the turn end.

input=$(cat)

# Already in a hook-triggered continuation — let it stop for real.
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

cat <<'EOF'
{"decision":"block","reason":"agent-log checkpoint: Did this turn complete a meaningful collaboration beat — finished planning, scaffolded a feature, an edit/refactor, a review, a fix, or a non-obvious decision? If yes, append a single one-line entry to AGENT_LOG.md following the agent-log skill (English, tagged, under today's date heading), then stop. If there is nothing meaningful to log, just stop immediately with no extra output."}
EOF
exit 0
