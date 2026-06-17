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
