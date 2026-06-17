import { Task } from '../tasks/task.entity';

// Side effects the tools produce during one chat turn. Tools need per-request
// state, but Nest services are singletons — so instead of a service field
// (which would leak across concurrent requests) each request creates a fresh
// effects object and the tools close over it. Future tools extend this shape
// (updatedTasks, deletedTasks, quickReplies, ...).
export interface ChatTurnEffects {
  createdTasks: Task[];
  updatedTasks: Task[];
  // Title is captured before removal so the client can still say "Deleted: X".
  deletedTasks: Pick<Task, 'id' | 'title'>[];
  // Durable project facts the agent saved / dropped this turn (the fact text),
  // so the client can show a subtle "remembered"/"forgot" note.
  savedMemories: string[];
  forgotMemories: string[];
}

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

export const createChatTurnEffects = (): ChatTurnEffects => ({
  createdTasks: [],
  updatedTasks: [],
  deletedTasks: [],
  savedMemories: [],
  forgotMemories: [],
});
