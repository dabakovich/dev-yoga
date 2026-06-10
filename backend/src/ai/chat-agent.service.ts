import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import { TaskPriority } from '../tasks/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { ChatMessageDto, ChatRole } from './dto/chat-request.dto';
import { Task } from '../tasks/task.entity';

// What the agent hands back to the controller: the assistant's final text plus
// the tasks the tool actually created this turn (so the client can render a
// confirmation and refresh its list).
export interface ChatResult {
  reply: string;
  createdTasks: Task[];
}

// The default model. Sonnet 4.6 is the sweet spot for an interactive triage
// chat — fast and cheap enough to feel responsive, smart enough to decompose a
// vague backlog. Overridable via AI_MODEL without touching code.
const DEFAULT_MODEL = 'claude-sonnet-4-6';

// The system prompt IS the agent. The intelligence — when to clarify, when to
// split, and the never-create-before-confirm gate — lives here, not in code.
const SYSTEM_PROMPT = `You are DevYoga's task triage agent, built into a task tracker for software developers. Your job is to help a developer cut through a messy backlog: turn vague intentions into concrete, well-formed tasks.

You can create tasks with the create_tasks tool. Each task has a title, an optional description, and a priority (low | medium | high).

Behave like a thoughtful engineering lead doing backlog grooming:

1. CLARIFY when the request is vague or underspecified. If you can't write a concrete, actionable title with confidence, ask a short clarifying question instead of guessing. Never invent scope, priority, or details you aren't sure about — ask.

2. DECOMPOSE when a request is too big for one task. If the user describes something that is really several units of work (e.g. "add authentication"), propose several smaller, independently-actionable tasks rather than one giant vague one. These are flat, separate tasks — there are no subtasks.

3. CONFIRM before creating. This is a hard rule: first show the user a clear textual DRAFT of the task(s) you intend to create (titles, priorities, one-line descriptions) and ask them to confirm. Do NOT call create_tasks in the same turn you first propose a draft. Only call create_tasks AFTER the user has explicitly approved the draft (e.g. "yes", "go ahead", "create them"). If the user asks for changes, show an updated draft and ask again.

4. Choose priority deliberately: high for blocking/urgent/security work, low for nice-to-haves, medium otherwise. Keep titles short and imperative ("Add login rate limiting"), descriptions to one or two sentences.

STYLE: Your replies are shown in a plain-text chat bubble that does NOT render markdown. Write plain text only — no markdown syntax: no **bold**, no _italics_, no \`code\`, no # headings, no markdown links or tables. For a task draft, use simple plain lines (e.g. dashes and line breaks). Be very laconic and minimal — say only what's needed, in a warm, friendly tone. You are a grooming assistant, not a chatbot: get the user to a clean, confirmed set of tasks with as little back-and-forth as possible.`;

@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);

  // ConfigService is injected by Nest's DI container (ConfigModule is global, so
  // we don't re-import it). It reads the resolved .env values at runtime.
  constructor(
    private readonly config: ConfigService,
    private readonly tasksService: TasksService,
  ) {}

  async chat(messages: ChatMessageDto[]): Promise<ChatResult> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');

    // No key → mock mode, so `npm run start:dev` works for anyone cloning the
    // repo without Anthropic credentials. Documented in the README.
    if (!apiKey) {
      return this.mockChat(messages);
    }

    // Tasks the create_tasks tool created during THIS request. The tool's
    // `execute` pushes into this closure-scoped array; we return it to the
    // client alongside the reply. (Stateless agent: nothing is persisted about
    // the conversation, only the tasks themselves land in the DB.)
    const createdTasks: Task[] = [];

    const anthropic = createAnthropic({ apiKey });
    const model = this.config.get<string>('AI_MODEL') ?? DEFAULT_MODEL;

    const { text } = await generateText({
      model: anthropic(model),
      system: SYSTEM_PROMPT,
      // The client's transcript maps 1:1 onto AI SDK model messages.
      messages: messages as ModelMessage[],
      tools: {
        create_tasks: tool({
          description:
            'Create one or more tasks in the backlog. Only call this AFTER the user has explicitly confirmed a draft you previously showed them. Batch related tasks into a single call.',
          inputSchema: z.object({
            tasks: z
              .array(
                z.object({
                  title: z.string().describe('Short, imperative task title'),
                  description: z
                    .string()
                    .optional()
                    .describe('One or two sentences of detail, if useful'),
                  priority: z
                    .enum(['low', 'medium', 'high'])
                    .describe('Task priority'),
                }),
              )
              .min(1),
          }),
          // `execute` makes this an auto-running tool: the AI SDK calls it,
          // feeds the result back to the model, and lets it write a final
          // confirmation — all within one generateText call.
          execute: async ({ tasks }) => {
            const created = await Promise.all(
              tasks.map((t) =>
                this.tasksService.create({
                  title: t.title,
                  description: t.description,
                  priority: t.priority as TaskPriority,
                }),
              ),
            );
            createdTasks.push(...created);
            // Hand the model back enough to confirm naturally to the user.
            return created.map((t) => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
            }));
          },
        }),
      },
      // The agent loop: let the model call the tool and then summarize the
      // result. A small cap is a guardrail against runaway loops.
      stopWhen: stepCountIs(5),
    });

    return { reply: text, createdTasks };
  }

  // Canonical, key-free responses so the endpoint is demoable without Anthropic
  // credentials. It mimics the draft → confirm → create gate with a keyword
  // check so the full flow can still be exercised end-to-end.
  private async mockChat(messages: ChatMessageDto[]): Promise<ChatResult> {
    this.logger.warn('ANTHROPIC_API_KEY not set — using mock AI responses.');

    const userMessages = messages.filter((m) => m.role === ChatRole.USER);
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
        reply: `[mock] Created task "${created.title}". Set ANTHROPIC_API_KEY for the real triage agent.`,
        createdTasks: [created],
      };
    }

    return {
      reply:
        last.length > 0
          ? `[mock] Draft: I'd create a task "${last.slice(0, 80)}" (priority: medium). Reply "yes" to confirm. (Set ANTHROPIC_API_KEY to enable the real agent.)`
          : '[mock] Tell me what task you want to create. (Set ANTHROPIC_API_KEY to enable the real agent.)',
      createdTasks: [],
    };
  }
}
