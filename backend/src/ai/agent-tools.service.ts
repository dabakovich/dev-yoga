import { Injectable } from '@nestjs/common';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { TaskPriority } from '../tasks/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { ChatTurnEffects } from './chat-turn.types';

// Per-request tool factory. The service itself is a stateless singleton (Nest
// injects TasksService once); `build(effects)` is called per chat request so
// each tool closes over THAT request's effects object. We deliberately avoid
// `@Injectable({ scope: Scope.REQUEST })` — request scope re-instantiates the
// whole injector chain per request and is contagious up the graph; a plain
// function parameter is simpler and faster.
@Injectable()
export class AgentToolsService {
  constructor(private readonly tasksService: TasksService) {}

  build(effects: ChatTurnEffects): ToolSet {
    return {
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
    };
  }
}
