# AGENT_LOG

A log of human–AI collaboration on DevYoga. Short one-line entries grouped by date.
Maintained by the `agent-log` skill (proactively) or by hand.

## 2026-06-07

- `plan` Chose the stack: NestJS + SQLite (CRUD) backend, React Native Expo frontend, AI features later.
- `scaffold` Agent created the `agent-log` project skill to maintain this log.
- `decision` Log entries are English, one-line, tagged by interaction type; agent work and manual user edits are distinguished.
- `decision` Made the `agent-log` skill proactive-by-default — it auto-logs in the background after agent interactions.
- `scaffold` Added a Stop hook (`.claude/hooks/agent-log-checkpoint.sh` + `.claude/settings.json`) that nudges a log entry only on a real checkpoint, not every turn.
- `chore` Initialized the git repo with a `.gitignore` and made the initial commit via the conventional-commit skill.
- `edit` Added an auto-commit step to the `agent-log` skill: after appending entries it commits only `AGENT_LOG.md`.
- `decision` Chose a flat `backend/` + `mobile/` monorepo layout — minimal ceremony over workspaces; avoids Expo/Metro friction for the test task.
- `scaffold` Initialized NestJS 11 backend in `backend/` via Nest CLI (npm, strict TS, no nested git).
- `decision` Adopted Context7 (`ctx7`/find-docs) proactively for library/API docs, codegen, and setup — no need to ask each time.
- `decision` Chose TypeORM + better-sqlite3 with `synchronize` (dev-only, env-gated) over migrations for the first DB iteration.
- `scaffold` Added the DB layer: `TypeOrmModule.forRootAsync` + `ConfigModule`, plus a `Task` entity and `TasksModule` CRUD.
- `chore` Wired a global `ValidationPipe` (whitelist + transform) and `.env`/`.env.example` for DB config.
- `review` Verified end-to-end: build clean, CRUD smoke test passes, validation returns 400, baseline tests green.
- `edit` Refined the `agent-log` skill: never log the commit/revert action itself — log the work it captures.
- `decision` David chose to use the Expo plugin/skills for further mobile app development.
- `scaffold` Created `backend/scripts/seed.js` — bare better-sqlite3 seed with 7 sample tasks across all statuses; added `npm run seed` and `seed:clean` scripts.
- `config` Added Postman MCP server (`postman-mcp-server`) to global Claude Code config via `claude mcp add`.
- `scaffold` Created "DevYoga API" Postman collection in the DevYoga workspace with a `GET /tasks` "Get All Tasks" request; saved workspace ID to project memory.
- `scaffold` Initialized Expo SDK 56 mobile app in `mobile/` (Expo Router, TS): NativeTabs (Tasks + Chat) with per-tab Stacks, task list/detail/create-as-formSheet screens, typed fetch helpers to the backend; verified via `tsc` + iOS export.
- `review` Agent reviewed initialized mobile code against vercel-react-native-skills; identified list perf, missing StyleSheet.create, and unstable callback issues.
- `edit` Applied review fixes: memoized TaskCard, extracted TaskItem + EmptyState from FlatList renderItem, hoisted all styles to StyleSheet.create, wrapped onSubmit/handleSubmit/status handlers in useCallback; lint clean.
- `edit` Removed 11 Expo template leftover assets (react-logo, expo-badge, tabIcons, tutorial-web, logo-glow); kept only the 9 files referenced in app.json.
- `decision` Switched mobile off Expo Go to a local dev build (`expo-dev-client`) — needed for native modules (`@expo/ui`, `expo-glass-effect`); kept it local-only since David has no paid Apple Developer account.
- `scaffold` Added `expo-dev-client` (~56.0.19) and built/ran the iOS Simulator dev build via `expo run:ios`; verified the app + dev-launcher render on the booted iPhone 17 sim.
- `edit` Pointed `npm start` at `expo start --dev-client` and rewrote the README around the local dev-build flow (free-Apple-ID iPhone 7-day caveat, Android steps).
- `manual` David flattened the tab route groups — `(tasks)`/`(chat)` → `index`/`chat` folders — and added the iOS bundle id + personal Apple team to app.json; agent committed it separately from the dev-build switch.
- `feature` Made the server address env-configurable for LAN access from a real iPhone: backend binds to `HOST` in `app.listen`, mobile reads `EXPO_PUBLIC_API_BASE` (localhost fallback); added `.env`/`.env.example` both sides and gitignored `mobile/.env`.

## 2026-06-08

