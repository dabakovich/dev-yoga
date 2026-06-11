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

// What the agent hands back to the controller: the assistant's final text plus
// everything the tools did this turn (so the client can render confirmations
// and refresh its list).
export interface ChatResult extends ChatTurnEffects {
  reply: string;
}

export const createChatTurnEffects = (): ChatTurnEffects => ({
  createdTasks: [],
  updatedTasks: [],
  deletedTasks: [],
  savedMemories: [],
  forgotMemories: [],
});
