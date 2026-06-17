# Backend-stored Conversations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move chat history from device-only storage to the backend — multiple conversations (auto-created, listable, deletable), a stateful `POST /ai/chat`, per-message effects, and AI-generated titles.

**Architecture:** A new `conversations/` NestJS domain module owns two TypeORM entities (`Conversation`, `Message`) and a CRUD-ish service + REST controller. `AiModule` imports it; `ChatAgentService` becomes stateful: it loads history from the DB, runs the (unchanged) agent loop, persists the user + assistant messages, and generates a title on the first turn. The mobile app swaps its device-only Redux chat slice for RTK Query endpoints against the new backend, adding a conversation-list screen.

**Tech Stack:** NestJS 11, TypeORM + better-sqlite3, Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), Jest (colocated `*.spec.ts` unit tests); React Native + Expo Router, Redux Toolkit + RTK Query, redux-persist on MMKV.

**Conventions to follow:**
- Backend comments lean explanatory (DI, decorators, pipeline). Match `tasks.service.ts` / `task.entity.ts` density.
- Unit tests mock the TypeORM repository via `getRepositoryToken(...)` — see `tasks.service.spec.ts`. No real DB in unit tests.
- Run backend tests from `backend/`: `npm test`.
- Commit per task with Conventional Commits; co-author trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- After each meaningful task, append a one-line entry to `AGENT_LOG.md` (the `agent-log` skill).

---

## File Structure

**Backend — create:**
- `backend/src/conversations/conversation.entity.ts` — `Conversation` entity.
- `backend/src/conversations/message.entity.ts` — `Message` entity + `MessageRole` enum.
- `backend/src/conversations/conversations.service.ts` — create / appendMessage / list / getWithMessages / remove / setTitle.
- `backend/src/conversations/conversations.service.spec.ts` — unit tests.
- `backend/src/conversations/conversations.controller.ts` — `GET /conversations`, `GET /:id`, `DELETE /:id`.
- `backend/src/conversations/conversations.module.ts` — registers entities, exports the service.

**Backend — modify:**
- `backend/src/ai/chat-turn.types.ts` — add `AgentTurnOutput`, extend `ChatResult`.
- `backend/src/ai/dto/chat-request.dto.ts` — replace `messages[]` with `{ conversationId?, message }`.
- `backend/src/ai/chat-agent.service.ts` — stateful flow + title generation.
- `backend/src/ai/mock-agent.service.ts` — accept mapped history, return `AgentTurnOutput`.
- `backend/src/ai/ai.controller.ts` — pass the new DTO straight through.
- `backend/src/ai/ai.module.ts` — import `ConversationsModule`.
- `backend/src/app.module.ts` — register `ConversationsModule` (verify; see Task 7).

