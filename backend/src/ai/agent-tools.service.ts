import { Injectable } from '@nestjs/common';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { SortOrder, TaskSortBy } from '../tasks/dto/find-tasks-query.dto';
import { TaskPriority, TaskStatus } from '../tasks/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { ChatTurnEffects } from './chat-turn.types';
import { AgentMemoryService } from './memory/agent-memory.service';

// Per-request tool factory. The service itself is a stateless singleton (Nest
// injects TasksService once); `build(effects)` is called per chat request so
// each tool closes over THAT request's effects object. We deliberately avoid
// `@Injectable({ scope: Scope.REQUEST })` — request scope re-instantiates the
// whole injector chain per request and is contagious up the graph; a plain
// function parameter is simpler and faster.
@Injectable()
export class AgentToolsService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  build(effects: ChatTurnEffects): ToolSet {
    return {
      list_tasks: tool({
        description:
          'Read the current task board. Call this whenever the user asks what to work on, wants a plan for the day, or asks about existing tasks — never answer about the board from memory. Read-only: no confirmation needed.',
        inputSchema: z.object({
          status: z
            .enum(['todo', 'in_progress', 'done'])
            .optional()
            .describe('Filter by status; omit to get the whole board'),
        }),
        execute: async ({ status }) => {
          const tasks = await this.tasksService.findAll({
            status: status as TaskStatus | undefined,
            sortBy: TaskSortBy.PRIORITY,
            sortOrder: SortOrder.DESC,
          });
          // Compact shape so a big board doesn't blow up the context window;
          // descriptions are truncated for the same reason.
          return tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description?.slice(0, 200),
            status: t.status,
            priority: t.priority,
            createdAt: t.createdAt,
          }));
        },
      }),
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
          effects.createdTasks.push(...created);
          // Hand the model back enough to confirm naturally to the user.
          return created.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
          }));
        },
      }),
      update_task: tool({
        description:
          'Update an existing task (status, priority, title, or description). Resolve the task id via list_tasks first — never guess ids. Status-only changes can be applied directly when the task reference is unambiguous; for bigger edits confirm with the user first.',
        inputSchema: z.object({
          id: z.string().uuid().describe('Task id, taken from list_tasks'),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['todo', 'in_progress', 'done']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        }),
        execute: async ({ id, ...patch }) => {
          // Return the failure as data instead of letting NotFoundException
          // kill the whole chat request — the model can re-list and recover.
          try {
            const updated = await this.tasksService.update(id, {
              ...patch,
              status: patch.status as TaskStatus | undefined,
              priority: patch.priority as TaskPriority | undefined,
            });
            effects.updatedTasks.push(updated);
            return {
              id: updated.id,
              title: updated.title,
              status: updated.status,
              priority: updated.priority,
            };
          } catch {
            return { error: `No task found with id ${id} — call list_tasks.` };
          }
        },
      }),
      delete_task: tool({
        description:
          'Permanently delete a task. Destructive and irreversible: only call this AFTER the user explicitly confirmed deleting this exact task in a previous turn. Resolve the id via list_tasks first.',
        inputSchema: z.object({
          id: z.string().uuid().describe('Task id, taken from list_tasks'),
        }),
        execute: async ({ id }) => {
          try {
            // findOne first: capture the title before the row is gone.
            const task = await this.tasksService.findOne(id);
            await this.tasksService.remove(id);
            effects.deletedTasks.push({ id: task.id, title: task.title });
            return { deleted: true, id: task.id, title: task.title };
          } catch {
            return { error: `No task found with id ${id} — call list_tasks.` };
          }
        },
      }),
      remember: tool({
        description:
          "Save one durable project fact so it carries across conversations (stack, conventions, people/ownership, recurring constraints). Never save tasks (use create_tasks) or chit-chat. Pass a single self-contained sentence. Idempotent: a near-duplicate of an existing fact is skipped.",
        inputSchema: z.object({
          fact: z
            .string()
            .max(300)
            .describe('One self-contained sentence stating a durable fact'),
        }),
        execute: async ({ fact }) => {
          const clean = fact.trim();
          // Cheap dedupe: skip if this fact is a substring of an existing one
          // (or vice-versa), case-insensitive. Good enough at this scale and
          // keeps the memory from piling up restatements of the same thing.
          const existing = await this.memoryService.findAll();
          const lower = clean.toLowerCase();
          const dup = existing.find((f) => {
            const e = f.content.toLowerCase();
            return e.includes(lower) || lower.includes(e);
          });
          if (dup) {
            return { saved: false, reason: 'already-known', fact: dup.content };
          }
          const created = await this.memoryService.create(clean);
          effects.savedMemories.push(created.content);
          return { saved: true, fact: created.content };
        },
      }),
      forget: tool({
        description:
          'Drop a remembered project fact the user says is wrong or no longer true. Pass words from the fact you want removed (e.g. "ship Fridays" to drop "We ship on Fridays"). Use only when the user asks to forget/correct something. If nothing matches, you get the current fact list back — do NOT claim a fact was removed unless this tool returns it under "forgot".',
        inputSchema: z.object({
          match: z
            .string()
            .describe('Distinctive words from the fact(s) to remove'),
        }),
        execute: async ({ match }) => {
          const existing = await this.memoryService.findAll();
          // Significant words from the model's match phrase (>=4 chars drops
          // "on", "the", "a"...). A fact is a hit if its text contains any of
          // them as a substring — so "Fridays" matches the word "friday", and
          // a brittle exact-phrase match isn't required.
          const words = match
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length >= 4);
          const hits = words.length
            ? existing.filter((f) => {
                const text = f.content.toLowerCase();
                return words.some((w) => text.includes(w));
              })
            : [];
          if (hits.length === 0) {
            // Tell the model the truth so it can't fabricate a removal; hand it
            // the current facts to retry with better words or report honestly.
            return {
              forgot: [] as string[],
              error: 'No saved fact matched those words.',
              currentFacts: existing.map((f) => f.content),
            };
          }
          await Promise.all(hits.map((f) => this.memoryService.remove(f.id)));
          const forgot = hits.map((f) => f.content);
          effects.forgotMemories.push(...forgot);
          return { forgot };
        },
      }),
    };
  }
}
