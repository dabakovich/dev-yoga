# DevYoga

A task tracker for developers with an AI agent built into the product — my take
on the **DevLog** test task. The pain it targets is **triaging the pile**:
deciding what matters, what a vague ticket really entails, and where to start.
The AI layer carries that grunt work; the tracker is the foundation under it.

- **`backend/`** — NestJS 11 + TypeORM + SQLite. Tasks CRUD REST API + the AI agent (`POST /ai/chat`). [Details →](backend/README.md)
- **`mobile/`** — React Native + Expo SDK 56 (Expo Router). Native iOS dev build. [Details →](mobile/README.md)
- **`AGENT_LOG.md`** — honest day-by-day log of how the coding agent was used. [Read →](AGENT_LOG.md)
- **`plans/`** — staged AI-layer plans with effort estimates and an explicit cut order. [Index →](plans/README.md)

## Quick start

Prerequisites: Node 20+, Xcode + iOS Simulator (for mobile), npm.

### 1. Backend (port 3000)

```bash
cd backend
cp .env.example .env     # add ANTHROPIC_API_KEY to enable the real agent (see below)
npm install
npm run dev              # NestJS in watch mode, binds 0.0.0.0:3000
```

Optional — put sample tasks into the DB:

```bash
npm run seed             # inserts 7 sample tasks across all statuses
npm run seed:clean       # wipes tasks first, then seeds
```

### 2. Mobile

```bash
cd mobile
cp .env.example .env     # defaults to http://localhost:3000 — fine for the Simulator
npm install
npm run ios              # one-time: builds & installs the dev build on the Simulator
npm run dev              # starts Metro (expo start --dev-client)
```

The app is a **local dev build** (`expo-dev-client`), not Expo Go — it uses
native modules (`@expo/ui`, `expo-glass-effect`). Build once with `npm run ios`,
then `npm run dev` is enough for day-to-day. Full details (incl. running on a
physical iPhone with a free Apple ID): [mobile/README.md](mobile/README.md).

### Testing on a real device

The phone can't reach `localhost` on your Mac. Both devices must be on the
**same Wi-Fi network**, and the app must point at the Mac's **LAN IP**:

```bash
ipconfig getifaddr en0                          # find the Mac's LAN IP
# mobile/.env
EXPO_PUBLIC_API_BASE=http://192.168.x.x:3000    # restart Metro after changing (npx expo start -c)
```

The backend already binds `0.0.0.0`, so no server change is needed.

### AI key (or mock mode)

Set `ANTHROPIC_API_KEY` in `backend/.env` to enable the real agent. **Without a
key the backend still boots** and `/ai/chat` serves canned mock responses, so
the whole flow stays demoable. Model is `claude-sonnet-4-6` by default
(override via `AI_MODEL`).

## Architecture in brief

```
mobile (Expo / RN)  ── REST ──>  backend (NestJS)
  Redux Toolkit + RTK Query        TasksModule  — CRUD, filter, sort
  redux-persist + MMKV             AiModule     — one agent, POST /ai/chat
  chat persisted on device           ├─ Vercel AI SDK + Anthropic
                                     ├─ tools: list/create/update/delete tasks,
                                     │         remember/forget memory facts
                                     └─ SQLite (TypeORM + better-sqlite3)
```

**Storage choice:** SQLite via `better-sqlite3` — a real relational store with
zero setup (single file, `npm install` is all it takes), which fits a local-run
test task better than Postgres-in-Docker and survives restarts unlike
in-memory. Limitations: single-writer, no migrations (dev-only TypeORM
`synchronize`, env-gated), not a multi-instance production setup — all fine for
one user, one team, one machine.

**Conversations are not stored on the backend.** There is one conversation,
persisted on the device (MMKV); the client re-sends the transcript each call,
keeping the chat endpoint stateless. It can be cleared from the chat header.
The only server-side state besides tasks is **agent memory** — small durable
project facts the agent saves/recalls across conversations.

## AI features

One **conversational agent** is the single AI surface — a real multi-step agent
(Vercel AI SDK tool loop), not a one-shot LLM call. It decides per turn whether
to ask, plan, or act:

1. **Task creation with clarify → decompose → confirm.** Vague request → the
   agent asks a clarifying question; too big → it proposes a split into
   separate tasks; it **never writes before an explicit "yes"** (human-in-the-loop
   gate lives in the system prompt, batch creation via a `create_tasks` tool).
2. **"Plan my day" prioritization.** The agent reads the live board via
   `list_tasks` and recommends where to start, weighing priority, status, and
   task age — with its reasoning, not just the top-ranked row.
3. **Triage by talking.** Update or delete tasks conversationally
   (`update_task` / `delete_task`), with id-resolution against the board and a
   hard confirm gate before deletes.
4. **Agent memory.** `remember` / `forget` tools keep durable project facts
   (stack, conventions, constraints) in SQLite and fold them into every system
   prompt, so context carries across conversations.

## Decisions made

- **React Native instead of web** (the brief says Next.js) — agreed trade-off,
  since the role is Senior React Native. Backend stays Node/REST per the brief.
- **Expo SDK 56** — to lean on native navigation and glass UI components
  (`@expo/ui` SwiftUI views, native tabs/menus) and get a real native feel.
- **iOS-first stability.** Web and Android are not supported in this MVP.
- **Chat as the generic AI pattern.** One agentic surface instead of scattered
  AI buttons. More interactive ideas were considered and deliberately descoped
  for the 8–10 h budget (see below).
- **No server-side conversations; basic agent memory** instead — see
  architecture above.

### Descoped, deliberately

Ideas that didn't make the time budget, kept as honest backlog
(see [plans/](plans/README.md) for the cut order):

- Task-screen menu: generate a Slack-style status message; generate an
  agent-ready prompt for pasting into Cursor/Claude.
- Dynamic task form: fields fill in and clarifying questions appear as you type
  the title (generative UI).
- Backend hook on task updates calling a cheap model to keep a personalized
  summary, surfaced in chat on fresh start.
- Conversation compaction tool that saves a summary into agent memory.
- AI on device — would ship the API key in the bundle; the agent stays behind
  the backend.

## Agentic-first development

How the coding agent was used as an amplifier (the full story is in
[AGENT_LOG.md](AGENT_LOG.md)):

- **Shared context up front** — my Obsidian notes folder sat in the IDE
  workspace next to the project, so the agent saw my thoughts, priorities, and
  the product framing, not just code.
- **Brainstorm before build** — initial architecture, stack, and MVP scope were
  converged with the agent from my raw ideas before any scaffolding.
- **Skills for the stack** — Expo, NestJS, conventional commits, RN best
  practices, and Context7 for up-to-date docs (both SDKs are recent; training
  data alone gets the APIs wrong).
- **Automatic collaboration log** — a custom `agent-log` skill appends one-line
  entries to AGENT_LOG.md; initially triggered by a session-end hook, later the
  hook was removed to cut overhead and the skill runs proactively.
- **Plan first, then cheap execution** — smarter models for brainstorming and
  high-level plans (`plans/`), cheaper models for routine code.
- **Local memory** — project memory keeps the north star and conventions in
  focus across sessions.
- **Agents for periodic review** — code-structure reviews, decomposing
  oversized files, refactors against best practices (e.g. the AI module
  decomposition in plan 01).