**Mobile — modify:**
- `mobile/src/utils/api.ts` — conversation/message types; new chat request/result shapes.
- `mobile/src/store/chat-api.ts` → rename concept to conversations API (list/get/send/delete).
- `mobile/src/store/index.ts` — drop `chat` slice from reducers + persist whitelist.
- `mobile/src/store/active-conversation-slice.ts` — **create**: holds the active conversation id.
- `mobile/src/app/(tabs)/chat/_layout.tsx` — add the list + detail routes.
- `mobile/src/app/(tabs)/chat/index.tsx` — conversation list screen.
- `mobile/src/app/(tabs)/chat/[id].tsx` — **create**: the chat thread screen (adapted from today's `index.tsx`).

**Mobile — delete:**
- `mobile/src/store/chat-slice.ts` — replaced by backend storage + active-conversation slice.

---

## PHASE 1 — BACKEND

### Task 1: `Conversation` and `Message` entities

**Files:**
- Create: `backend/src/conversations/conversation.entity.ts`
- Create: `backend/src/conversations/message.entity.ts`

- [ ] **Step 1: Write the `Conversation` entity**

`backend/src/conversations/conversation.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from './message.entity';

// A single chat thread. Deliberately minimal (single-user tracker, like
// MemoryFact): no owner FK. `title` is null until the agent generates one after
// the first turn. `updatedAt` is bumped on every new message so the list view
// can sort most-recent-first.
@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  // `@OneToMany` is the inverse side — it owns no column; the FK lives on
  // Message. `cascade: ['insert']` lets us save a Conversation with messages in
  // one call, though here we usually append messages individually.
  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

- [ ] **Step 2: Write the `Message` entity**

`backend/src/conversations/message.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import type { ChatTurnEffects } from '../ai/chat-turn.types';

// The two roles we persist. `system` is never stored — it's owned by the agent
// and injected at request time.
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

// One message in a conversation. `effects` is populated only on assistant turns:
// it stores the side-effect summary (created/updated/deleted tasks, saved/forgot
// memories) so reloaded history can re-render the same "Created task X" notes the
// user saw live. `simple-json` serializes the object to a text column (SQLite has
// no JSON type).
@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // `@ManyToOne` is the owning side — it creates the `conversationId` FK column.
  // `onDelete: 'CASCADE'` makes the DB drop a conversation's messages when the
  // conversation row is deleted.
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Column({ type: 'simple-enum', enum: MessageRole })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'simple-json', nullable: true })
  effects?: ChatTurnEffects | null;

  @CreateDateColumn()
  createdAt!: Date;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. (`ChatTurnEffects` already exists in `src/ai/chat-turn.types.ts`.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/conversations/conversation.entity.ts backend/src/conversations/message.entity.ts
git commit -m "feat(conversations): add Conversation and Message entities

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `ConversationsService` (TDD)

**Files:**
- Create: `backend/src/conversations/conversations.service.ts`
- Test: `backend/src/conversations/conversations.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`backend/src/conversations/conversations.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { ConversationsService } from './conversations.service';

// Unit test in isolation: both TypeORM repositories are replaced with mocks
// (provided via getRepositoryToken) so nothing touches a real DB.
describe('ConversationsService', () => {
  let service: ConversationsService;

  const conversationsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const messagesRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: getRepositoryToken(Conversation), useValue: conversationsRepo },
        { provide: getRepositoryToken(Message), useValue: messagesRepo },
      ],
    }).compile();

    service = module.get(ConversationsService);
    jest.clearAllMocks();
  });

  it('create() persists a new conversation and returns it', async () => {
    const convo = { id: 'c1', title: null } as Conversation;
    conversationsRepo.create.mockReturnValue(convo);
    conversationsRepo.save.mockResolvedValue(convo);

    await expect(service.create()).resolves.toBe(convo);
    expect(conversationsRepo.save).toHaveBeenCalledWith(convo);
  });

  it('appendMessage() saves the message and bumps the conversation timestamp', async () => {
    const msg = { id: 'm1' } as Message;
    messagesRepo.create.mockReturnValue(msg);
    messagesRepo.save.mockResolvedValue(msg);

    const result = await service.appendMessage('c1', {
      role: MessageRole.USER,
      content: 'hello',
    });

    expect(result).toBe(msg);
    expect(messagesRepo.create).toHaveBeenCalledWith({
      conversation: { id: 'c1' },
      role: MessageRole.USER,
      content: 'hello',
      effects: null,
    });
    // Touch the parent so updatedAt advances and the list re-sorts.
    expect(conversationsRepo.update).toHaveBeenCalledWith('c1', {
      updatedAt: expect.any(Date),
    });
  });

  it('findAll() lists conversations newest-first without messages', async () => {
    const convos = [{ id: 'c1' }] as Conversation[];
    conversationsRepo.find.mockResolvedValue(convos);

    await expect(service.findAll()).resolves.toBe(convos);
    expect(conversationsRepo.find).toHaveBeenCalledWith({
      order: { updatedAt: 'DESC' },
    });
  });

  it('getWithMessages() returns the conversation with ordered messages', async () => {
    const convo = { id: 'c1', messages: [] } as unknown as Conversation;
    conversationsRepo.findOne.mockResolvedValue(convo);

    await expect(service.getWithMessages('c1')).resolves.toBe(convo);
    expect(conversationsRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'c1' },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
  });

  it('getWithMessages() throws NotFoundException when missing', async () => {
    conversationsRepo.findOne.mockResolvedValue(null);
    await expect(service.getWithMessages('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() throws NotFoundException when no row was deleted', async () => {
    conversationsRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
    await expect(service.remove('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('setTitle() updates only the title column', async () => {
    conversationsRepo.update.mockResolvedValue({ affected: 1 });
    await service.setTitle('c1', 'Triage backend backlog');
    expect(conversationsRepo.update).toHaveBeenCalledWith('c1', {
      title: 'Triage backend backlog',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npm test -- conversations.service`
Expected: FAIL — `Cannot find module './conversations.service'`.

- [ ] **Step 3: Write the implementation**

`backend/src/conversations/conversations.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ChatTurnEffects } from '../ai/chat-turn.types';
import { Conversation } from './conversation.entity';
import { Message, MessageRole } from './message.entity';

// Persistence gateway for conversations and their messages. The agent
// (ChatAgentService) and the REST controller both go through here — storage
// logic stays out of the agent.
@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
  ) {}

  // A new, empty, untitled thread. The title is filled in later (first turn).
  create(): Promise<Conversation> {
    const conversation = this.conversations.create({ title: null });
    return this.conversations.save(conversation);
  }

  // Append one message. We set the FK with a bare `{ id }` reference (no need to
  // load the full parent row), then bump the parent's updatedAt so the list view
  // re-sorts to most-recent-first.
  async appendMessage(
    conversationId: string,
    data: {
      role: MessageRole;
      content: string;
      effects?: ChatTurnEffects | null;
    },
  ): Promise<Message> {
    const message = this.messages.create({
      conversation: { id: conversationId } as Conversation,
      role: data.role,
      content: data.content,
      effects: data.effects ?? null,
    });
    const saved = await this.messages.save(message);
    await this.conversations.update(conversationId, { updatedAt: new Date() });
    return saved;
  }

  // List for the index screen — newest first, no messages (keep it cheap).
  findAll(): Promise<Conversation[]> {
    return this.conversations.find({ order: { updatedAt: 'DESC' } });
  }

  // Full thread with its messages in chronological order.
  async getWithMessages(id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }

  async remove(id: string): Promise<void> {
    // onDelete: 'CASCADE' on Message.conversation drops the messages with it.
    const result = await this.conversations.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
  }

  async setTitle(id: string, title: string): Promise<void> {
    await this.conversations.update(id, { title });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npm test -- conversations.service`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/conversations/conversations.service.ts backend/src/conversations/conversations.service.spec.ts
git commit -m "feat(conversations): add ConversationsService with unit tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `ConversationsController` and `ConversationsModule`

**Files:**
- Create: `backend/src/conversations/conversations.controller.ts`
- Create: `backend/src/conversations/conversations.module.ts`

- [ ] **Step 1: Write the controller**

`backend/src/conversations/conversations.controller.ts`:

```ts
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';

// `@Controller('conversations')` prefixes these routes with /conversations.
// There is no POST here — conversations are created implicitly by POST /ai/chat
// (the agent owns thread creation). This controller is read + delete only.
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  findAll() {
    return this.conversations.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Throws NotFoundException (404) if the id is unknown.
    return this.conversations.getWithMessages(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.conversations.remove(id);
  }
}
```

- [ ] **Step 2: Write the module**

`backend/src/conversations/conversations.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  // forFeature registers both repositories in this module's DI scope and (via
  // autoLoadEntities) tells the root connection about the entities so the tables
  // are created.
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  // Export the service so AiModule (which imports this module) can inject it.
  exports: [ConversationsService],
})
export class ConversationsModule {}
```

- [ ] **Step 3: Register the module in the app**

Open `backend/src/app.module.ts`. Confirm how feature modules are wired (TasksModule, AiModule). Add `ConversationsModule` to the root `imports` array alongside them. (If `AiModule` is the only place modules are composed, still register here so the controller's routes mount.)

- [ ] **Step 4: Verify it boots and routes mount**

Run: `cd backend && npm run build`
Expected: build succeeds.

Run (smoke, optional): `cd backend && (npm run start &) && sleep 6 && curl -s localhost:3000/conversations && kill %1`
Expected: `[]` (empty list) on a fresh DB.

- [ ] **Step 5: Commit**

```bash
git add backend/src/conversations/conversations.controller.ts backend/src/conversations/conversations.module.ts backend/src/app.module.ts
git commit -m "feat(conversations): add REST controller and module

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Update chat turn types and the chat request DTO

**Files:**
- Modify: `backend/src/ai/chat-turn.types.ts`
- Modify: `backend/src/ai/dto/chat-request.dto.ts`

- [ ] **Step 1: Add `AgentTurnOutput` and extend `ChatResult`**

In `backend/src/ai/chat-turn.types.ts`, replace the `ChatResult` interface (currently `extends ChatTurnEffects` with just `reply`) so generation output and the controller result are separated:

```ts
// What a single text-generation pass produces — the assistant's reply plus the
// effects the tools recorded. Both the live agent and the mock agent return this
// shape; ChatAgentService wraps it with persistence concerns (below).
export interface AgentTurnOutput extends ChatTurnEffects {
  reply: string;
}

// What the controller returns to the client: the generation output plus the
// conversation id it belongs to and, on the first turn, the freshly generated
// title.
export interface ChatResult extends AgentTurnOutput {
  conversationId: string;
  title?: string;
}
```

Keep `ChatTurnEffects` and `createChatTurnEffects` unchanged.

- [ ] **Step 2: Rewrite the chat request DTO**

Replace the whole body of `backend/src/ai/dto/chat-request.dto.ts`:

```ts
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// Body for `POST /ai/chat`. The backend is now stateful: instead of the full
// transcript, the client sends just the new user message plus (after the first
// turn) the conversation it belongs to. Validated by the global ValidationPipe.
export class ChatRequestDto {
  // Absent on the first message of a new thread — the agent creates the
  // conversation and returns its id. Must be a uuid when present.
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
```

(`ChatRole` / `ChatMessageDto` are removed; the persisted role enum now lives in `message.entity.ts` as `MessageRole`.)

- [ ] **Step 3: Verify the type changes compile in isolation**

Run: `cd backend && npx tsc --noEmit`
Expected: errors ONLY in `ai.controller.ts`, `chat-agent.service.ts`, and `mock-agent.service.ts` (they still reference the old shapes) — these are fixed in Tasks 5–6. No errors in the conversations module or DTO/types files themselves.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ai/chat-turn.types.ts backend/src/ai/dto/chat-request.dto.ts
git commit -m "refactor(ai): stateful chat DTO and split AgentTurnOutput from ChatResult

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Make `ChatAgentService` stateful (TDD)

**Files:**
- Modify: `backend/src/ai/chat-agent.service.ts`
- Test: `backend/src/ai/chat-agent.service.spec.ts` (create)

This task introduces the orchestration: resolve/create conversation → persist user message → load history → generate → persist assistant message + effects → generate title on first turn.

- [ ] **Step 1: Write the failing test**

`backend/src/ai/chat-agent.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatAgentService } from './chat-agent.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import { MockAgentService } from './mock-agent.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/message.entity';
import { createChatTurnEffects } from './chat-turn.types';

// No ANTHROPIC_API_KEY is configured (config.get returns undefined), so these
// tests drive the mock path — that lets us assert the persistence orchestration
// without hitting Anthropic.
describe('ChatAgentService (stateful flow, mock mode)', () => {
  let service: ChatAgentService;

  const config = { get: jest.fn().mockReturnValue(undefined) };
  const tools = { build: jest.fn() };
  const memory = { findAll: jest.fn().mockResolvedValue([]) };
  const mockAgent = {
    chat: jest.fn().mockResolvedValue({
      reply: '[mock] hi',
      ...createChatTurnEffects(),
    }),
  };
  const conversations = {
    create: jest.fn().mockResolvedValue({ id: 'c1', title: null }),
    appendMessage: jest.fn().mockResolvedValue({ id: 'm1' }),
    getWithMessages: jest.fn(),
    setTitle: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatAgentService,
        { provide: ConfigService, useValue: config },
        { provide: AgentToolsService, useValue: tools },
        { provide: AgentMemoryService, useValue: memory },
        { provide: MockAgentService, useValue: mockAgent },
        { provide: ConversationsService, useValue: conversations },
      ],
    }).compile();

    service = module.get(ChatAgentService);
    jest.clearAllMocks();
    config.get.mockReturnValue(undefined);
    mockAgent.chat.mockResolvedValue({
      reply: '[mock] hi',
      ...createChatTurnEffects(),
    });
  });

  it('creates a conversation when no conversationId is given', async () => {
    conversations.create.mockResolvedValue({ id: 'c1', title: null });
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: null,
      messages: [{ role: MessageRole.USER, content: 'hi' }],
    });

    const result = await service.chat({ message: 'hi' });

    expect(conversations.create).toHaveBeenCalledTimes(1);
    expect(result.conversationId).toBe('c1');
  });

  it('persists the user message then the assistant message with effects', async () => {
    conversations.create.mockResolvedValue({ id: 'c1', title: null });
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: null,
      messages: [{ role: MessageRole.USER, content: 'hi' }],
    });

    await service.chat({ message: 'hi' });

    // First append = the user's message.
    expect(conversations.appendMessage).toHaveBeenNthCalledWith(1, 'c1', {
      role: MessageRole.USER,
      content: 'hi',
    });
    // Second append = the assistant reply, carrying the effects blob.
    expect(conversations.appendMessage).toHaveBeenNthCalledWith(2, 'c1', {
      role: MessageRole.ASSISTANT,
      content: '[mock] hi',
      effects: expect.objectContaining({ createdTasks: [] }),
    });
  });

  it('sets a snippet title on the first turn in mock mode', async () => {
    conversations.create.mockResolvedValue({ id: 'c1', title: null });
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: null,
      messages: [
        { role: MessageRole.USER, content: 'Refactor the auth backend please' },
      ],
    });

    const result = await service.chat({ message: 'Refactor the auth backend please' });

    expect(conversations.setTitle).toHaveBeenCalledWith(
      'c1',
      'Refactor the auth backend please',
    );
    expect(result.title).toBe('Refactor the auth backend please');
  });

  it('does NOT retitle a conversation that already has a title', async () => {
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: 'Existing title',
      messages: [{ role: MessageRole.USER, content: 'next message' }],
    });

    const result = await service.chat({ conversationId: 'c1', message: 'next message' });

    expect(conversations.create).not.toHaveBeenCalled();
    expect(conversations.setTitle).not.toHaveBeenCalled();
    expect(result.title).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npm test -- chat-agent.service`
Expected: FAIL — `service.chat` signature/behavior doesn't match (and `ConversationsService` not yet injected).

- [ ] **Step 3: Rewrite the service**

Replace `backend/src/ai/chat-agent.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { AgentToolsService } from './agent-tools.service';
import {
  AgentTurnOutput,
  ChatResult,
  createChatTurnEffects,
} from './chat-turn.types';
import { ChatRequestDto } from './dto/chat-request.dto';
import { AgentMemoryService } from './memory/agent-memory.service';
import { MockAgentService } from './mock-agent.service';
import { DEFAULT_MODEL, buildSystemPrompt } from './prompts/system-prompt';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/conversation.entity';
import { Message, MessageRole } from '../conversations/message.entity';

// A cheap model for the one-shot title call — titling doesn't need the full
// triage model. Falls back to the snippet if the call fails or there's no key.
const TITLE_MODEL = 'claude-haiku-4-5-20251001';

// The role/content pairs the AI SDK consumes. The persisted `effects` are NOT
// sent to the model — they exist only for UI rehydration.
type ModelMessage = { role: 'user' | 'assistant'; content: string };

// Orchestration: persist the turn around the (mock or live) text generation,
// and title the thread on its first turn.
@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tools: AgentToolsService,
    private readonly memory: AgentMemoryService,
    private readonly mockAgent: MockAgentService,
    private readonly conversations: ConversationsService,
  ) {}

  async chat(dto: ChatRequestDto): Promise<ChatResult> {
    // 1. Resolve the thread: existing one, or a fresh untitled conversation.
    const conversation: Conversation = dto.conversationId
      ? await this.conversations.getWithMessages(dto.conversationId)
      : await this.conversations.create();

    // 2. Persist the user's message.
    await this.conversations.appendMessage(conversation.id, {
      role: MessageRole.USER,
      content: dto.message,
    });

    // 3. Load the full history (now including the just-saved user message) and
    //    map it onto AI SDK messages. A freshly created conversation has no
    //    `messages` relation loaded, so re-fetch to get the canonical order.
    const full = await this.conversations.getWithMessages(conversation.id);
    const history: ModelMessage[] = full.messages.map((m: Message) => ({
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
    }));

    // 4. Generate the assistant turn (mock vs live).
    const output = await this.generate(history);

    // 5. Persist the assistant message with its effects blob.
    await this.conversations.appendMessage(conversation.id, {
      role: MessageRole.ASSISTANT,
      content: output.reply,
      effects: {
        createdTasks: output.createdTasks,
        updatedTasks: output.updatedTasks,
        deletedTasks: output.deletedTasks,
        savedMemories: output.savedMemories,
        forgotMemories: output.forgotMemories,
      },
    });

    // 6. Title the thread on its first turn (title still null). Non-fatal.
    let title: string | undefined;
    if (!full.title) {
      title = await this.generateTitle(dto.message);
      await this.conversations.setTitle(conversation.id, title);
    }

    return { conversationId: conversation.id, title, ...output };
  }

  // Produce the reply + effects. No key → mock mode so the repo runs without
  // Anthropic credentials.
  private async generate(history: ModelMessage[]): Promise<AgentTurnOutput> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return this.mockAgent.chat(history);
    }

    const effects = createChatTurnEffects();
    const anthropic = createAnthropic({ apiKey });
    const model = this.config.get<string>('AI_MODEL') ?? DEFAULT_MODEL;
    const facts = await this.memory.findAll();
    const system = buildSystemPrompt(facts.map((f) => f.content));

    const { text } = await generateText({
      model: anthropic(model),
      system,
      messages: history,
      tools: this.tools.build(effects),
      stopWhen: stepCountIs(5),
    });

    return { reply: text, ...effects };
  }

  // A short (<= 6 word) title from the opening message. In mock mode (no key) or
  // on any failure, fall back to a truncated snippet — titling must never break
  // the chat reply.
  private async generateTitle(firstMessage: string): Promise<string> {
    const snippet = firstMessage.trim().slice(0, 40);
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return snippet;
    }
    try {
      const anthropic = createAnthropic({ apiKey });
      const { text } = await generateText({
        model: anthropic(TITLE_MODEL),
        system:
          'You write terse chat titles. Reply with a title of at most 6 words. No quotes, no punctuation at the end.',
        prompt: `First message of the conversation:\n${firstMessage}`,
      });
      const cleaned = text.trim().replace(/^["']|["']$/g, '');
      return cleaned.length > 0 ? cleaned.slice(0, 60) : snippet;
    } catch (err) {
      this.logger.warn(`Title generation failed, using snippet: ${String(err)}`);
      return snippet;
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npm test -- chat-agent.service`
Expected: PASS (4 tests). (`mock-agent.service` is updated in Task 6 — its type may still error under `tsc`, but Jest with ts-jest isolates the spec; if the suite fails to compile, do Task 6 first, then re-run. They are sequential.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/ai/chat-agent.service.ts backend/src/ai/chat-agent.service.spec.ts
git commit -m "feat(ai): stateful chat flow with persistence and AI titles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Update `MockAgentService` and `AiController`

**Files:**
- Modify: `backend/src/ai/mock-agent.service.ts`
- Modify: `backend/src/ai/ai.controller.ts`
- Modify: `backend/src/ai/ai.module.ts`

- [ ] **Step 1: Update the mock agent signature**

`MockAgentService.chat` now receives mapped history (`{ role, content }[]`) and returns `AgentTurnOutput` (no `conversationId`). Replace `backend/src/ai/mock-agent.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { TaskPriority } from '../tasks/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { AgentTurnOutput, createChatTurnEffects } from './chat-turn.types';

// One mapped message as ChatAgentService passes it in (role + content only).
type ModelMessage = { role: 'user' | 'assistant'; content: string };

// Canonical, key-free responses so the endpoint is demoable without Anthropic
// credentials. Mimics the draft → confirm → create gate with a keyword check so
// the full flow can still be exercised end-to-end. Persistence is handled by
// ChatAgentService — this only produces the reply + effects.
@Injectable()
export class MockAgentService {
  private readonly logger = new Logger(MockAgentService.name);

  constructor(private readonly tasksService: TasksService) {}

  async chat(messages: ModelMessage[]): Promise<AgentTurnOutput> {
    this.logger.warn('ANTHROPIC_API_KEY not set — using mock AI responses.');

    const userMessages = messages.filter((m) => m.role === 'user');
    const last = userMessages.at(-1)?.content.trim() ?? '';
    const confirmed = /^(yes|y|confirm|go ahead|create|do it|да)\b/i.test(last);

    // The user's previous request is what we'd create (the latest message is
    // their confirmation).
    const subject = userMessages.at(-2)?.content.trim() ?? last;

    if (confirmed && subject) {
      const created = await this.tasksService.create({
        title: subject.slice(0, 80),
        description: 'Created in mock mode (no ANTHROPIC_API_KEY set).',
        priority: TaskPriority.MEDIUM,
      });
      return {
        ...createChatTurnEffects(),
        reply: `[mock] Created task "${created.title}". Set ANTHROPIC_API_KEY for the real triage agent.`,
        createdTasks: [created],
      };
    }

    return {
      ...createChatTurnEffects(),
      reply:
        last.length > 0
          ? `[mock] Draft: I'd create a task "${last.slice(0, 80)}" (priority: medium). Reply "yes" to confirm. (Set ANTHROPIC_API_KEY to enable the real agent.)`
          : '[mock] Tell me what task you want to create. (Set ANTHROPIC_API_KEY to enable the real agent.)',
    };
  }
}
```

- [ ] **Step 2: Update the controller**

`backend/src/ai/ai.controller.ts` — the agent now takes the whole DTO:

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { ChatAgentService } from './chat-agent.service';
import { ChatResult } from './chat-turn.types';
import { ChatRequestDto } from './dto/chat-request.dto';

// `@Controller('ai')` prefixes routes here with /ai. The single POST /ai/chat
// endpoint is the one agentic surface for the whole product. It is now stateful:
// the body carries an optional conversationId + the new message, and the agent
// owns history persistence.
@Controller('ai')
export class AiController {
  constructor(private readonly chatAgent: ChatAgentService) {}

  @Post('chat')
  chat(@Body() dto: ChatRequestDto): Promise<ChatResult> {
    return this.chatAgent.chat(dto);
  }
}
```

- [ ] **Step 3: Import `ConversationsModule` into `AiModule`**

In `backend/src/ai/ai.module.ts`, add `ConversationsModule` to `imports` (so `ChatAgentService` can inject `ConversationsService`):

```ts
import { ConversationsModule } from '../conversations/conversations.module';
// ...
  imports: [
    TasksModule,
    ConversationsModule,
    TypeOrmModule.forFeature([MemoryFact]),
  ],
```

- [ ] **Step 4: Run the full backend test suite + build**

Run: `cd backend && npm test`
Expected: all suites PASS (tasks + conversations + chat-agent).

Run: `cd backend && npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 5: End-to-end smoke (mock mode)**

Run:
```bash
cd backend && (npm run start &) && sleep 6 && \
  CID=$(curl -s -X POST localhost:3000/ai/chat -H 'Content-Type: application/json' \
    -d '{"message":"Plan my day"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["conversationId"])') && \
  echo "conversation: $CID" && \
  curl -s localhost:3000/conversations | python3 -m json.tool && \
  curl -s localhost:3000/conversations/$CID | python3 -m json.tool && \
  kill %1
```
Expected: the POST returns a `conversationId` + `title`; the list shows one conversation; the detail shows two messages (user + assistant), the assistant one carrying an `effects` object.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai/mock-agent.service.ts backend/src/ai/ai.controller.ts backend/src/ai/ai.module.ts
git commit -m "feat(ai): wire stateful chat through controller and mock agent

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 7: Log to AGENT_LOG.md** (via the `agent-log` skill): "Backend: conversations now persisted server-side; POST /ai/chat is stateful with AI-generated titles."

---

## PHASE 2 — MOBILE

> Mobile runs as a local dev build (not Expo Go). There is no headless test suite here — verification is by type-check (`npx tsc --noEmit` in `mobile/`) and a manual run (`npm run ios` / `npm run dev`). Each task ends with a type-check + commit; the final task includes a manual run.

### Task 7: Update mobile API types

**Files:**
- Modify: `mobile/src/utils/api.ts`

- [ ] **Step 1: Replace the chat type block**

In `mobile/src/utils/api.ts`, replace everything from the `// Chat types` comment to the end of the file:

```ts
// Conversation / chat types — mirror backend conversations + ChatResult.
export type ChatRole = 'user' | 'assistant';

// Per-assistant-message side effects (mirrors backend ChatTurnEffects).
export interface MessageEffects {
  createdTasks: Task[];
  updatedTasks: Task[];
  deletedTasks: Pick<Task, 'id' | 'title'>[];
  savedMemories: string[];
  forgotMemories: string[];
}

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  effects?: MessageEffects | null;
  createdAt: string;
}

// List item — no messages (the list endpoint omits them).
export interface ConversationSummary {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

// Body for POST /ai/chat — stateful: optional conversationId + the new message.
export interface ChatRequest {
  conversationId?: string;
  message: string;
}

export interface ChatResult extends MessageEffects {
  conversationId: string;
  reply: string;
  title?: string;
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: errors only in files still using the old chat types (`chat-api.ts`, `chat-slice.ts`, `chat/index.tsx`) — fixed in Tasks 8–10.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/utils/api.ts
git commit -m "feat(mobile): conversation + stateful chat API types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Conversations RTK Query API + active-conversation slice + store wiring

**Files:**
- Modify: `mobile/src/store/chat-api.ts`
- Create: `mobile/src/store/active-conversation-slice.ts`
- Delete: `mobile/src/store/chat-slice.ts`
- Modify: `mobile/src/store/index.ts`

- [ ] **Step 1: Rewrite `chat-api.ts` with conversation endpoints**

Replace `mobile/src/store/chat-api.ts`:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';

import { API_BASE } from '@/constants/api';
import type {
  ChatRequest,
  ChatResult,
  Conversation,
  ConversationSummary,
} from '@/utils/api';
import { tasksApi } from './tasks-api';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Conversation'],

  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      return (action as any).payload?.[reducerPath];
    }
  },

  endpoints: (build) => ({
    getConversations: build.query<ConversationSummary[], void>({
      query: () => '/conversations',
      providesTags: (result) =>
        result
          ? [
              { type: 'Conversation', id: 'LIST' },
              ...result.map((c) => ({ type: 'Conversation' as const, id: c.id })),
            ]
          : [{ type: 'Conversation', id: 'LIST' }],
    }),

    getConversation: build.query<Conversation, string>({
      query: (id) => `/conversations/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Conversation', id }],
    }),

    deleteConversation: build.mutation<void, string>({
      query: (id) => ({ url: `/conversations/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Conversation', id: 'LIST' },
        { type: 'Conversation', id },
      ],
    }),

    sendChat: build.mutation<ChatResult, ChatRequest>({
      query: (body) => ({ url: '/ai/chat', method: 'POST', body }),
      // Refresh this conversation (new messages) and the list (updatedAt / new
      // thread / new title). Plus cross-slice: invalidate tasks when the turn
      // touched the board.
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'Conversation', id: 'LIST' },
              { type: 'Conversation', id: result.conversationId },
            ]
          : [{ type: 'Conversation', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (
          data.createdTasks.length > 0 ||
          data.updatedTasks.length > 0 ||
          data.deletedTasks.length > 0
        ) {
          dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: 'LIST' }]));
        }
      },
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useDeleteConversationMutation,
  useSendChatMutation,
} = chatApi;
```

- [ ] **Step 2: Create the active-conversation slice**

`mobile/src/store/active-conversation-slice.ts`:

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Tracks which conversation the chat screen is currently showing. The messages
// themselves live on the backend (RTK Query cache); this slice only remembers
// the selected id so it survives app restarts. `null` = no thread open yet.
interface ActiveConversationState {
  id: string | null;
}

const initialState: ActiveConversationState = { id: null };

const slice = createSlice({
  name: 'activeConversation',
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.id = action.payload;
    },
  },
});

export const { setActiveConversation } = slice.actions;
export default slice.reducer;

type StateWithActive = { activeConversation: ActiveConversationState };
export const selectActiveConversationId = (state: StateWithActive) =>
  state.activeConversation.id;
```

- [ ] **Step 3: Delete the old slice**

```bash
git rm mobile/src/store/chat-slice.ts
```

- [ ] **Step 4: Update the store**

In `mobile/src/store/index.ts`: remove the `chatReducer` import and its `chat:` entry; add the active-conversation reducer; update the persist whitelist (drop `'chat'`, add `'activeConversation'`).

Replace the import line:
```ts
import chatReducer from './chat-slice';
```
with:
```ts
import activeConversationReducer from './active-conversation-slice';
```

Replace the `rootReducer`:
```ts
const rootReducer = combineReducers({
  filters: filtersReducer,
  activeConversation: activeConversationReducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
  [chatApi.reducerPath]: chatApi.reducer,
});
```

Replace the persist whitelist:
```ts
    whitelist: ['filters', 'activeConversation', tasksApi.reducerPath],
```

(Leave the `chatApi.middleware` concat as-is; the chat reducer path no longer holds the transcript, but the RTK Query cache is intentionally not persisted — it refetches on launch.)

- [ ] **Step 5: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: errors only in `chat/index.tsx` (still the old single-thread screen) — fixed in Task 9/10.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/store
git commit -m "feat(mobile): conversations RTK Query API + active-conversation slice

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Chat thread screen (`[id].tsx`) + route layout

**Files:**
- Create: `mobile/src/app/(tabs)/chat/[id].tsx`
- Modify: `mobile/src/app/(tabs)/chat/_layout.tsx`

The thread screen is the old `index.tsx` chat UI, re-pointed at the backend: it reads `id` from the route, loads the conversation via `useGetConversationQuery`, and sends with `{ conversationId, message }`. The "effects → text" rendering moves into message display so reloaded history shows the notes.

- [ ] **Step 1: Add the helper that turns effects into the note suffix**

This logic currently lives inline in `handleSend`. Put it in `[id].tsx` as a module function so it can render both live and persisted messages:

```ts
import type { Message, MessageEffects } from '@/utils/api';

function effectsSuffix(effects?: MessageEffects | null): string {
  if (!effects) return '';
  let out = '';
  if (effects.createdTasks.length > 0) {
    const names = effects.createdTasks.map((t) => `"${t.title}"`).join(', ');
    const noun = effects.createdTasks.length === 1 ? 'task' : 'tasks';
    out += `\n\n✅ Created ${effects.createdTasks.length} ${noun}: ${names}`;
  }
  if (effects.updatedTasks.length > 0) {
    out += `\n\n✏️ Updated: ${effects.updatedTasks.map((t) => `"${t.title}"`).join(', ')}`;
  }
  if (effects.deletedTasks.length > 0) {
    out += `\n\n🗑️ Deleted: ${effects.deletedTasks.map((t) => `"${t.title}"`).join(', ')}`;
  }
  if (effects.savedMemories.length > 0) {
    out += `\n\n🧠 Remembered: ${effects.savedMemories.join('; ')}`;
  }
  if (effects.forgotMemories.length > 0) {
    out += `\n\n🧠 Forgot: ${effects.forgotMemories.join('; ')}`;
  }
  return out;
}

// A persisted assistant message renders content + its effect notes.
function renderMessageText(m: Message): string {
  return m.role === 'assistant' ? m.content + effectsSuffix(m.effects) : m.content;
}
```

- [ ] **Step 2: Write the screen**

`mobile/src/app/(tabs)/chat/[id].tsx` — adapt the existing `index.tsx` screen (Step 1 of this task is part of this file). Key differences from today:
- `const { id } = useLocalSearchParams<{ id: string }>();`
- `const { data: conversation, isLoading: isLoadingHistory } = useGetConversationQuery(id);`
- The list data is `conversation?.messages ?? []` (reversed for the inverted list), rendered via `renderMessageText`.
- `handleSend` calls `sendChat({ conversationId: id, message: text }).unwrap()` and does NOT locally append — RTK Query invalidation (Task 8) refetches the thread. Show optimistic UX via the existing typing bubble while `isLoading`.
- The header "Clear chat" button is replaced by a "Delete conversation" button that calls `useDeleteConversationMutation`, then `router.back()` to the list.

Full file:

```tsx
import { Button, Host } from '@expo/ui/swift-ui';
import { font, labelStyle, padding } from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useDeleteConversationMutation,
  useGetConversationQuery,
  useSendChatMutation,
} from '@/store/chat-api';
import type { Message, MessageEffects } from '@/utils/api';

function effectsSuffix(effects?: MessageEffects | null): string {
  if (!effects) return '';
  let out = '';
  if (effects.createdTasks.length > 0) {
    const names = effects.createdTasks.map((t) => `"${t.title}"`).join(', ');
    const noun = effects.createdTasks.length === 1 ? 'task' : 'tasks';
    out += `\n\n✅ Created ${effects.createdTasks.length} ${noun}: ${names}`;
  }
  if (effects.updatedTasks.length > 0) {
    out += `\n\n✏️ Updated: ${effects.updatedTasks.map((t) => `"${t.title}"`).join(', ')}`;
  }
  if (effects.deletedTasks.length > 0) {
    out += `\n\n🗑️ Deleted: ${effects.deletedTasks.map((t) => `"${t.title}"`).join(', ')}`;
  }
  if (effects.savedMemories.length > 0) {
    out += `\n\n🧠 Remembered: ${effects.savedMemories.join('; ')}`;
  }
  if (effects.forgotMemories.length > 0) {
    out += `\n\n🧠 Forgot: ${effects.forgotMemories.join('; ')}`;
  }
  return out;
}

function renderMessageText(m: Message): string {
  return m.role === 'assistant' ? m.content + effectsSuffix(m.effects) : m.content;
}

function MessageBubble({
  message,
  theme,
}: {
  message: Message;
  theme: ReturnType<typeof useTheme>;
}) {
  const isUser = message.role === 'user';
  const text = renderMessageText(message);
  return (
    <Pressable
      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
      onLongPress={() => {
        Clipboard.setStringAsync(text);
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (Platform.OS === 'android') ToastAndroid.show('Copied', ToastAndroid.SHORT);
      }}
    >
      <ThemedText
        style={[
          styles.bubbleText,
          {
            backgroundColor: isUser ? '#3c87f7' : theme.backgroundElement,
            color: isUser ? '#ffffff' : theme.text,
          },
        ]}
      >
        {text}
      </ThemedText>
    </Pressable>
  );
}

function TypingBubble({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.bubbleAssistant}>
      <ThemedText
        style={[
          styles.bubbleText,
          { backgroundColor: theme.backgroundElement, color: theme.textSecondary },
        ]}
      >
        …
      </ThemedText>
    </View>
  );
}

export default function ChatThreadScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { data: conversation } = useGetConversationQuery(id);
  const [sendChat, { isLoading }] = useSendChatMutation();
  const [deleteConversation] = useDeleteConversationMutation();

  const [draftText, setDraftText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const messages = conversation?.messages ?? [];

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isLoading) return;
    setDraftText('');
    try {
      // Invalidation (chat-api) refetches this thread + the list, so we don't
      // locally append — the server is the source of truth.
      await sendChat({ conversationId: id, message: text }).unwrap();
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    }
  }, [draftText, isLoading, id, sendChat]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete conversation?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(id).unwrap().catch(() => {});
          router.back();
        },
      },
    ]);
  }, [deleteConversation, id, router]);

  const canSend = draftText.trim().length > 0 && !isLoading;
  const listData = [...messages].reverse();

  return (
    <>
      <Stack.Screen
        options={{
          title: conversation?.title ?? 'Chat',
          headerRight: () => (
            <Host matchContents>
              <Button
                label="Delete conversation"
                systemImage="trash"
                role="destructive"
                modifiers={[labelStyle('iconOnly'), font({ size: 20 }), padding({ all: 4 })]}
                onPress={handleDelete}
              />
            </Host>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
          ListHeaderComponent={isLoading ? <TypingBubble theme={theme} /> : null}
          inverted
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
        />

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundSelected,
              paddingBottom: keyboardVisible ? Spacing.two : bottom + Spacing.two,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            value={draftText}
            onChangeText={setDraftText}
            placeholder="Ask the agent…"
            placeholderTextColor={theme.textSecondary}
            multiline
            onSubmitEditing={handleSend}
            submitBehavior="blurAndSubmit"
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, { opacity: canSend ? 1 : 0.4 }]}
          >
            <ThemedText style={styles.sendIcon}>↑</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { justifyContent: 'flex-end', padding: Spacing.three, gap: Spacing.two },
  bubble: { maxWidth: '80%' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  bubbleText: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    overflow: 'hidden',
    fontSize: 15,
    lineHeight: 21,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  textInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendIcon: { color: '#ffffff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
});
```

- [ ] **Step 3: Register the route**

Replace `mobile/src/app/(tabs)/chat/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function ChatStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: false }}>
      <Stack.Screen name="index" options={{ title: 'Chats' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: errors only in `chat/index.tsx` (still old) — fixed in Task 10.

- [ ] **Step 5: Commit**

```bash
git add "mobile/src/app/(tabs)/chat/[id].tsx" "mobile/src/app/(tabs)/chat/_layout.tsx"
git commit -m "feat(mobile): backend-backed chat thread screen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Conversation list screen (`index.tsx`)

**Files:**
- Modify: `mobile/src/app/(tabs)/chat/index.tsx`

The Chat tab now shows the list of conversations with a "New chat" action. Tapping a row navigates to `[id]`. "New chat" creates a thread lazily: it navigates to a new-thread state — simplest is to start a thread by sending the first message. To keep the list/thread split clean, "New chat" navigates to `[id]` with a sentinel that means "no conversation yet"; but since the backend creates the conversation on first message, we instead navigate to the thread screen only once an id exists.

**Decision (keep it simple):** "New chat" sends the user straight into a thread screen by first creating a conversation via an empty-history send is NOT possible (message is required). Instead, the list's "New chat" focuses a small composer? Overkill. Use this flow: "New chat" pushes `[id]` with `id="new"`; the thread screen treats `id === 'new'` by sending without a `conversationId`, then, on the result, replaces the route with the real id.

Apply this addition to `[id].tsx` from Task 9 — update `handleSend` to support the `"new"` sentinel:

```ts
  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isLoading) return;
    setDraftText('');
    try {
      const result = await sendChat({
        conversationId: id === 'new' ? undefined : id,
        message: text,
      }).unwrap();
      // First message of a brand-new thread: swap the placeholder route for the
      // real conversation id so subsequent sends target it and the title shows.
      if (id === 'new') {
        router.replace(`/chat/${result.conversationId}`);
      }
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    }
  }, [draftText, isLoading, id, sendChat, router]);
