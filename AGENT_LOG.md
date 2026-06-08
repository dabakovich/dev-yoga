# AGENT_LOG

A log of human–AI collaboration on DevLog. Short one-line entries grouped by date.
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
