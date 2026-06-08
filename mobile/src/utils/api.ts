import { API_BASE } from '@/constants/api';

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

// Sort params accepted by `GET /tasks` — mirrors the backend FindTasksQueryDto
// (backend/src/tasks/dto/find-tasks-query.dto.ts).
export type SortBy = 'createdAt' | 'priority';
export type SortOrder = 'asc' | 'desc';

export interface TaskQuery {
  status?: TaskStatus;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`);
  }

  // DELETE returns 204 No Content — nothing to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const getTasks = (query: TaskQuery = {}) => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
};

export const getTask = (id: string) => request<Task>(`/tasks/${id}`);

export const createTask = (input: CreateTaskInput) =>
  request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) });

export const updateTask = (id: string, input: UpdateTaskInput) =>
  request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteTask = (id: string) =>
  request<void>(`/tasks/${id}`, { method: 'DELETE' });
