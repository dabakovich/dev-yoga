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

// Chat types — mirrors backend ChatRequestDto / ChatResult.
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResult {
  reply: string;
  createdTasks: Task[];
  updatedTasks: Task[];
  deletedTasks: Pick<Task, 'id' | 'title'>[];
  // Durable project facts the agent saved / dropped this turn (the fact text).
  savedMemories: string[];
  forgotMemories: string[];
}
