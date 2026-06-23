---
name: maestro-e2e
description: Drive the running DevYoga app on the booted iOS Simulator with Maestro to verify a feature end-to-end — tap buttons, type into inputs, scroll, assert, and screenshot. Use proactively as the *action* half of the build→drive→observe→fix loop whenever a change needs real interaction to verify (creating a task through the form, sending a chat message, navigating a flow) rather than a single static screen. For a quick one-screen glance with no interaction, use the lighter `ios-screenshot` skill instead.
---

# maestro-e2e

DevYoga is iOS-first and runs as an Expo dev build on the iOS Simulator. This skill
lets you **drive your own work**: launch the installed dev build, perform real taps /
typing / scrolls via [Maestro](https://maestro.mobile.dev), assert the outcome, and
capture screenshots — then Read them back and fix. It closes the loop that
`ios-screenshot` (look-only) can't: actually exercising a feature.

Maestro is **black-box** — it drives the *already-installed* dev build through the
accessibility layer. No native rebuild, no instrumentation, no extra app deps. Just
keep Metro running and a sim booted.

## When to use which tool (escalation ladder)

1. **`ios-screenshot`** — fast single-screen peek, no Maestro. "Does this screen render?"
2. **`maestro-e2e` CLI** (this skill, `run-flow.sh`) — multi-step interaction, fully
   in-repo, works for anyone with `maestro` installed. The default for driving a flow.
3. **Maestro MCP** — the same flows *inline*, and it appends the **live view hierarchy**
   (element ids/text/bounds) to every run, plus `check_syntax` / `get_cheat_sheet`. Reach
   for it when a selector won't match and you need to see the actual tree. Per-machine
   setup (see "Maestro MCP" below).

## The loop

1. Make the edit; let Metro fast-refresh.
2. Pick or write a flow (curated ones in `flows/`; ad-hoc ones go in the gitignored
   scratch dir `mobile/.maestro/`).
3. Run it (CLI path):
   ```bash
   mobile/e2e/scripts/run-flow.sh mobile/e2e/flows/create-task.yaml
   ```
4. The script prints a run dir, the screenshot paths, and **PASS/FAIL**. **Read the PNG
   paths** so the screens enter context — this is mandatory; the script only writes files.
5. On FAIL, look at `…/<stamp>/debug/` (Maestro's view hierarchy + command log) to find
   the selector that didn't match. Fix and repeat.

To target a specific device when more than one sim is booted: append `--udid <UDID>`.

## App facts

- **appId:** `com.dabakovich.dev-yoga` (every flow needs this header).
- **URL scheme:** `devyoga` — use `openLink:` in flows for deterministic navigation.

| Screen        | `openLink:`              |
| ------------- | ------------------------ |
| Tasks list    | `devyoga://`             |
| Task detail   | `devyoga:///<taskId>`    |
| New task      | `devyoga:///new`         |
| Chat list     | `devyoga:///chat`        |
| New chat      | `devyoga:///chat/new`    |
| Chat thread   | `devyoga:///chat/<id>`   |

## testID map

Stable accessibility ids on interactive controls (RN `testID` → iOS accessibility
identifier). Target them with `tapOn: { id: "…" }`. **Keep this table in sync when you
add or rename a testID.**

| Control                         | id                       |
| ------------------------------- | ------------------------ |
| Create-task: title input        | `task-title-input`       |
| Create-task: description input   | `task-desc-input`        |
| Create-task: status option      | `task-status-<value>` (`todo`/`in_progress`/`done`) |
| Create-task: priority option    | `task-priority-<value>` (`low`/`medium`/`high`)     |
| Create-task: save button        | `task-save`              |
| Task detail: delete button      | label `"Delete task"` (SwiftUI `Button`, use `tapOn: "Delete task"`) |
| Chat: message input             | `chat-input`             |
| Chat: send button               | `chat-send`              |

Not every control has a testID. The **FAB ("Add task")** and the **bottom tabs
("Tasks" / "Chat")** are native `@expo/ui` SwiftUI elements where `testID` doesn't
reliably propagate — target them by their visible/accessibility **label text** instead
(`tapOn: "Add task"`), or just `openLink:` to the destination. **Task rows** are
targeted by their visible title text.

## Command cheatsheet

```yaml
appId: com.dabakovich.dev-yoga
---
- launchApp                         # foreground the installed dev build
- openLink: devyoga:///new          # deterministic in-app navigation
- tapOn: "Add task"                 # by visible text (label)
- tapOn: { id: "task-title-input" } # by testID (regex allowed: id: ".*save")
- inputText: "Buy milk"
- eraseText                         # clear the focused field
- scrollUntilVisible: { element: { id: "task-save" }, direction: DOWN }
- assertVisible: "Buy milk"         # fails the flow if not found (this is your pass/fail)
- waitForAnimationToEnd: { timeout: 8000 }
- takeScreenshot: result            # saved as result.png in the run dir
```

## Curated flows (`flows/`)

- `smoke.yaml` — launch, glance at Tasks + Chat tabs.
- `create-task.yaml` — fill the create form, save, assert the task appears.
- `chat-send.yaml` — open a new chat, send a message, screenshot the reply.

Copy one and adapt, or write an ad-hoc flow into `mobile/.maestro/` and pass its path
to `run-flow.sh`.

## Maestro MCP (optional power path)

The official `mobile-dev-inc/maestro-mcp` server exposes `run_code` (inline flow + view
hierarchy), `run_flow_files`, `inspect`, `take_screenshot`, `check_syntax`,
`get_cheat_sheet`. A project-level [`.mcp.json`](../../../.mcp.json) at the repo root
holds the server entry; two values are machine-local:

1. `maestro login` (free account) populates the API key Maestro looks up.
2. Set `MAESTRO_BINARY_PATH` (usually `~/.maestro/bin/maestro`) and the absolute path to
   the cloned server's `mcp.py` in `.mcp.json`, then restart Claude.

When configured, the MCP tools accept the **same flow YAML** as the CLI — the testID map
and route map above apply unchanged. The big win is the appended view hierarchy for
debugging selectors without a separate run.

## Preconditions & troubleshooting

- **Maestro installed?** `curl -fsSL "https://get.maestro.mobile.dev" | bash` (one-time;
  the script guards on it and exits with this hint).
- **Sim booted + dev build running + Metro up?** `cd mobile && npm run ios` then
  `npm run dev`. No booted sim → the script exits 1 with a hint.
- **Selector didn't match?** Open the run's `debug/` hierarchy (or use the MCP) to see the
  actual ids/labels on screen — the on-screen tree is the source of truth.
- **Stale screen?** Metro fast-refresh usually applies; otherwise reload (`r` in Metro).
  `EXPO_PUBLIC_*` changes need a Metro restart (`npx expo start -c`), not just a refresh.
- Artifacts land in `mobile/.maestro-artifacts/<stamp>/` (gitignored). Exit codes:
  0 pass, 1 no sim, 2 bad args, 3 flow failed, 4 maestro not installed.
