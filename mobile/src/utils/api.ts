// Mirrors the backend Task entity (backend/src/tasks/task.entity.ts).
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

// Payload shapes accepted by the backend DTOs.
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

// Sort params accepted by `GET /tasks` — mirrors the backend FindTasksQueryDto.
export type SortBy = 'createdAt' | 'priority';
export type SortOrder = 'asc' | 'desc';

export interface TaskQuery {
  status?: TaskStatus;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

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