```

And guard the history query so it skips when there's no real id yet:

```ts
  const { data: conversation } = useGetConversationQuery(id, { skip: id === 'new' });
```

(`useGetConversationQuery` accepts a second `{ skip }` options arg.)

- [ ] **Step 1: Write the list screen**

Replace `mobile/src/app/(tabs)/chat/index.tsx`:

```tsx
import { Button, Host } from '@expo/ui/swift-ui';
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers';
import { Link, Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGetConversationsQuery } from '@/store/chat-api';
import type { ConversationSummary } from '@/utils/api';

function ConversationRow({
  conversation,
  theme,
}: {
  conversation: ConversationSummary;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Link href={`/chat/${conversation.id}`} asChild>
      <Pressable style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {conversation.title ?? 'New conversation'}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {new Date(conversation.updatedAt).toLocaleString()}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

export default function ConversationListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: conversations = [], isLoading } = useGetConversationsQuery();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Host matchContents>
              <Button
                label="New chat"
                systemImage="square.and.pencil"
                modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
                onPress={() => router.push('/chat/new')}
              />
            </Host>
          ),
        }}
      />

      {conversations.length === 0 && !isLoading ? (
        <View style={[styles.empty, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">No conversations yet</ThemedText>
          <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Tap the compose button to start triaging with the agent.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          style={{ backgroundColor: theme.background }}
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationRow conversation={item} theme={theme} />}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two },
  row: { padding: Spacing.three, borderRadius: 12, gap: Spacing.one },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
```

- [ ] **Step 2: Apply the `"new"`-sentinel changes to `[id].tsx`**

Make the two edits shown above (the `handleSend` body and the `useGetConversationQuery(id, { skip: id === 'new' })` line) in `mobile/src/app/(tabs)/chat/[id].tsx`.

- [ ] **Step 3: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual run (verification)**

Run: `cd mobile && npm run dev` (with the dev build installed and the backend running).
Verify: the Chat tab lists conversations; "New chat" opens an empty thread; sending a message creates a thread, shows the reply + any effect notes, and the title appears in the list; reopening a thread shows full history including the "Created task X" notes; deleting a conversation returns to the list and it's gone.

- [ ] **Step 5: Commit**

```bash
git add "mobile/src/app/(tabs)/chat/index.tsx" "mobile/src/app/(tabs)/chat/[id].tsx"
git commit -m "feat(mobile): conversation list screen with new-chat flow

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Log to AGENT_LOG.md** (via the `agent-log` skill): "Mobile: chat tab is now a backend-backed conversation list + thread screens (RTK Query)."

---

## Final verification

- [ ] `cd backend && npm test` — all suites pass.
- [ ] `cd backend && npm run build` — clean.
- [ ] `cd mobile && npx tsc --noEmit` — clean.
- [ ] Manual end-to-end on device per Task 10 Step 4.
- [ ] Update docs if needed: `CLAUDE.md` "Current state" / "Data model & API" sections mention the stateless agent and device-only chat — update to describe backend conversations + stateful `POST /ai/chat`. (`backend/README.md` API list too.)

---

## Spec coverage check

- Multiple, minimal conversations (auto-created, listable, deletable) → Tasks 1–3 (entities, service, controller), Task 10 (list + delete UI). ✓
- Stateful `POST /ai/chat` (`{ conversationId?, message }`, DB source of truth) → Tasks 4–6. ✓
- Per-message `effects` blob, re-rendered on reload → `Message.effects` (Task 1), persisted (Task 5), rendered (Task 9 `renderMessageText`). ✓
- AI-generated title with snippet fallback in mock mode → Task 5 `generateTitle` + tests. ✓
- Module boundaries (separate `conversations/`, AiModule imports it) → Tasks 1–3, 6. ✓
- 404 on unknown id → `getWithMessages` / `remove` (Task 2), controller (Task 3). ✓
- No on-device migration → old `chat-slice` deleted (Task 8); no migration code. ✓
- Tests: ConversationsService, stateful chat flow, title fallback → Tasks 2, 5. ✓
- Mobile swap to RTK Query + list screen → Tasks 7–10. ✓
```
