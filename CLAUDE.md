# CLAUDE.md

High-level orientation for this repo. Read this first in a new session to get into
context fast. Deeper docs live next to the code — this file points at them, it
doesn't duplicate them.

## What this is

**DevYoga** — a task tracker for developers with an AI agent layer built into the
product. It's David's take-home test task for **Holywater** (Senior React Native
role), so it is graded on two axes — optimize for both:

1. **How naturally a coding agent (you) is used in the dev process** — captured in
   [AGENT_LOG.md](AGENT_LOG.md), maintained proactively via the `agent-log` skill.
2. **How thoughtfully AI is built into the product** — AI must be a genuine
   *amplifier*: real multi-step agents, not a single LLM call bolted on. At least
   **2** real AI features must ship.

Scope budget per the brief: ~8–10 hours. Favor sharp, well-chosen features over breadth.

## North star — the pain we're solving

Don't treat DevYoga as "yet another todo app." The end goal is one specific
developer pain:

> **Triaging the pile.** Before a developer writes a line of code they have to dig
> through a messy backlog — decide what actually matters, what's urgent, what a
> vague ticket really entails, and where to start. That grooming is tedious and
> repetitive, and it's exactly where AI should carry the load.

So judge every product decision against one question: **does this help a developer
cut through the task pile faster?** The AI layer is the centerpiece, not garnish.
The features that serve the north star:

- **Prioritize** — rank a noisy backlog so the next right thing to do is obvious.
- **Decompose** — turn a one-line "task" into concrete, ordered, actionable subtasks.
- **Summarize / status** — generate a status update or a "what should I do today"
  view from the current state of the board.
- **Converse** — a chat to ask about today's tasks and to create/triage tasks by
  talking (incl. ideas like voice input and generative-UI dynamic form fields).

When you propose features or UI, bias toward ones that reduce the grunt-work of task
triage. The app should ideally be good enough to help plan its own development.

## Stack & layout

Flat monorepo — deliberately minimal (no workspaces), to avoid Expo/Metro friction
for a short test task:

- **`backend/`** — NestJS 11 + TypeORM + better-sqlite3. A Tasks CRUD REST API.
- **`mobile/`** — React Native + Expo SDK 56 (Expo Router). Runs as a **local dev
  build** (`expo-dev-client`), **not** Expo Go — it uses native modules. See
  [mobile/README.md](mobile/README.md) and [mobile/AGENTS.md](mobile/AGENTS.md).

## Current state

- ✅ Backend Tasks CRUD with status filter + sorting; global validation; seed script.
- ✅ Mobile: task list / detail / create, native header filter + sort menus, FAB.
- ⏳ **AI features: not built yet.** The Chat tab is a placeholder
  ([mobile/src/app/(tabs)/chat/index.tsx](mobile/src/app/(tabs)/chat/index.tsx))
  and the backend has no AI endpoints. This is the next and most important work —
  see the north star.

## Data model & API

`Task` ([backend/src/tasks/task.entity.ts](backend/src/tasks/task.entity.ts)):
`id` (uuid), `title`, `description?`, `status` (`todo`|`in_progress`|`done`,
default `todo`), `priority` (`low`|`medium`|`high`, default `medium`),
`createdAt`, `updatedAt`.

REST under `/tasks` ([tasks.controller.ts](backend/src/tasks/tasks.controller.ts)):

- `GET /tasks` — supports `?status=`, `?sortBy=createdAt|priority`,
  `?sortOrder=asc|desc`. **Default sort: priority DESC.**
- `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id` (204).

A global `ValidationPipe` (whitelist + transform) validates every DTO. The mobile
client mirrors these types in [mobile/src/utils/api.ts](mobile/src/utils/api.ts).

## Run it

**Backend** (port 3000, binds `0.0.0.0` for LAN access):
```bash
cd backend && npm install && npm run start:dev   # watch mode
npm run seed                                       # 7 sample tasks (seed:clean to wipe)
```
DB schema auto-syncs only when `DB_SYNCHRONIZE=true` (see `.env.example`).

**Mobile** (build the dev client once, then start Metro):
```bash
cd mobile && npm install
npm run ios          # or: npm run android — builds & installs the dev build
npm start            # expo start --dev-client
```
Point the app at the backend via `EXPO_PUBLIC_API_BASE` (defaults to
`http://localhost:3000`; use the Mac's LAN IP on a real device). The native
`ios/`/`android/` folders are CNG-generated and gitignored.

## Conventions

- **Log AI collaboration** to [AGENT_LOG.md](AGENT_LOG.md) — short, one-line,
  English entries. The `agent-log` skill does this proactively; don't log the
  commit/revert itself, log the work it captures.
- **Commits** follow Conventional Commits (`conventional-commit` skill). Commit /
  push only when asked. Co-author trailer: `Co-Authored-By: Claude ...`.
- **Library/API docs**: fetch current docs via Context7 (`find-docs` / `ctx7`)
  before writing library code or config — Expo SDK 56 and NestJS 11 are recent.
- **NestJS is new to David** — explain the under-the-hood (DI, decorators, request
  pipeline) alongside backend changes. Code comments here lean explanatory by design.
- **Stay proactive** — suggest ideas and next steps, don't just execute literally.
- Postman work uses the **DevYoga** workspace (`347ffdcb-c4f0-49c1-a69d-28324ea8d00c`).
