# Backend-stored conversations — design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)

## Goal

Move chat history from device-only storage to the backend. Support **multiple
conversations** (minimal management: auto-created, listable, deletable — no
rename/pin/search), make `POST /ai/chat` **stateful** (DB is the source of
truth), persist per-message **effects** so reloaded history renders identically,
and give each conversation an **AI-generated title**.

### Why

Today the backend is stateless: the mobile app holds one flat `messages[]` thread
in Redux, persists it to MMKV, and re-sends the whole transcript on every
`POST /ai/chat`. There is no server-side record of any conversation. We want the
backend to own conversation history so it survives reinstalls, can be inspected,
and supports more than one thread.

## Non-goals (YAGNI)

- Rename, pin, search, or fold/archive conversations.
- Multi-user / ownership — this stays a single-user personal tracker (consistent
  with `MemoryFact`: no owner FK).
- Migrating the existing on-device thread. On upgrade we drop it and start fresh.
- Streaming responses (unchanged from today).

## Architecture & module boundaries

A new **`conversations/`** domain module owns persistence. **`AiModule`** consumes
it, mirroring how `AiModule` already imports `TasksModule`. Storage logic does not
know about the agent; the agent treats conversation history as a dependency it
loads and appends to.

```
backend/src/conversations/
  conversation.entity.ts        # Conversation
  message.entity.ts             # Message (FK -> Conversation, cascade delete)
  conversations.service.ts      # create / list / getWithMessages / appendMessage / delete / setTitle
  conversations.controller.ts   # GET /conversations, GET /:id, DELETE /:id
  conversations.module.ts       # registers entities + exports the service
```

`ConversationsModule` registers both entities via `TypeOrmModule.forFeature` and
**exports `ConversationsService`**. `AiModule` imports `ConversationsModule`;
`ChatAgentService` gains a `ConversationsService` dependency. With
`autoLoadEntities`, the two tables are created automatically.

## Data model

### `Conversation`

| Column      | Type        | Notes                                                        |
|-------------|-------------|--------------------------------------------------------------|
| `id`        | uuid (PK)   | `@PrimaryGeneratedColumn('uuid')`                            |
| `title`     | text, null  | Null until generated; see Title generation                  |
| `createdAt` | timestamp   | `@CreateDateColumn`                                          |
| `updatedAt` | timestamp   | `@UpdateDateColumn`; bumped on each new message for list order |

- `@OneToMany(() => Message, m => m.conversation)` — `messages`.

### `Message`

| Column         | Type                   | Notes                                                      |
|----------------|------------------------|------------------------------------------------------------|
| `id`           | uuid (PK)              | `@PrimaryGeneratedColumn('uuid')`                          |
| `conversation` | ManyToOne → Conversation | `onDelete: 'CASCADE'`; FK column `conversationId`        |
| `role`         | simple-enum            | `user` \| `assistant` (reuse/align with `ChatRole`)        |
| `content`      | text                   | The message text                                           |
| `effects`      | simple-json, null      | Assistant turns only; the turn's effects summary (below)   |
| `createdAt`    | timestamp              | `@CreateDateColumn`; orders messages within a conversation |

`effects` stores the existing `ChatTurnEffects` shape
(`createdTasks` / `updatedTasks` / `deletedTasks` / `savedMemories` /
`forgotMemories`) so reloaded history re-renders the same "Created task X" /
"Remembered Y" notes the user saw live. SQLite has no JSON type; TypeORM
`simple-json` serializes to text transparently.

## API & chat flow

### `POST /ai/chat` (now stateful)

**New request body** (replaces `{ messages[] }`):

```ts
class ChatRequestDto {
  @IsOptional() @IsUUID()
  conversationId?: string;

  @IsString() @IsNotEmpty()
  message!: string;
}
```

**Flow in `ChatAgentService.chat()`:**

1. Resolve the conversation: if no `conversationId`, create a new `Conversation`;
   if given but not found → `NotFoundException` (404).
2. Persist the **user** message (`role: user`, `content: message`).
3. Load the full history from the DB (ordered by `createdAt`) and map it to AI SDK
   model messages (`{ role, content }`).
4. Run the agent loop (unchanged: system prompt + memory facts + tools, mock vs
   live by API-key presence).
5. Persist the **assistant** message (`role: assistant`, `content: reply`,
   `effects` = this turn's effects object).
6. If the conversation has no title yet → generate one (see Title generation).
7. Return:

```ts
interface ChatResult extends ChatTurnEffects {
  conversationId: string;
  reply: string;
  title?: string; // present when generated this turn
}
```

Mock mode follows the same persistence flow (steps 1–6); only step 4's text comes
from `MockAgentService`.

### REST endpoints (new `ConversationsController`)

Validated by the existing global `ValidationPipe`.

- `GET /conversations` → list, sorted `updatedAt DESC`. Each item:
  `{ id, title, createdAt, updatedAt }` (no messages — keep the list cheap).
- `GET /conversations/:id` → `{ id, title, createdAt, updatedAt, messages[] }`
  with messages ordered by `createdAt` (each includes `effects`). 404 if unknown.
- `DELETE /conversations/:id` → 204; cascade-deletes its messages. 404 if unknown.

## AI title generation

After the **first** assistant turn (conversation `title` still null), make a
**separate, cheap** `generateText` call: a small model, no tools, capped to a few
output tokens, prompted to return a ≤6-word title summarizing the opening
exchange. Persist it via `ConversationsService.setTitle` and return it in that
turn's `ChatResult.title`.

- **Mock mode / no API key →** skip the call; title = truncated first user-message
  snippet (e.g. first ~40 chars).
- **Non-fatal:** a title-gen failure is caught and logged; we fall back to the
  snippet. A failed title must never block or fail the chat reply.

## Mobile impact (high level — detailed in the implementation plan)

- Remove the device-only `chat-slice` flat thread. Replace with RTK Query
  endpoints in a `conversations-api` (or extended `chat-api`):
  `getConversations`, `getConversation`, `sendChat({ conversationId?, message })`,
  `deleteConversation`.
- `sendChat` response carries `conversationId` (+ optional `title`); on success
  it invalidates the conversation + conversation-list caches, and still invalidates
  `Task.LIST` when task effects are present (as today).
- New **conversation list** screen + "new chat" action; the existing chat screen
  loads a conversation by id. MMKV persists only the active-conversation id and
  RTK Query cache, not the canonical thread.
- Drop the old persisted `chat` thread on upgrade (no migration).

## Error handling

- Unknown conversation id on `GET`/`DELETE`/`POST` → `NotFoundException` (404).
- Title generation and the agent run are isolated: a failed title never blocks the
  reply; an agent error surfaces as today.

## Testing

Unit tests (Jest, matching `tasks.service.spec.ts` style):

- `ConversationsService`: create; `appendMessage` bumps `updatedAt`; `getWithMessages`
  returns ordered messages with `effects`; `delete` cascades messages; list ordering
  by `updatedAt DESC`; unknown id → throws.
- Stateful chat flow: persists both the user and assistant messages, stores `effects`
  on the assistant message, creates a conversation when `conversationId` is absent.
- Title generation: mock mode falls back to the first-message snippet; title only
  generated when previously null.
```
