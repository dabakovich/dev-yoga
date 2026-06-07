---
name: agent-log
description: Proactively maintain AGENT_LOG.md by appending short one-line entries that record AI-agent collaboration (planning, scaffolding, edits, review, fixes, decisions). Runs in proactive mode by DEFAULT — log automatically in the background at natural checkpoints after agent interactions, without waiting to be asked. Also runs on demand when the user says "log this" / passes raw text to record verbatim. Keeps the DevLog test-task AGENT_LOG honest and current.
---

# agent-log

Maintain `AGENT_LOG.md` at the repo root — an honest, concise record of how the
human and the AI agent collaborated on this project. This is a graded deliverable
of the DevLog test task: reviewers read it to judge whether AI was used as an
*amplifier*, not a replacement. Honesty beats polish.

## Proactive by default

This skill is **on by default in proactive mode.** Log automatically in the
background — at natural checkpoints after agent interactions — without being
asked. The user should be able to ignore the log entirely and still find it
accurate at the end. On-demand use (`/agent-log <text>`) is just a manual override
on top of the automatic behavior.

> Note: a skill influences *when the agent chooses* to log, but cannot by itself
> guarantee a run after every single turn. For hard guarantees, back it with a
> Stop hook that invokes this skill. Absent that, treat proactive logging as a
> standing instruction and act on it.

## What an entry looks like

One bullet, one line. Grouped under a `## YYYY-MM-DD` date heading.

```
## 2026-06-07

- `plan` Outlined backend architecture: NestJS + SQLite, tasks/ai modules.
- `scaffold` Generated Expo task-list screen + TaskCard component.
- `edit` User hand-rewrote the priority enum typing — agent got the union wrong.
- `decision` Keep AI logic on the backend to avoid duplicating CRUD on the client.
```

## Format rules

- **Language:** English.
- **One line each.** No multi-sentence paragraphs. Trim filler — log the decision
  or outcome, not the process. If you can't say it in one line, it's two entries.
- **Tag prefix** in backticks. Use one of:
  - `plan` — architecture, scoping, breaking work down.
  - `scaffold` — agent generated new files/components/boilerplate.
  - `edit` — code changes to existing files.
  - `review` — agent reviewed / user reviewed agent output.
  - `fix` — bug fix or correction.
  - `decision` — a deliberate choice + the reason (always include the *why*).
  - `manual` — the user did something by hand, or overrode the agent.
- **Honesty markers matter.** When the agent got something wrong and the user
  corrected it, say so plainly (use `edit`/`manual`/`fix`). When the user steered
  and the agent filled in routine work, note who did what.
- **Append, never rewrite history.** Add new bullets under today's date heading;
  create the heading if today's date has none. Keep dates in chronological order.

## How to run

1. Read `AGENT_LOG.md`.
2. Determine today's date heading (today is provided in the session context;
   otherwise run `date +%F`). Add the heading if missing.
3. Append the entry/entries as bullets under that date.
   - If the user passed text after the command, log that text (lightly tidied into
     one line with an appropriate tag).
   - If no text was passed, summarize the most recent meaningful interaction(s)
     from this conversation into one or a few entries.
4. Edit the file in place. Don't echo the whole log back — confirm with just the
   line(s) you added.

## What to log vs skip

Log: finished planning discussions, scaffolded features, user corrections of
agent output, non-obvious decisions — one good line per meaningful collaboration
beat. Skip: trivial mechanical steps (a single rename, re-reading a file),
and don't double-log something already captured.