- `feature` Added `priority` (low/medium/high, default medium) to Task across backend entity/DTO and mobile types/form/card; generalized form's StatusButton into a generic `OptionButton<V>` to host both selectors.
- `feature` Planned and implemented optional `?status=` filter for `GET /tasks`: new `FindTasksQueryDto`, conditional TypeORM `where`, updated controller + service; mobile `getTasks(status?)` + `StatusFilter` chip row wired to index screen; backend committed, mobile UI pending David's edits.
- `edit` Reworked mobile status filter per David: dropped the body chip row for a native `@expo/ui` `Menu` bar-button in the header (funnel SF Symbol, fills when active, checkmark on selected) placed before the `＋`.
- `fix` Replaced the header `＋` text glyph with a native SwiftUI `Button(systemImage="plus")` so both header buttons share one native style, tint, and vertical alignment.
- `fix` Plus button rendered empty — a `systemImage`-only `Button` needs `labelStyle('iconOnly')` (with a real `label` kept for accessibility) to show just the icon.
- `feature` Moved add-task out of the header into a FAB: a circular `borderedProminent` SwiftUI `Button` pinned bottom-right above the tab bar; header now keeps only the filter.
- `feature` Added sorting to `GET /tasks`: `sortBy` (createdAt|priority) + `sortOrder` (asc|desc) enums on `FindTasksQueryDto`; service switched to QueryBuilder with a CASE rank for priority (low<medium<high) and a createdAt tie-break, default unchanged (createdAt DESC). Backend only.
- `fix` Centered the filter icon in its header glass button — the `Menu`'s empty `label=""` baseline-shifted the SF Symbol up/left; switched to a real label + `labelStyle('iconOnly')` (verified on the simulator).
- `test` Added a minimal `TasksService` unit spec (mock repo via `getRepositoryToken`, chainable QueryBuilder stub): covers create, findOne found/missing, remove-missing, and findAll status filter + priority CASE ordering; 6 tests green.
- `feature` Added a Sort menu to the tasks header beside the filter: SwiftUI `Menu` with "Sort by" (Date/Priority) and "Order" (Descending/Ascending) sections, filled icon when non-default; `getTasks` now sends `sortBy`/`sortOrder`.
- `edit` Increased header icon size (`font({ size: 22 })`) and added tap-area padding (`padding({ all: 4 })`) to both SortMenu and StatusFilter.
- `edit` Changed default sort to priority DESC in backend DTO, mobile index state, and SortMenu's DEFAULT_SORT_BY constant.
- `edit` Moved priority and status badges to the bottom of TaskCard — priority left, status right via `justifyContent: 'space-between'`.
- `scaffold` Added a root `CLAUDE.md` — high-level orientation for new sessions, centered on the north star (easing developers' task-triage pain with AI as the amplifier), plus stack/layout, data model & API, run commands, and conventions.

## 2026-06-09

- `edit` Added `AppLightTheme`/`AppDarkTheme` to `theme.ts` derived from `Colors` palette; wired into root `ThemeProvider` so nav headers and screen backgrounds match the app palette; cleared task-detail dynamic title; removed redundant `Pressable` wrapper from `TaskCard`; fixed `Link.MenuAction` child syntax.
- `scaffold` Installed Redux Toolkit, react-redux, redux-persist, react-native-mmkv (v4) for offline-first state management; created `src/store/mmkv.ts` MMKV-backed redux-persist storage adapter.
- `scaffold` Implemented steps 3–6 of the state-management plan: `tasks-api.ts` (RTK Query endpoints + tag invalidation + rehydration), `filters-slice.ts` (persisted filter/sort state), `store/index.ts` (persistReducer + MMKV + setupListeners), and `_layout.tsx` wired with `<Provider>` + `<PersistGate>`.
- `edit` Migrated all three screens (list, detail, create) off imperative fetch/useState onto RTK Query hooks; Redux filters slice drives list query; tag invalidation replaces focus-refetch hack; removed all imperative functions from `utils/api.ts`, keeping only types.
- `edit` Extracted delete-confirmation Alert into shared `useDeleteConfirm` hook; list screen now shows a confirmation dialog before deleting (previously deleted immediately with no prompt).
- `decision` Brainstormed the AI layer and converged on a single agentic chat (no separate "Today" screen): stateless backend (`messages[]` round-tripped, no conversation/memory tables in v1), human-in-the-loop proactive task creation with clarifying questions + "too big → propose split", batch creation via a `create_tasks` tool, staged bottom-up (backend then frontend); chose the Vercel AI SDK over LangChain (lighter, declarative zod tools, agent loop via `stopWhen: stepCountIs`, tool-without-`execute` for HITL) and over raw SDK.
- `plan` Finalized the staged AI-layer plan (chat on Vercel AI SDK): Stage 0 backend `POST /ai/chat` with a `create_tasks` tool (zod batch input, `execute` → `TasksService`) and a system-prompt gate (clarify when vague, propose flat split when too big, never create before explicit confirm); Stage 1 mobile chat; Stage 2 more tools (list/prioritize/update/delete/status); Stage 3 optional persistence + read-only memory. Decided: too-big split = flat separate tasks (no schema change), confirmation round-trips through `/ai/chat`, stateless backend, mock mode when no API key.
- `scaffold` Built AI-layer Stage 0: `AiModule` with `POST /ai/chat`, `ChatRequestDto` (validated by the global pipe), and `ChatAgentService` using the Vercel AI SDK (`generateText` + `create_tasks` zod tool with `execute`, `stopWhen: stepCountIs(5)`) on `@ai-sdk/anthropic`; reuses `TasksService` via DI (`TasksModule` now exports it).
- `decision` Put the agent's intelligence in the system prompt (clarify/decompose/confirm), not in code — the never-create-before-explicit-"yes" gate lives there too; default model `claude-sonnet-4-6` (env-overridable via `AI_MODEL`) for fast/cheap interactive triage.
- `scaffold` Added mock mode: with no `ANTHROPIC_API_KEY` the agent returns canonical draft→confirm→create responses so the server boots and the flow is demoable without credentials; added `ANTHROPIC_API_KEY` + `AI_MODEL` to `.env.example`.
- `review` Verified Stage 0 live via curl: vague request → textual draft (no tasks created) → "yes" → `create_tasks` fires → task persisted and visible in `GET /tasks`; plus validation 400s (empty/bad-role messages) and mock mode both pass.
- `scaffold` Stage 1 frontend chat: `chat-api.ts` RTK Query slice (`sendChat` mutation, cross-slice `Task.LIST` invalidation via `onQueryStarted`/`tasksApi.util.invalidateTags`), chat types in `utils/api.ts`, store wired; full `ChatScreen` with `useReducer` transcript, `@expo/ui/swift-ui` `TextField` input bar, quick-reply chips ("Create a task", "Plan my day"), user/assistant message bubbles, and error handling.
- `decision` Used RTK Query mutation (not `@ai-sdk/react` `useChat`) for Stage 1 — the backend returns plain JSON (`generateText`, no streaming), and RTK Query gives free cross-tab invalidation without a backend rewrite.
- `manual` Removed Stop hook (agent-log-checkpoint.sh) from `.claude/settings.json` — hook was auto-logging AI collaboration on session end.
- `scaffold` Moved the chat transcript off local `useReducer` onto a persisted Redux `chat-slice` (`appendMessage`/`clearChat`/`selectMessages`, MMKV-whitelisted) so conversations survive app restarts.
- `fix` Chat list rendered in wrong order / native large-title fade looked broken: replaced the `inverted` FlatList (its `scaleY(-1)` transform flipped the iOS large-title scroll-edge fade) with a bottom-pinned non-inverted list — `flexGrow:1` + `justifyContent:'flex-end'` content container, natural message order, auto-`scrollToEnd` on content growth.

## 2026-06-10

- `fix` Chat input bar hid behind the keyboard: set `keyboardVerticalOffset` to the native Stack header height (via `useHeaderHeight` from expo-router's bundled `@react-navigation/elements`, not a standalone install — that would spawn a second `HeaderHeightContext` returning 0).
- `scaffold` Added a destructive trash button to the Chat header (`headerRight` via `Stack.Screen`) that confirms via `Alert` then dispatches the existing `clearChat` action; hidden when the transcript is empty. Reused the `@expo/ui/swift-ui` `Button`/`Host` header-button pattern from the Tasks tab.

## 2026-06-11

- `review` Agent reviewed backend AI architecture against David's wishlist (more tools, quick replies, today-plan, status, memory): verdict — current shape holds; everything is a new tool on the one agent, not new agents/infra.
- `plan` Agreed the decomposition: split `chat-agent.service.ts` into orchestration + `AgentToolsService` (per-request tool factory closing over a `ChatTurnEffects` collector) + prompt file + mock service; quick replies via a no-op `suggest_quick_replies` tool, no second LLM call.
- `decision` Prioritized remaining AI work 1–6: decompose → `list_tasks`+today-plan (meets the ≥2-features bar) → update/delete tools → quick replies → status generator → memory (first to cut); explicitly descoped on-device AI (key exposure) and update-hooks auto-reprioritization.
- `scaffold` Agent wrote `plans/` (index + 6 staged plan docs, 01–06) — each with goal, steps, done-criteria, effort, and cut order.
- `edit` Executed plan 01: decomposed the AI module into orchestration-only `ChatAgentService`, `AgentToolsService.build(effects)` per-request tool factory, `chat-turn.types.ts`, `prompts/system-prompt.ts`, and `MockAgentService` — pure refactor, verified live draft→confirm→create and mock mode end-to-end.
