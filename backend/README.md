# DevYoga backend

NestJS 11 + TypeORM + SQLite (`better-sqlite3`). Two modules:

- **`TasksModule`** — Tasks CRUD REST API with status filter and sorting.
- **`AiModule`** — the in-product AI agent behind a single `POST /ai/chat`
  endpoint (Vercel AI SDK + Anthropic).

## Run

```bash
cp .env.example .env   # see "Environment" below
npm install
npm run dev            # watch mode (alias of start:dev), listens on 0.0.0.0:3000
```

Seed sample data (optional):

```bash
npm run seed           # 7 sample tasks across all statuses
npm run seed:clean     # wipe tasks, then seed
```

Tests:

```bash
npm run test           # unit (incl. TasksService spec)
npm run test:e2e
```

## Environment

All variables are documented inline in [.env.example](.env.example):

| Var | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | `0.0.0.0` exposes the server on the LAN IP so a phone on the same Wi-Fi can reach it |
| `DATABASE_PATH` | `data/dev.sqlite` | SQLite file location |
| `DB_SYNCHRONIZE` | — | `true` lets TypeORM auto-create/update tables on boot (dev only) |
| `ANTHROPIC_API_KEY` | *(empty)* | Empty → **mock mode**: `/ai/chat` returns canned responses, server boots without credentials |
| `AI_MODEL` | `claude-sonnet-4-6` | Claude model the agent uses |

## API

REST under `/tasks` ([tasks.controller.ts](src/tasks/tasks.controller.ts)):

- `GET /tasks` — `?status=todo|in_progress|done`, `?sortBy=createdAt|priority`,
  `?sortOrder=asc|desc`. Default sort: **priority DESC**.
- `GET /tasks/:id` · `POST /tasks` · `PATCH /tasks/:id` · `DELETE /tasks/:id` (204)

`Task`: `id` (uuid), `title`, `description?`, `status` (`todo`|`in_progress`|`done`),
`priority` (`low`|`medium`|`high`), `createdAt`, `updatedAt`.

A global `ValidationPipe` (whitelist + transform) validates every DTO before it
reaches a controller.

- `POST /ai/chat` — body `{ messages: [{ role, content }, ...] }`; the client
  sends the full transcript each call (the endpoint is stateless). Responds
  with the assistant text plus side-effect summaries (created/updated/deleted
  tasks, saved/forgotten memories) so the mobile app can refresh its cache.

## Storage choice

SQLite via `better-sqlite3`: a real relational store with zero setup — one
file, no Docker, `npm install` is all a reviewer needs — and data survives
restarts (unlike in-memory). Limitations, accepted for a local single-user test
task: single-writer, no migrations (schema comes from dev-only, env-gated
TypeORM `synchronize`), not a multi-instance production setup.

## AI agent

The agent lives in [src/ai](src/ai), decomposed into:

- `ChatAgentService` — orchestration only: builds the prompt, runs the Vercel
  AI SDK tool loop (`generateText` + `stopWhen: stepCountIs(...)`).
- `AgentToolsService.build(effects)` — per-request tool factory; every tool
  closes over that request's effects collector. Tools: `list_tasks`,
  `create_tasks`, `update_task`, `delete_task`, `remember`, `forget`.
- `prompts/system-prompt.ts` — the agent's behavior lives here, not in code:
  clarify vague tasks, propose splitting oversized ones, and **never create or
  delete before an explicit user confirmation**.
- `MockAgentService` — canned draft→confirm→create responses when no
  `ANTHROPIC_API_KEY` is set.

### Agent memory

The chat agent is otherwise **stateless** (the client re-sends the full
transcript each call), but it keeps a small store of **durable project facts**
so suggestions carry context across conversations.

- **What it stores:** one self-contained fact per row (stack, conventions,
  people/ownership, recurring constraints) in the `memory_fact` table
  (`{ id, content, createdAt }`). Never tasks — those belong on the board.
- **How it works:** every `/ai/chat` request reads all facts and folds them into
  the system prompt. The agent saves new ones via the `remember` tool (with a
  lowercase substring dedupe) and drops stale ones via `forget`. When memory is
  empty it offers a one-line onboarding nudge instead of injecting facts.
- **Limits (deliberate, for a test task):** flat list, **no retrieval/ranking or
  embeddings** (a full dump is a few hundred tokens at this scale), **single
  user** (no per-account scoping), and no audit trail. Dedupe is a substring
  check, not semantic — good enough here.
